README.md

# Social Media Content Calendar

A modern web application for planning and scheduling social media content across multiple platforms.

## 🚀 Live Demo

The application is deployed and available at:
**https://social-media-content-calendar-v1.onrender.com/**

*Note: This is a production deployment on Render.com with full functionality including PostgreSQL database, Slack integration, and AI content generation.*

## Technologies Used

- React with TypeScript
- Vite for frontend development
- Tailwind CSS for styling
- React Query for data management
- PostgreSQL or SQLite for data storage
- Express.js backend API
- User authentication and account management
- Notification preferences system
- OpenAI API for AI content generation

## Quick Start

1. Clone the repository:
   ```
   git clone https://github.com/RodrigoMvs123/Social-Media-Content-Calendar-V1.git
   cd Social-Media-Content-Calendar-V1
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   
   **Step 1:** Copy the example files to create your environment files (run in PowerShell/Bash):
   ```bash
   cp .env.example .env
   cp .env.example server/.env
   ```
   
   **Step 2:** Edit both `.env` files and replace the placeholders with your actual credentials:
   - Database settings (PostgreSQL or SQLite)
   - OpenAI API key OR Claude API key (for AI content generation)
   - Social media OAuth credentials (for platform integration)
   - Slack settings (optional)

4. Start the application:
   ```
   npm run dev
   ```

   This will start both the frontend (http://localhost:3000) and backend (http://localhost:3001) servers.

5. Open your browser to http://localhost:3000

## Database Configuration

This application supports two database options:

1. **PostgreSQL** (Recommended for production):
   - Set in `.env`: `DB_TYPE=postgres` and `DATABASE_URL=your_postgres_connection_string`
   - Requires PostgreSQL server (local or cloud-based like Render.com)
   - Supports SSL connections for cloud databases

2. **SQLite** (Great for development):
   - Set in `.env`: `DB_TYPE=sqlite` and optionally `DB_PATH=./your_database.sqlite`
   - No additional setup required
   - Data stored in a local file

The application will automatically use the database specified in your environment variables.

## AI Content Generation

The application supports both OpenAI and Claude APIs for generating social media content:

1. **Setup** (choose one):
   - **OpenAI**: Get an API key from [OpenAI](https://platform.openai.com/) and add: `OPENAI_API_KEY=your_api_key_here`
   - **Claude**: Get an API key from [Anthropic](https://console.anthropic.com/) and add: `CLAUDE_API_KEY=your_api_key_here`

2. **Usage**:
   - Click "Generate AI Content" on the dashboard
   - Enter a prompt and select a platform
   - Click "Generate Content"
   - Use the generated content for your social media posts

3. **Rate Limiting**:
   - The application includes built-in rate limiting and caching
   - This helps manage API usage and stay within free tier limits
   - Generated content is cached to avoid duplicate API calls

## Social Media Integration

This application uses OAuth for real social media integration.

To connect your social media accounts:

1. Register as a developer on each platform:
   - **X**: [X Developer Portal](https://developer.x.com/)
   - **LinkedIn**: [LinkedIn Developer Portal](https://developer.linkedin.com/)
   - **Facebook/Instagram**: [Meta for Developers](https://developers.facebook.com/)

2. Create an application in their developer portals

3. Configure the redirect URLs in each platform's developer portal:

   > **Important**: These URLs are configured in the **external platform developer portals** (X, LinkedIn, Facebook, Instagram), NOT in your code files.
   
   **For Development (localhost):**
   - **X Developer Portal**: Add `http://localhost:3001/api/oauth/callback/x`
   - **LinkedIn Developer Portal**: Add `http://localhost:3001/api/oauth/callback/linkedin`
   - **Facebook Developer Portal**: Add `http://localhost:3001/api/oauth/callback/facebook`
   - **Instagram Developer Portal**: Add `http://localhost:3001/api/oauth/callback/instagram`
   
   **For Production (using this deployment):**
   - **X Developer Portal**: Add `https://social-media-content-calendar-v1.onrender.com/api/oauth/callback/x`
   - **LinkedIn Developer Portal**: Add `https://social-media-content-calendar-v1.onrender.com/api/oauth/callback/linkedin`
   - **Facebook Developer Portal**: Add `https://social-media-content-calendar-v1.onrender.com/api/oauth/callback/facebook`
   - **Instagram Developer Portal**: Add `https://social-media-content-calendar-v1.onrender.com/api/oauth/callback/instagram`
   
   **For Your Own Deployment:**
   - Use your own domain instead of `social-media-content-calendar-v1.onrender.com`
   - Example: `https://yourdomain.com/api/oauth/callback/x`

