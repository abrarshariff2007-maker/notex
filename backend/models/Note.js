const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  legacyId: {
    type: String,
    unique: true,
    sparse: true
  },
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  courseCode: {
    type: String,
    trim: true,
    default: 'GEN101'
  },
  branch: {
    type: String,
    required: true,
    enum: ['Computer Science', 'Information Technology', 'Artificial Intelligence', 'Mechanical', 'Electronics', 'Civil', 'General Engineering', 'Other']
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  fileType: {
    type: String,
    default: 'PDF'
  },
  fileSize: {
    type: String,
    default: '2.0 MB'
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploaderName: {
    type: String,
    required: true
  },
  uploaderEmail: {
    type: String,
    required: true
  },
  college: {
    type: String,
    required: true
  },
  downloads: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 1
  },
  pages: {
    type: Number,
    default: 20
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Note', NoteSchema);
