const mongoose = require('mongoose');
const logger = require('./logger');

async function connectDB(uri) {
  if (!uri) {
    throw new Error('MongoDB connection URI is required');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('Connected to MongoDB');
    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
}

module.exports = connectDB;
