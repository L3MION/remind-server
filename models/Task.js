const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'overdue'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  category: {
    type: String,
    default: 'Work',
  },
  dueDate: {
    type: Date,
    required: true,
  },
  completedAt: {
    type: Date,
  },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  attachments: [{
    name: { type: String },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  }],
  subTasks: [{
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Task', taskSchema);
