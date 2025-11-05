const { generateContent, generateIdeas } = require('./ai.ts');

async function testGemini() {
  console.log('🧪 Testing Gemini AI Integration...\n');
  
  try {
    // Test content generation
    console.log('1. Testing content generation...');
    const content = await generateContent('Create a post about sustainable living tips', 'Instagram');
    console.log('✅ Generated content:', content);
    console.log('📏 Length:', content.length, 'characters\n');
    
    // Test idea generation
    console.log('2. Testing idea generation...');
    const ideas = await generateIdeas('artificial intelligence');
    console.log('✅ Generated ideas:');
    ideas.forEach((idea, index) => {
      console.log(`   ${index + 1}. ${idea}`);
    });
    
    console.log('\n🎉 Gemini integration test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGemini();