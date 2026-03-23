import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { terminalRateLimit } from '../middleware/rateLimit';
import { CommandExecutor } from '../services/commandExecutor';
import { CommandParser } from '../services/commandParser';
import { Project } from '../models/Project';
import TeamMember from '../models/TeamMember';
import { logDebug, logError } from '../config/logger';
import activityLogger from '../services/activityLogger';
import { AnalyticsService } from '../middleware/analytics';
import { asyncHandler, BadRequestError } from '../utils/errorHandler';
import { handleAIQuery, handleAIQueryStream, clearUserSessions, invalidateSessionContext } from '../services/aiHandler';
import { terminalCommandSecurity } from '../middleware/commandSecurity';
import { AIAction, AITier } from '../services/AIService';
import { User as UserModel } from '../models/User';
import { SystemConfig } from '../models/SystemConfig';

const router = express.Router();

// ── AI Token Tracking Helper ────────────────────────────────────────────

async function trackAITokens(userId: string, input: string, response: { message?: string; actions?: any[]; tokensUsed?: { prompt: number; completion: number; total: number } }) {
  const tokens = response.tokensUsed?.total
    || Math.ceil((input.length + (response.message?.length || 0) + JSON.stringify(response.actions || []).length) / 4);
  if (!response.tokensUsed) {
    response.tokensUsed = { prompt: 0, completion: 0, total: tokens };
  }
  await UserModel.findByIdAndUpdate(userId, {
    $inc: { 'aiUsage.tokensUsedThisMonth': tokens, 'aiUsage.queryCount': 1 },
    $set: { 'aiUsage.lastQueryAt': new Date() },
  });
  return tokens;
}

// ── AI Tier Config ─────────────────────────────────────────────────────
const AI_TIER_LIMITS = {
  free:    { enabled: true,  maxChars: 2000,  queriesPerMin: 0,  monthlyTokens: 0,         dailyQueries: 3, apiTier: 'free' as AITier },
  pro:     { enabled: true,  maxChars: 5000,  queriesPerMin: 15, monthlyTokens: 500_000,   dailyQueries: 0, apiTier: 'paid' as AITier },
  premium: { enabled: true,  maxChars: 10000, queriesPerMin: 30, monthlyTokens: 2_000_000, dailyQueries: 0, apiTier: 'paid' as AITier },
} as const;

const isSelfHosted = process.env.SELF_HOSTED === 'true';

// ── Global Daily Token Budget ───────────────────────────────────────────
// Hard safety cap — kills AI for ALL users if exceeded. Set low while testing.
// Default 50k tokens/day ≈ $0.03/day on gemini-2.5-flash
const AI_DAILY_TOKEN_BUDGET = parseInt(process.env.AI_DAILY_TOKEN_BUDGET || '50000', 10) || 50000;

async function checkDailyBudget(): Promise<boolean> {
  const today = new Date().toDateString();
  const doc = await SystemConfig.findOne({ key: 'dailyTokenBudget' }).lean();
  if (!doc || (doc.value as any).date !== today) return true; // new day = fresh budget
  return (doc.value as any).tokensUsed < AI_DAILY_TOKEN_BUDGET;
}

async function addToDailyBudget(tokens: number): Promise<void> {
  const today = new Date().toDateString();
  // Atomic: increment if same day
  const result = await SystemConfig.findOneAndUpdate(
    { key: 'dailyTokenBudget', 'value.date': today },
    { $inc: { 'value.tokensUsed': tokens } },
    { new: true }
  );
  if (!result) {
    // New day or first use — reset and set atomically
    await SystemConfig.findOneAndUpdate(
      { key: 'dailyTokenBudget' },
      { $set: { value: { tokensUsed: tokens, date: today } } },
      { upsert: true }
    );
  }
}

// Simple in-memory per-minute rate tracking for AI queries
const aiQueryTimestamps = new Map<string, number[]>();

function checkAIRateLimit(userId: string, maxPerMin: number): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const timestamps = aiQueryTimestamps.get(userId) || [];
  const recent = timestamps.filter(t => now - t < windowMs);
  if (recent.length >= maxPerMin) return false;
  recent.push(now);
  aiQueryTimestamps.set(userId, recent);
  return true;
}

