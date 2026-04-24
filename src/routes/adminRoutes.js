const express = require('express');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  getAdminDashboard,
  listRecipesForAdmin,
  setRecipePublishStatus,
  deleteAnyRecipe,
  listChefsForAdmin,
  updateChefRole,
  updateChefStatus,
  deleteChef
} = require('../controllers/adminController');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/dashboard', getAdminDashboard);

router.get('/recipes', listRecipesForAdmin);
router.patch('/recipes/:id/publish', setRecipePublishStatus);
router.delete('/recipes/:id', deleteAnyRecipe);

router.get('/chefs', listChefsForAdmin);
router.patch('/chefs/:id/role', updateChefRole);
router.patch('/chefs/:id/status', updateChefStatus);
router.delete('/chefs/:id', deleteChef);

module.exports = router;
