// Debug script to test post creation API
const fetch = require('node-fetch');

async function testPostCreation() {
  try {
    console.log('Testing post creation API...');
    
    const testPost = {
      userId: "test-user-id", // This should match a user ID in your system
      platform: "twitter",
      content: "This is a test post from debug script",
      scheduledTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      status: "scheduled"
    };
    
    console.log('Sending post data:', testPost);
    
    const response = await fetch('http://localhost:3001/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPost)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error: ${response.status}`, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Post created successfully:', data);
    
  } catch (error) {
    console.error('Error testing post creation:', error);
  }
}

testPostCreation();