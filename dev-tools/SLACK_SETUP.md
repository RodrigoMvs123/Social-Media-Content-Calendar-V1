# Slack Bidirectional Sync Setup

## Current Status
✅ **Webapp → Slack**: Delete post from dashboard → Slack message deleted  
❌ **Slack → Webapp**: Delete Slack message → Post NOT deleted (needs setup)

## Required: Configure Slack Event Subscriptions

### Step 1: Get Your Production URL
Your app is deployed at: **https://social-media-content-calendar-v1.onrender.com**

### Step 2: Configure Slack App
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your Slack app
3. Go to **"Event Subscriptions"** in the sidebar
4. **Enable Events** → Toggle ON
5. **Request URL**: Enter this exact URL:
   ```
   https://social-media-content-calendar-v1.onrender.com/api/slack/events
   ```
6. Wait for Slack to verify the URL (should show ✅ Verified)

### Step 3: Subscribe to Events
In the same Event Subscriptions page:
1. **Subscribe to bot events** → Click "Add Bot User Event"
2. Add these events:
   - `message.channels` (to detect message deletions in channels)
   - `message.groups` (to detect message deletions in private channels)
3. **Save Changes**

### Step 4: Reinstall App (Important!)
After adding events, you MUST reinstall the app:
1. Go to **"Install App"** in sidebar
2. Click **"Reinstall to Workspace"**
3. Authorize the new permissions

## Test the Setup

### Test 1: Check Webhook Endpoint
Visit this URL in your browser:
```
https://social-media-content-calendar-v1.onrender.com/api/slack/events
```
Should return: `{"message":"Slack events endpoint is reachable"}`

### Test 2: Test Bidirectional Sync
1. **Create a post** in the webapp → Should send Slack notification
2. **Delete the Slack message** → Should delete post from webapp
3. **Check server logs** for: `🗑️ Message deleted in Slack`

## Troubleshooting

### If webhook verification fails:
- Make sure your production app is running
- Check that the URL is exactly: `/api/slack/events`
- Verify no typos in the domain name

### If events aren't received:
- Ensure you reinstalled the app after adding events
- Check that the bot is in the channel where you're deleting messages
- Verify the bot has `channels:history` permission

### Check Server Logs
After setup, server logs will show:
```
📨 Slack webhook received: {...}
🗑️ Message deleted in Slack, timestamp: 1234567890.123
🗑️ Deleted 1 post(s) from PostgreSQL database
```

## Production URL
Your webhook endpoint: `https://social-media-content-calendar-v1.onrender.com/api/slack/events`