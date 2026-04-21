const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  createRecipe,
  getRecipes,
  getRecipeById,
  updateRecipe,
  deleteRecipe,
  likeRecipe,
  getMyRecipes,
  saveRecipe,
  getSavedRecipes,
  searchRecipes,      
  getTrendingRecipes  
} = require('../controllers/recipeController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// ==================== PUBLIC ROUTES ====================
// Specific routes first
router.get('/', getRecipes);
router.get('/search', searchRecipes);
router.get('/trending', getTrendingRecipes);
router.post('/:id/view', async (req, res, next) => {
  try {
    const Recipe = require('../models/Recipe');
    await Recipe.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Serve static files from uploads directory
router.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// ==================== PROTECTED ROUTES ====================
router.use(authMiddleware);

// Protected specific routes (no :id parameter)
router.post('/', upload.single('image'), createRecipe);
router.get('/my/recipes', getMyRecipes);
router.get('/saved', getSavedRecipes);

// Protected routes with :id parameter
router.put('/:id', upload.single('image'), updateRecipe);
router.delete('/:id', deleteRecipe);
router.post('/:id/like', likeRecipe);
router.post('/:id/save', saveRecipe);

// ==================== PUBLIC PARAMETER ROUTE (MUST BE LAST!) ====================
// This catches any GET request with an ID that wasn't matched above
router.get('/:id', getRecipeById);

module.exports = router;