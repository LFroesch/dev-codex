import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AnalyticsService } from '../middleware/analytics';

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

// Track custom event
router.post('/track', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { eventType, eventData } = req.body;

    if (!eventType || !eventData) {
      return res.status(400).json({ error: 'eventType and eventData are required' });
    }

    const allowedEventTypes = ['field_edit', 'action', 'page_view', 'project_open'];
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

export default router;