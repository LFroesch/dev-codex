import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { CommandExecutor } from '../services/commandExecutor';
import { CommandParser } from '../services/commandParser';
import { Project } from '../models/Project';
import TeamMember from '../models/TeamMember';
import { logInfo, logError } from '../config/logger';
import activityLogger from '../services/activityLogger';

const router = express.Router();

// All terminal routes require authentication
router.use(requireAuth);

/**
 * POST /api/terminal/execute
 * Execute a terminal command
 */
router.post('/execute', async (req: AuthRequest, res) => {
  try {
    const { command, currentProjectId } = req.body;

    if (!command || typeof command !== 'string') {
      return res.status(400).json({
        type: 'error',
        message: 'Command is required and must be a string'
      });
    }

    const userId = req.userId!;

    logInfo('Terminal command execution', {
      userId,
      command: command.slice(0, 100), // Log only first 100 chars for security
      currentProjectId
    });

    // Execute command
    const executor = new CommandExecutor(userId);
    const response = await executor.execute(command, currentProjectId);

    // Log command execution for audit trail (only if project-related)
    if (response.metadata?.projectId) {
      try {
        await activityLogger.log({
          projectId: response.metadata.projectId,
          userId,
          sessionId: 'terminal', // Terminal commands don't have a session
          action: 'terminal_command',
          resourceType: 'project',
          resourceId: response.metadata.projectId,
          details: {
            metadata: {
              command: command.slice(0, 100),
              commandType: response.metadata.action,
              success: response.type === 'success'
            }
          }
        });
      } catch (error) {
        // Don't fail command execution if logging fails
        logError('Activity logging failed', error as Error, { userId });
      }
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

    // Format for autocomplete
    const formatted = commands.map(cmd => ({
      value: cmd.syntax.split('[')[0].trim(), // e.g., "/add todo"
      label: cmd.syntax,
      description: cmd.description,
      examples: cmd.examples,
      category: categorizeCommand(cmd.type.toString())
    }));

    res.json({ commands: formatted });
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
 * Helper function to categorize commands
 */
function categorizeCommand(type: string): string {
  if (type.startsWith('add_')) return 'Create';
  if (type.startsWith('view_')) return 'View';
  if (type.startsWith('wizard_')) return 'Wizards';
  if (['swap_project', 'export'].includes(type)) return 'Project';
  return 'Other';
}

export default router;
