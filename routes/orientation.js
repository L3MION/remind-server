const express = require('express');
const router = express.Router();
const Orientation = require('../models/Orientation');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { title, description, department, items } = req.body;
    const orientation = await Orientation.create({
      title,
      description,
      department: department || 'all',
      items: items || [],
    });
    res.status(201).json(orientation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const orientations = await Orientation.find({ isActive: true });
    res.json(orientations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const orientation = await Orientation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!orientation) {
      return res.status(404).json({ message: 'Orientation not found' });
    }
    res.json(orientation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/checklist', auth, authorize('intern'), async (req, res) => {
  try {
    const { checklist } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.orientationChecklist = checklist;
    user.orientationCompleted = checklist.every(item => item.completed);
    await user.save();

    const updated = await User.findById(user._id).populate('badges').populate('reportingManager', 'name email');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
