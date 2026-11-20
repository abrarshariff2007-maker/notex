require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('./models/User');
const Note = require('./models/Note');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'notex_super_secret_jwt_key_2026';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/notex';

const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const STATIC_DIR = path.join(__dirname, '..');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(STATIC_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, suffix + '-' + file.originalname.replace(/\s+/g, '_'));
    }
  }),
  limits: { fileSize: 30 * 1024 * 1024 }
});

function readSeed(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf8'));
}

function publicUser(user) {
  const data = user.toObject ? user.toObject() : { ...user };
  delete data.password;
  delete data._id;
  delete data.__v;
  return {
    id: data.legacyId,
    fullName: data.fullName,
    email: data.email,
    college: data.college,
    branch: data.branch,
    semester: data.semester,
    joinedDate: data.createdAt ? data.createdAt.toISOString().slice(0, 10) : data.joinedDate,
    avatar: data.avatar,
    bookmarks: data.bookmarks || []
  };
}

function publicNote(note) {
  const data = note.toObject ? note.toObject() : { ...note };
  return {
    id: data.legacyId,
    title: data.title,
    subject: data.subject,
    courseCode: data.courseCode,
    branch: data.branch,
    semester: data.semester,
    fileType: data.fileType,
    fileSize: data.fileSize,
    fileName: data.fileName,
    fileUrl: data.fileUrl,
    description: data.description,
    tags: data.tags,
    uploaderName: data.uploaderName,
    uploaderEmail: data.uploaderEmail,
    college: data.college,
    downloads: data.downloads,
    likes: data.likes,
    uploadDate: data.createdAt ? data.createdAt.toISOString().slice(0, 10) : '',
    pages: data.pages
  };
}

async function seedDatabase() {
  if (await Note.countDocuments() === 0) {
    const notes = readSeed('initial-notes.json');
    await Note.insertMany(notes.map(note => ({
      legacyId: note.id,
      title: note.title,
      subject: note.subject,
      courseCode: note.courseCode,
      branch: note.branch,
      semester: note.semester,
      fileType: note.fileType,
      fileSize: note.fileSize,
      fileName: note.fileName,
      fileUrl: note.fileUrl,
      description: note.description,
      tags: note.tags,
      uploaderName: note.uploaderName,
      uploaderEmail: note.uploaderEmail,
      college: note.college,
      downloads: note.downloads,
      likes: note.likes,
      pages: note.pages,
      createdAt: new Date(note.uploadDate)
    })));
  }

  if (await User.countDocuments() === 0) {
    const users = readSeed('users.json');
    await User.insertMany(await Promise.all(users.map(async user => ({
      legacyId: user.id,
      fullName: user.fullName,
      email: user.email,
      password: await bcrypt.hash(user.password, 10),
      college: user.college,
      branch: user.branch,
      semester: user.semester,
      avatar: user.avatar,
      bookmarks: user.bookmarks || [],
      createdAt: new Date(user.joinedDate)
    }))));
  }
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (_) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function isCollegeEmail(email) {
  const generic = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase();
  return !generic.includes(domain) &&
    (domain.endsWith('.edu') || domain.includes('.ac.') || domain.includes('.edu.') || domain.endsWith('.res.in'));
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, branch, semester, college } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required' });
    }
    if (!isCollegeEmail(email)) {
      return res.status(400).json({ message: 'Must be an institutional or college email (.edu, .ac.in, etc.)' });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({ message: 'Account already exists for this email.' });
    }

    const user = await User.create({
      legacyId: 'user-' + Date.now(),
      fullName,
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      college: college || 'University Campus',
      branch: branch || 'Computer Science',
      semester: Number(semester) || 1,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fullName)}`
    });
    const token = jwt.sign({ id: user.legacyId, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, token, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }
    const token = jwt.sign({ id: user.legacyId, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({});
  res.json(users.map(publicUser));
});

app.get('/api/notes', async (req, res) => {
  const { search, branch, semester, sortBy } = req.query;
  const filter = {};
  if (branch && branch !== 'All') filter.branch = branch;
  if (semester && semester !== 'All') filter.semester = Number(semester);
  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { title: regex }, { subject: regex }, { courseCode: regex },
      { college: regex }, { description: regex }, { tags: regex }
    ];
  }
  const sort = sortBy === 'downloads' ? { downloads: -1 } : { createdAt: -1 };
  const notes = await Note.find(filter).sort(sort);
  res.json(notes.map(publicNote));
});

app.post('/api/notes/upload', upload.single('noteFile'), async (req, res) => {
  try {
    const body = req.body;
    const note = await Note.create({
      legacyId: 'note-' + Date.now(),
      title: body.title || 'Untitled Course Material',
      subject: body.subject || 'General Subject',
      courseCode: body.courseCode || 'GEN101',
      branch: body.branch || 'Computer Science',
      semester: Number(body.semester) || 1,
      fileType: req.file ? path.extname(req.file.originalname).replace('.', '').toUpperCase() : 'PDF',
      fileSize: req.file ? `${(req.file.size / (1024 * 1024)).toFixed(1)} MB` : '1.8 MB',
      fileName: req.file ? req.file.originalname : 'course-notes.pdf',
      fileUrl: req.file ? `/uploads/${req.file.filename}` : 'assets/sample-notes/dsa-handwritten-notes.pdf',
      description: body.description || '',
      tags: typeof body.tags === 'string' ? body.tags.split(',').map(tag => tag.trim()) : (body.tags || []),
      uploaderName: body.uploaderName || 'Student Scholar',
      uploaderEmail: body.uploaderEmail || 'scholar@university.edu',
      college: body.college || 'University Campus'
    });
    res.status(201).json({ success: true, note: publicNote(note) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const body = req.body;
    const note = await Note.create({
      ...body,
      legacyId: 'note-' + Date.now(),
      semester: Number(body.semester) || 1,
      tags: body.tags || []
    });
    res.status(201).json({ success: true, note: publicNote(note) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  const note = await Note.findOneAndDelete({ legacyId: req.params.id });
  if (!note) return res.status(404).json({ message: 'Note not found' });
  await User.updateMany({}, { $pull: { bookmarks: req.params.id } });
  res.json({ success: true });
});

app.get('/api/notes/:id/download', async (req, res) => {
  const note = await Note.findOne({ legacyId: req.params.id });
  if (!note) return res.status(404).json({ message: 'Note not found' });
  note.downloads = (note.downloads || 0) + 1;
  await note.save();

  if (note.fileUrl && fs.existsSync(path.join(STATIC_DIR, note.fileUrl))) {
    return res.download(path.join(STATIC_DIR, note.fileUrl), note.fileName);
  }
  const fallback = path.join(STATIC_DIR, 'assets', 'sample-notes', 'dsa-handwritten-notes.pdf');
  if (fs.existsSync(fallback)) return res.download(fallback, note.fileName || 'NoteX_Course_Material.pdf');
  res.json({ success: true, downloads: note.downloads });
});

app.post('/api/bookmarks/:email/:noteId', async (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase();
  const noteId = decodeURIComponent(req.params.noteId);
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const existing = user.bookmarks.includes(noteId);
  if (existing) user.bookmarks = user.bookmarks.filter(id => id !== noteId);
  else user.bookmarks.push(noteId);
  await user.save();
  res.json({ success: true, bookmarked: !existing });
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    await seedDatabase();
    app.listen(PORT, () => {
      console.log('===============================================');
      console.log('NoteX MongoDB server started');
      console.log(`Local URL: http://localhost:${PORT}`);
      console.log(`Database: ${mongoose.connection.name}`);
      console.log('===============================================');
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

start();
