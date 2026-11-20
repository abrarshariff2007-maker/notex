#!/usr/bin/env python3
"""NoteX development server backed by a persistent SQLite database."""

import base64
import hashlib
import http.server
import json
import os
import sqlite3
import urllib.parse
from datetime import datetime

PORT = 5000
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_FILE = os.path.join(DATA_DIR, "notex.db")


def db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def load_json(filename):
    with open(os.path.join(DATA_DIR, filename), "r", encoding="utf-8") as f:
        return json.load(f)


def hash_password(password):
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return "pbkdf2$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def verify_password(password, stored):
    if not stored or "$" not in stored:
        return password == stored
    try:
        _, salt_text, digest_text = stored.split("$", 2)
        salt = base64.b64decode(salt_text)
        digest = base64.b64decode(digest_text)
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
        return hashlib.compare_digest(candidate, digest)
    except Exception:
        return False


def init_database():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL, college TEXT, branch TEXT, semester INTEGER,
            joined_date TEXT, avatar TEXT
        );
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY, title TEXT, subject TEXT, course_code TEXT, branch TEXT,
            semester INTEGER, file_type TEXT, file_size TEXT, file_name TEXT, file_url TEXT,
            file_data TEXT, description TEXT, tags TEXT, uploader_name TEXT,
            uploader_email TEXT, college TEXT, downloads INTEGER DEFAULT 0, likes INTEGER DEFAULT 1,
            upload_date TEXT, pages INTEGER
        );
        CREATE TABLE IF NOT EXISTS bookmarks (
            user_email TEXT, note_id TEXT,
            PRIMARY KEY (user_email, note_id),
            FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
            FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
        );
    """)

    if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        for u in load_json("users.json"):
            conn.execute("""INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (u["id"], u["fullName"], u["email"].lower(), hash_password(u["password"]),
                 u.get("college"), u.get("branch"), u.get("semester"),
                 u.get("joinedDate"), u.get("avatar")))
            for note_id in u.get("bookmarks", []):
                conn.execute("INSERT OR IGNORE INTO bookmarks VALUES (?, ?)",
                             (u["email"].lower(), note_id))

    if conn.execute("SELECT COUNT(*) FROM notes").fetchone()[0] == 0:
        for n in load_json("initial-notes.json"):
            conn.execute("""INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (n["id"], n["title"], n["subject"], n["courseCode"], n["branch"],
                 n["semester"], n["fileType"], n["fileSize"], n["fileName"], n.get("fileUrl"),
                 n.get("fileData"), n.get("description"), json.dumps(n.get("tags", [])),
                 n["uploaderName"], n["uploaderEmail"], n["college"], n.get("downloads", 0),
                 n.get("likes", 1), n["uploadDate"], n.get("pages", 20)))
    conn.commit()
    conn.close()


def user_json(row):
    if not row:
        return None
    u = dict(row)
    conn = db()
    bookmarks = [r[0] for r in conn.execute(
        "SELECT note_id FROM bookmarks WHERE user_email = ?", (u["email"],))]
    conn.close()
    return {
        "id": u["id"], "fullName": u["full_name"], "email": u["email"],
        "college": u["college"], "branch": u["branch"], "semester": u["semester"],
        "joinedDate": u["joined_date"], "avatar": u["avatar"], "bookmarks": bookmarks
    }


def note_json(row):
    n = dict(row)
    try:
        tags = json.loads(n["tags"] or "[]")
    except Exception:
        tags = []
    return {
        "id": n["id"], "title": n["title"], "subject": n["subject"],
        "courseCode": n["course_code"], "branch": n["branch"], "semester": n["semester"],
        "fileType": n["file_type"], "fileSize": n["file_size"], "fileName": n["file_name"],
        "fileUrl": n["file_url"], "fileData": n["file_data"], "description": n["description"],
        "tags": tags, "uploaderName": n["uploader_name"], "uploaderEmail": n["uploader_email"],
        "college": n["college"], "downloads": n["downloads"], "likes": n["likes"],
        "uploadDate": n["upload_date"], "pages": n["pages"]
    }


class NoteXHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def send_json(self, status, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length).decode("utf-8")) if length else {}

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        conn = db()
        if parsed.path == "/api/notes":
            rows = conn.execute("SELECT * FROM notes ORDER BY upload_date DESC, rowid DESC").fetchall()
            conn.close()
            self.send_json(200, [note_json(r) for r in rows])
            return
        if parsed.path == "/api/users":
            rows = conn.execute("SELECT * FROM users").fetchall()
            conn.close()
            self.send_json(200, [user_json(r) for r in rows])
            return
        match = parsed.path.startswith("/api/notes/") and parsed.path.endswith("/download")
        if match:
            note_id = parsed.path.split("/")[-2]
            row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
            if not row:
                conn.close()
                self.send_json(404, {"message": "Note not found"})
                return
            conn.execute("UPDATE notes SET downloads = downloads + 1 WHERE id = ?", (note_id,))
            conn.commit()
            note = note_json(row)
            conn.close()
            file_data = note.get("fileData")
            if file_data and file_data.startswith("data:"):
                header, encoded = file_data.split(",", 1)
                content = base64.b64decode(encoded)
                self.send_response(200)
                mime = header.split(";")[0].replace("data:", "")
                self.send_header("Content-Type", mime)
                self.send_header("Content-Disposition",
                                 f'attachment; filename="{note.get("fileName", "note.pdf")}"')
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            file_url = note.get("fileUrl") or "assets/sample-notes/dsa-handwritten-notes.pdf"
            path = os.path.join(BASE_DIR, file_url)
            if os.path.exists(path):
                with open(path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Disposition",
                                 f'attachment; filename="{note.get("fileName", "note.pdf")}"')
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            self.send_json(404, {"message": "File not found"})
            return
        conn.close()
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        body = self.read_json()
        conn = db()
        if parsed.path == "/api/auth/register":
            email = body.get("email", "").strip().lower()
            if conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
                conn.close()
                self.send_json(400, {"success": False, "message": "An account with this email already exists."})
                return
            user_id = "user-" + str(int(datetime.now().timestamp() * 1000))
            conn.execute("""INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (user_id, body["fullName"].strip(), email, hash_password(body["password"]),
                 body.get("college", "University Campus"), body.get("branch", "Computer Science"),
                 int(body.get("semester", 1)), datetime.now().strftime("%Y-%m-%d"),
                 body.get("avatar") or "https://api.dicebear.com/7.x/bottts/svg?seed=" +
                 urllib.parse.quote(body["fullName"])))
            conn.commit()
            row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            conn.close()
            self.send_json(201, {"success": True, "user": user_json(row)})
            return
        if parsed.path == "/api/auth/login":
            email = body.get("email", "").strip().lower()
            row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            if not row or not verify_password(body.get("password", ""), row["password"]):
                conn.close()
                self.send_json(400, {"success": False, "message": "Invalid email or password."})
                return
            conn.close()
            self.send_json(200, {"success": True, "user": user_json(row)})
            return
        if parsed.path == "/api/notes":
            note_id = "note-" + str(int(datetime.now().timestamp() * 1000))
            conn.execute("""INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)""",
                (note_id, body["title"], body["subject"], body.get("courseCode", "GEN101"),
                 body["branch"], int(body.get("semester", 1)), body.get("fileType", "PDF"),
                 body.get("fileSize", "1.5 MB"), body.get("fileName", "course-material.pdf"),
                 body.get("fileUrl"), body.get("fileData"),
                 body.get("description", ""), json.dumps(body.get("tags", [])),
                 body["uploaderName"], body["uploaderEmail"], body["college"],
                 datetime.now().strftime("%Y-%m-%d"), body.get("pages", 20)))
            conn.commit()
            row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
            conn.close()
            self.send_json(201, {"success": True, "note": note_json(row)})
            return
        if parsed.path.startswith("/api/bookmarks/"):
            parts = parsed.path.strip("/").split("/")
            if len(parts) == 3:
                email = urllib.parse.unquote(parts[1]).lower()
                note_id = parts[2]
                exists = conn.execute(
                    "SELECT 1 FROM bookmarks WHERE user_email = ? AND note_id = ?",
                    (email, note_id)).fetchone()
                if exists:
                    conn.execute(
                        "DELETE FROM bookmarks WHERE user_email = ? AND note_id = ?",
                        (email, note_id))
                    bookmarked = False
                else:
                    conn.execute(
                        "INSERT INTO bookmarks (user_email, note_id) VALUES (?, ?)",
                        (email, note_id))
                    bookmarked = True
                conn.commit()
                conn.close()
                self.send_json(200, {"success": True, "bookmarked": bookmarked})
                return
        conn.close()
        self.send_json(404, {"success": False, "message": "Unknown API route"})

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        conn = db()
        if parsed.path.startswith("/api/notes/"):
            note_id = parsed.path.split("/")[-1]
            conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
            conn.commit()
            conn.close()
            self.send_json(200, {"success": True})
            return
        conn.close()
        self.send_json(404, {"success": False, "message": "Unknown API route"})


if __name__ == "__main__":
    init_database()
    os.chdir(BASE_DIR)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(("0.0.0.0", PORT), NoteXHandler) as httpd:
        print("=" * 60)
        print("NoteX SQLite server")
        print("Local URL: http://localhost:5000")
        print(f"Database: {DB_FILE}")
        print("=" * 60)
        httpd.serve_forever()
