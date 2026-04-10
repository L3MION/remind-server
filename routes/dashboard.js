const express = require('express');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Leave = require('../models/Leave');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/intern', auth, authorize('intern'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [attendanceToday, taskStats, leaveStats, monthlyAttendance] = await Promise.all([
      Attendance.findOne({ user: req.user._id, date: today }),
      Task.aggregate([
        { $match: { assignedTo: req.user._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Leave.aggregate([
        { $match: { applicant: req.user._id, status: 'approved' } },
        { $group: { _id: '$leaveType', count: { $sum: 1 } } },
      ]),
      Attendance.countDocuments({
        user: req.user._id,
        date: { $gte: startOfMonth },
        status: { $in: ['present', 'half-day'] },
      }),
    ]);

    const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate('assignedBy', 'name email')
      .sort({ dueDate: 1 })
      .limit(5);

    res.json({
      attendanceToday,
      taskStats: taskStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      leaveStats: leaveStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      monthlyAttendance: {
        present: monthlyAttendance,
        totalDays: totalDaysInMonth,
        percentage: Math.round((monthlyAttendance / totalDaysInMonth) * 100),
      },
      recentTasks: tasks,
      workingHours: req.user.workingHours,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/manager', auth, authorize('manager'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const interns = await User.find({ reportingManager: req.user._id }).select('_id name');
    const internIds = interns.map(i => i._id);

    const [todayAttendance, pendingLeaves, taskStats] = await Promise.all([
      Attendance.find({ user: { $in: internIds }, date: today }).populate('user', 'name'),
      Leave.find({ applicant: { $in: internIds }, status: 'pending' })
        .populate('applicant', 'name email department'),
      Task.aggregate([
        { $match: { assignedBy: req.user._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const presentCount = todayAttendance.filter(a => a.status === 'present' || a.status === 'half-day').length;

    res.json({
      teamSize: interns.length,
      presentToday: presentCount,
      absentToday: interns.length - presentCount,
      pendingLeaves,
      taskStats: taskStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      teamAttendance: todayAttendance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/admin', auth, authorize('admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalInterns, totalManagers, todayAttendance, pendingLeaves, taskStats] = await Promise.all([
      User.countDocuments({ role: 'intern', isActive: true }),
      User.countDocuments({ role: 'manager', isActive: true }),
      Attendance.find({ date: today }).populate('user', 'name department'),
      Leave.find({ status: 'pending' }).populate('applicant', 'name email department'),
      Task.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      totalInterns,
      totalManagers,
      presentToday: todayAttendance.filter(a => a.status === 'present').length,
      absentToday: todayAttendance.filter(a => a.status === 'absent').length,
      onLeaveToday: todayAttendance.filter(a => a.status === 'on-leave').length,
      pendingLeaves: pendingLeaves.length,
      taskStats: taskStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
