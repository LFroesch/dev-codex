import { Project } from '../models/Project';
import { User } from '../models/User';
import TeamMember from '../models/TeamMember';
import NotificationService from './notificationService';

export interface StaleItem {
  projectId: string;
  projectName: string;
  itemId: string;
  itemType: 'note' | 'todo';
  title: string;
  daysSinceUpdate: number;
  updatedAt: Date;
}

export interface StaleItemsSummary {
  staleNotes: StaleItem[];
  staleTodos: StaleItem[];
  totalCount: number;
}

/**
 * Service for detecting and notifying users about stale notes and todos
 * that haven't been updated in a while and don't have due dates/reminders
 */
class StaleItemService {
  // TODO: Make these user-configurable in settings (future enhancement)
  private readonly STALE_THRESHOLD_DAYS_NOTES = 14;
  private readonly STALE_THRESHOLD_DAYS_TODOS = 7;

  /**
   * Find stale items for a specific user
   * Only checks items WITHOUT due dates or reminders
   */
  async findStaleItems(userId: string): Promise<StaleItemsSummary> {
    const staleNotes: StaleItem[] = [];
    const staleTodos: StaleItem[] = [];
    const noteCutoffDate = new Date();
    noteCutoffDate.setDate(noteCutoffDate.getDate() - this.STALE_THRESHOLD_DAYS_NOTES);
    const todoCutoffDate = new Date();
    todoCutoffDate.setDate(todoCutoffDate.getDate() - this.STALE_THRESHOLD_DAYS_TODOS);

    // Find all projects owned by the user OR where user is a team member
    const teamMemberships = await TeamMember.find({
      userId,
      isActive: true
    }).select('projectId').lean();
    const teamProjectIds = teamMemberships.map(tm => tm.projectId);

    const projects = await Project.find({
      $or: [
        { ownerId: userId },
        { _id: { $in: teamProjectIds } }
      ]
    }).lean();

    for (const project of projects) {
      // Check notes for staleness
      if (project.notes && Array.isArray(project.notes)) {
        for (const note of project.notes) {
          // Skip if note doesn't have an updatedAt field
          if (!note.updatedAt) continue;

          // Check if note is stale (updated before cutoff)
          if (new Date(note.updatedAt) < noteCutoffDate) {
            const daysSince = Math.floor(
              (Date.now() - new Date(note.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            staleNotes.push({
              projectId: project._id.toString(),
              projectName: project.name,
              itemId: note.id,
              itemType: 'note',
              title: note.title,
              daysSinceUpdate: daysSince,
              updatedAt: new Date(note.updatedAt)
            });
          }
        }
      }

      // Check todos for staleness
      // Only check todos WITHOUT due dates or reminders
      if (project.todos && Array.isArray(project.todos)) {
        

        for (const todo of project.todos) {
          // Skip completed todos
          if (todo.completed || todo.status === 'completed') {
            
            continue;
          }

          // Skip todos that have due dates or reminders (they have their own notification system)
          if (todo.dueDate || todo.reminderDate) {
            
            continue;
          }

          // Use updatedAt if available, fallback to createdAt for older todos
          const lastUpdate = (todo as any).updatedAt || todo.createdAt;
          if (!lastUpdate) {
            
            continue;
          }

          const lastUpdateDate = new Date(lastUpdate);
          const daysSince = Math.floor(
            (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          

          // Check if todo is stale
          if (lastUpdateDate < todoCutoffDate) {
            
            staleTodos.push({
              projectId: project._id.toString(),
              projectName: project.name,
              itemId: todo.id,
              itemType: 'todo',
              title: todo.title,
              daysSinceUpdate: daysSince,
              updatedAt: new Date(lastUpdate)
            });
          }
        }
      }
    }

    // Sort by days since update (most stale first)
    staleNotes.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
    staleTodos.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

    

    return {
      staleNotes,
      staleTodos,
      totalCount: staleNotes.length + staleTodos.length
    };
  }

  /**
   * Create a notification for stale items
   * Uses NotificationService which handles deduplication automatically
   */
  async notifyStaleItems(userId: string): Promise<void> {
    const summary = await this.findStaleItems(userId);

    // Don't create notification if there are no stale items
    if (summary.totalCount === 0) {
      return;
    }

    const notificationService = NotificationService.getInstance();

    const noteText = summary.staleNotes.length === 1 ? 'note' : 'notes';
    const todoText = summary.staleTodos.length === 1 ? 'todo' : 'todos';

    let message = '';
    if (summary.staleNotes.length > 0 && summary.staleTodos.length > 0) {
      message = `${summary.staleNotes.length} ${noteText} (${this.STALE_THRESHOLD_DAYS_NOTES}+ days) and ${summary.staleTodos.length} ${todoText} (${this.STALE_THRESHOLD_DAYS_TODOS}+ days) need attention`;
    } else if (summary.staleNotes.length > 0) {
      message = `${summary.staleNotes.length} ${noteText} haven't been updated in ${this.STALE_THRESHOLD_DAYS_NOTES}+ days`;
    } else {
      message = `${summary.staleTodos.length} ${todoText} haven't been updated in ${this.STALE_THRESHOLD_DAYS_TODOS}+ days`;
    }

    // Create notification with metadata
    // NotificationService handles deduplication (userId + type)
    await notificationService.createNotification({
      userId,
      type: 'stale_items_summary' as any,
      title: 'Stale Items Summary',
      message,
      actionUrl: '/notifications',
      metadata: {
        staleNotes: summary.staleNotes,
        staleTodos: summary.staleTodos,
        totalCount: summary.totalCount,
        thresholdDaysNotes: this.STALE_THRESHOLD_DAYS_NOTES,
        thresholdDaysTodos: this.STALE_THRESHOLD_DAYS_TODOS
      }
    });
  }

  /**
   * Check all users and send stale item notifications
   * Called by cron job (weekly on Mondays)
   */
  async checkAllUsers(): Promise<void> {
    try {
      const users = await User.find({}).select('_id').lean();

      

      let notificationsSent = 0;
      for (const user of users) {
        try {
          await this.notifyStaleItems(user._id.toString());
          notificationsSent++;
        } catch (error) {
          
          // Continue with other users even if one fails
        }
      }

      
    } catch (error) {
      
      throw error;
    }
  }
}

export default new StaleItemService();
