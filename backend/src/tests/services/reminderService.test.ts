import ReminderService from '../../services/reminderService';

// Mock node-cron to prevent actual cron jobs from running
jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

// Mock models
jest.mock('../../models/Project');
jest.mock('../../models/Notification');
jest.mock('../../models/User');
jest.mock('../../services/notificationService');

describe('ReminderService', () => {
  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ReminderService.getInstance();
      const instance2 = ReminderService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize cron jobs', () => {
      const cron = require('node-cron');
      const service = ReminderService.getInstance();

      service.initialize();

      // Verify cron.schedule was called (for due todos and daily summary)
      expect(cron.schedule).toHaveBeenCalled();
    });

    it('should not initialize twice', () => {
      const cron = require('node-cron');
      cron.schedule.mockClear();

      const service = ReminderService.getInstance();
      service.initialize();
      service.initialize(); // Second call should be no-op

      // Should only schedule cron jobs once
      const callCount = cron.schedule.mock.calls.length;
      service.initialize();
      expect(cron.schedule.mock.calls.length).toBe(callCount); // No new calls
    });
  });
});