4. Copy the client ID and secret to **both** `.env` files:
   
   **File 1: `/Social-Media-Content-Calendar-V1/.env`**
   **File 2: `/Social-Media-Content-Calendar-V1/server/.env`**
   
   Add these lines to both files:
   ```
   # X (formerly Twitter) OAuth credentials
   X_CLIENT_ID=your_x_client_id
   X_CLIENT_SECRET=your_x_client_secret

   # LinkedIn OAuth credentials
   LINKEDIN_CLIENT_ID=your_linkedin_client_id
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

   # Facebook OAuth credentials
   FACEBOOK_CLIENT_ID=your_facebook_client_id
   FACEBOOK_CLIENT_SECRET=your_facebook_client_secret

   # Instagram OAuth credentials
   INSTAGRAM_CLIENT_ID=your_instagram_client_id
   INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
   ```

5. Set the client URL in both `.env` files:
   ```
   CLIENT_URL=http://localhost:3000  # For development
   CLIENT_URL=https://social-media-content-calendar-v1.onrender.com  # For this deployment
   CLIENT_URL=https://yourdomain.com  # For your own deployment
   ```

   > **Important**: You must add these credentials to both the root `.env` file AND the `server/.env` file, as Node.js sometimes only checks for the nearest environment file.
   
   > **File Locations**: 
   > - Root: `/Social-Media-Content-Calendar-V1/.env`
   > - Server: `/Social-Media-Content-Calendar-V1/server/.env`

The application is already configured to use these credentials when available.

## Features

- **Calendar Views**: Month, List, and Grid views for visualizing your content schedule
- **Post Management**: Create, edit, and delete posts across multiple platforms
- **AI Content Generation**: Generate content ideas and full posts with AI assistance
- **Multi-Platform Support**: Schedule posts for X (formerly Twitter), LinkedIn, Facebook, and Instagram
- **Filtering & Search**: Filter posts by platform, status, and search by content
- **Persistent Storage**: Store your data in PostgreSQL or SQLite database
- **User Accounts**: Create and manage user accounts with secure authentication
- **Notification Preferences**: Customize how and when you receive notifications

## Usage

- **Create Posts**: Click the "Add New Post" button to create a new post
- **Generate AI Content**: Click "Generate AI Content" to use AI for content creation
- **Edit/Delete Posts**: Use the edit (pen) and delete (trash) icons on each post
- **Change Views**: Toggle between Month, List, and Grid views using the view selector
- **Filter Content**: Use the filter bar to find specific posts
- **Connect Accounts**: Use the Connect page to link your social media accounts
- **User Account**: Create an account in the Settings page under the Account tab
- **Notification Settings**: Configure your notification preferences in the Settings page under the Notifications tab

## Development

For development purposes, you can use either database option:

- **SQLite**: Simpler setup, great for local development
- **PostgreSQL**: More similar to production environment

The application includes mock data for initial testing. To modify the mock data, edit:
```
client/src/lib/mockApi.ts
```

## User Account Management

The application supports full user account management:

1. **Creating an Account**:
   - Go to the Settings page and select the Account tab
   - Fill in your name, email, and password
   - Click "Save Profile" to create your account

2. **Logging In**:
   - If you've created an account, you can log in using your email and password
   - Your session will be maintained until you log out

3. **Updating Your Profile**:
   - Change your name or email in the Account tab
   - Update your password by providing your current password and a new password

4. **Notification Preferences**:
   - Go to the Settings page and select the Notifications tab
   - Configure email notifications for daily digests, post publishing, and failures
   - Enable or disable browser notifications

5. **Slack Integration**:
   - Go to the Settings page and select the Slack Integration tab
   - Enter your Slack Bot Token and Channel ID
   - Click "Save Settings" to connect your calendar to Slack

All user data is securely stored in your database with passwords properly hashed.

## Settings Persistence

The application uses a hybrid approach for settings persistence:

1. **Local Storage**: All settings are immediately saved to the browser's localStorage for instant persistence between page navigations and browser sessions.

2. **Server Storage**: When connected to the backend, settings are also saved to the database for long-term storage and cross-device access.

This hybrid approach provides:
- Immediate feedback and persistence for users
- Offline capability when the server is unavailable
- Proper server-side storage for production use
- Synchronization between devices when users log in from different locations

### Implementation Details

The application automatically:
1. Loads settings from the server when available
2. Falls back to localStorage when offline
3. Synchronizes localStorage with server data when reconnected
4. Handles conflicts by prioritizing the most recent changes

### For Developers

To switch between development (localStorage only) and production (server + localStorage) modes:

```
# In .env file
USE_SERVER_STORAGE=true  # For production
USE_SERVER_STORAGE=false # For development (localStorage only)
```

When `USE_SERVER_STORAGE` is false, the application will only use localStorage, making it perfect for demonstrations and development without a backend.

## Slack Integration Setup

