const Recipe = require('../models/Recipe');
const User = require('../models/User');
const Comment = require('../models/comment');
const Notification = require('../models/notification');

async function createRecipe(req, res, next) {
  try {
    const {
      title,
      description,
      ingredients,
      steps,
      instructions,
      tags,
      image,
      prepTime,
      cookTime,
      servings,
      difficulty,
      cuisine
    } = req.body;

    // Validation
    if (!title || title.length < 3) {
      return res.status(400).json({ message: 'Recipe title must be at least 3 characters' });
    }
    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ message: 'Provide at least one ingredient' });
    }
    if (!instructions || instructions.length === 0) {
      return res.status(400).json({ message: 'Provide at least one instruction' });
    }

    const recipe = await Recipe.create({
      title,
      description: description || '',
      ingredients,
      steps: steps || [],
      instructions,
      tags: tags || [],
      image: image || '',
      prepTime: prepTime || 30,
      cookTime: cookTime || 30,
      servings: servings || 4,
      difficulty: difficulty || 'Medium',
      cuisine: cuisine || '',
      createdBy: req.user.id
    });

    res.status(201).json(recipe);
  } catch (error) {
    next(error);
  }
}

async function getRecipes(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 5), 50);
    const search = req.query.search ? req.query.search.trim() : '';
    const cuisine = req.query.cuisine;
    const difficulty = req.query.difficulty;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build filter
    const filter = {};
    
    // Only show published recipes for non-owners
    if (!req.query.includeAll) {
      filter.published = true;
    }
    
    // Search by title, description, or tags
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by cuisine
    if (cuisine && cuisine !== 'all') {
      filter.cuisine = cuisine;
    }
    
    // Filter by difficulty
    if (difficulty && difficulty !== 'all') {
      filter.difficulty = difficulty;
    }

    const total = await Recipe.countDocuments(filter);
    const recipes = await Recipe.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'name profilePicture')
      .lean();

    res.json({
      page,
      limit,
      total,
      recipes,
      hasMore: page * limit < total
    });
  } catch (error) {
    next(error);
  }
}

async function getRecipeById(req, res, next) {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate('createdBy', 'name profilePicture bio specialty')
      .lean();
      
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    // Increment view count (async, don't wait)
    Recipe.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();
    
    // Get comments
    const comments = await Comment.find({ recipe: req.params.id })
      .populate('user', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    res.json({ ...recipe, comments });
  } catch (error) {
    next(error);
  }
}

async function updateRecipe(req, res, next) {
  try {
    const recipe = await Recipe.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found or not owned by user' });
    }
    
    res.json(recipe);
  } catch (error) {
    next(error);
  }
}

async function deleteRecipe(req, res, next) {
  try {
    const deleted = await Recipe.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id
    });
    
    if (!deleted) {
      return res.status(404).json({ message: 'Recipe not found or not owned by user' });
    }
    
    // Delete associated comments
    await Comment.deleteMany({ recipe: req.params.id });
    
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function likeRecipe(req, res, next) {
  try {
    console.log('Like request received for recipe:', req.params.id);
    console.log('User ID:', req.user.id);
    
    const Recipe = require('../models/Recipe');
    const Notification = require('../models/notification');
    
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      console.log('Recipe not found');
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    // Initialize likes array if it doesn't exist
    if (!recipe.likes) {
      recipe.likes = [];
    }
    
    const userLiked = recipe.likes.includes(req.user.id);
    console.log('User already liked:', userLiked);
    
    if (userLiked) {
      // Unlike
      recipe.likes = recipe.likes.filter(id => id.toString() !== req.user.id);
      await recipe.save();
      console.log('Recipe unliked successfully');
      
      res.json({ 
        liked: false, 
        likesCount: recipe.likes.length,
        message: 'Recipe unliked successfully'
      });
    } else {
      // Like
      recipe.likes.push(req.user.id);
      await recipe.save();
      console.log('Recipe liked successfully');
      
      // Create notification for recipe owner
      if (recipe.createdBy.toString() !== req.user.id) {
        try {
          await Notification.create({
            user: recipe.createdBy,
            type: 'like',
            title: 'Someone liked your recipe!',
            message: `${req.user.name} liked your recipe "${recipe.title}"`,
            data: { recipeId: recipe._id, userId: req.user.id }
          });
          console.log('Notification created');
        } catch (err) {
          console.log('Notification creation failed:', err.message);
        }
      }
      
      res.json({ 
        liked: true, 
        likesCount: recipe.likes.length,
        message: 'Recipe liked successfully'
      });
    }
  } catch (error) {
    console.error('Like recipe error:', error);
    next(error);
  }
}

