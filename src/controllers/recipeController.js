const Recipe = require('../models/Recipe');
const { validateRecipePayload } = require('../utils/validate');

async function createRecipe(req, res, next) {
  try {
    const sanitized = validateRecipePayload(req.body);
    const recipe = await Recipe.create({
      ...sanitized,
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
    const filter = {
      createdBy: req.user.id
    };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Recipe.countDocuments(filter);
    const recipes = await Recipe.find(filter)
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

async function getRecipeById(req, res, next) {
  try {
    const recipe = await Recipe.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    }).lean();
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    next(error);
  }
}

async function updateRecipe(req, res, next) {
  try {
    const payload = validateRecipePayload(req.body);
    const recipe = await Recipe.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      payload,
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
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createRecipe,
  getRecipes,
  getRecipeById,
  updateRecipe,
  deleteRecipe
};
