const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Comment = require('../models/comment');

async function buildChefFilter(search = '') {
  const recipeCreatorIds = await Recipe.distinct('createdBy');

  const baseFilter = {
    $and: [
      { role: { $ne: 'admin' } },
      {
        $or: [
          { role: 'chef' },
          { _id: { $in: recipeCreatorIds } }
        ]
      }
    ]
  };

  if (!search) {
    return baseFilter;
  }

  return {
    $and: [
      baseFilter,
      {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { specialty: { $regex: search, $options: 'i' } }
        ]
      }
    ]
  };
}

async function getAdminDashboard(req, res, next) {
  try {
    const chefFilter = await buildChefFilter();

    const [totalUsers, totalChefs, totalAdmins, totalRecipes, activeRecipes, inactiveChefs] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments(chefFilter),
      User.countDocuments({ role: 'admin' }),
      Recipe.countDocuments({}),
      Recipe.countDocuments({ published: true }),
      User.countDocuments({ $and: [chefFilter, { isActive: false }] })
    ]);

    const latestRecipes = await Recipe.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('createdBy', 'name email role isActive')
      .lean();

    const latestChefs = await User.find(chefFilter)
      .sort({ createdAt: -1 })
      .limit(8)
      .select('name email role isActive createdAt specialty location')
      .lean();

    res.json({
      stats: {
        totalUsers,
        totalChefs,
        totalAdmins,
        totalRecipes,
        activeRecipes,
        inactiveChefs
      },
      latestRecipes,
      latestChefs
    });
  } catch (error) {
    next(error);
  }
}

async function listRecipesForAdmin(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 5), 50);
    const search = (req.query.search || '').trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Recipe.countDocuments(filter);
    const recipes = await Recipe.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'name email isActive')
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

async function setRecipePublishStatus(req, res, next) {
  try {
    const { published } = req.body;
    if (typeof published !== 'boolean') {
      return res.status(400).json({ message: 'published must be a boolean' });
    }

    const recipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      { published },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    res.json({ recipe });
  } catch (error) {
    next(error);
  }
}

async function deleteAnyRecipe(req, res, next) {
  try {
    const deleted = await Recipe.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    await Comment.deleteMany({ recipe: req.params.id });

    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function listChefsForAdmin(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 5), 50);
    const search = (req.query.search || '').trim();

    const filter = await buildChefFilter(search);

    const total = await User.countDocuments(filter);
    const chefs = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name email role isActive specialty experience location createdAt')
      .lean();

    const chefIds = chefs.map((chef) => chef._id);
    const recipesCountAgg = await Recipe.aggregate([
      { $match: { createdBy: { $in: chefIds } } },
      { $group: { _id: '$createdBy', totalRecipes: { $sum: 1 } } }
    ]);

    const recipeCountMap = new Map(recipesCountAgg.map((item) => [String(item._id), item.totalRecipes]));
    const chefsWithStats = chefs.map((chef) => ({
      ...chef,
      role: chef.role || 'chef',
      totalRecipes: recipeCountMap.get(String(chef._id)) || 0
    }));

    res.json({
      page,
      limit,
      total,
      chefs: chefsWithStats,
      hasMore: page * limit < total
    });
  } catch (error) {
    next(error);
  }
}

async function updateChefRole(req, res, next) {
  try {
    const { role } = req.body;
    if (!['chef', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Allowed roles: chef, admin' });
    }

    if (String(req.user._id) === req.params.id && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot remove your own admin role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('name email role isActive specialty location');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function updateChefStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    if (String(req.user._id) === req.params.id && !isActive) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    ).select('name email role isActive specialty location');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function deleteChef(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select('role');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (String(req.user._id) === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await Recipe.deleteMany({ createdBy: req.params.id });
    await Comment.deleteMany({ user: req.params.id });
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'Chef account and related content deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdminDashboard,
  listRecipesForAdmin,
  setRecipePublishStatus,
  deleteAnyRecipe,
  listChefsForAdmin,
  updateChefRole,
  updateChefStatus,
  deleteChef
};
