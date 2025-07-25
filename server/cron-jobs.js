const cron = require('node-cron');
const { sendDailyDigest } = require('./notification-service');

// Schedule daily digest at 8:00 AM every day
cron.schedule('0 8 * * *', async () => {
  console.log('🕐 Running daily digest cron job...');
  try {
    await sendDailyDigest();
    console.log('✅ Daily digest cron job completed');
  } catch (error) {
    console.error('❌ Daily digest cron job failed:', error);
  }
});

// For testing: run every minute (comment out in production)
// cron.schedule('* * * * *', async () => {
//   console.log('🕐 Running test daily digest...');
//   await sendDailyDigest();
// });

console.log('📅 Cron jobs initialized - Daily digest scheduled for 8:00 AM');

module.exports = {};