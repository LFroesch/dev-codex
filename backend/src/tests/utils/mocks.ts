/**
 * Mock Stripe for billing tests
 */
export function getMockStripe() {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'cus_mock_customer_id',
        email: 'test@example.com'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'cus_mock_customer_id',
        email: 'test@example.com',
        subscriptions: {
          data: []
        }
      })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_mock_session_id',
          url: 'https://checkout.stripe.com/mock_session'
        })
      }
    },
    subscriptions: {
      list: jest.fn().mockResolvedValue({
        data: []
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_mock_subscription_id',
        status: 'active',
        items: {
          data: [{
            price: {
              lookup_key: 'premium_monthly'
            }
          }]
        }
      }),
      cancel: jest.fn().mockResolvedValue({
        id: 'sub_mock_subscription_id',
        status: 'canceled'
      })
    },
    webhooks: {
      constructEvent: jest.fn().mockImplementation(() => {
        throw new Error('Invalid signature');
      })
    }
  }));
}

/**
 * Mock unified email service for email tests
 */
export function setupEmailServiceMock() {
  const mockSendEmail = jest.fn().mockResolvedValue(undefined);

  jest.mock('../../services/emailService', () => ({
    sendEmail: mockSendEmail
  }));

  return mockSendEmail;
}

/**
 * @deprecated Use setupEmailServiceMock() instead - nodemailer is no longer used
 */
export function setupNodemailerMock() {
  const mockCreateTransport = jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  }));

  jest.mock('nodemailer', () => ({
    default: {
      createTransport: mockCreateTransport
    },
    createTransport: mockCreateTransport
  }));

  return mockCreateTransport;
}

/**
 * Mock NotificationService
 */
export function getMockNotificationService() {
  return {
    getNotifications: jest.fn(),
    createNotification: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    clearAllNotifications: jest.fn(),
    hasRecentNotification: jest.fn(),
    createBulkNotifications: jest.fn()
  };
}

/**
 * Setup environment variables for tests
 */
export function setupTestEnv() {
  process.env.SUPPORT_EMAIL = 'support@test.com';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.NODE_ENV = 'test';

  // CRITICAL: Remove real SMTP credentials to prevent sending actual emails during tests
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_FROM;
}
