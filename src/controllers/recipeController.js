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
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    const userLiked = recipe.likes.includes(req.user.id);
    
    if (userLiked) {
      // Unlike
      recipe.likes = recipe.likes.filter(id => id.toString() !== req.user.id);
      await recipe.save();
      
      res.json({ liked: false, likesCount: recipe.likes.length });
    } else {
      // Like
      recipe.likes.push(req.user.id);
      await recipe.save();
      
      // Create notification for recipe owner
      if (recipe.createdBy.toString() !== req.user.id) {
        await Notification.create({
          user: recipe.createdBy,
          type: 'like',
          title: 'Someone liked your recipe!',
          message: `${req.user.name} liked your recipe "${recipe.title}"`,
          data: { recipeId: recipe._id, userId: req.user.id }
        });
      }
      
      res.json({ liked: true, likesCount: recipe.likes.length });
    }
  } catch (error) {
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

module.exports = {
  createRecipe,
  getRecipes,
  getRecipeById,
  updateRecipe,
  deleteRecipe,
  likeRecipe,
  addComment,
  getMyRecipes
};