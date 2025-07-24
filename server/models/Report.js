const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Report = require('../models/Report');
const User = require('../models/User');
const auth = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Upload image and detect waste
router.post('/detect', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const { latitude, longitude, description } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Location coordinates are required' });
    }

    // Upload image to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    // Send image to AI service for detection
    const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/detect`, {
      imageUrl: uploadResult.secure_url
    });

    const { wasteType, confidence, riskLevel } = aiResponse.data;

    // Create report
    const report = new Report({
      userId: req.user._id,
      imageUrl: uploadResult.secure_url,
      wasteType,
      confidence,
      riskLevel,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      description: description || ''
    });

    await report.save();

    // Update user stats
    const user = await User.findById(req.user._id);
    user.reportCount += 1;
    user.ecoPoints += 10; // Base points for reporting
    
    // Bonus points for high confidence
    if (confidence > 80) {
      user.ecoPoints += 5;
    }

    // Update accuracy (simplified calculation)
    user.accuracy = Math.round((user.accuracy * (user.reportCount - 1) + confidence) / user.reportCount);
    
    // Update rank
    user.updateRank();
    
    // Update streak
    const today = new Date();
    const lastReport = user.lastReportDate;
    
    if (lastReport) {
      const daysDiff = Math.floor((today - lastReport) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        user.streakDays += 1;
      } else if (daysDiff > 1) {
        user.streakDays = 1;
      }
    } else {
      user.streakDays = 1;
    }
    
    user.lastReportDate = today;
    await user.save();

    // Check for badge achievements
    await checkBadgeAchievements(user);

    res.status(201).json({
      message: 'Waste detected and report created successfully',
      report: {
        id: report._id,
        wasteType,
        confidence,
        riskLevel,
        location: report.location,
        imageUrl: report.imageUrl,
        createdAt: report.createdAt
      },
      userStats: {
        ecoPoints: user.ecoPoints,
        rank: user.rank,
        reportCount: user.reportCount,
        accuracy: user.accuracy,
        streakDays: user.streakDays
      }
    });
  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({ message: 'Server error during waste detection' });
  }
});

// Get user's reports
router.get('/my-reports', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await Report.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username');

    const total = await Report.countDocuments({ userId: req.user._id });

    res.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error fetching reports' });
  }
});

// Get nearby reports
router.get('/nearby', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query; // radius in km

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Location coordinates are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusInDegrees = radius / 111; // Approximate conversion

    const reports = await Report.find({
      'location.latitude': {
        $gte: lat - radiusInDegrees,
        $lte: lat + radiusInDegrees
      },
      'location.longitude': {
        $gte: lng - radiusInDegrees,
        $lte: lng + radiusInDegrees
      }
    })
    .populate('userId', 'username')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json(reports);
  } catch (error) {
    console.error('Get nearby reports error:', error);
    res.status(500).json({ message: 'Server error fetching nearby reports' });
  }
});

// Get report by ID
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('userId', 'username profilePicture')
      .populate('verifiedBy', 'username')
      .populate('comments.userId', 'username profilePicture');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ message: 'Server error fetching report' });
  }
});

// Like/unlike report
router.post('/:id/like', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const userId = req.user._id;
    const isLiked = report.likedBy.includes(userId);

    if (isLiked) {
      report.likedBy.pull(userId);
      report.likes -= 1;
    } else {
      report.likedBy.push(userId);
      report.likes += 1;
    }

    await report.save();

    res.json({
      message: isLiked ? 'Report unliked' : 'Report liked',
      likes: report.likes,
      isLiked: !isLiked
    });
  } catch (error) {
    console.error('Like report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment to report
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { comment } = req.body;
    
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ message: 'Comment cannot be empty' });
    }

    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.comments.push({
      userId: req.user._id,
      comment: comment.trim()
    });

    await report.save();

    const updatedReport = await Report.findById(req.params.id)
      .populate('comments.userId', 'username profilePicture');

    res.json({
      message: 'Comment added successfully',
      comments: updatedReport.comments
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to check badge achievements
async function checkBadgeAchievements(user) {
  const Badge = require('../models/Badge');
  
  try {
    const badges = await Badge.find();
    const newBadges = [];

    for (const badge of badges) {
      // Skip if user already has this badge
      if (user.badges.includes(badge._id)) continue;

      let achieved = false;

      switch (badge.criteria.type) {
        case 'report_count':
          achieved = user.reportCount >= badge.criteria.value;
          break;
        case 'accuracy':
          achieved = user.accuracy >= badge.criteria.value;
          break;
        case 'streak':
          achieved = user.streakDays >= badge.criteria.value;
          break;
      }

      if (achieved) {
        user.badges.push(badge._id);
        user.ecoPoints += badge.points;
        newBadges.push(badge);
      }
    }

    if (newBadges.length > 0) {
      await user.save();
    }

    return newBadges;
  } catch (error) {
    console.error('Badge check error:', error);
    return [];
  }
}

module.exports = router;

