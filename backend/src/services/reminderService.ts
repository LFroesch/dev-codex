import cron from 'node-cron';
import { Project } from '../models/Project';
import Notification from '../models/Notification';
import { User } from '../models/User';

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
      console.log('Reminder service already initialized');
      return;
    }

    console.log('Initializing reminder service...');

    // Check for due/overdue todos every hour
    cron.schedule('0 * * * *', () => {
      this.checkDueTodos();
    });

    // Check for reminder notifications every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      this.checkReminderNotifications();
    });

    // Daily summary at 9 AM
    cron.schedule('0 9 * * *', () => {
      this.sendDailySummary();
    });

    this.isInitialized = true;
    console.log('Reminder service initialized with cron jobs');
  }

  private async checkDueTodos(): Promise<void> {
    try {
      console.log('Checking for due todos...');
      
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
            await this.createNotification({
              userId: todo.assignedTo || project.ownerId,
              type: 'todo_overdue',
              title: 'Todo Overdue',
              message: `Todo "${todo.text}" in project "${project.name}" is overdue`,
              relatedProjectId: project._id,
              relatedTodoId: todo.id,
              actionUrl: `/projects/${project._id}`
            });
          }

          // Send due soon notification
          if (isDueSoon && !await this.hasRecentNotification(todo.assignedTo || project.ownerId, 'todo_due_soon', todo.id)) {
            await this.createNotification({
              userId: todo.assignedTo || project.ownerId,
              type: 'todo_due_soon',
              title: 'Todo Due Soon',
              message: `Todo "${todo.text}" in project "${project.name}" is due within 24 hours`,
              relatedProjectId: project._id,
              relatedTodoId: todo.id,
              actionUrl: `/projects/${project._id}`
            });
          }
        }
      }

      console.log('Due todos check completed');
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
          if (!todo.reminderDate || todo.completed) continue;

          const reminderDate = new Date(todo.reminderDate);
          
          // Send reminder if it's within the next 15 minutes or within the last minute
          if (reminderDate <= reminderWindow && reminderDate >= pastWindow) {
            const hasRecent = await this.hasRecentNotification(
              todo.assignedTo || project.ownerId, 
              'todo_due_soon', 
              todo.id,
              60 // Within last 60 minutes
            );

            if (!hasRecent) {
              await this.createNotification({
                userId: todo.assignedTo || project.ownerId,
                type: 'todo_due_soon',
                title: 'Todo Reminder',
                message: `Reminder: "${todo.text}" in project "${project.name}"`,
                relatedProjectId: project._id,
                relatedTodoId: todo.id,
                actionUrl: `/projects/${project._id}`
              });
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
      console.log('Sending daily summaries...');
      
      const users = await User.find({});
      
      for (const user of users) {
        // Find user's projects (owned + team member)
        const ownedProjects = await Project.find({ 
          $or: [{ userId: user._id }, { ownerId: user._id }] 
        });

        // Get team projects (would need to implement team membership lookup)
        
        let overdueTodos = 0;
        let dueTodayTodos = 0;
        const today = new Date();
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        for (const project of ownedProjects) {
          for (const todo of project.todos) {
            if (todo.completed) continue;
            
            const assignedToUser = todo.assignedTo?.toString() === user._id.toString();
            const isOwner = project.ownerId.toString() === user._id.toString();
            
            if (!assignedToUser && !isOwner) continue;

            if (todo.dueDate) {
              const dueDate = new Date(todo.dueDate);
              if (dueDate < today) {
                overdueTodos++;
              } else if (dueDate <= tomorrow) {
                dueTodayTodos++;
              }
            }
          }
        }

        // Send daily summary if there are actionable items
        if (overdueTodos > 0 || dueTodayTodos > 0) {
          let message = '';
          if (overdueTodos > 0) {
            message += `You have ${overdueTodos} overdue todo(s). `;
          }
          if (dueTodayTodos > 0) {
            message += `You have ${dueTodayTodos} todo(s) due today.`;
          }

          await this.createNotification({
            userId: user._id,
            type: 'todo_due_soon',
            title: 'Daily Todo Summary',
            message: message.trim(),
            actionUrl: '/projects'
          });
        }
      }

      console.log('Daily summaries sent');
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

  private async createNotification(data: {
    userId: any;
    type: string;
    title: string;
    message: string;
    relatedProjectId?: any;
    relatedTodoId?: string;
    actionUrl?: string;
  }): Promise<void> {
    try {
      await Notification.create(data);
      console.log(`Created ${data.type} notification for user ${data.userId}`);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }


  public stop(): void {
    // Note: node-cron doesn't provide a direct way to stop specific tasks
    // This would need to be implemented if needed
    console.log('Reminder service stopping...');
    this.isInitialized = false;
  }
}

export default ReminderService;