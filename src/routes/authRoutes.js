const express = require('express');
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, upload.single('profilePicture'), updateProfile);
module.exports = router;
// router.put('/profile', authMiddleware, updateProfile);