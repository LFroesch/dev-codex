import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AnalyticsService } from '../middleware/analytics';
import UserSession from '../models/UserSession';

const router = express.Router();

// Get user analytics
router.get('/user/:userId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { days = '30' } = req.query;

    // Ensure user can only access their own analytics (or admin)
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const analytics = await AnalyticsService.getUserAnalytics(userId, parseInt(days as string));
    
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not found' });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user's analytics
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { days = '30' } = req.query;
    const analytics = await AnalyticsService.getUserAnalytics(req.userId!, parseInt(days as string));
    
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not found' });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comprehensive analytics (feature usage, etc.)
router.get('/comprehensive', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { days = '30' } = req.query;
    
    const [featureUsage, navigation, searches, errors, performance, uiInteractions] = await Promise.all([
      AnalyticsService.runQuery('feature_usage', [days]),
      AnalyticsService.runQuery('navigation', [days]),
      AnalyticsService.runQuery('search', [days]),
      AnalyticsService.runQuery('error', [days]),
      AnalyticsService.runQuery('performance', [days]),
      AnalyticsService.runQuery('ui_interaction', [days])
    ]);
    
    const comprehensiveData = {
      featureUsage,
      navigation,
      searches,
      errors,
      performance,
      uiInteractions,
      summary: {
        totalFeatureUsage: featureUsage.reduce((sum: number, item: any) => sum + (item.usage_count || 0), 0),
        totalNavigationEvents: navigation.reduce((sum: number, item: any) => sum + (item.count || 0), 0),
        totalSearches: searches.reduce((sum: number, item: any) => sum + (item.search_count || 0), 0),
        totalErrors: errors.reduce((sum: number, item: any) => sum + (item.error_count || 0), 0),
        totalPerformanceEvents: performance.reduce((sum: number, item: any) => sum + (item.count || 0), 0),
        totalUIInteractions: uiInteractions.reduce((sum: number, item: any) => sum + (item.interaction_count || 0), 0)
      }
    };
    
    res.json(comprehensiveData);
  } catch (error) {
    console.error('Error fetching comprehensive analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track custom event
router.post('/track', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { eventType, eventData } = req.body;

    if (!eventType || !eventData) {
      return res.status(400).json({ error: 'eventType and eventData are required' });
    }

    const allowedEventTypes = [
      'field_edit', 
      'action', 
      'page_view', 
      'project_open',
      'feature_usage',
      'navigation', 
      'search', 
      'error', 
      'performance', 
      'ui_interaction'
    ];
    if (!allowedEventTypes.includes(eventType)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    await AnalyticsService.trackEvent(req.userId!, eventType, eventData, req);
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start session endpoint
router.post('/session/start', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { restoreSession } = req.body;
    
    // Check for existing active session within last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const existingSession = await AnalyticsService.getActiveSession(req.userId!);
    
    if (existingSession && existingSession.lastActivity > fifteenMinutesAgo) {
      // Update the existing session's last activity
      await AnalyticsService.updateSession(existingSession.sessionId, {
        resumed: true,
        timestamp: new Date()
      });
      
      console.log(`Restored existing session for user ${req.userId}: ${existingSession.sessionId}`);
      res.json({ sessionId: existingSession.sessionId });
    } else {
      // Create new session
      const sessionId = await AnalyticsService.startSession(req.userId!, req);
      res.json({ sessionId });
    }
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End session endpoint
router.post('/session/end', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    await AnalyticsService.endSession(sessionId, req.userId!);
    res.json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active session
router.get('/session/active', requireAuth, async (req: AuthRequest, res) => {
  try {
    const session = await AnalyticsService.getActiveSession(req.userId!);
    res.json(session);
  } catch (error) {
    console.error('Error getting active session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Heartbeat endpoint to update session activity
router.post('/heartbeat', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { sessionId, lastActivity, isVisible, currentProjectId, currentPage } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Update session activity
    await AnalyticsService.updateSession(sessionId, {
      heartbeat: true,
      isVisible,
      currentProjectId,
      currentPage,
      timestamp: new Date(lastActivity)
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Project Time Tracking Routes

// Switch to a new project (records time spent on previous project)
router.post('/project/switch', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { sessionId, newProjectId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const session = await UserSession.findOne({ sessionId, userId: req.userId!, isActive: true });
    if (!session) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    const now = new Date();
    
    // If switching FROM a project, record time spent
    if (session.currentProjectId && session.currentProjectStartTime) {
      const timeSpent = now.getTime() - session.currentProjectStartTime.getTime();
      
      // Find existing project time entry or create new one
      let existingProject = session.projectTimeBreakdown?.find(
        p => p.projectId === session.currentProjectId
      );
      
      if (existingProject) {
        existingProject.timeSpent += timeSpent;
        existingProject.lastSwitchTime = now;
      } else {
        if (!session.projectTimeBreakdown) {
          session.projectTimeBreakdown = [];
        }
        session.projectTimeBreakdown.push({
          projectId: session.currentProjectId,
          timeSpent,
          lastSwitchTime: now
        });
      }
    }

    // Switch to new project
    session.currentProjectId = newProjectId;
    session.currentProjectStartTime = newProjectId ? now : undefined;
    session.lastActivity = now;
    
    // Add to projectsViewed if not already there
    if (newProjectId && !session.projectsViewed.includes(newProjectId)) {
      session.projectsViewed.push(newProjectId);
    }

    await session.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error switching project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project time data for all user's projects
router.get('/projects/time', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { days = '30' } = req.query;
    const daysInt = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);

    // Aggregate project time from all user sessions
    const sessions = await UserSession.aggregate([
      {
        $match: {
          userId: req.userId!,
          startTime: { $gte: startDate },
          projectTimeBreakdown: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$projectTimeBreakdown'
      },
      {
        $group: {
          _id: '$projectTimeBreakdown.projectId',
          totalTime: { $sum: '$projectTimeBreakdown.timeSpent' },
          sessions: { $sum: 1 },
          lastUsed: { $max: '$projectTimeBreakdown.lastSwitchTime' }
        }
      },
      {
        $sort: { totalTime: -1 }
      }
    ]);

    res.json({ projects: sessions, period: `${days} days` });
  } catch (error) {
    console.error('Error fetching project time data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get time data for a specific project
router.get('/project/:projectId/time', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { days = '30' } = req.query;
    const daysInt = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);

    const projectTime = await UserSession.aggregate([
      {
        $match: {
          userId: req.userId!,
          startTime: { $gte: startDate },
          'projectTimeBreakdown.projectId': projectId
        }
      },
      {
        $unwind: '$projectTimeBreakdown'
      },
      {
        $match: {
          'projectTimeBreakdown.projectId': projectId
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$projectTimeBreakdown.lastSwitchTime'
              }
            }
          },
          dailyTime: { $sum: '$projectTimeBreakdown.timeSpent' },
          sessions: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    const totalTime = projectTime.reduce((sum, day) => sum + day.dailyTime, 0);

    res.json({
      projectId,
      totalTime,
      dailyBreakdown: projectTime,
      period: `${days} days`
    });
  } catch (error) {
    console.error('Error fetching project time data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get time data for all team members on a specific project
router.get('/project/:projectId/team-time', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { days = '30' } = req.query;
    const daysInt = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);

    // First, get all team members for this project
    const { Project } = await import('../models/Project');
    const project = await Project.findById(projectId).select('userId').lean();
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get team members from TeamMember collection
    const TeamMember = await import('../models/TeamMember');
    const teamMembers = await TeamMember.default.find({ projectId }).populate('userId', 'firstName lastName email').lean();
    
    // Get all user IDs (owner + team members)
    const userIds = [project.userId.toString()];
    if (teamMembers?.length > 0) {
      userIds.push(...teamMembers.map((m: any) => m.userId._id.toString()));
    }

    const mongoose = await import('mongoose');
    const objectIdUserIds = userIds.map(id => new mongoose.Types.ObjectId(id));

    // Simple aggregation to get time per user for this project
    const teamTimeData = await UserSession.aggregate([
      {
        $match: {
          userId: { $in: objectIdUserIds },
          startTime: { $gte: startDate },
          projectTimeBreakdown: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$projectTimeBreakdown'
      },
      {
        $match: {
          'projectTimeBreakdown.projectId': projectId
        }
      },
      {
        $group: {
          _id: '$userId',
          totalTime: { $sum: '$projectTimeBreakdown.timeSpent' },
          sessions: { $sum: 1 },
          lastUsed: { $max: '$projectTimeBreakdown.lastSwitchTime' }
        }
      },
      {
        $sort: { totalTime: -1 }
      }
    ]);

    res.json({
      projectId,
      teamTimeData,
      period: `${days} days`
    });
  } catch (error) {
    console.error('Error fetching team project time data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;