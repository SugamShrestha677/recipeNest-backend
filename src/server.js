require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const limiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const commentRoutes = require('./routes/commentRoutes');
// const path = require('path');

const app = express();
const PORT = process.env.SERVER_PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
express.json({ limit: '10mb' });
express.urlencoded({ extended: true, limit: '10mb' });
app.use(limiter);
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api', commentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

async function startServer() {
  try {
    await connectDB(process.env.MONGODB_URI);
    const serverInstance = app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });
    return serverInstance;
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