async function addComment(req, res, next) {
  try {
    const { content } = req.body;
    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment content is required' });
    }
    
    const comment = await Comment.create({
      recipe: req.params.id,
      user: req.user.id,
      content: content.trim()
    });
    
    await comment.populate('user', 'name profilePicture');
    
    // Create notification for recipe owner
    if (recipe.createdBy.toString() !== req.user.id) {
      await Notification.create({
        user: recipe.createdBy,
        type: 'comment',
        title: 'New comment on your recipe',
        message: `${req.user.name} commented on "${recipe.title}"`,
        data: { recipeId: recipe._id, userId: req.user.id, commentId: comment._id }
      });
    }
    
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
}

async function getMyRecipes(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 5), 50);
    
    const total = await Recipe.countDocuments({ createdBy: req.user.id });
    const recipes = await Recipe.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    res.json({
      page,
      limit,
      total,
      recipes,
      hasMore: page * limit < total
    });
  } catch (error) {
    next(error);
  }
}

// Save/Unsave recipe (bookmark)
async function saveRecipe(req, res, next) {
  try {
    console.log('Save request received for recipe:', req.params.id);
    console.log('User ID:', req.user.id);
    
    const Recipe = require('../models/Recipe');
    
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      console.log('Recipe not found');
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    // Initialize saves array if it doesn't exist
    if (!recipe.saves) {
      recipe.saves = [];
    }
    
    const userSaved = recipe.saves.includes(req.user.id);
    console.log('User already saved:', userSaved);
    
    if (userSaved) {
      // Unsave
      recipe.saves = recipe.saves.filter(id => id.toString() !== req.user.id);
      await recipe.save();
      console.log('Recipe unsaved successfully');
      
      res.json({ 
        saved: false, 
        savesCount: recipe.saves.length,
        message: 'Recipe removed from saved collection'
      });
    } else {
      // Save
      recipe.saves.push(req.user.id);
      await recipe.save();
      console.log('Recipe saved successfully');
      
      res.json({ 
        saved: true, 
        savesCount: recipe.saves.length,
        message: 'Recipe saved successfully'
      });
    }
  } catch (error) {
    console.error('Save recipe error:', error);
    next(error);
  }
}

// Get saved recipes for current user
async function getSavedRecipes(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 5), 50);
    
    // Find recipes where saves array contains current user's ID
    const total = await Recipe.countDocuments({ saves: req.user.id, published: true });
    const recipes = await Recipe.find({ saves: req.user.id, published: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'name profilePicture')
      .lean();
    
    res.json({
      page,
      limit,
      total,
      recipes,
      hasMore: page * limit < total
    });
  } catch (error) {
    next(error);
  }
}

// Search recipes (public)
async function searchRecipes(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 5), 50);
    const query = req.query.q ? req.query.q.trim() : '';
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Build search filter
    const filter = {
      published: true,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } },
        { cuisine: { $regex: query, $options: 'i' } }
      ]
    };
    
    const total = await Recipe.countDocuments(filter);
    const recipes = await Recipe.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'name profilePicture')
      .lean();
    
    res.json({
      page,
      limit,
      total,
      recipes,
      query,
      hasMore: page * limit < total
    });
  } catch (error) {
    next(error);
  }
}

// Get trending recipes (most viewed/liked)
async function getTrendingRecipes(req, res, next) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 5), 20);
    
    const recipes = await Recipe.find({ published: true })
      .sort({ views: -1, likes: -1 })
      .limit(limit)
      .populate('createdBy', 'name profilePicture')
      .lean();
    
    res.json({
      recipes,
      total: recipes.length
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createRecipe,
  getRecipes,
  getRecipeById,
  updateRecipe,
  deleteRecipe,
  likeRecipe,
  addComment,
  getMyRecipes,
  saveRecipe,
  getSavedRecipes,
  searchRecipes,
  getTrendingRecipes
};