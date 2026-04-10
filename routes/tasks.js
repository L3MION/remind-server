const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { auth, authorize } = require('../middleware/auth');

router.post('/', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, priority, category, subTasks } = req.body;

    const task = await Task.create({
      title,
      description,
      assignedTo,
      assignedBy: req.user._id,
      dueDate,
      priority: priority || 'medium',
      category: category || 'Work',
      subTasks: subTasks || [],
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/assigned-to-me', auth, authorize('intern'), async (req, res) => {
  try {
    const { status, priority } = req.query;
    const filter = { assignedTo: req.user._id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter)
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/assigned-by-me', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { status, assignedTo } = req.query;
    const filter = { assignedBy: req.user._id };
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('comments.user', 'name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (req.user.role === 'intern' && task.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (req.user.role === 'intern' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
    }
    await task.save();

    const updated = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { title, description, dueDate, priority, category, subTasks } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.assignedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (dueDate) task.dueDate = dueDate;
    if (priority) task.priority = priority;
    if (category) task.category = category;
    if (subTasks) task.subTasks = subTasks;

    await task.save();
    const updated = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.comments.push({ user: req.user._id, text });
    await task.save();

    const updated = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('comments.user', 'name');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/subtasks/:subtaskIndex', auth, async (req, res) => {
  try {
    const { completed } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const idx = parseInt(req.params.subtaskIndex);
    if (idx < 0 || idx >= task.subTasks.length) {
      return res.status(400).json({ message: 'Invalid subtask index' });
    }

    task.subTasks[idx].completed = completed;

    const allDone = task.subTasks.every(st => st.completed);
    if (allDone && task.subTasks.length > 0) {
      task.status = 'completed';
      task.completedAt = new Date();
    }

    await task.save();
    const updated = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
