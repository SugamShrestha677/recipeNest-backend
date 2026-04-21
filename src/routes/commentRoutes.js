const express = require('express');
const { addComment, likeComment } = require('../controllers/recipeController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/recipes/:id/comments', authMiddleware, addComment);
router.post('/comments/:id/like', authMiddleware, likeComment);

module.exports = router;