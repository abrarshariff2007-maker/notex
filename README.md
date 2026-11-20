# NoteX 🎓 — Verified College Course Materials & Notes Exchange

> **NoteX** is a modern, responsive academic exchange web application where students can upload, explore, and download lecture notes, formula cheat sheets, handwritten summaries, and past exam question banks. Built with a sleek **Glassmorphism UI**, college email verification, and a comprehensive student dashboard.

---

## 🌟 Key Features

1. **💎 Glassmorphic Responsive Design**:
   - Frosted glass cards (`backdrop-filter: blur(20px)`), glowing neon cyan and purple accents.
   - Dynamic ambient floating gradient orbs.
   - 100% responsive across mobile phones, tablets, laptops, and ultra-wide desktops.

2. **🏫 College Email Authentication**:
   - Students create accounts using their official **College / University mail ID** (`.edu`, `.ac.in`, `.ac.uk`, `.edu.*`, or custom institutional domains).
   - Real-time institutional domain validation (blocks personal addresses like `@gmail.com` or `@yahoo.com`).
   - Automatic college name detection (e.g., `user@stanford.edu` → *Stanford University*).
   - Demo 1-click test accounts included for instant evaluation.

3. **📚 Upload & Download Course Materials**:
   - **Upload**: Drag-and-drop or file picker with support for PDF, DOCX, PPTX, and handwritten scans.
   - Metadata tagging: Subject, Course Code (e.g. `CS201`), Branch/Major, Semester (1 to 8), Tags, and Detailed Description.
   - **Download**: Direct 1-click download with real-time download counter incrementation and preview modal.

4. **📊 Comprehensive Student Dashboard (`dashboard.html`)**:
   - Student profile card with verified college badge, avatar, and academic details.
   - Live KPI cards: **My Uploads**, **Total Downloads Generated**, **Bookmarks**, and **Academic Karma Score**.
   - Manage uploads table with quick download and delete actions.
   - Bookmarked notes collection for rapid exam revision.
   - JSON Database export tool (`notex-database.json`) for backups.

5. **🗄️ Universal Database Architecture (JSON & MongoDB)**:
   - **Zero-setup JSON Engine (`js/db.js`)**: Runs directly in any browser and on **GitHub Pages** without requiring a database server.
   - **Python Backend (`backend/server.py`)**: Lightweight zero-dependency server using Python's standard library.
   - **Node.js + MongoDB Backend (`backend/server.js`)**: Full REST API with Express, Multer file uploads, JWT authentication, and Mongoose schemas (`backend/models/`).

---

## 📁 Project Folder Structure

```text
notex/
├── index.html                   # Main page: Hero, search & filters, notes catalog, upload & preview modals
├── dashboard.html               # Student dashboard: Profile, stats, my uploads table, saved bookmarks
├── css/
│   ├── style.css                # Master glassmorphism design system & variables
│   ├── dashboard.css            # Dashboard specific layout & metrics styling
│   └── responsive.css           # Mobile & tablet drawer navigation and responsive breakpoints
├── js/
│   ├── app.js                   # Catalog rendering, live search, branch filters, upload & download handlers
│   ├── auth.js                  # College email validation, login, registration, session management
│   ├── db.js                    # Universal JSON database engine (LocalStorage + JSON persistence)
│   └── dashboard.js             # Dashboard controller: stats, upload table, bookmark management
├── data/
│   ├── initial-notes.json       # Seeded database with authentic CS, IT, AI, Math & Engineering notes
│   └── users.json               # Seeded student demo accounts
├── backend/                     # Optional Full-Stack Backends
│   ├── server.py                # Zero-dependency Python 3 server with REST API
│   ├── server.js                # Node.js + Express backend with file uploads & JWT
│   ├── package.json             # NPM dependencies (express, cors, multer, bcryptjs, jsonwebtoken)
│   └── models/
│       ├── User.js              # MongoDB Mongoose Schema for Student User
│       └── Note.js              # MongoDB Mongoose Schema for Course Note
├── assets/
│   ├── logo.svg                 # NoteX glassmorphic SVG icon
│   └── sample-notes/            # Authentic PDF notes ready for instant download testing
├── uploads/                     # Storage folder for uploaded documents
├── .gitignore                   # Standard gitignore (ignores node_modules, temp files)
└── README.md                    # Project documentation & GitHub deployment instructions
```

