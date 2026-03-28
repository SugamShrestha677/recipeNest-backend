const express = require('express');
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

const router = express.Router();

// Public routes (no authentication required)
router.get('/', getRecipes);

// GET /api/recipes/search - Search recipes (must come before /:id)
router.get('/search', searchRecipes);

// GET /api/recipes/trending - Get trending recipes
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

router.use(authMiddleware);

router.route('/').post(createRecipe).get(getRecipes);
router.get('/my/recipes', getMyRecipes);
router.get('/saved', getSavedRecipes);
router
.route('/:id')
.put(updateRecipe)
.delete(deleteRecipe);

router.post('/:id/like', likeRecipe);
router.post('/:id/save', saveRecipe);
router.get('/:id', getRecipeById);
module.exports = router;
