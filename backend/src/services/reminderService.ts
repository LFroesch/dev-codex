import cron from 'node-cron';
import { Project } from '../models/Project';
import Notification from '../models/Notification';
import { User } from '../models/User';
import NotificationService from './notificationService';
import staleItemService from './staleItemService';
import Stripe from 'stripe';
import { sendSubscriptionExpiringEmail } from './emailService';

export interface DueTodoItem {
  projectId: string;
  projectName: string;
  todoId: string;
  title: string;
  dueDate?: Date;
  status: 'overdue' | 'due_today';
  daysPastDue?: number;
}

class ReminderService {
  private static instance: ReminderService;
  private isInitialized = false;

  static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  public initialize(): void {
    if (this.isInitialized) {
      return;
    }


    // Check for due/overdue todos every 15 minutes
    // Check for reminder notifications every 15 minutes
    cron.schedule('*/15 * * * *', () => {
      this.checkDueTodos();
      this.checkReminderNotifications();
    });

    // Daily summary at 8 AM
    cron.schedule('0 8 * * *', () => {
      this.sendDailySummary();
    });

    // Weekly stale items check on Mondays at 9 AM
    cron.schedule('0 9 * * 1', () => {
      this.checkStaleItems();
    });

    // Daily subscription expiration check at 10 AM
    cron.schedule('0 10 * * *', () => {
      this.checkSubscriptionExpiration();
    });

    this.isInitialized = true;
  }