// ── Free-Tier AI Daily Rate Limiting ──────────────────────────────────
// Free users + demo share the free Gemini API key (20 req/day global).
// 3 queries/day per user (by userId) or per IP (for demo, since all demo share one DB user).
const FREE_AI_DAILY_LIMIT = parseInt(process.env.FREE_AI_DAILY_LIMIT || '3', 10);
const freeAIDailyUse = new Map<string, { count: number; date: string }>();

/** Check daily AI limit for free-tier/demo users. Key = userId for logged-in free users, IP for demo. */
function checkFreeAIDailyLimit(key: string): { allowed: boolean; remaining: number } {
  const today = new Date().toDateString();
  const entry = freeAIDailyUse.get(key);
  if (!entry || entry.date !== today) {
    freeAIDailyUse.set(key, { count: 1, date: today });
    return { allowed: true, remaining: FREE_AI_DAILY_LIMIT - 1 };
  }
  if (entry.count >= FREE_AI_DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: FREE_AI_DAILY_LIMIT - entry.count };
}

// Cleanup rate tracking every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of aiQueryTimestamps) {
    const recent = timestamps.filter(t => now - t < 60_000);
    if (recent.length === 0) aiQueryTimestamps.delete(userId);
    else aiQueryTimestamps.set(userId, recent);
  }
  // Purge stale free-tier entries (previous days)
  const today = new Date().toDateString();
  for (const [key, entry] of freeAIDailyUse) {
    if (entry.date !== today) freeAIDailyUse.delete(key);
  }
}, 300_000);

/** Reset monthly token count if needed */
async function resetMonthlyUsageIfNeeded(user: any): Promise<void> {
  const now = new Date();
  const lastReset = user.aiUsage?.lastResetDate ? new Date(user.aiUsage.lastResetDate) : new Date(0);
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    user.aiUsage = { tokensUsedThisMonth: 0, queryCount: 0, lastResetDate: now, lastQueryAt: user.aiUsage?.lastQueryAt };
    await user.save();
  }
}

