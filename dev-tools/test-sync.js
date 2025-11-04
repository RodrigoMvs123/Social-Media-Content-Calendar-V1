const { DatabaseFactory } = require('./cross-db-persistence/database/DatabaseFactory');
require('dotenv').config();

async function testSync() {
  try {
    console.log('🧪 Testing bidirectional sync...');
    
    // Test 1: Create post in SQLite, should sync to PostgreSQL
    console.log('\n📝 Test 1: Creating post in SQLite...');
    process.env.DB_TYPE = 'sqlite';
    const sqliteDb = await DatabaseFactory.createAdapter({ type: 'sqlite' });
    
    const testPost = {
      userId: '2',
      platform: 'X',
      content: 'Test sync post from SQLite',
      scheduledTime: new Date().toISOString(),
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const createdPost = await sqliteDb.posts.create(testPost);
    console.log('✅ Post created in SQLite:', createdPost.id);
    
    // Wait a moment for sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if it synced to PostgreSQL
    console.log('\n🔍 Checking if post synced to PostgreSQL...');
    process.env.DB_TYPE = 'postgres';
    const postgresDb = await DatabaseFactory.createAdapter({ type: 'postgres' });
    
    const syncedPost = await postgresDb.posts.findById(createdPost.id);
    if (syncedPost) {
      console.log('✅ Post found in PostgreSQL:', syncedPost.content);
    } else {
      console.log('❌ Post NOT found in PostgreSQL');
    }
    
    // Test 2: Create post in PostgreSQL, should sync to SQLite
    console.log('\n📝 Test 2: Creating post in PostgreSQL...');
    const testPost2 = {
      userId: '2',
      platform: 'Facebook',
      content: 'Test sync post from PostgreSQL',
      scheduledTime: new Date().toISOString(),
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const createdPost2 = await postgresDb.posts.create(testPost2);
    console.log('✅ Post created in PostgreSQL:', createdPost2.id);
    
    // Wait a moment for sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if it synced to SQLite
    console.log('\n🔍 Checking if post synced to SQLite...');
    const syncedPost2 = await sqliteDb.posts.findById(createdPost2.id);
    if (syncedPost2) {
      console.log('✅ Post found in SQLite:', syncedPost2.content);
    } else {
      console.log('❌ Post NOT found in SQLite');
    }
    
    console.log('\n🎉 Sync test completed!');
    
  } catch (error) {
    console.error('❌ Sync test failed:', error.message);
  }
}

testSync();