  private async checkDueTodos(): Promise<void> {
    try {
      
      const projects = await Project.find({}).populate('ownerId');
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const project of projects) {
        for (const todo of project.todos) {
          if (!todo.dueDate || todo.completed) continue;

          const dueDate = new Date(todo.dueDate);
          const isOverdue = dueDate < now;
          const isDueSoon = dueDate <= tomorrow && dueDate > now;

          // Send overdue notification
          if (isOverdue && !await this.hasRecentNotification(todo.assignedTo || project.ownerId, 'todo_overdue', todo.id)) {
            const notificationService = NotificationService.getInstance();
            await notificationService.createNotification({
              userId: todo.assignedTo || project.ownerId,
              type: 'todo_overdue',
              title: 'Todo Overdue',
              message: `Todo "${todo.title}" in project "${project.name}" is overdue`,
              relatedProjectId: project._id,
              relatedTodoId: todo.id,
              actionUrl: `/projects/${project._id}`
            });
          }

          // Send due soon notification
          if (isDueSoon && !await this.hasRecentNotification(todo.assignedTo || project.ownerId, 'todo_due_soon', todo.id)) {
            const notificationService = NotificationService.getInstance();
            await notificationService.createNotification({
              userId: todo.assignedTo || project.ownerId,
              type: 'todo_due_soon',
              title: 'Todo Due Soon',
              message: `Todo "${todo.title}" in project "${project.name}" is due within 24 hours`,
              relatedProjectId: project._id,
              relatedTodoId: todo.id,
              actionUrl: `/projects/${project._id}`
            });
          }
        }
      }

    } catch (error) {
      console.error('Error checking due todos:', error);
    }
  }

  private async checkReminderNotifications(): Promise<void> {
    try {
      const projects = await Project.find({}).populate('ownerId');
      const now = new Date();
      const reminderWindow = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes window
      const pastWindow = new Date(now.getTime() - 60 * 1000); // 1 minute behind

      for (const project of projects) {
        for (const todo of project.todos) {
          if (todo.completed) continue;

          // Check reminderDate
          if (todo.reminderDate) {
            const reminderDate = new Date(todo.reminderDate);
            if (reminderDate <= reminderWindow && reminderDate >= pastWindow) {
              const hasRecent = await this.hasRecentNotification(
                todo.assignedTo || project.ownerId, 
                'todo_due_soon', 
                todo.id,
                60 // Within last 60 minutes
              );

              if (!hasRecent) {
                const notificationService = NotificationService.getInstance();
                await notificationService.createNotification({
                  userId: todo.assignedTo || project.ownerId,
                  type: 'todo_due_soon',
                  title: 'Todo Reminder',
                  message: `Reminder: "${todo.title}" in project "${project.name}"`,
                  relatedProjectId: project._id,
                  relatedTodoId: todo.id,
                  actionUrl: `/projects/${project._id}`
                });
              }
            }
          }

          // Also check dueDate as a reminder (separate from overdue check)
          if (todo.dueDate) {
            const dueDate = new Date(todo.dueDate);
            if (dueDate <= reminderWindow && dueDate >= pastWindow) {
              const hasRecent = await this.hasRecentNotification(
                todo.assignedTo || project.ownerId, 
                'todo_due_soon', 
                todo.id,
                60 // Within last 60 minutes
              );

              if (!hasRecent) {
                const notificationService = NotificationService.getInstance();
                await notificationService.createNotification({
                  userId: todo.assignedTo || project.ownerId,
                  type: 'todo_due_soon',
                  title: 'Todo Due Soon',
                  message: `Todo "${todo.title}" in project "${project.name}" is due soon`,
                  relatedProjectId: project._id,
                  relatedTodoId: todo.id,
                  actionUrl: `/projects/${project._id}`
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking reminder notifications:', error);
    }
  }

  private async sendDailySummary(): Promise<void> {
    try {
      const users = await User.find({});

      for (const user of users) {
        // Find user's projects (owned + team member)
        const ownedProjects = await Project.find({
          $or: [{ userId: user._id }, { ownerId: user._id }]
        });

        const overdueTodoItems: DueTodoItem[] = [];
        const dueTodayTodoItems: DueTodoItem[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of day
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        for (const project of ownedProjects) {
          for (const todo of project.todos) {
            if (todo.completed) continue;

            const assignedToUser = todo.assignedTo?.toString() === user._id.toString();
            const isOwner = project.ownerId.toString() === user._id.toString();

            if (!assignedToUser && !isOwner) continue;

            if (todo.dueDate) {
              const dueDate = new Date(todo.dueDate);
              dueDate.setHours(0, 0, 0, 0); // Normalize to start of day

              if (dueDate < today) {
                // Calculate days past due
                const daysPast = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                overdueTodoItems.push({
                  projectId: project._id.toString(),
                  projectName: project.name,
                  todoId: todo.id,
                  title: todo.title,
                  dueDate: new Date(todo.dueDate),
                  status: 'overdue',
                  daysPastDue: daysPast
                });
              } else if (dueDate.getTime() === today.getTime()) {
                dueTodayTodoItems.push({
                  projectId: project._id.toString(),
                  projectName: project.name,
                  todoId: todo.id,
                  title: todo.title,
                  dueDate: new Date(todo.dueDate),
                  status: 'due_today'
                });
              }
            }
          }
        }

        // Sort overdue items by days past due (most overdue first)
        overdueTodoItems.sort((a, b) => (b.daysPastDue || 0) - (a.daysPastDue || 0));

        // Send daily summary if there are actionable items
        const totalTodos = overdueTodoItems.length + dueTodayTodoItems.length;
        if (totalTodos > 0) {
          let message = '';
          if (overdueTodoItems.length > 0) {
            const todoText = overdueTodoItems.length === 1 ? 'todo' : 'todos';
            message += `You have ${overdueTodoItems.length} overdue ${todoText}. `;
          }
          if (dueTodayTodoItems.length > 0) {
            const todoText = dueTodayTodoItems.length === 1 ? 'todo' : 'todos';
            message += `You have ${dueTodayTodoItems.length} ${todoText} due today.`;
          }

          const notificationService = NotificationService.getInstance();
          // Use 'daily_todo_summary' type so it's unique per user (prevents duplicates)
          // NotificationService will automatically replace the old notification with new one
          await notificationService.createNotification({
            userId: user._id,
            type: 'daily_todo_summary' as any,
            title: 'Daily Todo Summary',
            message: message.trim(),
            actionUrl: '/notifications',
            metadata: {
              overdueTodos: overdueTodoItems,
              dueTodayTodos: dueTodayTodoItems,
              totalCount: totalTodos
            }
          });
        }
      }

    } catch (error) {
      console.error('Error sending daily summaries:', error);
    }
  }

  private async hasRecentNotification(
    userId: any, 
    type: string, 
    todoId: string, 
    minutesWindow: number = 60
  ): Promise<boolean> {
    const cutoff = new Date(Date.now() - minutesWindow * 60 * 1000);
    
    const existingNotification = await Notification.findOne({
      userId,
      type,
      relatedTodoId: todoId,
      createdAt: { $gte: cutoff }
    });

    return !!existingNotification;
  }


  private async checkStaleItems(): Promise<void> {
    try {
      console.log('[ReminderService] Starting weekly stale items check');
      await staleItemService.checkAllUsers();
      console.log('[ReminderService] Completed weekly stale items check');
    } catch (error) {
      console.error('[ReminderService] Error in weekly stale items check:', error);
    }
  }

  private async checkSubscriptionExpiration(): Promise<void> {
    try {
      console.log('[ReminderService] Starting subscription expiration check');

      // Check if Stripe is configured
      if (!process.env.STRIPE_SECRET_KEY) {
        console.log('[ReminderService] Stripe not configured, skipping subscription expiration check');
        return;
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      // Find users with active subscriptions
      const users = await User.find({
        subscriptionStatus: 'active',
        subscriptionId: { $exists: true, $ne: null }
      });

      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const eightDaysFromNow = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

      for (const user of users) {
        try {
          if (!user.subscriptionId) continue;

          // Fetch subscription from Stripe
          const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);

          // Check if subscription is set to cancel at period end
          if ((subscription as any).cancel_at_period_end) {
            const periodEnd = new Date((subscription as any).current_period_end * 1000);

            // Check if period end is between 7 and 8 days from now
            // This ensures we only send the email once (on the day it's exactly 7 days away)
            if (periodEnd >= sevenDaysFromNow && periodEnd < eightDaysFromNow) {
              // Check if we've already sent this notification recently
              const hasRecentNotification = await Notification.findOne({
                userId: user._id,
                type: 'subscription_expiring',
                createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // Within last 24 hours
              });

              if (!hasRecentNotification) {
                // Send email
                await sendSubscriptionExpiringEmail(
                  user.email,
                  user.firstName || 'there',
                  user.planTier || 'pro',
                  periodEnd
                );

                // Create in-app notification
                const notificationService = NotificationService.getInstance();
                await notificationService.createNotification({
                  userId: user._id,
                  type: 'subscription_expiring' as any,
                  title: 'Subscription Expiring Soon',
                  message: `Your ${(user.planTier || 'pro').charAt(0).toUpperCase() + (user.planTier || 'pro').slice(1)} subscription expires in 7 days. Reactivate to keep your features!`,
                  actionUrl: '/billing'
                });

                console.log(`[ReminderService] Sent expiration warning to user ${user._id}`);
              }
            }
          }
        } catch (error) {
          console.error(`[ReminderService] Error checking subscription for user ${user._id}:`, error);
          // Continue with other users
        }
      }

      console.log('[ReminderService] Completed subscription expiration check');
    } catch (error) {
      console.error('[ReminderService] Error in subscription expiration check:', error);
    }
  }

  // Public method to manually trigger checks (for testing)
  public async triggerChecks(): Promise<void> {
    await this.checkDueTodos();
    await this.checkReminderNotifications();
  }

  public async triggerStaleItemsCheck(): Promise<void> {
    await this.checkStaleItems();
  }

  public async triggerSubscriptionExpirationCheck(): Promise<void> {
    await this.checkSubscriptionExpiration();
  }

  public stop(): void {
    // Note: node-cron doesn't provide a direct way to stop specific tasks
    // This would need to be implemented if needed
    this.isInitialized = false;
  }
}

export default ReminderService;