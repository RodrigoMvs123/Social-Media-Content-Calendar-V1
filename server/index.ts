import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { SQLiteAdapter } from './sqlite-db';
import authRoutes from './auth-routes';
import mediaRoutes from './media-routes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 3001;

// Database configuration
let dbConfig: any = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Fallback to SQLite if no DATABASE_URL is provided
let dbType = 'postgres';
let dbAdapter;

if (!process.env.DATABASE_URL) {
  dbType = 'sqlite';
  dbConfig = {
    filename: './data.sqlite'
  };
}

console.log('Database configuration (final):', [
  `DB_TYPE: ${dbType}`,
  `DB_PATH: ${dbType === 'sqlite' ? dbConfig.filename : 'N/A'}`
]);

// Set up database connection
let pool;
if (dbType === 'postgres') {
  console.log('Using PostgreSQL database adapter');
  pool = new Pool(dbConfig);
} else {
  console.log('Using SQLite database adapter');
  dbAdapter = new SQLiteAdapter(process.env.DB_PATH || './data.sqlite');
  dbAdapter.initialize().then(() => {
    console.log('SQLite database initialized successfully');
  }).catch(err => {
    console.error('Failed to initialize SQLite database:', err);
  });
}

// OpenAI API key check
const openaiApiKey = process.env.OPENAI_API_KEY;
console.log(`OpenAI API Key status: ${openaiApiKey ? 'FOUND' : 'NOT FOUND'}`);

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
// Use SQLite routes when DB_TYPE is sqlite
if (process.env.DB_TYPE === 'sqlite') {
  console.log('Using SQLite with JWT authentication');
  app.use('/api/auth', require('./auth-routes-sqlite'));
  app.use('/api/posts', require('./posts-routes-sqlite'));
  app.use('/api/analytics', require('./analytics-routes-sqlite'));
} else {
  app.use('/api/auth', authRoutes);
  app.use('/api/posts', require('./posts-routes'));
}
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
