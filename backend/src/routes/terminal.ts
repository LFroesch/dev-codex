import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { terminalRateLimit } from '../middleware/rateLimit';
import { CommandExecutor } from '../services/commandExecutor';
import { CommandParser } from '../services/commandParser';
import { Project } from '../models/Project';
import TeamMember from '../models/TeamMember';
import { logInfo, logError } from '../config/logger';
import activityLogger from '../services/activityLogger';
import { AnalyticsService } from '../middleware/analytics';

const router = express.Router();

// All terminal routes require authentication
router.use(requireAuth);

/**
 * POST /api/terminal/execute
 * Execute a terminal command - rate limited to prevent abuse
 */
router.post('/execute', terminalRateLimit, async (req: AuthRequest, res) => {
  try {
    const { command, currentProjectId } = req.body;

    if (!command || typeof command !== 'string') {
      return res.status(400).json({
        type: 'error',
        message: 'Command is required and must be a string'
      });
    }

    const userId = req.userId!;

    // Check if user is demo user and command is a write operation
    const { User } = await import('../models/User');
    const user = await User.findById(userId);

    if (user?.isDemo) {
      const commandLower = command.toLowerCase().trim();

      // Allow theme changes for demo users to try different themes
      const isThemeCommand = commandLower.includes('theme') || commandLower.startsWith('/theme') || commandLower.startsWith('theme');

      if (!isThemeCommand) {
        // Define write commands that demo users cannot execute
        const writeCommands = [
          'add', 'new', 'create', 'edit', 'update', 'delete', 'remove',
          'complete', 'assign', 'push', 'invite', 'set', 'clear', 'export'
        ];

        const isWriteCommand = writeCommands.some(cmd =>
          commandLower.startsWith(`/${cmd}`) || commandLower.startsWith(cmd)
        );

        if (isWriteCommand) {
          return res.json({
            type: 'error',
            message: '🎭 Demo Mode - Account Required',
            data: {
              demo: true,
              action: 'signup_required',
              title: 'This action requires a full account',
              description: 'You\'re in demo mode with read-only access. Sign up to create, edit, and manage your own projects!',
              signupUrl: '/register',
              ctaText: 'Create Free Account'
            }
          });
        }
      }
    }

    logInfo('Terminal command execution', {
      userId,
      command: command.slice(0, 100), // Log only first 100 chars for security
      currentProjectId,
      isDemo: user?.isDemo || false
    });

    // Execute command
    const executor = new CommandExecutor(userId);
    const response = await executor.execute(command, currentProjectId);

    // Track terminal usage analytics
    try {
      const commandType = command.split(' ')[0].replace('/', '');
      console.log('[TERMINAL ANALYTICS] Tracking terminal command:', {
        userId,
        commandType,
        responseType: response.type
      });

      const result = await AnalyticsService.trackEvent(userId, 'feature_used', {
        feature: 'terminal_command',
        category: 'engagement',
        projectId: currentProjectId,
        metadata: {
          commandType,
          hasProjectContext: !!currentProjectId,
          responseType: response.type
        }
      });

      console.log('[TERMINAL ANALYTICS] Track result:', result ? 'SUCCESS' : 'NULL (throttled or limit reached)');
    } catch (error) {
      // Don't fail the request if analytics fails
      console.error('[TERMINAL ANALYTICS] Failed to track terminal command:', error);
    }

    res.json(response);
  } catch (error) {
    logError('Terminal execute error', error as Error, {
      userId: req.userId,
      component: 'terminal',
      action: 'execute'
    });

    res.status(500).json({
      type: 'error',
      message: 'An error occurred while executing the command',
      data: { error: (error as Error).message }
    });
  }
});

/**
 * GET /api/terminal/commands
 * Get all available commands for autocomplete
 */
router.get('/commands', async (req: AuthRequest, res) => {
  try {
    const commands = CommandParser.getAllCommands();
    const aliases = CommandParser.getAllAliases();

    // Format for autocomplete - include both canonical commands and aliases
    const formatted = commands.map(cmd => {
      const cmdAliases = CommandParser.getAliasesForType(cmd.type);
      return {
        value: cmd.syntax.split('[')[0].trim(), // e.g., "/add todo"
        label: cmd.syntax,
        description: cmd.description,
        examples: cmd.examples,
        category: categorizeCommand(cmd.type.toString()),
        aliases: cmdAliases // Include aliases for matching
      };
    });

    res.json({ commands: formatted, aliases });
  } catch (error) {
    logError('Get commands error', error as Error, {
      userId: req.userId,
      component: 'terminal',
      action: 'get_commands'
    });

    res.status(500).json({
      type: 'error',
      message: 'Failed to retrieve commands'
    });
  }
});

