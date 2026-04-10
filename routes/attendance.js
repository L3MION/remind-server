const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { auth, authorize } = require('../middleware/auth');

router.post('/punch-in', auth, authorize('intern'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({ user: req.user._id, date: today });
    if (existing && existing.punchIn.time) {
      return res.status(400).json({ message: 'Already punched in today' });
    }

    const { latitude, longitude, address } = req.body;

    const attendance = await Attendance.findOneAndUpdate(
      { user: req.user._id, date: today },
      {
        punchIn: {
          time: new Date(),
          location: { latitude, longitude, address: address || '' },
        },
        status: 'present',
      },
      { upsert: true, new: true }
    );

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/punch-out', auth, authorize('intern'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ user: req.user._id, date: today });
    if (!attendance || !attendance.punchIn.time) {
      return res.status(400).json({ message: 'Must punch in first' });
    }
    if (attendance.punchOut.time) {
      return res.status(400).json({ message: 'Already punched out today' });
    }

    const { latitude, longitude, address } = req.body;

    attendance.punchOut = {
      time: new Date(),
      location: { latitude, longitude, address: address || '' },
    };
    attendance.calculateTotalHours();

    const workHours = req.user.workingHours;
    const [startH, startM] = workHours.start.split(':').map(Number);
    const [endH, endM] = workHours.end.split(':').map(Number);
    const requiredHours = (endH + endM / 60) - (startH + startM / 60);
    if (attendance.totalHours < requiredHours / 2) {
      attendance.status = 'half-day';
    }

    await attendance.save();
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const userId = req.user.role === 'intern' ? req.user._id : req.query.userId;

    const attendance = await Attendance.findOne({ user: userId, date: today }).populate('user', 'name');
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const { month, year, userId } = req.query;
    const targetUserId = userId ? String(userId) : String(req.user._id);

    if (req.user.role !== 'admin' && req.user.role !== 'manager' && targetUserId !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);

    const records = await Attendance.find({
      user: targetUserId,
      date: { $gte: startDate, $lte: endDate },
    }).populate('user', 'name').sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/team', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const User = require('../models/User');
    const filter = req.user.role === 'manager' ? { reportingManager: req.user._id } : {};
    const teamMembers = await User.find(filter).select('_id name');

    const records = await Attendance.find({
      user: { $in: teamMembers.map(m => m._id) },
      date: today,
    }).populate('user', 'name department');

    const result = teamMembers.map(member => {
      const record = records.find(r => r.user._id.toString() === member._id.toString());
      return {
        user: member,
        attendance: record || null,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
