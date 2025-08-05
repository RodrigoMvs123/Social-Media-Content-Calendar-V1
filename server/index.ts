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

// Serve test page
app.get('/slack-test', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Slack Preferences Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; }
        .checkbox-group { margin: 10px 0; }
        button { padding: 10px 20px; margin: 10px 0; background: #007cba; color: white; border: none; cursor: pointer; }
        button:hover { background: #005a87; }
        .status { margin: 10px 0; padding: 10px; background: #f0f0f0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Slack Notification Preferences</h1>
        
        <div class="checkbox-group">
            <label>
                <input type="checkbox" id="scheduled" checked> When a post is scheduled
            </label>
        </div>
        
        <div class="checkbox-group">
            <label>
                <input type="checkbox" id="published" checked> When a post is published
            </label>
        </div>
        
        <div class="checkbox-group">
            <label>
                <input type="checkbox" id="failed" checked> When a post fails to publish
            </label>
        </div>
        
        <button onclick="savePreferences()">Save Preferences</button>
        <button onclick="loadPreferences()">Load Current Settings</button>
        
        <div id="status" class="status"></div>
    </div>

    <script>
        const token = localStorage.getItem('auth_token');
        
        async function savePreferences() {
            const scheduled = document.getElementById('scheduled').checked;
            const published = document.getElementById('published').checked;
            const failed = document.getElementById('failed').checked;
            
            console.log('Saving:', { scheduled, published, failed });
            document.getElementById('status').innerHTML = 'Saving...';
            
            try {
                const response = await fetch('/api/slack/preferences', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${token}\`
                    },
                    body: JSON.stringify({
                        slackScheduled: scheduled,
                        slackPublished: published,
                        slackFailed: failed
                    })
                });
                
                const result = await response.json();
                console.log('Result:', result);
                
                if (response.ok) {
                    document.getElementById('status').innerHTML = '✅ Settings saved successfully!';
                } else {
                    document.getElementById('status').innerHTML = '❌ Error: ' + result.error;
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('status').innerHTML = '❌ Network error';
            }
        }
        
        async function loadPreferences() {
            document.getElementById('status').innerHTML = 'Loading...';
            
            try {
                const response = await fetch('/api/slack/settings', {
                    headers: {
                        'Authorization': \`Bearer \${token}\`
                    }
                });
                
                const result = await response.json();
                console.log('Current settings:', result);
                
                if (response.ok && result.configured) {
                    document.getElementById('scheduled').checked = result.slackScheduled ?? true;
                    document.getElementById('published').checked = result.slackPublished ?? true;
                    document.getElementById('failed').checked = result.slackFailed ?? true;
                    document.getElementById('status').innerHTML = '✅ Settings loaded';
                } else {
                    document.getElementById('status').innerHTML = '❌ No settings found';
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('status').innerHTML = '❌ Network error';
            }
        }
        
        // Load settings on page load
        if (token) {
            loadPreferences();
        } else {
            document.getElementById('status').innerHTML = '❌ No auth token found. Please login first.';
        }
    </script>
</body>
</html>`);
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