/**
 * GET /api/terminal/projects
 * Get user's projects for @ autocomplete
 */
router.get('/projects', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // Get owned projects
    const ownedProjects = await Project.find({
      $or: [
        { userId: userId },
        { ownerId: userId }
      ]
    })
      .select('name description category color')
      .lean();

    // Get team projects
    const teamProjectIds = await TeamMember.find({ userId })
      .select('projectId')
      .lean()
      .then(memberships => memberships.map(tm => tm.projectId));

    const teamProjects = teamProjectIds.length > 0
      ? await Project.find({
          _id: { $in: teamProjectIds },
          $nor: [
            { userId: userId },
            { ownerId: userId }
          ]
        })
          .select('name description category color')
          .lean()
      : [];

    // Combine and format
    const allProjects = [
      ...ownedProjects.map(p => ({ ...p, isOwner: true })),
      ...teamProjects.map(p => ({ ...p, isOwner: false }))
    ];

    // Format for autocomplete
    const formatted = allProjects.map(p => ({
      value: `@${p.name}`,
      label: p.name,
      description: p.description,
      category: p.category,
      color: p.color,
      isOwner: p.isOwner
    }));

    res.json({ projects: formatted });
  } catch (error) {
    logError('Get projects error', error as Error, {
      userId: req.userId,
      component: 'terminal',
      action: 'get_projects'
    });

    res.status(500).json({
      type: 'error',
      message: 'Failed to retrieve projects'
    });
  }
});

/**
 * POST /api/terminal/validate
 * Validate command syntax without executing
 */
router.post('/validate', async (req: AuthRequest, res) => {
  try {
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
      return res.status(400).json({
        isValid: false,
        errors: ['Command is required and must be a string']
      });
    }

    const validation = CommandParser.validate(command);
    res.json(validation);
  } catch (error) {
    logError('Validate command error', error as Error, {
      userId: req.userId,
      component: 'terminal',
      action: 'validate'
    });

    res.status(500).json({
      isValid: false,
      errors: ['Failed to validate command']
    });
  }
});

/**
 * GET /api/terminal/suggestions
 * Get command suggestions based on partial input
 */
router.get('/suggestions', async (req: AuthRequest, res) => {
  try {
    const { partial } = req.query;

    if (!partial || typeof partial !== 'string') {
      return res.json({ suggestions: [] });
    }

    const suggestions = CommandParser.getSuggestions(partial);
    res.json({ suggestions });
  } catch (error) {
    logError('Get suggestions error', error as Error, {
      userId: req.userId,
      component: 'terminal',
      action: 'get_suggestions'
    });

    res.status(500).json({
      type: 'error',
      message: 'Failed to retrieve suggestions'
    });
  }
});

/**
 * GET /api/terminal/history
 * Get user's command history
 * (Future enhancement - would require a separate command history collection)
 */
router.get('/history', async (req: AuthRequest, res) => {
  try {
    // For now, return empty history
    // In the future, we could create a separate CommandHistory model
    res.json({ history: [] });
  } catch (error) {
    logError('Get history error', error as Error, {
      userId: req.userId,
      component: 'terminal',
      action: 'get_history'
    });

    res.status(500).json({
      type: 'error',
      message: 'Failed to retrieve command history'
    });
  }
});

/**
 * Helper function to categorize commands by page/section
 */
function categorizeCommand(type: string): string {
  // Notes & Content
  if (type.includes('todo')) return 'Notes';
  if (type.includes('note')) return 'Notes';
  if (type.includes('devlog')) return 'Dev Log';

  // Features & Components
  if (type.includes('component') || type.includes('feature')) return 'Features';

  // Tech Stack
  if (type.includes('tech') || type.includes('package') || type.includes('stack')) return 'Stack';

  // Deployment
  if (type.includes('deployment')) return 'Deployment';

  // Public/Sharing
  if (type.includes('public')) return 'Public';
  if (type.includes('team') || type.includes('member') || type.includes('invite')) return 'Team';

  // Settings
  if (type.includes('settings') || type.includes('name') || type.includes('description') || type.includes('tag')) return 'Settings';

  // Project Operations
  if (type.includes('swap') || type.includes('project')) return 'Project';
  if (type.includes('export')) return 'Export';

  // Wizards
  if (type.includes('wizard')) return 'Wizards';

  // Help
  if (type.includes('help')) return 'Help';

  return 'General';
}

export default router;
