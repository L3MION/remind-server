const mongoose = require('mongoose');

const orientationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  department: {
    type: String,
    default: 'all',
  },
  items: [{
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['document', 'video', 'task', 'acknowledgment'], default: 'task' },
    link: { type: String, default: '' },
    order: { type: Number, default: 0 },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Orientation', orientationSchema);
