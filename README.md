# Social Media Content Calendar

A modern web application for planning and scheduling social media content across multiple platforms.

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
   ```
   # Copy the example files to both root and server directories
   cp .env.example .env
   cp .env.example server/.env
   ```
   Then edit both `.env` files with your credentials and preferred database option.

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

The application uses OpenAI's API to generate social media content:

1. **Setup**:
   - Get an API key from [OpenAI](https://platform.openai.com/)
   - Add your API key to both `.env` files: `OPENAI_API_KEY=your_api_key_here`

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

This application supports two modes for social media integration:

### Demo Mode
- Simulates connections without real authentication
- Enter any username/password to connect
- Perfect for testing and development
- No developer accounts or API credentials required

### OAuth Mode (For Real Integration)
To use real social media integration:

1. Register as a developer on each platform:
   - X (formerly Twitter): [X Developer Portal](https://developer.twitter.com/)
   - LinkedIn: [LinkedIn Developer Portal](https://developer.linkedin.com/)
   - Facebook/Instagram: [Meta for Developers](https://developers.facebook.com/)

2. Create an application in their developer portals

3. Configure the redirect URLs to point to your application:
   - Example: `http://localhost:3001/oauth/callback/twitter`

4. Copy the client ID and secret to **both** `.env` files (root and server directory):
   ```
   # X (formerly Twitter) OAuth credentials
   TWITTER_CLIENT_ID=your_x_client_id
   TWITTER_CLIENT_SECRET=your_x_client_secret

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

   > **Important**: You must add these credentials to both the root `.env` file AND the `server/.env` file, as Node.js sometimes only checks for the nearest environment file.

5. Set `OAUTH_REDIRECT_URI` in both `.env` files:
   ```
   OAUTH_REDIRECT_URI=http://localhost:3001/oauth/callback
   ```

6. Set `CLIENT_URL` in both `.env` files:
   ```
   CLIENT_URL=http://localhost:3000
   ```

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