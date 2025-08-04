// Test script to directly call the Slack preferences API
const testSlackPreferences = async () => {
  try {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyIiwiaWF0IjoxNzU0MzI4NzI5fQ.YhVQOCOKhJhJhVQOCOKhJhJhVQOCOKhJhJhVQOCOKhJh'; // Replace with actual token
    
    console.log('🧪 Testing Slack preferences API...');
    
    const response = await fetch('http://localhost:3001/api/slack/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        slackScheduled: true,
        slackPublished: true,
        slackFailed: true
      })
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response body:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
};

testSlackPreferences();