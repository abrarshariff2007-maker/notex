/**
 * NoteX Universal Database Client
 * Supports dual-mode persistence:
 * 1. Full-stack mode: Connects to NoteX REST API & SQLite / MongoDB backend.
 * 2. Static / GitHub Pages mode: Seamless fallback to LocalStorage & static JSON seed data.
 */

const NoteXDB = (() => {
  const STORAGE_KEYS = {
    NOTES: "notex_sqlite_notes",
    USERS: "notex_sqlite_users",
    ACTIVE_USER: "notex_current_user_v1"
  };

  let notes = [];
  let users = [];
  let readyPromise = null;

  function getRaw(key, fallback = []) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function setRaw(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("[NoteXDB] LocalStorage save failed", e);
    }
  }

  async function init() {
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      let loadedFromApi = false;
      try {
        const [notesResponse, usersResponse] = await Promise.all([
          fetch("/api/notes"),
          fetch("/api/users")
        ]);
        if (notesResponse.ok && usersResponse.ok) {
          notes = await notesResponse.json();
          users = await usersResponse.json();
          loadedFromApi = true;
          setRaw(STORAGE_KEYS.NOTES, notes);
          setRaw(STORAGE_KEYS.USERS, users);
        }
      } catch (error) {
        // Expected when hosted statically (e.g. GitHub Pages)
      }

      if (!loadedFromApi) {
        notes = getRaw(STORAGE_KEYS.NOTES, []);
        users = getRaw(STORAGE_KEYS.USERS, []);

        if (notes.length === 0 || users.length === 0) {
          try {
            const [nRes, uRes] = await Promise.all([
              fetch("data/initial-notes.json"),
              fetch("data/users.json")
            ]);
            if (nRes.ok && notes.length === 0) notes = await nRes.json();
            if (uRes.ok && users.length === 0) users = await uRes.json();
            setRaw(STORAGE_KEYS.NOTES, notes);
            setRaw(STORAGE_KEYS.USERS, users);
          } catch (e) {
            console.warn("[NoteXDB] Could not load seed data", e);
          }
        }
      }
      return true;
    })();
    return readyPromise;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Database request failed");
    return payload;
  }

  function refreshCaches() {
    setRaw(STORAGE_KEYS.NOTES, notes);
    setRaw(STORAGE_KEYS.USERS, users);
  }

  return {
    init,
    getNotes(filters = {}) {
      let result = [...notes];
      if (filters.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(n =>
          `${n.title} ${n.subject} ${n.courseCode} ${n.college} ${n.description || ""}`
            .toLowerCase().includes(q) ||
          (n.tags || []).some(t => t.toLowerCase().includes(q)));
      }
      if (filters.branch && filters.branch !== "All")
        result = result.filter(n => n.branch.toLowerCase() === filters.branch.toLowerCase());
      if (filters.semester && filters.semester !== "All")
        result = result.filter(n => String(n.semester) === String(filters.semester));
      if (filters.fileType && filters.fileType !== "All")
        result = result.filter(n => (n.fileType || "").toLowerCase() === filters.fileType.toLowerCase());
      if (filters.sortBy === "popular" || filters.sortBy === "downloads")
        result.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
      else
        result.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      return result;
    },
    getNoteById(id) {
      return notes.find(n => n.id === id) || null;
    },
    async addNote(noteData) {
      try {
        const payload = await api("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(noteData)
        });
        notes.unshift(payload.note);
        refreshCaches();
        return payload.note;
      } catch (error) {
        // Fallback for GitHub Pages / offline mode
        const newNote = {
          ...noteData,
          id: noteData.id || "note-" + Date.now(),
          uploadDate: noteData.uploadDate || new Date().toISOString().split("T")[0],
          downloads: 0,
          likes: 1,
          pages: noteData.pages || 20
        };
        notes.unshift(newNote);
        refreshCaches();
        return newNote;
      }
    },
    async deleteNote(id, userEmail) {
      const note = notes.find(n => n.id === id);
      if (!note || note.uploaderEmail.toLowerCase() !== userEmail.toLowerCase())
        return { success: false, message: "Unauthorized to delete this note" };
      try {
        await api(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch (error) {
        // Fallback for GitHub Pages / offline mode
      }
      notes = notes.filter(n => n.id !== id);
      refreshCaches();
      return { success: true, message: "Note deleted successfully" };
    },
    async incrementDownloads(id) {
      try {
        await fetch(`/api/notes/${encodeURIComponent(id)}/download`);
      } catch (e) {}
      const note = notes.find(n => n.id === id);
      if (note) note.downloads = (note.downloads || 0) + 1;
      refreshCaches();
      return note ? note.downloads : 0;
    },
    toggleLike(id) {
      const note = notes.find(n => n.id === id);
      if (note) note.likes = (note.likes || 0) + 1;
      refreshCaches();
      return note ? note.likes : 0;
    },
    getUserNotes(email) {
      return notes.filter(n => n.uploaderEmail.toLowerCase() === email.toLowerCase());
    },
    getBookmarkedNotes(email) {
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return [];
      return notes.filter(n => (user.bookmarks || []).includes(n.id));
    },
    async toggleBookmark(noteId, email) {
      let bookmarked = false;
      try {
        const payload = await api(
          `/api/bookmarks/${encodeURIComponent(email.toLowerCase())}/${encodeURIComponent(noteId)}`,
          { method: "POST" });
        bookmarked = payload.bookmarked;
      } catch (error) {
        // Fallback for GitHub Pages / offline mode
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        const hasBookmark = user && (user.bookmarks || []).includes(noteId);
        bookmarked = !hasBookmark;
      }

      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        user.bookmarks = user.bookmarks || [];
        const index = user.bookmarks.indexOf(noteId);
        if (bookmarked && index === -1) user.bookmarks.push(noteId);
        if (!bookmarked && index !== -1) user.bookmarks.splice(index, 1);
      }
      const active = getRaw(STORAGE_KEYS.ACTIVE_USER, null);
      if (active && active.email.toLowerCase() === email.toLowerCase())
        active.bookmarks = user ? user.bookmarks : [];
      setRaw(STORAGE_KEYS.ACTIVE_USER, active);
      refreshCaches();
      return { success: true, bookmarked };
    },
    getUsers() {
      return users;
    },
    getUserByEmail(email) {
      return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    },
    async registerUser(userData) {
      try {
        const payload = await api("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData)
        });
        users.push(payload.user);
        refreshCaches();
        return payload;
      } catch (error) {
        // Fallback for GitHub Pages / offline mode
        const existing = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
        if (existing) {
          throw new Error("An account already exists with this college email address.");
        }
        const newUser = {
          id: "user-" + Date.now(),
          fullName: userData.fullName,
          email: userData.email.toLowerCase(),
          password: userData.password,
          college: userData.college,
          branch: userData.branch,
          semester: userData.semester,
          joinedDate: new Date().toISOString().split("T")[0],
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          bookmarks: []
        };
        users.push(newUser);
        refreshCaches();
        return { success: true, user: newUser };
      }
    },
    async loginUser(email, password) {
      try {
        const payload = await api("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const existing = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
        if (existing >= 0) users[existing] = payload.user;
        else users.push(payload.user);
        refreshCaches();
        return payload;
      } catch (error) {
        // Fallback for GitHub Pages / offline mode
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!existingUser) {
          throw new Error("No student account found with this college email.");
        }
        if (existingUser.password && existingUser.password !== password) {
          throw new Error("Invalid password.");
        }
        return { success: true, user: existingUser };
      }
    },
    async updateUser(email, updatedData) {
      const emailLower = (email || "").toLowerCase();
      let updatedUser = null;
      try {
        const payload = await api(`/api/users/${encodeURIComponent(emailLower)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedData)
        });
        if (payload.user) updatedUser = payload.user;
      } catch (error) {
        // Fallback for GitHub Pages / offline mode
      }

      const idx = users.findIndex(u => u.email.toLowerCase() === emailLower);
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...(updatedUser || updatedData) };
        updatedUser = users[idx];
      } else if (!updatedUser) {
        updatedUser = { email: emailLower, ...updatedData };
        users.push(updatedUser);
      }

      const active = getRaw(STORAGE_KEYS.ACTIVE_USER, null);
      if (active && active.email.toLowerCase() === emailLower) {
        const safeActive = { ...active, ...updatedUser };
        delete safeActive.password;
        setRaw(STORAGE_KEYS.ACTIVE_USER, safeActive);
      }

      refreshCaches();
      return { success: true, user: updatedUser };
    },
    getUserStats(email) {
      const myNotes = this.getUserNotes(email);
      const user = this.getUserByEmail(email);
      const downloads = myNotes.reduce((sum, n) => sum + (n.downloads || 0), 0);
      const likes = myNotes.reduce((sum, n) => sum + (n.likes || 0), 0);
      const karmaPoints = myNotes.length * 50 + downloads * 5 + likes * 10;
      let badge = "Novice Scholar";
      if (karmaPoints > 2000) badge = "Master Contributor";
      else if (karmaPoints > 1000) badge = "Senior Note Maker";
      else if (karmaPoints > 400) badge = "Dean's Scholar";
      else if (karmaPoints > 100) badge = "Active Peer";
      return {
        totalUploads: myNotes.length,
        totalDownloadsReceived: downloads,
        totalLikesReceived: likes,
        totalBookmarks: user ? (user.bookmarks || []).length : 0,
        karmaPoints,
        badge
      };
    },
    getActiveUser() {
      return getRaw(STORAGE_KEYS.ACTIVE_USER, null);
    },
    setActiveUser(user) {
      if (!user) localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
      else {
        const safe = { ...user };
        delete safe.password;
        setRaw(STORAGE_KEYS.ACTIVE_USER, safe);
      }
    },
    exportDatabase() {
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), notes, users }, null, 2)],
        { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "notex-database.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    resetToDefault() {
      window.location.reload();
    }
  };
})();

window.NoteXDB = NoteXDB;