The application supports one-way synchronization with Slack - when you delete a post from the dashboard, it automatically deletes the corresponding Slack notification message.

### Prerequisites

1. **Slack App Configuration**:
   - Create a Slack App at [api.slack.com](https://api.slack.com/apps)
   - Add your `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` to both `.env` files

2. **Required OAuth Scopes**:
   - `chat:write` - Send messages
   - `chat:write.public` - Send messages to channels bot isn't in

3. **Add Bot to Channel**:
   - In your target Slack channel (e.g., #social)
   - Type: `/invite @YourBotName`
   - Or go to channel settings → Integrations → Add your bot

### How It Works

1. **Create a post** in the dashboard → Sends Slack notification
2. **Delete the post** from dashboard → Automatically deletes Slack message
3. **Post scheduling** → Sends notifications when posts are ready to publish

### Configuration

Add these to both `.env` files:
```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_CHANNEL_ID=your-channel-id
```

### Testing

1. **Create a post** in the webapp → Should send Slack notification
2. **Delete the post** from dashboard → Should delete Slack message
3. **Check Slack channel** for notifications

### Troubleshooting

- **No Slack notifications**: Check bot token and channel configuration
- **Bot not in channel**: Ensure bot is added to the target Slack channel
- **Permission errors**: Verify OAuth scopes are correctly configured

## 🚀 Render Deployment

The application can be deployed to Render.com using the included `render.yaml` configuration.

### Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Environment Variables**: Configure your `.env` variables

### Step-by-Step Deployment

#### Step 1: Prepare Environment Variables

In your Render Dashboard, you'll need to set these environment variables:

```bash
# Database configuration
DB_TYPE=postgres
DATABASE_URL=postgresql://username:password@localhost:5432/social_media_content_calendar_v1

# Or for SQLite:
DB_TYPE=sqlite
DB_PATH=./data.sqlite

# Use mock data for development
USE_MOCK_DATA=false

# JWT configuration
JWT_SECRET=your_jwt_secret_here

# CORS configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004

# Client URL for OAuth redirects
CLIENT_URL=http://localhost:3000

# AI configuration (choose one)
OPENAI_API_KEY=your_openai_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here

# Slack configuration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your-webhook-url
SLACK_CHANNEL_ID=your-channel-id

# Twitter OAuth credentials
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# LinkedIn OAuth credentials
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Facebook OAuth credentials
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret

# Instagram OAuth credentials
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
```

#### Step 2: Connect GitHub Repository

1. **Go to Render Dashboard** → **New** → **Web Service**
2. **Connect GitHub** and select your repository
3. **Branch**: Choose `main` or your deployment branch
4. **Root Directory**: Leave empty (uses root)

#### Step 3: Configure Build Settings

**Build Command:**
```bash
npm install && cd client && npm install && npm run build
```

**Start Command:**
```bash
cd server && npm start
```

**Environment**: `Node`

#### Step 4: Add Database (Optional)

For PostgreSQL:
1. **New** → **PostgreSQL**
2. **Copy connection string**
3. **Add to environment variables** as `DATABASE_URL`

#### Step 5: Deploy

1. **Click "Create Web Service"**
2. **Render will automatically**:
   - Install dependencies
   - Build the frontend
   - Start the server
   - Provide live URL

### Using render.yaml (Advanced)

The included `render.yaml` file automates the deployment with hybrid database support:

```yaml
# render.yaml configured with:
- Web service configuration
- Hybrid database support (PostgreSQL + SQLite fallback)
- Automatic PostgreSQL database creation
- Environment variables
- Build and start commands
```

**Database Configuration:**
- **Production**: Uses PostgreSQL (automatically created)
- **Development**: Can fallback to SQLite
- **Hybrid Support**: Application detects and uses available database

To use it:
1. **Push `render.yaml`** to your repository
2. **Import from GitHub** in Render Dashboard
3. **Render auto-detects** the configuration
4. **PostgreSQL database** is automatically created and connected

### Deployment Benefits

- ✅ **Automatic Deployments**: Push to GitHub → Auto-deploy
- ✅ **Free Tier Available**: Great for testing
- ✅ **PostgreSQL Included**: Managed database
- ✅ **SSL Certificates**: HTTPS by default
- ✅ **Custom Domains**: Add your own domain

## 🐳 Docker Deployment

The application supports Docker containerization with **hybrid database support** for consistent deployment across environments.

### Quick Start

**Three deployment modes available:**

```bash
# SQLite (Development)
docker-compose --profile sqlite up -d

# PostgreSQL (Production)
docker-compose --profile postgres up -d

# Hybrid (Auto-detection)
docker-compose --profile hybrid up -d
```

### Docker Files

**Included Docker configuration:**
- `Dockerfile` - Multi-stage build (builder + production)
- `docker-compose.yml` - Hybrid database deployment with profiles
- `.dockerignore` - Optimized build context
- `docker-run.sh` - Interactive deployment script
- `.env.docker.template` - Secure credential template

### Environment Configuration

**Template files provided:**
- `.env.sqlite` - SQLite development configuration
- `.env.docker` - PostgreSQL production configuration
- `.env.docker.template` - Safe template for Git commits

**Required environment variables:**
```bash
# Database Configuration
DB_TYPE=sqlite|postgres
NODE_ENV=production
PORT=3000

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Slack Integration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_CHANNEL_ID=your-channel-id
SLACK_SIGNING_SECRET=your-signing-secret

# AI Content Generation (Optional)
OPENAI_API_KEY=your_openai_key_here

# PostgreSQL (Production only)
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://postgres:password@postgres:5432/social_media_calendar
```

### Deployment Options

#### Option 1: SQLite Mode (Development)

**Best for:** Local development, testing, demos

```bash
# Start SQLite deployment
docker-compose --profile sqlite up -d

# Check logs
docker-compose logs app-sqlite

# Stop
docker-compose down
```

**Features:**
- ✅ **No external dependencies** (self-contained)
- ✅ **Fast startup** (< 30 seconds)
- ✅ **Persistent data** via Docker volumes
- ✅ **Automatic user creation** (rodrigomvsrodrigo@gmail.com)
- ✅ **Full Slack integration** (scheduled + published notifications)

#### Option 2: PostgreSQL Mode (Production)

**Best for:** Production deployments, team environments

```bash
# Start PostgreSQL deployment
docker-compose --profile postgres up -d

# Check logs
docker-compose logs app-postgres

# Check database
docker-compose logs postgres
```

**Features:**
- ✅ **Production-grade database** (PostgreSQL 15)
- ✅ **Automatic database creation** and schema setup
- ✅ **Health checks** and dependency management
- ✅ **SSL support** for cloud deployments
- ✅ **Scalable architecture** for high traffic

#### Option 3: Hybrid Mode (Auto-Detection)

**Best for:** Flexible deployments, CI/CD pipelines

```bash
# Start hybrid deployment
docker-compose --profile hybrid up -d

# Check which database was selected
docker-compose logs app-hybrid
```

**How it works:**
1. **Tries PostgreSQL first** (if available)
2. **Falls back to SQLite** (if PostgreSQL unavailable)
3. **Automatic detection** and configuration
4. **Seamless switching** between database types

### Interactive Deployment Script

**Use the included script for guided deployment:**

```bash
# Make executable and run
chmod +x docker-run.sh
bash docker-run.sh
```

**Script features:**
- 🔧 **Interactive mode selection** (SQLite/PostgreSQL/Hybrid)
- 🔒 **Security checks** for credentials
- 📋 **Environment validation**
- 🚀 **Automatic deployment**
- 📊 **Health monitoring**
- 🔄 **Detached mode support**

### Database Schema

**Automatically created tables:**
- `users` - User accounts and authentication
- `posts` - Social media posts and scheduling
- `slack_settings` - Slack integration configuration
- `notification_preferences` - User notification settings
- `social_accounts` - Connected social media accounts

#### Manual Production Setup

```bash
# 1. Clone repository
git clone https://github.com/RodrigoMvs123/Social-Media-Content-Calendar-V1.git
cd Social-Media-Content-Calendar-V1

# 2. Configure environment
cp .env.docker.template .env.docker
# Edit .env.docker with your credentials

# 3. Deploy with PostgreSQL
docker-compose --profile postgres up -d

# 4. Verify deployment
curl http://localhost:3000/api/health
```

### Troubleshooting

**Common issues and solutions:**

```bash
# Port already in use
docker-compose down
lsof -ti:3000 | xargs kill -9

# Database connection issues
docker-compose logs postgres
docker-compose restart app-postgres

# Clear all data and restart
docker-compose down -v
docker-compose --profile postgres up -d

# Check container health
docker-compose ps
docker-compose logs app-postgres
```

**Log monitoring:**
```bash
# Real-time logs
docker-compose logs -f app-postgres

# Filter specific logs
docker-compose logs app-postgres | grep "Slack notification"

# Check startup sequence
docker-compose logs app-postgres | grep "Server running"
```

### Docker Benefits

- ✅ **Hybrid Database Support** (PostgreSQL + SQLite)
- ✅ **Production Ready** (multi-stage builds, health checks)
- ✅ **Security First** (no hardcoded credentials, template system)
- ✅ **Auto-Configuration** (database schema, user accounts)
- ✅ **Full Feature Parity** (Slack integration, AI content, auth)
- ✅ **Easy Deployment** (one command setup)
- ✅ **Scalable Architecture** (container orchestration ready)
- ✅ **Development Friendly** (fast iteration, volume persistence)



