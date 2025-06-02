import { WebClient, type ChatPostMessageArguments } from "@slack/web-api";
import { Post } from "../shared/schema";
import { format } from "date-fns";

// Initialize Slack client with bot token from environment variables
const botToken = process.env.SLACK_BOT_TOKEN;
const channelId = process.env.SLACK_CHANNEL_ID;

// Create a Slack client if token is available
const slack = botToken ? new WebClient(botToken) : null;

/**
 * Send a notification to Slack about a new scheduled post
 */
export async function notifyNewPost(post: Post): Promise<void> {
  try {
    if (!slack || !channelId) {
      console.warn("Cannot send Slack notification: Slack client or channel ID not configured");
      return;
    }

    const formattedDate = format(new Date(post.scheduledTime), "MMM d, yyyy 'at' h:mm a");
    
    // Create a formatted message for Slack
    const message: ChatPostMessageArguments = {
      channel: channelId,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🗓️ New Social Media Post Scheduled",
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Platform:*\n${post.platform}`
            },
            {
              type: "mrkdwn",
              text: `*Status:*\n${post.status || "scheduled"}`
            },
            {
              type: "mrkdwn",
              text: `*Scheduled for:*\n${formattedDate}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Content:*\n${post.content}`
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Posted by Social Media Calendar App • ID: ${post.id}`
            }
          ]
        }
      ]
    };

    // Send the message
    if (slack) {
      await slack.chat.postMessage(message);
    }
    console.log("Slack notification sent successfully");
  } catch (error) {
    console.error("Error sending Slack notification:", error);
  }
}

/**
 * Get messages from a Slack channel
 */
export async function getSlackMessages(limit: number = 10): Promise<any> {
  try {
    if (!slack || !channelId) {
      console.warn("Cannot fetch Slack messages: Slack client or channel ID not configured");
      return [];
    }

    // This check is already done above, but TypeScript needs it here as well
    if (!slack) return [];
    
    const result = await slack.conversations.history({
      channel: channelId,
      limit
    });

    return result.messages || [];
  } catch (error) {
    console.error("Error fetching Slack messages:", error);
    return [];
  }
}