/**
 * NoteX - Student Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const profileAvatar = document.getElementById('dashProfileAvatar');
  const profileName = document.getElementById('dashProfileName');
  const profileEmail = document.getElementById('dashProfileEmail');
  const profileCollege = document.getElementById('dashProfileCollege');
  const profileBranch = document.getElementById('dashProfileBranch');
  const profileSemester = document.getElementById('dashProfileSemester');
  const profileJoined = document.getElementById('dashProfileJoined');

  // Stats elements
  const statMyUploads = document.getElementById('dashStatUploads');
  const statMyDownloads = document.getElementById('dashStatDownloads');
  const statMyBookmarks = document.getElementById('dashStatBookmarks');
  const statMyKarma = document.getElementById('dashStatKarma');
  const badgeRank = document.getElementById('dashBadgeRank');

  // Containers
  const myUploadsTableBody = document.getElementById('myUploadsTableBody');
  const myBookmarksGrid = document.getElementById('myBookmarksGrid');
  const tabUploadsBadge = document.getElementById('tabUploadsBadge');
  const tabBookmarksBadge = document.getElementById('tabBookmarksBadge');

  // Initialize
  checkAuthAndInit();

  async function checkAuthAndInit() {
    await NoteXDB.init();
    let currentUser = NoteXAuth.getCurrentUser();

    if (!currentUser) {
      // Prompt user or switch to demo account for easy preview
      const users = NoteXDB.getUsers();
      if (users && users.length > 0) {
        // Auto-log in to first demo user if visiting directly
        await NoteXAuth.login(users[0].email, users[0].password);
        currentUser = NoteXAuth.getCurrentUser();
        window.showToast?.(`Logged in as demo student: ${currentUser.fullName}`, 'info');
      } else {
        window.location.href = 'index.html';
        return;
      }
    }

    renderProfile(currentUser);
    renderStats(currentUser);
    renderMyUploads(currentUser);
    renderBookmarks(currentUser);
    setupTabs();
    setupActions();
  }

  function renderProfile(user) {
    if (profileAvatar) {
      profileAvatar.src = user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.fullName)}`;
    }
    if (profileName) profileName.textContent = user.fullName;
    if (profileEmail) profileEmail.textContent = user.email;
    if (profileCollege) profileCollege.textContent = user.college || 'Verified University';
    if (profileBranch) profileBranch.textContent = user.branch || 'Engineering';
    if (profileSemester) profileSemester.textContent = `Semester ${user.semester || 1}`;
    if (profileJoined) profileJoined.textContent = `Joined ${user.joinedDate || '2026'}`;
  }

  function renderStats(user) {
    const stats = NoteXDB.getUserStats(user.email);
    if (statMyUploads) statMyUploads.textContent = stats.totalUploads;
    if (statMyDownloads) statMyDownloads.textContent = stats.totalDownloadsReceived;
    if (statMyBookmarks) statMyBookmarks.textContent = stats.totalBookmarks;
    if (statMyKarma) statMyKarma.textContent = stats.karmaPoints;
    if (badgeRank) badgeRank.textContent = stats.badge;

    if (tabUploadsBadge) tabUploadsBadge.textContent = stats.totalUploads;
    if (tabBookmarksBadge) tabBookmarksBadge.textContent = stats.totalBookmarks;
  }

  function renderMyUploads(user) {
    const myNotes = NoteXDB.getUserNotes(user.email);
    if (!myUploadsTableBody) return;

    if (myNotes.length === 0) {
      myUploadsTableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="dash-empty-state">
              <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <h3 class="empty-state-title">No Uploads Yet</h3>
              <p class="empty-state-text">You haven't shared any notes yet. Upload your handwritten notes, formula cheat sheets, or lab manuals to earn karma points!</p>
              <button class="btn btn-primary btn-sm trigger-upload-modal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Upload First Note
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    myUploadsTableBody.innerHTML = myNotes.map(note => `
      <tr data-note-id="${note.id}">
        <td>
          <div class="note-cell-title">
            <span class="file-type-chip">${note.fileType || 'PDF'}</span>
            <div>
              <div style="font-weight: 600; color: #fff;">${escapeHtml(note.title)}</div>
              <div style="font-size: 0.78rem; color: var(--text-dim);">${escapeHtml(note.fileName || 'document.pdf')}</div>
            </div>
          </div>
        </td>
        <td><span style="color: var(--neon-cyan); font-weight: 500;">${escapeHtml(note.subject)}</span> (${escapeHtml(note.courseCode || 'GEN')})</td>
        <td>Sem ${note.semester} • ${escapeHtml(note.branch)}</td>
        <td><span style="font-weight: 700; color: #fff;">${note.downloads || 0}</span> downloads</td>
        <td>${note.uploadDate || 'Recent'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-glass btn-sm action-download-btn" data-id="${note.id}" title="Download Note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
            <button class="btn-action-delete" data-id="${note.id}" title="Delete Note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Attach actions
    myUploadsTableBody.querySelectorAll('.action-download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const note = NoteXDB.getNoteById(id);
        if (note) triggerDownload(note);
      });
    });

    myUploadsTableBody.querySelectorAll('.btn-action-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this course material?')) {
          const res = await NoteXDB.deleteNote(id, user.email);
          if (res.success) {
            window.showToast?.('Note removed from your collection.', 'info');
            renderMyUploads(user);
            renderStats(user);
          } else {
            window.showToast?.(res.message, 'error');
          }
        }
      });
    });
  }

  function renderBookmarks(user) {
    const bookmarkedNotes = NoteXDB.getBookmarkedNotes(user.email);
    if (!myBookmarksGrid) return;

    if (bookmarkedNotes.length === 0) {
      myBookmarksGrid.innerHTML = `
        <div class="dash-empty-state glass-card" style="grid-column: 1 / -1;">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3 class="empty-state-title">No Saved Notes</h3>
          <p class="empty-state-text">You haven't bookmarked any notes yet. Browse the community catalog and click the bookmark icon to save materials for quick revision.</p>
          <a href="index.html" class="btn btn-primary btn-sm">Explore Notes Catalog</a>
        </div>
      `;
      return;
    }

    myBookmarksGrid.innerHTML = bookmarkedNotes.map(note => `
      <div class="note-card glass-card">
        <div class="note-top-meta">
          <span class="branch-badge">${note.branch}</span>
          <span class="semester-badge">Sem ${note.semester}</span>
        </div>
        <h3 class="note-title">${escapeHtml(note.title)}</h3>
        <div class="note-subject-tag">${escapeHtml(note.subject)}</div>
        <p class="note-description">${escapeHtml(note.description)}</p>
        <div style="font-size: 0.8rem; color: var(--neon-green); margin-bottom: 1rem;">
          🏫 ${escapeHtml(note.college)} • By ${escapeHtml(note.uploaderName)}
        </div>
        <div class="note-footer">
          <span style="font-size: 0.82rem; color: var(--text-dim);">${note.downloads || 0} downloads</span>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-primary btn-sm bookmark-download-btn" data-id="${note.id}">Download</button>
            <button class="btn btn-glass btn-sm remove-bookmark-btn" data-id="${note.id}">Remove</button>
          </div>
        </div>
      </div>
    `).join('');

    myBookmarksGrid.querySelectorAll('.bookmark-download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const note = NoteXDB.getNoteById(id);
        if (note) triggerDownload(note);
      });
    });

    myBookmarksGrid.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        await NoteXDB.toggleBookmark(id, user.email);
        window.showToast?.('Removed from saved bookmarks', 'info');
        renderBookmarks(user);
        renderStats(user);
      });
    });
  }

  function triggerDownload(note) {
    NoteXDB.incrementDownloads(note.id);
    const currentUser = NoteXAuth.getCurrentUser();
    renderStats(currentUser);

    window.showToast?.(`Downloading "${note.title}"...`, 'success');

    if (note.fileData) {
      const a = document.createElement('a');
      a.href = note.fileData;
      a.download = note.fileName || 'NoteX-Course-Notes.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (note.fileUrl) {
      const a = document.createElement('a');
      a.href = note.fileUrl;
      a.download = note.fileName || 'NoteX-Material.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const content = `=====================================================
NoteX Academic Exchange Portal
Title: ${note.title}
Subject: ${note.subject} (${note.courseCode})
Branch: ${note.branch} | Semester: ${note.semester}
Author: ${note.uploaderName} (${note.college})
=====================================================
${note.description}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title.replace(/[^a-zA-Z0-9]/g, '_')}_NoteX.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  function setupTabs() {
    const tabBtns = document.querySelectorAll('.dash-tab-btn');
    const tabUploads = document.getElementById('tabContentUploads');
    const tabBookmarks = document.getElementById('tabContentBookmarks');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const target = btn.getAttribute('data-target');
        if (target === 'uploads') {
          if (tabUploads) tabUploads.style.display = 'block';
          if (tabBookmarks) tabBookmarks.style.display = 'none';
        } else {
          if (tabUploads) tabUploads.style.display = 'none';
          if (tabBookmarks) tabBookmarks.style.display = 'block';
        }
      });
    });
  }

  function setupActions() {
    // Export DB button
    const exportBtn = document.getElementById('exportDbBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        NoteXDB.exportDatabase();
        window.showToast?.('Exporting NoteX JSON database backup...', 'success');
      });
    }

    // Reset DB button
    const resetBtn = document.getElementById('resetDbBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset NoteX database back to initial state with sample notes?')) {
          NoteXDB.resetToDefault();
          window.location.reload();
        }
      });
    }

    // Switch Account button (for quick testing)
    const switchAccountBtn = document.getElementById('switchAccountBtn');
    if (switchAccountBtn) {
      switchAccountBtn.addEventListener('click', async () => {
        const users = NoteXDB.getUsers();
        const currentUser = NoteXAuth.getCurrentUser();
        // Pick next user
        const nextUser = users.find(u => u.email !== currentUser.email) || users[0];
        await NoteXAuth.login(nextUser.email, nextUser.password);
        window.showToast?.(`Switched to student: ${nextUser.fullName} (${nextUser.college})`, 'info');
        setTimeout(() => window.location.reload(), 500);
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
