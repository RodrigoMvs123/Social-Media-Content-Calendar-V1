// Simple script to test SQLite connection
const { db, initDb } = require('./db-wrapper');

async function testSQLiteConnection() {
  try {
    console.log('Initializing SQLite database...');
    await initDb();
    
    console.log('Testing user creation...');
    const testUser = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.users.create(testUser);
    console.log('User created successfully');
    
    console.log('Testing user retrieval...');
    const user = await db.users.findByEmail('test@example.com');
    console.log('User found:', user ? 'Yes' : 'No');
    
    console.log('SQLite connection and operations successful!');
  } catch (error) {
    console.error('Error testing SQLite connection:', error);
  }
}

testSQLiteConnection();