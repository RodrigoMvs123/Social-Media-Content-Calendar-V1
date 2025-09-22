const { sendEmailNotification } = require('./email-service');

async function testEmail() {
  try {
    await sendEmailNotification(
      'rodrigomvsrodrigo@gmail.com',
      '🧪 Test Email from Social Media Calendar',
      '<h2>Test Email</h2><p>If you receive this, email notifications are working!</p>'
    );
    console.log('✅ Test email completed');
  } catch (error) {
    console.error('❌ Test email failed:', error);
  }
  process.exit(0);
}

testEmail();