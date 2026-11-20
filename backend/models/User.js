const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  legacyId: {
    type: String,
    unique: true,
    sparse: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'College email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.(edu|ac\.[a-z]+|edu\.[a-z]+|[a-z0-9-]+\.[a-z]+)$/i,
      'Please provide a valid institutional / college mail ID'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  college: {
    type: String,
    required: true,
    trim: true
  },
  branch: {
    type: String,
    default: 'Computer Science'
  },
  semester: {
    type: Number,
    min: 1,
    max: 8,
    default: 1
  },
  avatar: {
    type: String,
    default: ''
  },
  bookmarks: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
