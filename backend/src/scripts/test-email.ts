import dotenv from 'dotenv';
import path from 'path';
import {
  sendEmail,
  sendProjectInvitationEmail,
  sendSubscriptionConfirmationEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionExpiredEmail,
  sendSubscriptionExpiringEmail,
  sendPlanDowngradeEmail
} from '../services/emailService';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const TEST_EMAIL = 'lucas.froeschner@gmail.com';

async function testBasicEmail() {
  console.log('\n📧 Testing basic email...');
  try {
    await sendEmail({
      to: TEST_EMAIL,
      subject: 'Test Email - Dev Codex Email Service',
      text: 'This is a test email from your Dev Codex email service. If you receive this, your email configuration is working!',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from your <strong>Dev Codex</strong> email service.</p>
        <p>If you receive this, your email configuration is working! ✅</p>
      `
    });
    console.log('✅ Basic email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to send basic email:', error);
    return false;
  }
}

async function testProjectInvitation() {
  console.log('\n📧 Testing project invitation email...');
  try {
    await sendProjectInvitationEmail(
      TEST_EMAIL,
      'Lucas Test',
      'Email Test Project',
      'test-token-123',
      'admin'
    );
    console.log('✅ Project invitation email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to send project invitation email:', error);
    return false;
  }
}

async function testSubscriptionConfirmation() {
  console.log('\n📧 Testing subscription confirmation email...');
  try {
    await sendSubscriptionConfirmationEmail(
      TEST_EMAIL,
      'Lucas',
      'pro'
    );
    console.log('✅ Subscription confirmation email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to send subscription confirmation email:', error);
    return false;
  }
}

async function testSubscriptionCancelled() {
  console.log('\n📧 Testing subscription cancelled email...');
  try {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    await sendSubscriptionCancelledEmail(
      TEST_EMAIL,
      'Lucas',
      'pro',
      endDate
    );
    console.log('✅ Subscription cancelled email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to send subscription cancelled email:', error);
    return false;
  }
}

async function testSubscriptionExpired() {
  console.log('\n📧 Testing subscription expired email...');
  try {
    await sendSubscriptionExpiredEmail(
      TEST_EMAIL,
      'Lucas',
      'pro'
    );
    console.log('✅ Subscription expired email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to send subscription expired email:', error);
    return false;
  }
}

async function testSubscriptionExpiring() {
  console.log('\n📧 Testing subscription expiring email...');
  try {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);
    await sendSubscriptionExpiringEmail(
      TEST_EMAIL,
      'Lucas',
      'pro',
      expirationDate
    );
    console.log('✅ Subscription expiring email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to send subscription expiring email:', error);
    return false;
  }
}

async function testPlanDowngrade() {
  console.log('\n📧 Testing plan downgrade email...');
  try {
    await sendPlanDowngradeEmail(
      TEST_EMAIL,
      'Lucas',
      'premium',
      'pro'
    );
    console.log('✅ Plan downgrade email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to send plan downgrade email:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting email service tests...');
  console.log(`📬 All test emails will be sent to: ${TEST_EMAIL}\n`);

  // Check for email configuration
  console.log('⚙️  Email Configuration:');
  console.log(`   RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`   SMTP_USER: ${process.env.SMTP_USER ? '✅ Set' : '❌ Not set'}`);
  console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '✅ Set' : '❌ Not set'}`);
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'smtp.gmail.com (default)'}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || '587 (default)'}`);

  if (!process.env.RESEND_API_KEY && !process.env.SMTP_USER) {
    console.error('\n❌ ERROR: No email service configured!');
    console.error('Please set either RESEND_API_KEY or SMTP credentials in your .env file.');
    process.exit(1);
  }

  const results = {
    basicEmail: await testBasicEmail(),
    projectInvitation: await testProjectInvitation(),
    subscriptionConfirmation: await testSubscriptionConfirmation(),
    subscriptionCancelled: await testSubscriptionCancelled(),
    subscriptionExpired: await testSubscriptionExpired(),
    subscriptionExpiring: await testSubscriptionExpiring(),
    planDowngrade: await testPlanDowngrade()
  };

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 All email tests passed! Check your inbox at', TEST_EMAIL);
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0];

(async () => {
  try {
    if (!testType || testType === 'all') {
      await runAllTests();
    } else {
      console.log(`🚀 Testing ${testType} email...`);
      console.log(`📬 Test email will be sent to: ${TEST_EMAIL}\n`);

      switch (testType) {
        case 'basic':
          await testBasicEmail();
          break;
        case 'invitation':
          await testProjectInvitation();
          break;
        case 'subscription-confirmation':
          await testSubscriptionConfirmation();
          break;
        case 'subscription-cancelled':
          await testSubscriptionCancelled();
          break;
        case 'subscription-expired':
          await testSubscriptionExpired();
          break;
        case 'subscription-expiring':
          await testSubscriptionExpiring();
          break;
        case 'plan-downgrade':
          await testPlanDowngrade();
          break;
        default:
          console.error(`❌ Unknown test type: ${testType}`);
          console.log('\nAvailable test types:');
          console.log('  - all (default)');
          console.log('  - basic');
          console.log('  - invitation');
          console.log('  - subscription-confirmation');
          console.log('  - subscription-cancelled');
          console.log('  - subscription-expired');
          console.log('  - subscription-expiring');
          console.log('  - plan-downgrade');
          process.exit(1);
      }

      console.log('\n✅ Test complete! Check your inbox at', TEST_EMAIL);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
})();
