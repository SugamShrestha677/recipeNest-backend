const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.startsWith('Bearer ')
      ? req.header('Authorization').split(' ')[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication token missing' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Fetch user from database (excluding password)
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }
      
      // Attach user to request
      req.user = user;
      return next();
    } catch (jwtError) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = authMiddleware;