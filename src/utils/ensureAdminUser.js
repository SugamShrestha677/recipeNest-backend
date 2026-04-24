const User = require('../models/User');
const logger = require('../config/logger');

async function ensureAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@recipenest.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'RecipeNest Admin';

  const existingAdmin = await User.findOne({ role: 'admin' }).select('_id email');
  if (existingAdmin) {
    return;
  }

  const existingByEmail = await User.findOne({ email: adminEmail }).select('+password');
  if (existingByEmail) {
    existingByEmail.role = 'admin';
    existingByEmail.isActive = true;
    await existingByEmail.save();

    logger.info(`Promoted existing user ${adminEmail} to admin role`);
    return;
  }

  await User.create({
    name: adminName,
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
    isActive: true
  });

  logger.warn('No admin user was found. A default admin account was created.');
  logger.warn(`Admin email: ${adminEmail}`);
  if (!process.env.ADMIN_PASSWORD) {
    logger.warn('Default admin password is in use (admin123). Set ADMIN_PASSWORD in environment variables.');
  }
}

module.exports = ensureAdminUser;
