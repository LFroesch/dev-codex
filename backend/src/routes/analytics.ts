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
      'project_open',
      'feature_used'
    ];
    if (!allowedEventTypes.includes(eventType)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    await AnalyticsService.trackEvent(req.userId!, eventType, eventData, req);
    res.json({ success: true });
  } catch (error) {
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start session endpoint
router.post('/session/start', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { restoreSession } = req.body;
    
    // Check for existing active session within last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existingSession = await AnalyticsService.getActiveSession(req.userId!);
    
    if (existingSession && existingSession.lastActivity > thirtyMinutesAgo) {
      // Update the existing session's last activity
      await AnalyticsService.updateSession(existingSession.sessionId, {
        resumed: true,
        timestamp: new Date()
      });
      
      res.json({ sessionId: existingSession.sessionId });
    } else {
      // Create new session
      const sessionId = await AnalyticsService.startSession(req.userId!, req);
      res.json({ sessionId });
    }
  } catch (error) {
    
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
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active session
router.get('/session/active', requireAuth, async (req: AuthRequest, res) => {
  try {
    const session = await AnalyticsService.getActiveSession(req.userId!);
    res.json(session);
  } catch (error) {
    
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

    // Update session activity - gap detection happens automatically via calculateActiveTime()
    await AnalyticsService.updateSession(sessionId, {
      heartbeat: true,
      isVisible,
      currentProjectId,
      currentPage,
      timestamp: new Date(lastActivity)
    });

    res.json({ success: true });
  } catch (error) {
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Feature usage tracking endpoint
router.post('/feature', requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    const { feature, metadata, timestamp, page } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required in X-Session-ID header' });
    }

    if (!feature) {
      return res.status(400).json({ error: 'feature is required' });
    }

    // Track feature usage event
    await AnalyticsService.trackEvent(
      req.userId!,
      'feature_used',
      {
        feature,
        page,
        metadata: metadata || {},
        sessionId
      },
      req
    );

    res.json({ success: true });
  } catch (error) {
    
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Project Time Tracking Routes

// Switch to a new project (records time spent on previous project using gap-aware calculation)
router.post('/project/switch', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { sessionId, newProjectId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Use the improved switchProject method from AnalyticsService
    const result = await AnalyticsService.switchProject(req.userId!, sessionId, newProjectId);
    
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    
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
          totalTime: { 
            $sum: { 
              $ifNull: ['$projectTimeBreakdown.activeTime', '$projectTimeBreakdown.timeSpent'] 
            } 
          },
          sessions: { $sum: 1 },
          lastUsed: { $max: '$projectTimeBreakdown.lastSwitchTime' }
        }
      },
      {
        $sort: { totalTime: -1 }
      }
    ]);

    // Add current active session time to the results
    const activeSession = await UserSession.findOne({
      userId: req.userId!,
      isActive: true
    });

    if (activeSession && activeSession.currentProjectId && activeSession.currentProjectStartTime) {
      // Calculate active time using gap detection instead of raw time
      const currentProject = activeSession.projectTimeBreakdown?.find(
        p => p.projectId === activeSession.currentProjectId
      );
      
      // Import the gap detection function from analytics middleware
      const { calculateActiveTime } = await import('../middleware/analytics');
      
      const currentSessionTime = calculateActiveTime(
        activeSession.currentProjectStartTime,
        new Date(),
        currentProject?.heartbeatTimestamps || []
      );
      
      // Find existing project in results
      let existingProject = sessions.find(s => s._id === activeSession.currentProjectId);
      
      if (existingProject) {
        existingProject.totalTime += currentSessionTime;
        existingProject.lastUsed = new Date();
      } else {
        // New project with only active session time
        sessions.push({
          _id: activeSession.currentProjectId,
          totalTime: currentSessionTime,
          sessions: 1,
          lastUsed: new Date()
        });
      }
      
      // Re-sort after adding active session time
      sessions.sort((a, b) => b.totalTime - a.totalTime);
    }

    res.json({ projects: sessions, period: `${days} days` });
  } catch (error) {
    
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

    // Get current active sessions for all team members
    const activeSessions = await UserSession.find({
      userId: { $in: objectIdUserIds },
      isActive: true
    }).lean();

    const teamTimeData: any[] = [];
    
    // For each team member, calculate their total time on this project
    for (const userId of userIds) {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      
      // Get all sessions for this user that have project time data
      const userSessions = await UserSession.find({
        userId: userObjectId,
        projectTimeBreakdown: { $exists: true, $ne: [] }
      }).lean();
      
      let totalTime = 0;
      let lastUsed: Date | null = null;
      
      userSessions.forEach(session => {
        const projectEntry = session.projectTimeBreakdown?.find(p => 
          p.projectId === projectId || p.projectId?.toString() === projectId
        );
        if (projectEntry) {
          // Use activeTime if available, otherwise fall back to timeSpent
          const timeToAdd = projectEntry.activeTime || projectEntry.timeSpent || 0;
          totalTime += timeToAdd;
          if (!lastUsed || projectEntry.lastSwitchTime > lastUsed) {
            lastUsed = projectEntry.lastSwitchTime;
          }
        }
      });
      
      // Check for current active session with this project
      const activeSession = activeSessions.find(s => s.userId.toString() === userId);
      if (activeSession && activeSession.currentProjectId === projectId && activeSession.currentProjectStartTime) {
        // Calculate active time using gap detection instead of raw time
        const currentProject = activeSession.projectTimeBreakdown?.find(
          p => p.projectId === projectId || p.projectId?.toString() === projectId
        );
        
        // Import the gap detection function from analytics middleware
        const { calculateActiveTime } = await import('../middleware/analytics');
        
        const currentSessionTime = calculateActiveTime(
          activeSession.currentProjectStartTime,
          new Date(),
          currentProject?.heartbeatTimestamps || []
        );
        
        totalTime += currentSessionTime;
        lastUsed = new Date();
      }
      
      // Always include team members in the result, even with 0 time
      teamTimeData.push({
        _id: userObjectId,
        totalTime,
        sessions: userSessions.length,
        lastUsed
      });
    }

    res.json({
      projectId,
      teamTimeData,
      period: `${days} days`
    });
  } catch (error) {
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Plan-based analytics endpoints
// Update user analytics retention when plan changes
router.post('/plan/update', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { planTier, subscriptionStatus } = req.body;

    if (!['free', 'pro', 'premium'].includes(planTier)) {
      return res.status(400).json({ error: 'Invalid plan tier' });
    }

    await AnalyticsService.updateUserAnalyticsRetention(req.userId!, planTier, subscriptionStatus);

    res.json({ 
      success: true, 
      message: `Analytics retention updated for ${planTier} plan` 
    });
  } catch (error) {
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle subscription cancellation
router.post('/plan/cancel', requireAuth, async (req: AuthRequest, res) => {
  try {
    await AnalyticsService.handleSubscriptionCancellation(req.userId!);
    
    res.json({ 
      success: true, 
      message: 'Analytics converted to free tier retention' 
    });
  } catch (error) {
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get plan-aware analytics summary
router.get('/plan/summary', requireAuth, async (req: AuthRequest, res) => {
  try {
    const summary = await AnalyticsService.getAnalyticsSummary(req.userId!);
    res.json(summary);
  } catch (error) {
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;