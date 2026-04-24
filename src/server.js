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
const adminRoutes = require('./routes/adminRoutes');
const ensureAdminUser = require('./utils/ensureAdminUser');
const path = require('path');

const app = express();
const PORT = process.env.SERVER_PORT || 5000;

// Configure CORS with more permissive settings for static files
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS middleware FIRST
app.use(cors(corsOptions));

// Serve static files BEFORE other middleware
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, path) => {
    // Add CORS headers to static files
    res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin resource sharing
}));

// IMPORTANT: Body parser middleware - MUST be added with app.use()
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api', commentRoutes);
app.use('/api/admin', adminRoutes);

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
    await ensureAdminUser();
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