/** Basic prompt sanitization — strip obvious injection attempts */
function sanitizePrompt(input: string): string {
  return input
    // Strip attempts to override system prompt
    .replace(/\b(system|SYSTEM)\s*:\s*/g, '')
    .replace(/\[SYSTEM\]/gi, '')
    .replace(/\{?\s*"role"\s*:\s*"system"/gi, '')
    // Strip markdown code fences that might contain injection
    .replace(/```(system|prompt|instructions)[\s\S]*?```/gi, '')
    .trim();
}

// All terminal routes require authentication
router.use(requireAuth);

/**
 * POST /api/terminal/execute
 * Execute a terminal command - rate limited to prevent abuse
 */
router.post('/execute', terminalCommandSecurity, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { command, currentProjectId } = req.body;

  if (!command || typeof command !== 'string') {
    throw BadRequestError('Command is required and must be a string', 'INVALID_COMMAND');
  }

  const userId = req.userId!;

  // Fetch user for tier/demo checks
  const { User } = await import('../models/User');
  const user = await User.findById(userId);

  // Demo users can execute all commands — data resets on next demo login
  // Only block dangerous account-level operations
  if (user?.isDemo) {
    const commandLower = command.toLowerCase().trim();
    const blockedDemoCommands = ['/invite', '/team', '/billing', '/delete-account'];
    if (blockedDemoCommands.some(cmd => commandLower.startsWith(cmd))) {
      return res.json({
        type: 'error',
        message: 'This action is not available in demo mode. Sign up to unlock all features!',
        data: { demo: true, action: 'signup_required', signupUrl: '/register', ctaText: 'Create Free Account' }
      });
    }
  }

  logDebug('Terminal command execution', {
    userId,
    command: command.slice(0, 100), // Log only first 100 chars for security
    currentProjectId,
    isDemo: user?.isDemo || false
  });

  // Route non-slash input to AI
  const trimmedCommand = command.trim();
  const isSlashCommand = trimmedCommand.startsWith('/');
  const aiEnabled = process.env.AI_ENABLED !== 'false';

  if (!isSlashCommand && aiEnabled) {
    // Determine tier: demo users use free tier limits
    const planTier = user?.isDemo ? 'free' : ((user?.planTier || 'free') as keyof typeof AI_TIER_LIMITS);
    const tierLimits = AI_TIER_LIMITS[planTier] || AI_TIER_LIMITS.free;
    const apiTier = isSelfHosted ? 'paid' as AITier : tierLimits.apiTier;

    // Gate: tier must be enabled (unless self-hosted)
    if (!tierLimits.enabled && !isSelfHosted) {
      return res.json({
        type: 'ai',
        message: 'AI features are not available on your plan.',
        data: { action: 'upgrade_required', upgradeUrl: '/settings', ctaText: 'Upgrade Plan' }
      });
    }

    // Input length validation
    const maxChars = isSelfHosted ? 10000 : tierLimits.maxChars;
    if (trimmedCommand.length > maxChars) {
      return res.json({
        type: 'ai',
        message: `Input too long (${trimmedCommand.length} chars). Maximum is ${maxChars} characters for your plan.`,
        data: {}
      });
    }

    // Daily query limit (free + demo users)
    let freeAIRemaining: number | undefined;
    if (tierLimits.dailyQueries > 0 && !isSelfHosted) {
      // Demo users keyed by IP (shared DB user), free users keyed by userId
      const rateKey = user?.isDemo ? (req.ip || 'unknown') : userId;
      const dailyCheck = checkFreeAIDailyLimit(rateKey);
      if (!dailyCheck.allowed) {
        const message = user?.isDemo
          ? `You've used all ${FREE_AI_DAILY_LIMIT} demo AI queries for today. Sign up for full access!`
          : `You've used all ${FREE_AI_DAILY_LIMIT} free AI queries for today. Upgrade for unlimited AI.`;
        return res.json({
          type: 'ai',
          message,
          data: {
            ...(user?.isDemo && { demo: true, action: 'signup_required', signupUrl: '/register', ctaText: 'Create Free Account' }),
            ...(!user?.isDemo && { action: 'upgrade_required', upgradeUrl: '/settings', ctaText: 'Upgrade Plan' }),
            freeAIRemaining: 0
          }
        });
      }
      freeAIRemaining = dailyCheck.remaining;
    }

    // Per-minute rate limit (paid tiers only, skip for self-hosted)
    if (!isSelfHosted && tierLimits.queriesPerMin > 0) {
      if (!checkAIRateLimit(userId, tierLimits.queriesPerMin)) {
        return res.json({
          type: 'ai',
          message: `You've hit the AI rate limit (${tierLimits.queriesPerMin}/min). Please wait a moment before trying again.`,
          data: {}
        });
      }
    }

    // Monthly token cap check (paid tiers, skip for self-hosted)
    if (!isSelfHosted && tierLimits.monthlyTokens > 0 && user && !user.isDemo) {
      await resetMonthlyUsageIfNeeded(user);
      if (user.aiUsage.tokensUsedThisMonth >= tierLimits.monthlyTokens) {
        return res.json({
          type: 'ai',
          message: `You've used all your AI tokens this month (${tierLimits.monthlyTokens.toLocaleString()} token limit). Resets on the 1st. Upgrade your plan for more.`,
          data: { action: 'upgrade_required', title: 'Monthly AI limit reached', upgradeUrl: '/settings', ctaText: 'Upgrade Plan' }
        });
      }
    }

    // Daily budget check (applies to all users)
    if (!await checkDailyBudget()) {
      return res.json({
        type: 'ai',
        message: 'AI is temporarily unavailable. Try again tomorrow.',
        data: {}
      });
    }

    const sanitizedInput = sanitizePrompt(trimmedCommand);
    const { sessionId, mode } = req.body;
    const aiResponse = await handleAIQuery(userId, sanitizedInput, currentProjectId, sessionId, mode, apiTier);

    try {
      const tokens = await trackAITokens(userId, sanitizedInput, aiResponse);
      await addToDailyBudget(tokens);
    } catch (trackingError) {
      logError('AI usage tracking failed', trackingError as Error, { userId });
    }

    return res.json({
      type: 'ai',
      message: aiResponse.message,
      data: {
        aiResponse: {
          message: aiResponse.message,
          actions: aiResponse.actions,
          followUp: aiResponse.followUp,
          intent: aiResponse.intent,
          sessionId: aiResponse.sessionId,
          tokensUsed: aiResponse.tokensUsed,
          elapsed: aiResponse.elapsed,
          model: aiResponse.model,
          ...(freeAIRemaining !== undefined && { freeAIRemaining }),
        }
      }
    });
  }

  // Handle /reset — clear AI session
  const resetPatterns = ['/reset', '/reset chat', '/new chat'];
  if (resetPatterns.includes(trimmedCommand.toLowerCase())) {
    // clearUserSessions already checks userId ownership; no need for sessionId-based clear
    clearUserSessions(userId);
    return res.json({
      type: 'success',
      message: 'AI conversation reset. Start fresh!',
      data: { resetChat: true }
    });
  }

  // Execute slash command
  const executor = new CommandExecutor(userId);
  const response = await executor.execute(command, currentProjectId);

  // Track terminal usage analytics
  try {
    const commandType = command.split(' ')[0].replace('/', '');
    

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

    
  } catch (error) {
    // Don't fail the request if analytics fails
    
  }

  res.json(response);
}));

