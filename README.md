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
   cp .env.example .env
   ```
   Then edit the `.env` file with your credentials and preferred database option.

4. Start the application:
   ```
   npm run dev
   ```

   This will start both the frontend (http://localhost:5173) and backend (http://localhost:3001) servers.

5. Open your browser to http://localhost:5173

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
   - Twitter: [Twitter Developer Portal](https://developer.twitter.com/)
   - LinkedIn: [LinkedIn Developer Portal](https://developer.linkedin.com/)
   - Facebook/Instagram: [Meta for Developers](https://developers.facebook.com/)

2. Create an application in their developer portals

3. Configure the redirect URLs to point to your application:
   - Example: `http://localhost:3001/oauth/callback/twitter`

4. Copy the client ID and secret to your `.env` file

5. Set `OAUTH_REDIRECT_URI` in your `.env` file

The application is already configured to use these credentials when available.

## Features

- **Calendar Views**: Month, List, and Grid views for visualizing your content schedule
- **Post Management**: Create, edit, and delete posts across multiple platforms
- **AI Content Generation**: Generate content ideas and full posts with AI assistance
- **Multi-Platform Support**: Schedule posts for Twitter, LinkedIn, Facebook, and Instagram
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