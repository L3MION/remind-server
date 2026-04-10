const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: () => new Date().setHours(0, 0, 0, 0),
  },
  punchIn: {
    time: { type: Date },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String, default: '' },
    },
  },
  punchOut: {
    time: { type: Date },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String, default: '' },
    },
  },
  totalHours: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['present', 'half-day', 'absent', 'on-leave'],
    default: 'present',
  },
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

attendanceSchema.methods.calculateTotalHours = function () {
  if (this.punchIn.time && this.punchOut.time) {
    const diff = this.punchOut.time - this.punchIn.time;
    this.totalHours = Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
  }
  return this.totalHours;
};

module.exports = mongoose.model('Attendance', attendanceSchema);
