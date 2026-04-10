const express = require('express');
const router = express.Router();
const Badge = require('../models/Badge');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, description, icon, color, criteria, isAutoAward, autoAwardRule } = req.body;

    const badge = await Badge.create({
      name,
      description,
      icon: icon || '🏆',
      color: color || '#39FF14',
      criteria,
      isAutoAward: isAutoAward || false,
      autoAwardRule: autoAwardRule || {},
    });
    res.status(201).json(badge);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const badges = await Badge.find();
    res.json(badges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/award/:userId', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { badgeId } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const badge = await Badge.findById(badgeId);
    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }

    if (user.badges.includes(badgeId)) {
      return res.status(400).json({ message: 'Badge already awarded' });
    }

    user.badges.push(badgeId);
    await user.save();

    const updated = await User.findById(user._id).populate('badges').populate('reportingManager', 'name email');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:badgeId/user/:userId', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.badges = user.badges.filter(b => b.toString() !== req.params.badgeId);
    await user.save();

    const updated = await User.findById(user._id).populate('badges');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
