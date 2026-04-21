const jwt = require('jsonwebtoken');
const User = require('../models/User');
const validator = require('validator');

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'  // Changed to 7 days
  });
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters long' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        fullName: user.name  // Add this for consistency
      },
      token
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        fullName: user.name  // Add this for consistency
      },
      token
    });
  } catch (error) {
    next(error);
  }
}

// Add this new function
async function getMe(req, res, next) {
  try {
    // User is already attached to req by the protect middleware
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        fullName: user.name,
        bio: user.bio || '',
        specialty: user.specialty || '',
        experience: user.experience || 0,
        location: user.location || '',
        profilePicture: user.profilePicture || ''
      }
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, bio, specialty, experience, location, website, phone } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (specialty !== undefined) user.specialty = specialty;
    if (experience !== undefined) user.experience = experience;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;
    if (phone !== undefined) user.phone = phone;
    
    // Handle profile picture upload
    if (req.file) {
      user.profilePicture = `/uploads/${req.file.filename}`;
    }
    
    await user.save();
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        fullName: user.name,
        bio: user.bio,
        specialty: user.specialty,
        experience: user.experience,
        location: user.location,
        profilePicture: user.profilePicture,
        website: user.website,
        phone: user.phone
      }
    });
  } catch (error) {
    next(error);
  }
}
module.exports = {
  register,
  login,
  getMe,
  updateProfile
};