/**
 * POST /api/terminal/ai/stream
 * SSE streaming endpoint for AI queries — tokens arrive as they're generated
 */
router.post('/ai/stream', terminalRateLimit, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { command, currentProjectId, sessionId, mode } = req.body;

  if (!command || typeof command !== 'string') {
    throw BadRequestError('Command is required', 'INVALID_COMMAND');
  }

  const userId = req.userId!;
  const user = await UserModel.findById(userId);

  // Determine tier
  const planTier = user?.isDemo ? 'free' : ((user?.planTier || 'free') as keyof typeof AI_TIER_LIMITS);
  const tierLimits = AI_TIER_LIMITS[planTier] || AI_TIER_LIMITS.free;
  const apiTier = isSelfHosted ? 'paid' as AITier : tierLimits.apiTier;

  if (!tierLimits.enabled && !isSelfHosted) {
    return res.status(403).json({ type: 'ai', message: 'AI features are not available on your plan.', data: {} });
  }

  // Input length
  const maxChars = isSelfHosted ? 10000 : tierLimits.maxChars;
  if (command.trim().length > maxChars) {
    return res.status(400).json({ type: 'ai', message: `Input too long (max ${maxChars} chars).`, data: {} });
  }

  // Daily query limit (free + demo)
  let freeAIRemaining: number | undefined;
  if (tierLimits.dailyQueries > 0 && !isSelfHosted) {
    const rateKey = user?.isDemo ? (req.ip || 'unknown') : userId;
    const dailyCheck = checkFreeAIDailyLimit(rateKey);
    if (!dailyCheck.allowed) {
      return res.status(429).json({
        type: 'ai',
        message: `You've used all ${FREE_AI_DAILY_LIMIT} AI queries for today.`,
        data: { freeAIRemaining: 0 }
      });
    }
    freeAIRemaining = dailyCheck.remaining;
  }

  // Per-minute rate limit (paid tiers)
  if (!isSelfHosted && tierLimits.queriesPerMin > 0) {
    if (!checkAIRateLimit(userId, tierLimits.queriesPerMin)) {
      return res.status(429).json({ type: 'ai', message: `Rate limit hit (${tierLimits.queriesPerMin}/min). Wait a moment.`, data: {} });
    }
  }

  // Monthly token cap (paid tiers)
  if (!isSelfHosted && tierLimits.monthlyTokens > 0 && user && !user.isDemo) {
    await resetMonthlyUsageIfNeeded(user);
    if (user.aiUsage.tokensUsedThisMonth >= tierLimits.monthlyTokens) {
      return res.status(429).json({ type: 'ai', message: 'Monthly AI token limit reached.', data: {} });
    }
  }

  // Daily budget check
  if (!await checkDailyBudget()) {
    return res.status(429).json({ type: 'ai', message: 'AI is temporarily unavailable. Try again tomorrow.', data: {} });
  }

  const sanitizedInput = sanitizePrompt(command.trim());

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  // Abort AI generation if client disconnects (saves tokens/compute)
  let clientDisconnected = false;
  req.on('close', () => { clientDisconnected = true; });

  let finalResponse: any = null;

  try {
    for await (const event of handleAIQueryStream(userId, sanitizedInput, currentProjectId, sessionId, mode, apiTier)) {
      if (clientDisconnected) break;
      if (event.type === 'chunk') {
        res.write(`data: ${JSON.stringify({ chunk: event.text })}\n\n`);
      } else if (event.type === 'done') {
        finalResponse = event.response;
        res.write(`data: ${JSON.stringify({ done: true, response: event.response })}\n\n`);
      }
    }
  } catch (error: any) {
    logError('AI stream endpoint error', error, { userId, sessionId });
    res.write(`data: ${JSON.stringify({ done: true, response: { message: 'AI streaming failed.', actions: [], sessionId: sessionId || '' } })}\n\n`);
  }

  // Track token usage
  if (finalResponse) {
    try {
      const tokens = await trackAITokens(userId, sanitizedInput, finalResponse);
      await addToDailyBudget(tokens);
    } catch (trackingError) {
      logError('AI usage tracking failed', trackingError as Error, { userId });
    }
  }

  res.end();
}));

