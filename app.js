/**
 * NoteX - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Current active filters
  const filters = {
    search: '',
    branch: 'All',
    semester: 'All',
    fileType: 'All',
    sortBy: 'newest'
  };

  // State
  let selectedUploadFile = null;

  // DOM Elements
  const notesGrid = document.getElementById('notesGrid');
  const notesCountBadge = document.getElementById('notesCountBadge');
  const searchInput = document.getElementById('searchInput');
  const branchPills = document.querySelectorAll('.branch-pill');
  const semesterFilter = document.getElementById('semesterFilter');
  const sortFilter = document.getElementById('sortFilter');
  
  // Hero stats elements
  const statTotalNotes = document.getElementById('statTotalNotes');
  const statTotalDownloads = document.getElementById('statTotalDownloads');
  const statTotalColleges = document.getElementById('statTotalColleges');

  // Modals
  const authModal = document.getElementById('authModal');
  const uploadModal = document.getElementById('uploadModal');
  const previewModal = document.getElementById('previewModal');

  // Nav
  const navAuthActions = document.getElementById('navAuthActions');
  const mobileToggle = document.getElementById('mobileNavToggle');
  const navLinks = document.getElementById('navLinks');

  // Initialize
  initApp();

  function initApp() {
    NoteXDB.init().then(() => {
      setupAuthUI();
      setupEventListeners();
      renderNotes();
      updateGlobalStats();
    });
  }

  // --------------------------------------------------------------------------
  // Authentication UI Sync
  // --------------------------------------------------------------------------
  function setupAuthUI() {
    const currentUser = NoteXAuth.getCurrentUser();
    if (currentUser) {
      navAuthActions.innerHTML = `
        <a href="dashboard.html" class="user-menu-pill">
          <img src="${currentUser.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(currentUser.fullName)}" class="user-avatar-tiny" alt="${currentUser.fullName}">
          <span class="user-pill-name">${currentUser.fullName.split(' ')[0]}</span>
        </a>
        <a href="dashboard.html" class="btn btn-primary btn-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          Dashboard
        </a>
        <button id="logoutBtn" class="btn btn-glass btn-sm" title="Log Out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      `;

      document.getElementById('logoutBtn')?.addEventListener('click', () => {
        NoteXAuth.logout();
      });
    } else {
      navAuthActions.innerHTML = `
        <button id="openLoginBtn" class="btn btn-glass btn-sm">Sign In</button>
        <button id="openRegisterBtn" class="btn btn-primary btn-sm">Student Sign Up</button>
      `;

      document.getElementById('openLoginBtn')?.addEventListener('click', () => openAuthModal('login'));
      document.getElementById('openRegisterBtn')?.addEventListener('click', () => openAuthModal('register'));
    }
  }

  // --------------------------------------------------------------------------
  // Notes Rendering
  // --------------------------------------------------------------------------
  function renderNotes() {
    const notes = NoteXDB.getNotes(filters);
    const currentUser = NoteXAuth.getCurrentUser();
    const bookmarks = (currentUser && currentUser.bookmarks) ? currentUser.bookmarks : [];

    if (notesCountBadge) {
      notesCountBadge.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'}`;
    }

    if (notes.length === 0) {
      notesGrid.innerHTML = `
        <div class="dash-empty-state glass-card" style="grid-column: 1 / -1;">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <h3 class="empty-state-title">No Notes Found</h3>
          <p class="empty-state-text">No course materials match your current search and filter criteria. Try adjusting your query or upload your own notes!</p>
          <button class="btn btn-primary" onclick="window.triggerUploadModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Upload Notes
          </button>
        </div>
      `;
      return;
    }

    notesGrid.innerHTML = notes.map(note => {
      const isBookmarked = bookmarks.includes(note.id);
      const tagsHtml = (note.tags || []).slice(0, 3).map(tag => `<span class="note-tag">#${tag}</span>`).join('');
      const uploaderInitial = note.uploaderName ? note.uploaderName.charAt(0).toUpperCase() : 'S';

      return `
        <div class="note-card glass-card" data-id="${note.id}">
          <div class="note-top-meta">
            <span class="branch-badge">${note.branch || 'General'}</span>
            <span class="semester-badge">Semester ${note.semester}</span>
          </div>

          <h3 class="note-title" title="${escapeHtml(note.title)}">${escapeHtml(note.title)}</h3>
          <div class="note-subject-tag">${escapeHtml(note.subject)} (${escapeHtml(note.courseCode || 'GEN')})</div>
          <p class="note-description">${escapeHtml(note.description)}</p>

          <div class="note-tags-wrap">${tagsHtml}</div>

          <div class="note-uploader-row">
            <div class="uploader-avatar">${uploaderInitial}</div>
            <div class="uploader-details">
              <div class="uploader-name">${escapeHtml(note.uploaderName)}</div>
              <div class="uploader-college">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                ${escapeHtml(note.college)}
              </div>
            </div>
            <button class="btn btn-icon btn-glass bookmark-btn ${isBookmarked ? 'active' : ''}" data-id="${note.id}" title="${isBookmarked ? 'Remove Bookmark' : 'Save Note'}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${isBookmarked ? 'var(--neon-cyan)' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            </button>
          </div>

          <div class="note-footer">
            <div class="note-stats-group">
              <span class="note-stat-item" title="Total Downloads">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                ${note.downloads || 0}
              </span>
              <span class="note-stat-item" title="File Size">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                ${note.fileSize || 'PDF'}
              </span>
            </div>

            <button class="btn btn-primary btn-sm preview-download-btn" data-id="${note.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              View & Download
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach card event listeners
    document.querySelectorAll('.preview-download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openPreviewModal(id);
      });
    });

    document.querySelectorAll('.bookmark-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-id');
        await handleBookmarkToggle(id);
      });
    });
  }

  // --------------------------------------------------------------------------
  // Update Hero Stats
  // --------------------------------------------------------------------------
  function updateGlobalStats() {
    const allNotes = NoteXDB.getNotes();
    const totalDownloads = allNotes.reduce((acc, curr) => acc + (curr.downloads || 0), 0);
    const collegesSet = new Set(allNotes.map(n => n.college).filter(Boolean));

    if (statTotalNotes) statTotalNotes.textContent = allNotes.length + '+';
    if (statTotalDownloads) statTotalDownloads.textContent = (totalDownloads > 1000 ? (totalDownloads/1000).toFixed(1) + 'k' : totalDownloads);
    if (statTotalColleges) statTotalColleges.textContent = Math.max(collegesSet.size, 12) + '+';
  }

  // --------------------------------------------------------------------------
  // Event Listeners (Search, Filter, Modals)
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // Search with debounce
    let searchTimeout;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          filters.search = e.target.value;
          renderNotes();
        }, 200);
      });
    }

    // Branch filter tabs
    branchPills.forEach(pill => {
      pill.addEventListener('click', () => {
        branchPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        filters.branch = pill.getAttribute('data-branch') || 'All';
        renderNotes();
      });
    });

    // Semester filter
    if (semesterFilter) {
      semesterFilter.addEventListener('change', (e) => {
        filters.semester = e.target.value;
        renderNotes();
      });
    }

    // Sort filter
    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        filters.sortBy = e.target.value;
        renderNotes();
      });
    }

    // Mobile nav toggle
    if (mobileToggle && navLinks) {
      mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
      });
    }

    // Modal Close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        closeAllModals();
      });
    });

    // Close on backdrop click
    [authModal, uploadModal, previewModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeAllModals();
        });
      }
    });

    // Upload triggers
    const triggerUploads = document.querySelectorAll('.trigger-upload-modal');
    triggerUploads.forEach(btn => {
      btn.addEventListener('click', () => {
        window.triggerUploadModal();
      });
    });

    // Setup Auth Forms
    setupAuthFormHandlers();

    // Setup Upload Form
    setupUploadFormHandlers();
  }

  // Global helper for opening upload modal with auth guard
  window.triggerUploadModal = function() {
    const user = NoteXAuth.getCurrentUser();
    if (!user) {
      showToast('Please sign in with your college mail ID to upload notes.', 'info');
      openAuthModal('login');
      return;
    }
    openUploadModal();
  };

  // --------------------------------------------------------------------------
  // Bookmark Handler
  // --------------------------------------------------------------------------
  async function handleBookmarkToggle(noteId) {
    const user = NoteXAuth.getCurrentUser();
    if (!user) {
      showToast('Sign in with your college email to bookmark notes.', 'info');
      openAuthModal('login');
      return;
    }

    const res = await NoteXDB.toggleBookmark(noteId, user.email);
    if (res && res.success) {
      showToast(res.bookmarked ? 'Note saved to your bookmarks!' : 'Bookmark removed.', 'info');
      renderNotes();
    }
  }

  // --------------------------------------------------------------------------
  // Preview & Download Modal
  // --------------------------------------------------------------------------
  function openPreviewModal(noteId) {
    const note = NoteXDB.getNoteById(noteId);
    if (!note) return;

    const modalBody = document.getElementById('previewModalBody');
    const downloadBtn = document.getElementById('modalDownloadBtn');

    modalBody.innerHTML = `
      <div style="display: flex; gap: 1.5rem; flex-direction: column;">
        <div>
          <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span class="branch-badge">${note.branch}</span>
            <span class="semester-badge">Semester ${note.semester}</span>
            <span class="semester-badge">${note.courseCode}</span>
          </div>
          <h2 style="font-size: 1.4rem; color: #fff; margin-bottom: 0.4rem;">${escapeHtml(note.title)}</h2>
          <div style="color: var(--neon-purple); font-weight: 500; font-size: 0.95rem;">${escapeHtml(note.subject)}</div>
        </div>

        <!-- Simulated Document Preview Frame -->
        <div style="background: rgba(10, 14, 23, 0.7); border: 1px solid var(--glass-border); border-radius: var(--radius-md); padding: 1.5rem; max-height: 250px; overflow-y: auto;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 0.75rem; margin-bottom: 1rem;">
            <div style="font-size: 0.85rem; color: var(--neon-cyan); display: flex; align-items: center; gap: 0.4rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              ${escapeHtml(note.fileName || 'course-notes.pdf')}
            </div>
            <span style="font-size: 0.75rem; color: var(--text-dim);">${note.pages || 24} Pages • ${note.fileSize || '3 MB'}</span>
          </div>
          <p style="font-size: 0.9rem; line-height: 1.7; color: var(--text-muted);">${escapeHtml(note.description)}</p>
          <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(0, 242, 254, 0.05); border-left: 3px solid var(--neon-cyan); border-radius: 4px; font-size: 0.82rem; color: #cbd5e1;">
            💡 <strong>Verified Academic Note:</strong> Thoroughly reviewed for syllabus completeness, derivations, formula sheets, and solved previous year questions.
          </div>
        </div>

        <!-- Uploader & Verification Badge -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255, 255, 255, 0.03); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--glass-border);">
          <div>
            <div style="font-size: 0.82rem; color: var(--text-dim);">Contributed by</div>
            <div style="font-weight: 700; color: #fff;">${escapeHtml(note.uploaderName)}</div>
            <div style="font-size: 0.8rem; color: var(--neon-green);">${escapeHtml(note.college)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.82rem; color: var(--text-dim);">Total Downloads</div>
            <div id="modalDownloadCountDisplay" style="font-size: 1.2rem; font-weight: 800; color: var(--neon-cyan);">${note.downloads || 0}</div>
          </div>
        </div>
      </div>
    `;

    // Download action
    downloadBtn.onclick = () => {
      triggerNoteDownload(note);
    };

    previewModal.classList.add('active');
  }

  async function triggerNoteDownload(note) {
    // 1. Increment counter in database
    const newCount = await NoteXDB.incrementDownloads(note.id);
    const countDisplay = document.getElementById('modalDownloadCountDisplay');
    if (countDisplay) countDisplay.textContent = newCount;
    
    // Refresh background list count
    renderNotes();
    updateGlobalStats();

    showToast(`Downloading "${note.title}"...`, 'success');

    // 2. Perform actual download
    if (note.fileData) {
      // User uploaded custom file (base64)
      const a = document.createElement('a');
      a.href = note.fileData;
      a.download = note.fileName || 'NoteX-Material.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (note.fileUrl) {
      // Sample file from assets
      const a = document.createElement('a');
      a.href = note.fileUrl;
      a.download = note.fileName || 'NoteX-Course-Notes.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Synthesize formatted note document blob
      const content = `=====================================================
NoteX Academic Exchange Portal
Title: ${note.title}
Subject: ${note.subject} (${note.courseCode})
Branch: ${note.branch} | Semester: ${note.semester}
Author: ${note.uploaderName} (${note.college})
Uploaded Date: ${note.uploadDate}
=====================================================

DESCRIPTION & STUDY GUIDE:
${note.description}

TAGS:
${(note.tags || []).join(', ')}

-----------------------------------------------------
Note: This material was shared on NoteX for student peer learning.
Visit NoteX: https://github.com/your-username/notex
=====================================================`;

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

  // --------------------------------------------------------------------------
  // Upload Modal & File Handling
  // --------------------------------------------------------------------------
  function openUploadModal() {
    selectedUploadFile = null;
    const dropzone = document.getElementById('fileDropzone');
    const preview = document.getElementById('selectedFilePreview');
    const uploadForm = document.getElementById('uploadNoteForm');
    
    if (dropzone) dropzone.style.display = 'block';
    if (preview) preview.style.display = 'none';
    if (uploadForm) uploadForm.reset();

    uploadModal.classList.add('active');
  }

  function setupUploadFormHandlers() {
    const dropzone = document.getElementById('fileDropzone');
    const fileInput = document.getElementById('noteFileInput');
    const preview = document.getElementById('selectedFilePreview');
    const fileNameDisplay = document.getElementById('previewFileName');
    const removeFileBtn = document.getElementById('removeSelectedFileBtn');
    const uploadForm = document.getElementById('uploadNoteForm');

    if (!dropzone || !fileInput) return;

    // Dropzone events
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    if (removeFileBtn) {
      removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedUploadFile = null;
        fileInput.value = '';
        dropzone.style.display = 'block';
        preview.style.display = 'none';
      });
    }

    function handleFileSelect(file) {
      selectedUploadFile = file;
      fileNameDisplay.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
      dropzone.style.display = 'none';
      preview.style.display = 'flex';
    }

    // Submit upload form
    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentUser = NoteXAuth.getCurrentUser();
        if (!currentUser) {
          showToast('Session expired. Please sign in again.', 'error');
          openAuthModal('login');
          return;
        }

        const title = document.getElementById('uploadTitle').value.trim();
        const subject = document.getElementById('uploadSubject').value.trim();
        const courseCode = document.getElementById('uploadCourseCode').value.trim() || 'GEN101';
        const branch = document.getElementById('uploadBranch').value;
        const semester = document.getElementById('uploadSemester').value;
        const tagsInput = document.getElementById('uploadTags').value;
        const description = document.getElementById('uploadDescription').value.trim();

        if (!title || !subject) {
          showToast('Please fill in the title and subject.', 'error');
          return;
        }

        let fileDataUrl = null;
        let fileName = 'course-notes.pdf';
        let fileSize = '1.8 MB';
        let fileType = 'PDF';

        if (selectedUploadFile) {
          fileName = selectedUploadFile.name;
          fileSize = (selectedUploadFile.size / (1024 * 1024)).toFixed(1) + ' MB';
          const ext = fileName.split('.').pop().toUpperCase();
          fileType = ext.length <= 4 ? ext : 'PDF';

          // Convert file to Base64 for persistent browser storage
          try {
            fileDataUrl = await readFileAsBase64(selectedUploadFile);
          } catch (err) {
            console.error('Error reading file:', err);
          }
        }

        const tags = tagsInput
          ? tagsInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
          : [branch, subject];

        const newNote = await NoteXDB.addNote({
          title,
          subject,
          courseCode,
          branch,
          semester,
          tags,
          description,
          fileType,
          fileSize,
          fileName,
          fileData: fileDataUrl,
          uploaderName: currentUser.fullName,
          uploaderEmail: currentUser.email,
          college: currentUser.college
        });

        closeAllModals();
        showToast('🎉 Course material uploaded successfully!', 'success');
        renderNotes();
        updateGlobalStats();
      });
    }
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  // --------------------------------------------------------------------------
  // Auth Modal & College Email Validation
  // --------------------------------------------------------------------------
  function openAuthModal(tab = 'login') {
    switchAuthTab(tab);
    authModal.classList.add('active');
  }

  function switchAuthTab(tab) {
    const tabBtns = document.querySelectorAll('.auth-tab-btn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    tabBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });

    if (tab === 'login') {
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    } else {
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    }
  }

  function setupAuthFormHandlers() {
    // Tab switching
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        switchAuthTab(e.currentTarget.getAttribute('data-tab'));
      });
    });

    // Real-time college email feedback
    const regEmailInput = document.getElementById('regEmail');
    const feedbackPill = document.getElementById('regEmailFeedback');
    const detectedCollegeDisplay = document.getElementById('detectedCollegeDisplay');

    if (regEmailInput && feedbackPill) {
      regEmailInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (!val) {
          feedbackPill.className = 'email-feedback-pill';
          feedbackPill.textContent = '';
          if (detectedCollegeDisplay) detectedCollegeDisplay.value = '';
          return;
        }

        const check = NoteXAuth.validateCollegeEmail(val);
        if (check.valid) {
          feedbackPill.className = 'email-feedback-pill valid';
          feedbackPill.innerHTML = `✓ Verified College Domain (${check.detectedCollege})`;
          if (detectedCollegeDisplay) detectedCollegeDisplay.value = check.detectedCollege;
        } else {
          feedbackPill.className = 'email-feedback-pill invalid';
          feedbackPill.innerHTML = `⚠ ${check.reason}`;
        }
      });
    }

    // Demo account quick login chips
    document.querySelectorAll('.demo-click-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const email = chip.getAttribute('data-email');
        const pass = chip.getAttribute('data-pass');
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = pass;
        showToast(`Auto-filled: ${email}`, 'info');
      });
    });

    // Login Form Submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;

        const res = await NoteXAuth.login(email, pass);
        if (res && res.success) {
          closeAllModals();
          showToast(`Welcome back, ${res.user.fullName}!`, 'success');
          setupAuthUI();
          renderNotes();
        } else {
          showToast((res && res.message) || 'Invalid email or password.', 'error');
        }
      });
    }

    // Register Form Submit
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const branch = document.getElementById('regBranch').value;
        const semester = document.getElementById('regSemester').value;
        const college = document.getElementById('detectedCollegeDisplay')?.value;

        const res = await NoteXAuth.register({ fullName, email, password, branch, semester, college });
        if (res && res.success) {
          closeAllModals();
          showToast(`🎉 Student account created! Welcome to NoteX, ${fullName}`, 'success');
          setupAuthUI();
          renderNotes();
        } else {
          showToast((res && res.message) || 'Failed to create account.', 'error');
        }
      });
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  function closeAllModals() {
    [authModal, uploadModal, previewModal].forEach(m => {
      if (m) m.classList.remove('active');
    });
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

  // Global Toast function
  window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--neon-green)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--neon-pink)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    } else {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <span style="font-size: 0.92rem; font-weight: 500;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  };
});
