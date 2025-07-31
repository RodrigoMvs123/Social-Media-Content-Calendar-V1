import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { SQLiteAdapter } from './sqlite-db';
import { findFreePort } from './utils/port-finder';
import { startPostScheduler } from './post-scheduler';

// Route imports
import mediaRoutes from './media-routes';
import authRoutesSqlite from './auth-routes-sqlite';
import postsRoutesSqlite from './posts-routes-sqlite';
import analyticsRoutesSqlite from './analytics-routes-sqlite';
import slackRoutes from './slack-routes';
import notificationRoutes from './notification-routes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// Use DB_TYPE from environment variables
let dbType = process.env.DB_TYPE || 'sqlite';
let dbAdapter;

if (dbType === 'sqlite') {
  console.log('Using SQLite database adapter');
  dbAdapter = new SQLiteAdapter(process.env.DB_PATH || './data.sqlite');
  dbAdapter.initialize().then(() => {
    console.log('SQLite database initialized successfully');
  }).catch(err => {
    console.error('Failed to initialize SQLite database:', err);
  });
} else {
  console.log('Using PostgreSQL database adapter');
  const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
  const pool = new Pool(dbConfig);
}

console.log('Database configuration (final):', [
  `DB_TYPE: ${dbType}`,
  `DB_PATH: ${dbType === 'sqlite' ? (process.env.DB_PATH || './data.sqlite') : 'N/A'}`
]);

// OpenAI API key check
const openaiApiKey = process.env.OPENAI_API_KEY;
console.log(`OpenAI API Key status: ${openaiApiKey ? 'FOUND' : 'NOT FOUND'}`);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
if (dbType === 'sqlite') {
  console.log('Using SQLite with JWT authentication');
  app.use('/api/auth', authRoutesSqlite);
  app.use('/api/posts', postsRoutesSqlite);
  app.use('/api/analytics', analyticsRoutesSqlite);
  app.use('/api/slack', slackRoutes);
  app.use('/api/notifications', notificationRoutes);
} else {
  const authRoutesPostgres = require('./auth-routes');
  const postsRoutes = require('./posts-routes');
  app.use('/api/auth', authRoutesPostgres);
  app.use('/api/posts', postsRoutes);
}
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start post scheduler
startPostScheduler();

// Start server with automatic port finding
async function startServer() {
  try {
    const availablePort = await findFreePort(port);
    app.listen(availablePort, () => {
      console.log(`Server running on port ${availablePort}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
