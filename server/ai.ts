import { Configuration, OpenAIApi } from 'openai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from both locations
dotenv.config(); // Load from server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') }); // Load from root directory

// Log that we're loading the API key (without revealing it)
console.log(`OpenAI API Key status: ${process.env.OPENAI_API_KEY ? 'Loaded' : 'NOT FOUND'}`);

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export async function generateContent(prompt: string, platform: string) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found in environment variables');
      throw new Error('API key not configured');
    }
    
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a social media content creator for ${platform}. Create engaging, platform-appropriate content.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.data.choices[0].message?.content || "Could not generate content.";
  } catch (error) {
    console.error('Error generating content with OpenAI:', error);
    throw new Error('Failed to generate content');
  }
}

export async function generateIdeas(topic: string) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found in environment variables');
      throw new Error('API key not configured');
    }
    
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a creative content strategist. Generate 5 engaging social media content ideas."
        },
        {
          role: "user",
          content: `Generate 5 social media content ideas about ${topic}. Format as a list.`
        }
      ],
      max_tokens: 500,
      temperature: 0.8,
    });

    const response = completion.data.choices[0].message?.content || "";
    // Parse the response to extract the ideas
    const ideas = response
      .split(/\d+\./)
      .map(idea => idea.trim())
      .filter(idea => idea.length > 0);

    return ideas;
  } catch (error) {
    console.error('Error generating ideas with OpenAI:', error);
    throw new Error('Failed to generate ideas');
  }
}