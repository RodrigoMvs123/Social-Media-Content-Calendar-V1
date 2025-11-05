import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from both locations
dotenv.config(); // Load from server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') }); // Load from root directory

// Check which AI service is configured
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasClaude = !!process.env.CLAUDE_API_KEY;
const hasGemini = !!process.env.GOOGLE_API_KEY;

console.log(`AI Services - OpenAI: ${hasOpenAI ? 'Loaded' : 'NOT FOUND'}, Claude: ${hasClaude ? 'Loaded' : 'NOT FOUND'}, Gemini: ${hasGemini ? 'Loaded' : 'NOT FOUND'}`);

const openai = hasOpenAI ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const gemini = hasGemini ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;

// Claude API call function
async function callClaudeAPI(prompt: string, platform: string, maxTokens: number) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: `Create a ${platform} post under ${getPlatformCharLimit(platform)} characters. Be concise and engaging.\n\nPrompt: ${prompt}`
      }]
    })
  });
  
  const data = await response.json() as any;
  if (!response.ok) throw new Error(data.error?.message || 'Claude API error');
  return data.content[0].text;
}

// Gemini API call function
async function callGeminiAPI(prompt: string, platform: string) {
  if (!gemini) throw new Error('Gemini not initialized');
  
  const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const charLimit = getPlatformCharLimit(platform);
  
  const fullPrompt = `Create a ${platform} social media post under ${charLimit} characters. Be concise, engaging, and platform-appropriate.\n\nPrompt: ${prompt}`;
  
  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  return response.text();
}

function getPlatformCharLimit(platform: string): number {
  const limits = { 'x': 280, 'twitter': 280, 'linkedin': 3000, 'facebook': 2000, 'instagram': 2200 };
  return limits[platform.toLowerCase()] || 280;
}

export async function generateContent(prompt: string, platform: string) {
  try {
    if (!hasOpenAI && !hasClaude && !hasGemini) {
      console.warn('No AI API keys found - using fallback content');
      return getFallbackContent(prompt, platform);
    }
    
    const charLimit = getPlatformCharLimit(platform);
    const maxTokens = Math.min(Math.ceil(charLimit / 3), 100);
    
    console.log(`Generating content for ${platform} (max ${charLimit} chars, ${maxTokens} tokens)`);
    
    let content: string;
    
    // Try Gemini first (generous free tier), then Claude, then OpenAI
    if (hasGemini) {
      console.log('Using Gemini API (Google)');
      content = await callGeminiAPI(prompt, platform);
    } else if (hasClaude) {
      console.log('Using Claude API');
      content = await callClaudeAPI(prompt, platform, maxTokens);
    } else if (hasOpenAI && openai) {
      console.log('Using OpenAI API');
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Create a ${platform} post under ${charLimit} characters. Be concise and engaging.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });
      content = completion.choices[0].message?.content || "Could not generate content.";
    } else {
      throw new Error('No AI service available');
    }

    console.log(`Generated content: ${content.length} characters`);
    return content;
  } catch (error: any) {
    console.error('AI API Error:', error.message);
    
    // Handle specific error types
    if (error.code === 'insufficient_quota') {
      console.log('⚠️ AI quota exceeded - using fallback content');
    } else if (error.code === 'invalid_api_key') {
      console.log('⚠️ Invalid AI API key - using fallback content');
    }
    
    return getFallbackContent(prompt, platform);
  }
}

// Fallback content generator when OpenAI is unavailable
function getFallbackContent(prompt: string, platform: string): string {
  const templates = {
    'x': [
      `🚀 Excited to share: ${prompt.substring(0, 50)}... What do you think? #Innovation`,
      `💡 New insight: ${prompt.substring(0, 60)}... Let's discuss! #Ideas`,
      `🎯 Focus on: ${prompt.substring(0, 70)}... #Goals #Success`
    ],
    'linkedin': [
      `I'm excited to share some thoughts on ${prompt.substring(0, 30)}...\n\nThis topic has been on my mind lately, and I believe it's worth discussing with my network. What are your thoughts?\n\n#Professional #Insights`,
      `Here's what I've learned about ${prompt.substring(0, 40)}...\n\nKey takeaways:\n• Important consideration\n• Valuable insight\n• Actionable next step\n\nWhat's your experience with this?`,
    ],
    'facebook': [
      `Hey everyone! 👋\n\nI wanted to share something about ${prompt.substring(0, 50)}...\n\nIt's amazing how much we can learn when we take the time to explore new ideas. What do you think about this?`,
      `Thinking about ${prompt.substring(0, 60)}... 🤔\n\nSometimes the best insights come from the simplest observations. Would love to hear your thoughts on this!`
    ],
    'instagram': [
      `✨ ${prompt.substring(0, 40)}... ✨\n\n📸 Capturing moments that matter\n💭 Sharing thoughts that inspire\n🌟 Creating content that connects\n\n#Inspiration #Content #Social`,
      `🎨 Creative thoughts on ${prompt.substring(0, 30)}...\n\n🔥 What inspires you today?\n💫 Share your perspective below!\n\n#Creative #Inspiration #Community`
    ]
  };
  
  const platformKey = platform.toLowerCase();
  const platformTemplates = templates[platformKey] || templates['x'];
  const randomTemplate = platformTemplates[Math.floor(Math.random() * platformTemplates.length)];
  
  return randomTemplate;
}

export async function generateIdeas(topic: string) {
  try {
    if (!hasOpenAI && !hasClaude && !hasGemini) {
      console.warn('No AI API keys found - using fallback ideas');
      return getFallbackIdeas(topic);
    }
    
    let response: string;
    
    // Try Gemini first, then Claude, then OpenAI
    if (hasGemini && gemini) {
      console.log('Using Gemini API for ideas');
      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(`Generate exactly 5 short social media content ideas about ${topic}. Format as a numbered list.`);
      const geminiResponse = await result.response;
      response = geminiResponse.text();
    } else if (hasClaude) {
      console.log('Using Claude API for ideas');
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 150,
          messages: [{
            role: 'user',
            content: `Generate exactly 5 short social media content ideas about ${topic}. Format as a numbered list.`
          }]
        })
      });
      const data = await claudeResponse.json() as any;
      if (!claudeResponse.ok) throw new Error(data.error?.message || 'Claude API error');
      response = data.content[0].text;
    } else if (hasOpenAI && openai) {
      console.log('Using OpenAI API for ideas');
      const completion = await openai.chat.completions.create({
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
      max_tokens: 150,
      temperature: 0.8,
    });

      response = completion.choices[0].message?.content || "";
    } else {
      throw new Error('No AI service available');
    }

    // Parse the response to extract the ideas
    const ideas = response
      .split(/\d+\./)
      .map(idea => idea.trim())
      .filter(idea => idea.length > 0);

    return ideas;
  } catch (error: any) {
    console.error('AI API Error for ideas:', error.message);
    return getFallbackIdeas(topic);
  }
}

function getFallbackIdeas(topic: string): string[] {
  return [
    `5 ways to improve your ${topic} strategy`,
    `The future of ${topic} - what to expect`,
    `How to get started with ${topic}`,
    `Common ${topic} mistakes to avoid`,
    `Why ${topic} matters for your business`
  ];
}