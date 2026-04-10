const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['intern', 'manager', 'admin'],
    default: 'intern',
  },
  department: {
    type: String,
    default: '',
  },
  phone: {
    type: String,
    default: '',
  },
  avatar: {
    type: String,
    default: '',
  },
  reportingManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' },
  },
  badges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Badge',
  }],
  orientationCompleted: {
    type: Boolean,
    default: false,
  },
  orientationChecklist: [{
    item: { type: String, required: true },
    completed: { type: Boolean, default: false },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  joiningDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
