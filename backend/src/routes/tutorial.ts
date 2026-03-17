import express, { Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { asyncHandler, NotFoundError, BadRequestError } from '../utils/errorHandler';

const router = express.Router();

// Hardcoded tutorial steps
const TUTORIAL_STEPS = [
  {
    stepNumber: 1,
    title: 'Create & Select Project',
    route: '/projects',
    content: {
      heading: 'Welcome! Let\'s start by creating a project',
      body: 'Projects are the foundation of your workspace. Each project can contain notes, todos, devlogs, features, and more. You\'ll need to create and select a project to access most features.',
      tips: [
        'Click the "+" button in the top header to create a new project',
        'Give your project a meaningful name and description',
        'You can create multiple projects to organize different work streams'
      ],
      actionRequired: 'Create and select a project to continue'
    },
    requiresProjectSelection: true
  },
  {
    stepNumber: 2,
    title: 'Header & Navigation',
    route: '/projects',
    content: {
      heading: 'Get oriented with the layout',
      body: 'The header contains your Session Tracker, Notifications, Search, and User Menu. The navigation bar gives you access to all sections — project-specific tabs appear when a project is selected.',
      tips: [
        'Session Tracker automatically logs your work sessions',
        'Use search to quickly find projects and content',
        'Project-specific tabs (Notes, Stack, Features, etc.) appear when a project is selected'
      ]
    },
    requiresProjectSelection: false
  },
  {
    stepNumber: 3,
    title: 'Terminal Interface',
    route: '/terminal',
    content: {
      heading: 'Your command center',
      body: 'The terminal is AI-first: just type naturally and the AI responds. For direct commands, prefix with /.',
      tips: [
        'Type naturally — AI responds with proposed actions you can confirm or cancel',
        'Prefix with / for slash commands: /add note, /view todos, /search',
        'Use Up/Down arrows to navigate command history',
        'Smart autocomplete suggests commands as you type',
        'Commands like /today, /standup, and /week give quick project overviews'
      ],
      actionRequired: 'Try typing "what can I do here?"'
    },
    requiresProjectSelection: true
  },
  {
    stepNumber: 4,
    title: 'AI Actions',
    route: '/terminal',
    content: {
      heading: 'Confirm before anything changes',
      body: 'When the AI suggests changes, they appear as checkboxes. Confirm or cancel — nothing happens without your approval.',
      tips: [
        'AI responses include action checkboxes — check the ones you want to run',
        'Click Confirm to execute checked actions, or Cancel to dismiss',
        'You can continue the conversation to refine suggestions before confirming',
        'Use "New Chat" or /reset to start a fresh conversation anytime'
      ],
      actionRequired: 'Try: "add a todo to review the project README"'
    },
    requiresProjectSelection: true
  },
  {
    stepNumber: 5,
    title: 'Notes, Todos & DevLogs',
    route: '/notes',
    content: {
      heading: 'Organize your project documentation',
      body: 'Keep notes for documentation and ideas, todos for tracking tasks, and devlogs for recording development progress. Switch between tabs to access each type.',
      tips: [
        'Notes support markdown for rich documentation',
        'Todos have priorities, due dates, subtasks, and status tracking',
        'DevLogs create a chronological record of your development progress',
        'You can also manage all of these from the terminal with /add, /view, and /edit commands'
      ],
      actionRequired: 'Try creating a note or todo to get started'
    },
    requiresProjectSelection: true
  },
  {
    stepNumber: 6,
    title: 'Stack & Features',
    route: '/stack',
    content: {
      heading: 'Define your tech stack and map your architecture',
      body: 'Track the technologies used in your project with the Stack tab. Then use Features to document components, services, and their relationships with a visual graph.',
      tips: [
        'Add technologies with category, version, and description',
        'Use preset stacks to quickly set up common configurations',
        'Features let you document components, hooks, routes, models, and more',
        'The graph view visualizes how features relate to each other'
      ],
      actionRequired: 'Add a technology to your stack, then check out the Features tab'
    },
    requiresProjectSelection: true
  },
  {
    stepNumber: 7,
    title: 'Deployment & Sharing',
    route: '/deployment',
    content: {
      heading: 'Deploy and share your work',
      body: 'Configure deployment details and environment variables in the Deployment tab. Make your project discoverable by setting it to public, or invite team members to collaborate.',
      tips: [
        'Store deployment URLs, build commands, and environment variables',
        'Set a public slug to create a shareable project page',
        'Invite team members by email or username with role-based access',
        'Public projects appear in the Discover feed for the community to find'
      ]
    },
    requiresProjectSelection: true
  },
  {
    stepNumber: 8,
    title: 'Settings & Account',
    route: '/settings',
    content: {
      heading: 'Make it yours',
      body: 'Customize your project settings (name, color, category, import/export) and your account (profile, themes, preferences). Visit the Discover page to explore public projects and other users.',
      tips: [
        'Customize project color and category for better organization',
        'Import/export project data as JSON for backup or sharing',
        'Create custom themes with your favorite colors in Account Settings',
        'Browse the Discover page for inspiration from other developers',
        'Restart this tutorial anytime from the Help page'
      ]
    },
    requiresProjectSelection: false
  }
];

// Get all tutorial steps
router.get('/steps', asyncHandler(async (_req: Request, res: Response) => {
  res.json({ steps: TUTORIAL_STEPS });
}));

// Get user's tutorial progress
router.get('/progress', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  // Ensure defaults for existing users who don't have tutorial fields
  const tutorialCompleted = user.tutorialCompleted ?? false;
  const tutorialProgress = user.tutorialProgress ?? {
    currentStep: 0,
    completedSteps: [],
    skipped: false,
    lastActiveDate: new Date()
  };

  res.json({
    tutorialCompleted,
    tutorialProgress
  });
}));

