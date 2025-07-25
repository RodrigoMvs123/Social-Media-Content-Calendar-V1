const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter using Ethereal Email (fake SMTP for testing)
const createTransporter = async () => {
  // Generate test SMTP service account from ethereal.email
  const testAccount = await nodemailer.createTestAccount();
  
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

// Send email notification using Ethereal Email
async function sendEmailNotification(to, subject, htmlContent) {
  try {
    console.log('📧 Sending email via Ethereal Email to:', to);
    
    const transporter = await createTransporter();
    
    const mailOptions = {
      from: '"Social Media Calendar" <noreply@socialmedia.app>',
      to: to,
      subject: subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ EMAIL SENT successfully!');
    console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(result));
    console.log('📧 Subject:', subject);
    console.log('📧 To:', to);
    
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    // Don't throw error to avoid breaking post creation
  }
}

// Email templates
const emailTemplates = {
  postPublished: (post) => `
    <h2>🎉 Post Published Successfully</h2>
    <p><strong>Platform:</strong> ${post.platform}</p>
    <p><strong>Content:</strong> ${post.content}</p>
    <p><strong>Published at:</strong> ${new Date().toLocaleString()}</p>
  `,
  
  postFailed: (post, error) => `
    <h2>❌ Post Failed to Publish</h2>
    <p><strong>Platform:</strong> ${post.platform}</p>
    <p><strong>Content:</strong> ${post.content}</p>
    <p><strong>Error:</strong> ${error}</p>
    <p><strong>Scheduled for:</strong> ${new Date(post.scheduledTime).toLocaleString()}</p>
  `,
  
  dailyDigest: (posts) => `
    <h2>📅 Daily Digest - Upcoming Posts</h2>
    <p>You have ${posts.length} posts scheduled for today:</p>
    ${posts.map(post => `
      <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0;">
        <p><strong>${post.platform}</strong> - ${new Date(post.scheduledTime).toLocaleTimeString()}</p>
        <p>${post.content}</p>
      </div>
    `).join('')}
  `
};

module.exports = {
  sendEmailNotification,
  emailTemplates
};