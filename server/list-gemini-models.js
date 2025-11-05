const dotenv = require('dotenv');
dotenv.config();
dotenv.config({ path: '../.env' });

async function listModels() {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    const models = await gemini.listModels();
    console.log('Available Gemini models:');
    models.forEach(model => {
      console.log(`- ${model.name} (${model.displayName})`);
    });
  } catch (error) {
    console.error('Error listing models:', error.message);
  }
}

listModels();