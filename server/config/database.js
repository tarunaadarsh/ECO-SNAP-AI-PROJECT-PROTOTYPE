const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Try to connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn('MongoDB connection failed, running in demo mode without database:', error.message);
    
    // For demo purposes, we'll continue without database
    // In production, you would want to exit the process
    console.log('Note: Some features may not work without database connection');
  }
};

module.exports = connectDB;
