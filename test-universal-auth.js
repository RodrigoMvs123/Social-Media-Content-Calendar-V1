const { CrossDatabaseAuthService } = require('./server/services/CrossDatabaseAuthService');

async function testUniversalAuth() {
  console.log('🧪 Testing Universal Authentication');
  console.log('==================================');
  
  const universalAuth = new CrossDatabaseAuthService();
  
  try {
    // Test 1: Find user across databases
    console.log('\n📋 Test 1: Finding user across databases');
    const userInfo = await universalAuth.findUserAcrossDBs('rodrigomvsoares@gmail.com');
    
    if (userInfo) {
      console.log('✅ User found!');
      console.log('📍 Database:', userInfo.sourceDB);
      console.log('👤 User:', userInfo.user);
    } else {
      console.log('❌ User not found in any database');
    }
    
    // Test 2: Authenticate user
    console.log('\n📋 Test 2: Universal authentication');
    const authResult = await universalAuth.authenticateUser('rodrigomvsoares@gmail.com', '123456789');
    
    if (authResult.success) {
      console.log('✅ Authentication successful!');
      console.log('📍 Source:', authResult.source);
      console.log('🔄 Migrated:', authResult.migrated);
      console.log('👤 User:', authResult.user);
      if (authResult.message) {
        console.log('💬 Message:', authResult.message);
      }
    } else {
      console.log('❌ Authentication failed:', authResult.error);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testUniversalAuth();