const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  logger.error(err);
  const status = err.status || 500;
  const message = err.message || 'An unexpected error occurred';
  res.status(status).json({ message });
}

module.exports = errorHandler;
