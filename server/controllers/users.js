const express = require('express');
const User = require('../models/User');
const Badge = require('../models/Badge');
const Report = require('../models/Report');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('badges')
      .select('-password');

    // Get recent reports
    const recentReports = await Report.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('wasteType confidence createdAt imageUrl');

    // Calculate additional stats
    const totalReports = await Report.countDocuments({ userId: req.user._id });
    const verifiedReports = await Report.countDocuments({ 
      userId: req.user._id, 
      status: 'Verified' 
    });

    const wasteTypeStats = await Report.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: '$wasteType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        ecoPoints: user.ecoPoints,
        rank: user.rank,
        reportCount: user.reportCount,
        accuracy: user.accuracy,
        streakDays: user.streakDays,
        badges: user.badges
      },
      stats: {
        totalReports,
        verifiedReports,
        wasteTypeStats,
        recentReports
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error fetching user stats' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'points', limit = 10 } = req.query;
    
    let sortField;
    switch (type) {
      case 'points':
        sortField = { ecoPoints: -1 };
        break;
      case 'reports':
        sortField = { reportCount: -1 };
        break;
      case 'accuracy':
        sortField = { accuracy: -1 };
        break;
      case 'streak':
        sortField = { streakDays: -1 };
        break;
      default:
        sortField = { ecoPoints: -1 };
    }

    const users = await User.find()
      .select('username profilePicture ecoPoints rank reportCount accuracy streakDays')
      .sort(sortField)
      .limit(parseInt(limit));

    res.json(users);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Server error fetching leaderboard' });
  }
});

// Get all badges
router.get('/badges', async (req, res) => {
  try {
    const badges = await Badge.find().sort({ rarity: 1, points: 1 });
    res.json(badges);
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({ message: 'Server error fetching badges' });
  }
});

// Get user's badges with progress
router.get('/badges/progress', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('badges');
    const allBadges = await Badge.find();

    const badgeProgress = allBadges.map(badge => {
      const earned = user.badges.some(userBadge => userBadge._id.equals(badge._id));
      
      let progress = 0;
      let progressText = '';

      if (!earned) {
        switch (badge.criteria.type) {
          case 'report_count':
            progress = Math.min((user.reportCount / badge.criteria.value) * 100, 100);
            progressText = `${user.reportCount}/${badge.criteria.value} reports`;
            break;
          case 'accuracy':
            progress = Math.min((user.accuracy / badge.criteria.value) * 100, 100);
            progressText = `${user.accuracy}%/${badge.criteria.value}% accuracy`;
            break;
          case 'streak':
            progress = Math.min((user.streakDays / badge.criteria.value) * 100, 100);
            progressText = `${user.streakDays}/${badge.criteria.value} days`;
            break;
        }
      } else {
        progress = 100;
        progressText = 'Earned!';
      }

      return {
        ...badge.toObject(),
        earned,
        progress,
        progressText
      };
    });

    res.json(badgeProgress);
  } catch (error) {
    console.error('Get badge progress error:', error);
    res.status(500).json({ message: 'Server error fetching badge progress' });
  }
});

// Search users
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await User.find({
      username: { $regex: q, $options: 'i' }
    })
    .select('username profilePicture ecoPoints rank reportCount')
    .limit(parseInt(limit));

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error searching users' });
  }
});

module.exports = router;