---

## 🚀 How to Run Locally

### Option 1: Open Directly in Your Browser (No Server Required)
Simply double-click `index.html` or drag it into Google Chrome, Microsoft Edge, Firefox, or Safari. The built-in JSON database engine will initialize and run automatically.

### Option 2: Run with Python (Standard Library)
Open your terminal inside the `notex` folder:
```bash
python backend/server.py
```
Open **`http://localhost:5000`** in your browser.

### Option 3: Run with Node.js & Express
```bash
cd backend
npm install
npm start
```

The Node.js server now uses MongoDB. Start MongoDB locally, or set `MONGODB_URI` in
`backend/.env` for MongoDB Atlas or another MongoDB deployment:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/notex
PORT=5000
JWT_SECRET=replace-with-a-long-random-secret
```

You can copy `backend/.env.example` to `backend/.env`. On first startup, the server
loads the existing seed notes and users into the `notex` MongoDB database.
Open **`http://localhost:5000`** in your browser.

---

## 🌐 How to Deploy on GitHub & Make It Live

You can host **NoteX** completely **free on GitHub Pages** in less than 2 minutes!

### Method A: Using Git CLI

1. **Open a terminal** inside the `notex` project folder:
   ```bash
   cd "C:\Users\Abrar Shariff\OneDrive\Documents\notex"
   ```

2. **Initialize Git repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: NoteX college notes exchange platform"
   ```

3. **Create a new GitHub Repository**:
   - Go to [https://github.com/new](https://github.com/new).
   - Enter Repository Name: `notex`.
   - Choose **Public**.
   - Do **NOT** check "Initialize with README" (you already have one).
   - Click **Create repository**.

4. **Push your code to GitHub**:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/notex.git
   git push -u origin main
   ```

5. **Enable GitHub Pages (Free Live Hosting)**:
   - On your GitHub repository page, click **Settings** (top right tab).
   - In the left sidebar, click **Pages** (under "Code and automation").
   - Under **Build and deployment** > **Branch**:
     - Select branch: **`main`**
     - Select folder: **`/ (root)`**
     - Click **Save**.
   - Wait 30–60 seconds. Refresh the page to see your live URL:
     ```text
     https://<YOUR_GITHUB_USERNAME>.github.io/notex/
     ```

---

### Method B: Uploading via GitHub Web Interface (No Git CLI needed)

If you do not have Git installed on your computer:
1. Go to [https://github.com/new](https://github.com/new) and create a repository named `notex`.
2. On the new repository page, click **"uploading an existing file"**.
3. Drag and drop all the files and folders from `notex` into the GitHub upload area:
   - `index.html`
   - `dashboard.html`
   - `css/`
   - `js/`
   - `data/`
   - `assets/`
   - `backend/`
   - `README.md`
4. Click **Commit changes**.
5. Go to **Settings > Pages** > select **main** branch > **Save**. Your site is now live!

---

## 🧪 Demo Test Accounts

| Full Name | College Email | Password | College Affiliation |
|---|---|---|---|
| **Alex Chen** | `alex.chen@stanford.edu` | `Password123!` | Stanford University |
| **Priya Sharma** | `priya.s@iitb.ac.in` | `Password123!` | IIT Bombay |
| **Marcus Vance** | `m.vance@mit.edu` | `Password123!` | MIT |

*(You can also register with your own college email address or use the 1-click demo login buttons in the Sign In modal!)*

---

## 🛡️ License
MIT License. Free for students and educators worldwide.
