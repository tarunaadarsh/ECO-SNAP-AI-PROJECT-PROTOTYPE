const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profilePicture: {
    type: String,
    default: ''
  },
  ecoPoints: {
    type: Number,
    default: 0
  },
  rank: {
    type: String,
    default: 'Beginner',
    enum: ['Beginner', 'Eco Warrior', 'Environmental Guardian', 'Planet Protector', 'Legend']
  },
  reportCount: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0
  },
  badges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Badge'
  }],
  streakDays: {
    type: Number,
    default: 0
  },
  lastReportDate: {
    type: Date
  },
  location: {
    latitude: Number,
    longitude: Number
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update rank based on eco points
userSchema.methods.updateRank = function() {
  if (this.ecoPoints >= 500) {
    this.rank = 'Legend';
  } else if (this.ecoPoints >= 300) {
    this.rank = 'Planet Protector';
  } else if (this.ecoPoints >= 150) {
    this.rank = 'Environmental Guardian';
  } else if (this.ecoPoints >= 50) {
    this.rank = 'Eco Warrior';
  } else {
    this.rank = 'Beginner';
  }
};

module.exports = mongoose.model('User', userSchema);



