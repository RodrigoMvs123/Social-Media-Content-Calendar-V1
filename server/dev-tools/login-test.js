// Script to test login with the test user
const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('Testing login with test user...');
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Login successful!');
      console.log('User:', data.user);
      console.log('Token:', data.token);
      console.log('\nTo use this token in your browser:');
      console.log('1. Open browser developer tools (F12)');
      console.log('2. Go to Console tab');
      console.log('3. Run this command:');
      console.log(`   localStorage.setItem('token', '${data.token}')`);
      console.log('4. Refresh the page');
    } else {
      console.error('Login failed:', data.error);
    }
  } catch (error) {
    console.error('Error testing login:', error);
  }
}

testLogin();