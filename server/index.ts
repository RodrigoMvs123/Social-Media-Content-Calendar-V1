import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import { initDb } from './db-wrapper';
import routes from './routes';
import oauthRoutes from './oauth';
import { validateEnv } from './validateEnv';
import path from 'path';

// Load environment variables from both locations
dotenv.config(); // Load from server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') }); // Load from root directory

// Log environment variables for debugging
console.log('Environment variables loaded:');
console.log(`- DB_TYPE: ${process.env.DB_TYPE}`);
console.log(`- DATABASE_URL: ${process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set'}`);
console.log(`- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set (hidden)' : 'Not set'}`);
console.log(`- SESSION_SECRET: ${process.env.SESSION_SECRET ? 'Set (hidden)' : 'Not set'}`);

// Validate environment variables
validateEnv();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'social-media-calendar-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize database
initDb().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Routes
app.use('/api', routes);
app.use('/oauth', oauthRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});