/**
 * POST /api/terminal/ai/confirm
 * Execute confirmed AI actions as batch commands
 */
router.post('/ai/confirm', terminalRateLimit, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { actions, currentProjectId } = req.body;

  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    throw BadRequestError('Actions array is required', 'INVALID_ACTIONS');
  }

  if (actions.length > 10) {
    throw BadRequestError('Too many actions. Maximum is 10 per batch.', 'TOO_MANY_ACTIONS');
  }

  const userId = req.userId!;

  // Verify user has AI access (prevent crafted requests)
  if (!isSelfHosted) {
    const user = await UserModel.findById(userId).select('planTier isDemo').lean();
    const tier = user?.isDemo ? 'free' : ((user?.planTier || 'free') as keyof typeof AI_TIER_LIMITS);
    if (!AI_TIER_LIMITS[tier]?.enabled) {
      throw BadRequestError('AI features are not available on your plan', 'AI_ACCESS_DENIED');
    }
  }

  // Validate actions: commands must start with / and be reasonable length
  for (const action of actions as AIAction[]) {
    if (!action.command || typeof action.command !== 'string' || !action.command.startsWith('/')) {
      throw BadRequestError('Invalid action: commands must be valid slash commands', 'INVALID_ACTION');
    }
    if (action.command.length > 2000) {
      throw BadRequestError('Invalid action: command too long', 'INVALID_ACTION');
    }
  }

  const executor = new CommandExecutor(userId);
  const results: any[] = [];
  let successCount = 0;

  // Sort delete commands in reverse index order so earlier deletes don't shift
  // the indexes of later ones (e.g. delete #9 before #8 before #7...)
  const sortedActions = [...(actions as AIAction[])].sort((a, b) => {
    const aIndex = a.command.match(/\/delete\s+\w+\s+'(\d+)'/)?.[1];
    const bIndex = b.command.match(/\/delete\s+\w+\s+'(\d+)'/)?.[1];
    if (aIndex && bIndex) return Number(bIndex) - Number(aIndex);
    return 0;
  });

  for (const action of sortedActions) {
    try {
      const result = await executor.execute(action.command, currentProjectId);
      results.push({
        command: action.command,
        summary: action.summary,
        icon: action.icon,
        ...result,
      });
      if (result.type === 'success') successCount++;
    } catch (error: any) {
      results.push({
        command: action.command,
        summary: action.summary,
        icon: action.icon,
        type: 'error',
        message: error.message || 'Failed to execute action',
      });
    }
  }

  // Invalidate AI context so next query sees fresh project state
  const hasProjectChanges = results.some(r => r.type === 'success');
  if (hasProjectChanges) {
    invalidateSessionContext(userId);
  }

  res.json({
    type: 'success',
    message: `Executed ${successCount}/${actions.length} actions`,
    data: {
      batch: true,
      results,
      executed: successCount,
      total: actions.length,
      unexecuted: [],
      refreshProject: hasProjectChanges,
    }
  });
}));

/**
 * GET /api/terminal/commands
 * Get all available commands for autocomplete
 */
router.get('/commands', asyncHandler(async (req: AuthRequest, res: express.Response) => {
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
}));

/**
 * GET /api/terminal/projects
 * Get user's projects for @ autocomplete
 */
router.get('/projects', asyncHandler(async (req: AuthRequest, res: express.Response) => {
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
}));

/**
 * POST /api/terminal/validate
 * Validate command syntax without executing
 */
router.post('/validate', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { command } = req.body;

  if (!command || typeof command !== 'string') {
    return res.json({
      isValid: false,
      errors: ['Command is required and must be a string']
    });
  }

  const validation = CommandParser.validate(command);
  res.json(validation);
}));

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
 * Helper function to categorize commands by page/section
 */
function categorizeCommand(type: string): string {
  // Notes & Content
  if (type.includes('todo')) return 'Notes';
  if (type.includes('note')) return 'Notes';
  if (type.includes('devlog')) return 'Dev Log';

  // Features
  if (type.includes('feature')) return 'Features';

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
