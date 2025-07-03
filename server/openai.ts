import OpenAI from "openai";
import { type Post } from "../shared/schema";

// Initialize OpenAI client with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use gpt-3.5-turbo by default since it's more cost-effective
// The newest OpenAI model is "gpt-4o" which was released May 13, 2024
const MODEL = "gpt-3.5-turbo";

/**
 * Generate social media content based on a prompt
 * @param prompt User's prompt for content generation
 * @param platform The social media platform for which to generate content
 * @returns Generated content as a string
 */
export async function generateContent(prompt: string, platform: string): Promise<string> {
  try {
    // Create a platform-specific system message
    const systemMessage = createPlatformPrompt(platform);
    
    // Prepare the conversation
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract and return the generated content
    return response.choices[0].message.content || "Unable to generate content.";
  } catch (error) {
    console.error("Error generating content with OpenAI:", error);
    throw new Error("Failed to generate content. Please try again later.");
  }
}

/**
 * Generate a batch of social media content ideas
 * @param topic The general topic or theme for content ideas
 * @param count Number of ideas to generate
 * @returns An array of content ideas
 */
export async function generateContentIdeas(topic: string, count: number = 5): Promise<string[]> {
  try {
    const prompt = `Generate ${count} creative social media content ideas about "${topic}". Each idea should be concise and engaging.`;
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { 
          role: "system", 
          content: "You are a creative social media marketing expert. Generate numbered, concise content ideas that are catchy and shareable." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 600,
      response_format: { type: "json_object" }
    });

    // Try to parse the response as JSON
    try {
      const content = response.choices[0].message.content || "";
      const parsedContent = JSON.parse(content);
      
      if (Array.isArray(parsedContent.ideas)) {
        return parsedContent.ideas.slice(0, count);
      } else {
        // Fallback to text parsing if JSON structure isn't as expected
        return parseTextContentIdeas(content, count);
      }
    } catch (parseError) {
      // Fallback to text parsing if JSON parsing fails
      const content = response.choices[0].message.content || "";
      return parseTextContentIdeas(content, count);
    }
  } catch (error) {
    console.error("Error generating content ideas with OpenAI:", error);
    throw new Error("Failed to generate content ideas. Please try again later.");
  }
}

/**
 * Create a platform-specific system prompt for content generation
 */
function createPlatformPrompt(platform: string): string {
  const platformPrompts: Record<string, string> = {
    Twitter: "You are a social media expert who crafts engaging tweets. Write concise content under 280 characters that is attention-grabbing and shareable. Use hashtags sparingly and effectively.",
    
    LinkedIn: "You are a professional content creator for LinkedIn. Create insightful, value-driven content that demonstrates thought leadership. Use a professional tone while remaining conversational. Focus on business insights, career development, or industry trends.",
    
    Instagram: "You are an Instagram content specialist. Create visually descriptive, emotionally engaging captions that complement images. Use a conversational, authentic tone. Include relevant hashtags at the end of the content.",
    
    Facebook: "You are a Facebook content creator. Write engaging, shareable content that encourages conversation. Use a friendly, conversational tone. Content can be longer than other platforms but still focused and purposeful.",
    
    // Default prompt if platform is not recognized
    default: "You are a social media content creator. Write engaging, platform-appropriate content that resonates with the audience and encourages engagement."
  };
  
  return platformPrompts[platform] || platformPrompts.default;
}

/**
 * Parse text content to extract ideas when JSON parsing fails
 */
function parseTextContentIdeas(content: string, count: number): string[] {
  const ideas: string[] = [];
  
  // Split by lines first
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  for (const line of lines) {
    // Remove any numbering at the start of the line
    const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
    if (cleanLine && !ideas.includes(cleanLine) && ideas.length < count) {
      ideas.push(cleanLine);
    }
  }
  
  // If we still don't have enough ideas, try to extract from the content directly
  if (ideas.length < count) {
    // Split by periods
    const sentences = content.split('.').filter(s => s.trim() !== '');
    for (const sentence of sentences) {
      const cleanSentence = sentence.trim();
      if (cleanSentence && !ideas.includes(cleanSentence) && ideas.length < count) {
        ideas.push(cleanSentence);
      }
    }
  }
  
  return ideas.slice(0, count);
}

/**
 * Analyze the sentiment of a post content
 */
export async function analyzeSentiment(content: string): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative',
  score: number,
  feedback?: string
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a social media sentiment analysis expert. Analyze the sentiment of the given content and provide a rating from -1 (very negative) to 1 (very positive), along with brief feedback. Respond with JSON in this format: { 'sentiment': 'positive|neutral|negative', 'score': number, 'feedback': 'brief explanation' }"
        },
        {
          role: "user",
          content: content
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      sentiment: result.sentiment || 'neutral',
      score: typeof result.score === 'number' ? result.score : 0,
      feedback: result.feedback
    };
  } catch (error) {
    console.error("Error analyzing sentiment with OpenAI:", error);
    return {
      sentiment: 'neutral',
      score: 0,
      feedback: "Unable to analyze sentiment at this time."
    };
  }
}

/**
 * Generate an optimized version of the post
 */
export async function optimizePost(post: Partial<Post>): Promise<string> {
  try {
    const platform = post.platform || 'general';
    const content = post.content || '';
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a social media optimization expert for ${platform}. Improve the given content to maximize engagement while maintaining the original message and intent. Make it more engaging, clearer, and optimized for the platform.`
        },
        {
          role: "user",
          content: `Please optimize this ${platform} post: "${content}"`
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content || content;
  } catch (error) {
    console.error("Error optimizing post with OpenAI:", error);
    throw new Error("Failed to optimize post. Please try again later.");
  }
}