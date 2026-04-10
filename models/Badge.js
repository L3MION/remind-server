const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '🏆',
  },
  color: {
    type: String,
    default: '#39FF14',
  },
  criteria: {
    type: String,
    default: '',
  },
  isAutoAward: {
    type: Boolean,
    default: false,
  },
  autoAwardRule: {
    type: { type: String, enum: ['attendance', 'tasks', 'punctuality', 'custom'] },
    threshold: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Badge', badgeSchema);
