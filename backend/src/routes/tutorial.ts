import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';

const router = express.Router();

// Hardcoded tutorial steps
const TUTORIAL_STEPS = [
  {
    stepNumber: 1,
    title: 'Create & Select Project',
    route: '/projects',
    content: {
      heading: 'Welcome! Let\'s start by creating a project',
      body: 'Projects are the foundation of your workspace. Each project can contain notes, todos, devlogs, and more. You\'ll need to create and select a project to access most features.',
      tips: [
        'Click "Create New Project" to get started',
        'Give your project a meaningful name',
        'You can create multiple projects to organize different work streams'
      ],
      actionRequired: 'Create and select a project to continue'
    },
    requiresProjectSelection: true
  },
  {
    stepNumber: 2,
    title: 'Header Components',
    route: '/projects',
    content: {
      heading: 'Explore the header features',
      body: 'The header contains several useful tools: Session Tracker to monitor your work time, Notifications to stay updated, Search to quickly find content, and your User Menu for account settings.',
      tips: [
        'Session Tracker automatically logs your work sessions',
        'Click the bell icon to view notifications',
        'Use the search bar to quickly find projects and content'
      ]
    },
    requiresProjectSelection: false
  },
  {
    stepNumber: 3,
    title: 'Navigation System',
    route: '/projects',
    content: {
      heading: 'Navigate through the application',
      body: 'The main navigation bar lets you access different sections of the app. When a project is selected, you\'ll see additional tabs specific to that project.',
      tips: [
        'Main nav items are always accessible',
        'Project-specific tabs appear when you select a project',
        'The active tab is highlighted for easy navigation'
      ]
    },
    requiresProjectSelection: false
  },
  {
    stepNumber: 4,
    title: 'Terminal Interface',
    route: '/terminal',
    content: {
      heading: 'Power-user terminal interface',
      body: 'Experience a unique CLI-style interface built right into your browser. Execute commands with the speed and efficiency of a terminal, featuring intelligent autocomplete, persistent command history, and instant execution - no page reloads required.',
      tips: [
        'Lightning-fast command execution with real-time feedback',
        'Smart autocomplete learns your workflow patterns',
        'Full command history with Up/Down arrow navigation',
        'Execute complex operations in seconds, not clicks'
      ],
      actionRequired: 'Type /help to see all available commands'
    },
    requiresProjectSelection: true
  },
  {
    stepNumber: 5,
    title: 'Notes, Todos & DevLogs',
    route: '/notes',
    content: {
      heading: 'Organize your project documentation',
      body: 'This section lets you create notes, manage todos, and track development logs. Switch between tabs to access different content types.',
      tips: [
        'Notes are great for documentation and ideas',
        'Todos help track tasks and action items',
        'DevLogs document your development progress over time'
      ]
    },
    requiresProjectSelection: true
  },
  {
    stepNumber: 6,
    title: 'Stack Management',
    route: '/stack',
    content: {
      heading: 'Define your technology stack',
      body: 'Track the technologies, frameworks, and packages used in your project. Use presets for common stacks or add custom technologies.',
      tips: [
        'View current stack in the "Current" tab',
        'Add new technologies in the "Add" tab',
        'Use preset stacks to quickly set up common configurations'
      ]
    },
    requiresProjectSelection: true
  },
  {
    stepNumber: 7,
    title: 'Features & Components',
    route: '/features',
    content: {
      heading: 'Visualize your project structure',
      body: 'Document features and components with a visual graph representation. See how different parts of your project relate to each other.',
      tips: [
        'The graph view shows component relationships',
        'Click nodes to view details',
        'Use the structure tab for a hierarchical view'
      ]
    },
    requiresProjectSelection: true
  },
  {
    stepNumber: 8,
    title: 'Deployment Configuration',
    route: '/deployment',
    content: {
      heading: 'Manage deployment settings',
      body: 'Configure deployment details, environment variables, and deployment notes. Keep track of your hosting and deployment configuration.',
      tips: [
        'Store environment variables securely',
        'Document your deployment process',
        'Track deployment history and status'
      ]
    },
    requiresProjectSelection: true
  },
  {
    stepNumber: 9,
    title: 'Public Sharing',
    route: '/public',
    content: {
      heading: 'Share your project publicly',
      body: 'Make your project discoverable by setting a public slug and visibility settings. Control what information is shared publicly.',
      tips: [
        'Set a unique public slug for your project URL',
        'Toggle visibility to control public access',
        'Public projects appear in the discovery feed'
      ]
    },
    requiresProjectSelection: false
  },
  {
    stepNumber: 10,
    title: 'Team Collaboration',
    route: '/sharing',
    content: {
      heading: 'Collaborate with your team',
      body: 'Invite team members, manage roles and permissions, and view team activity. Work together on projects seamlessly.',
      tips: [
        'Invite members by email or username',
        'Assign roles to control access levels',
        'View activity log to track team changes'
      ]
    },
    requiresProjectSelection: false
  },
  {
    stepNumber: 11,
    title: 'Account Settings',
    route: '/account-settings',
    content: {
      heading: 'Customize your account',
      body: 'Manage your profile, create custom themes, and configure your account settings. Make the app your own.',
      tips: [
        'Update your profile information',
        'Create custom themes with your favorite colors',
        'Set your display preferences'
      ]
    },
    requiresProjectSelection: false
  },
  {
    stepNumber: 12,
    title: 'Discover Community',
    route: '/discover',
    content: {
      heading: 'Explore the community',
      body: 'Discover public projects and users. Use search and filters to find interesting projects and connect with other developers.',
      tips: [
        'Browse public projects for inspiration',
        'Search by technology or project type',
        'Follow users to stay updated on their work'
      ]
    },
    requiresProjectSelection: false
  }
];

// Get all tutorial steps
router.get('/steps', async (req, res) => {
  try {
    res.json({ steps: TUTORIAL_STEPS });
  } catch (error) {
    console.error('Error fetching tutorial steps:', error);
    res.status(500).json({ error: 'Failed to fetch tutorial steps' });
  }
});

// Get user's tutorial progress
router.get('/progress', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
  } catch (error) {
    console.error('Error fetching tutorial progress:', error);
    res.status(500).json({ error: 'Failed to fetch tutorial progress' });
  }
});

// Update tutorial progress
router.patch('/progress', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentStep, completedSteps } = req.body;

    if (currentStep === undefined || !Array.isArray(completedSteps)) {
      return res.status(400).json({ error: 'currentStep and completedSteps are required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
  } catch (error) {
    console.error('Error updating tutorial progress:', error);
    res.status(500).json({ error: 'Failed to update tutorial progress' });
  }
});

// Complete tutorial
router.post('/complete', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
  } catch (error) {
    console.error('Error completing tutorial:', error);
    res.status(500).json({ error: 'Failed to complete tutorial' });
  }
});

// Skip tutorial
router.patch('/skip', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
  } catch (error) {
    console.error('Error skipping tutorial:', error);
    res.status(500).json({ error: 'Failed to skip tutorial' });
  }
});

// Reset tutorial
router.post('/reset', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
  } catch (error) {
    console.error('Error resetting tutorial:', error);
    res.status(500).json({ error: 'Failed to reset tutorial' });
  }
});

export default router;
