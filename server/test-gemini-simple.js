const dotenv = require('dotenv');
dotenv.config();
dotenv.config({ path: '../.env' });

async function testGemini() {
  console.log('🧪 Testing Gemini AI Integration...\n');
  
  const hasGemini = !!process.env.GOOGLE_API_KEY;
  console.log('Gemini API Key:', hasGemini ? 'Found' : 'NOT FOUND');
  
  if (!hasGemini) {
    console.log('❌ No Gemini API key found. Please set GOOGLE_API_KEY in .env file');
    return;
  }
  
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = gemini.getGenerativeModel({ model: 'gemini-pro' });
    
    console.log('1. Testing content generation...');
    const result = await model.generateContent('Create a short Instagram post about sustainable living tips under 200 characters');
    const response = await result.response;
    const content = response.text();
    
    console.log('✅ Generated content:', content);
    console.log('📏 Length:', content.length, 'characters\n');
    
    console.log('🎉 Gemini integration test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGemini();