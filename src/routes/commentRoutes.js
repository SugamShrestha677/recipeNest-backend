const express = require('express');
const { addComment } = require('../controllers/recipeController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/recipes/:id/comments', authMiddleware, addComment);

module.exports = router;