// Update tutorial progress
router.patch('/progress', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentStep, completedSteps } = req.body;

  if (currentStep === undefined || !Array.isArray(completedSteps)) {
    throw BadRequestError('currentStep and completedSteps are required', 'INVALID_PROGRESS_DATA');
  }

  const user = await User.findById(req.userId);
  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  // Initialize tutorialProgress if it doesn't exist (for existing users)
  if (!user.tutorialProgress) {
    user.tutorialProgress = {
      currentStep: 0,
      completedSteps: [],
      skipped: false,
      lastActiveDate: new Date()
    };
    user.markModified('tutorialProgress');
  }

  // Update progress
  user.tutorialProgress.currentStep = currentStep;
  user.tutorialProgress.completedSteps = completedSteps;
  user.tutorialProgress.lastActiveDate = new Date();
  user.markModified('tutorialProgress');

  await user.save();

  res.json({
    tutorialCompleted: user.tutorialCompleted,
    tutorialProgress: user.tutorialProgress
  });
}));

// Complete tutorial
router.post('/complete', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  // Initialize tutorialProgress if it doesn't exist
  if (!user.tutorialProgress) {
    user.tutorialProgress = {
      currentStep: 0,
      completedSteps: [],
      skipped: false,
      lastActiveDate: new Date()
    };
    user.markModified('tutorialProgress');
  }

  user.tutorialCompleted = true;
  user.tutorialProgress.currentStep = TUTORIAL_STEPS.length;
  user.tutorialProgress.completedSteps = TUTORIAL_STEPS.map(s => s.stepNumber);
  user.tutorialProgress.lastActiveDate = new Date();
  user.markModified('tutorialProgress');

  await user.save();

  res.json({
    tutorialCompleted: true,
    message: 'Tutorial completed successfully!'
  });
}));

// Skip tutorial
router.patch('/skip', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  // Initialize tutorialProgress if it doesn't exist
  if (!user.tutorialProgress) {
    user.tutorialProgress = {
      currentStep: 0,
      completedSteps: [],
      skipped: false,
      lastActiveDate: new Date()
    };
    user.markModified('tutorialProgress');
  }

  user.tutorialProgress.skipped = true;
  user.tutorialProgress.lastActiveDate = new Date();
  user.markModified('tutorialProgress');

  await user.save();

  res.json({
    message: 'Tutorial skipped',
    tutorialProgress: user.tutorialProgress
  });
}));

// Reset tutorial
router.post('/reset', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  // Initialize tutorialProgress if it doesn't exist
  if (!user.tutorialProgress) {
    user.tutorialProgress = {
      currentStep: 0,
      completedSteps: [],
      skipped: false,
      lastActiveDate: new Date()
    };
    user.markModified('tutorialProgress');
  }

  user.tutorialCompleted = false;
  user.tutorialProgress.currentStep = 0;
  user.tutorialProgress.completedSteps = [];
  user.tutorialProgress.skipped = false;
  user.tutorialProgress.lastActiveDate = new Date();
  user.markModified('tutorialProgress');

  await user.save();

  res.json({
    message: 'Tutorial reset successfully',
    tutorialProgress: user.tutorialProgress
  });
}));

export default router;
