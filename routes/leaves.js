const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const { auth, authorize } = require('../middleware/auth');

router.post('/', auth, authorize('intern'), async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const leave = await Leave.create({
      applicant: req.user._id,
      leaveType,
      startDate,
      endDate,
      reason,
    });

    const populated = await Leave.findById(leave._id)
      .populate('applicant', 'name email department');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my-leaves', auth, authorize('intern'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { applicant: req.user._id };
    if (status) filter.status = status;

    const leaves = await Leave.find(filter)
      .populate('applicant', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/pending', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const filter = { status: 'pending' };

    if (req.user.role === 'manager') {
      const interns = await User.find({ reportingManager: req.user._id }).select('_id');
      filter.applicant = { $in: interns.map(i => i._id) };
    }

    const leaves = await Leave.find(filter)
      .populate('applicant', 'name email department')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/review', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { status, reviewComment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Leave already reviewed' });
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewComment = reviewComment || '';
    await leave.save();

    if (status === 'approved') {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        await Attendance.findOneAndUpdate(
          { user: leave.applicant, date: dayStart },
          { status: 'on-leave' },
          { upsert: true }
        );
      }
    }

    const populated = await Leave.findById(leave._id)
      .populate('applicant', 'name email')
      .populate('reviewedBy', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/team', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const filter = {};

    if (req.user.role === 'manager') {
      const interns = await User.find({ reportingManager: req.user._id }).select('_id');
      filter.applicant = { $in: interns.map(i => i._id) };
    }

    const { status, month, year } = req.query;
    if (status) filter.status = status;

    const leaves = await Leave.find(filter)
      .populate('applicant', 'name email department')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
