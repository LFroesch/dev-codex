import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { connectDatabase } from '../config/database';

dotenv.config();

async function seedDemoUser() {
  try {
    await connectDatabase();

    const demoEmail = 'demo@projectmanager.example';
    const demoUsername = 'demo_user';

    // Check if demo user already exists
    let demoUser = await User.findOne({ email: demoEmail });

    if (demoUser) {
      console.log('Demo user already exists:', demoEmail);
      console.log('Demo user ID:', demoUser._id);

      // Update isDemo flag if it doesn't exist
      if (!demoUser.isDemo) {
        demoUser.isDemo = true;
        await demoUser.save();
        console.log('Updated demo user with isDemo flag');
      }
    } else {
      // Create demo user
      demoUser = new User({
        email: demoEmail,
        password: 'demo-password-not-used',
        firstName: 'Demo',
        lastName: 'User',
        username: demoUsername,
        theme: 'retro',
        planTier: 'pro',
        projectLimit: 10,
        isDemo: true,
        isAdmin: false,
        tutorialCompleted: true,
        bio: 'This is a demo account. Sign up to create your own projects!',
        isPublic: true,
        publicSlug: 'demo',
        publicDescription: 'Demo account showcasing all features'
      });

      await demoUser.save();
      console.log('✓ Demo user created successfully');
      console.log('  Email:', demoEmail);
      console.log('  Username:', demoUsername);
      console.log('  User ID:', demoUser._id);
    }

    // Create demo projects with rich sample data
    const existingProjects = await Project.find({ ownerId: demoUser._id });

    if (existingProjects.length > 0) {
      console.log(`Demo user already has ${existingProjects.length} projects. Skipping project creation.`);
      console.log('To reset demo data, delete existing demo projects first.');
    } else {
      // Project 1: Full-stack web app
      const webAppProject = new Project({
        name: 'TaskFlow',
        description: 'A modern, collaborative project management tool built with React and Node.js',
        color: '#8B5CF6',
        category: 'Demo',
        ownerId: demoUser._id,
        userId: demoUser._id,
        status: 'in_progress',
        isPublic: true,
        publicSlug: 'demo-taskflow',
        publicDescription: 'A modern, collaborative project management tool built with React and Node.js. Features real-time collaboration, role-based access control, and rich activity tracking.',
        notes: [
          {
            id: 'note1',
            title: 'Architecture Overview',
            description: 'High-level system design',
            content: `# Architecture Overview

## Frontend
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS + DaisyUI for styling
- React Router for navigation

## Backend
- Node.js + Express
- MongoDB for data persistence
- JWT authentication
- RESTful API design

## Key Features
- Real-time collaboration
- Role-based access control
- Activity tracking
- Rich text editing`,
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          },
          {
            id: 'note2',
            title: 'API Endpoints',
            description: 'Documentation of REST API',
            content: `# API Endpoints

## Authentication
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

## Projects
- GET /api/projects
- POST /api/projects
- PUT /api/projects/:id
- DELETE /api/projects/:id

## Notes/Todos/DevLogs
- GET /api/projects/:id/notes
- POST /api/projects/:id/notes
- etc.`,
            createdAt: new Date('2024-01-18'),
            updatedAt: new Date('2024-01-20'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          }
        ],
        todos: [
          {
            id: 'todo1',
            title: 'Design user authentication flow',
            description: 'Create wireframes and user stories for login/signup',
            priority: 'high',
            completed: true,
            status: 'completed',
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-12'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          },
          {
            id: 'todo2',
            title: 'Implement JWT authentication',
            description: 'Set up JWT tokens, refresh tokens, and secure cookie handling',
            priority: 'high',
            completed: true,
            status: 'completed',
            createdAt: new Date('2024-01-12'),
            updatedAt: new Date('2024-01-16'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          },
          {
            id: 'todo3',
            title: 'Build project dashboard UI',
            description: 'Create responsive dashboard with project cards and quick actions',
            priority: 'high',
            completed: false,
            status: 'in_progress',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            createdAt: new Date('2024-01-18'),
            updatedAt: new Date('2024-01-20'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          },
          {
            id: 'todo4',
            title: 'Add real-time collaboration features',
            description: 'Implement WebSocket support for live updates',
            priority: 'medium',
            completed: false,
            status: 'not_started',
            createdAt: new Date('2024-01-19'),
            updatedAt: new Date('2024-01-19'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          },
          {
            id: 'todo5',
            title: 'Write unit tests for API endpoints',
            description: 'Achieve 80%+ test coverage for backend routes',
            priority: 'medium',
            completed: false,
            status: 'not_started',
            createdAt: new Date('2024-01-20'),
            updatedAt: new Date('2024-01-20'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          }
        ],
        devLogs: [
          {
            id: 'devlog1',
            title: 'Initial Setup & Project Kickoff',
            description: `Set up the development environment and initialized both frontend and backend repositories. Configured ESLint, Prettier, and TypeScript.

Created initial folder structure and installed core dependencies. Set up MongoDB connection and basic Express server.`,
            date: new Date('2024-01-10'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          },
          {
            id: 'devlog2',
            title: 'Authentication System Complete',
            description: `Finished implementing the complete authentication flow including:
- User registration with email validation
- Login with JWT token generation
- Refresh token rotation
- Password reset via email
- OAuth integration (Google)

All endpoints tested and working smoothly.`,
            date: new Date('2024-01-16'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          },
          {
            id: 'devlog3',
            title: 'Dashboard UI Progress',
            description: `Made significant progress on the dashboard UI. Implemented:
- Responsive project cards with color coding
- Quick action buttons
- Filter and search functionality
- Loading skeletons

Still need to add drag-and-drop reordering and better mobile responsiveness.`,
            date: new Date('2024-01-20'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          }
        ],
        stack: [
          { category: 'framework', name: 'React', version: '18.2.0', description: 'Frontend framework' },
          { category: 'runtime', name: 'Node.js', version: '20.x', description: 'Backend runtime' },
          { category: 'database', name: 'MongoDB', version: '7.0', description: 'NoSQL database' },
          { category: 'framework', name: 'Express', version: '4.18', description: 'Web framework' },
          { category: 'styling', name: 'TailwindCSS', version: '3.4', description: 'Utility-first CSS' },
          { category: 'ui', name: 'DaisyUI', version: '4.x', description: 'Component library' },
          { category: 'tooling', name: 'Vite', version: '5.x', description: 'Build tool' },
          { category: 'testing', name: 'Jest', version: '29.x', description: 'Testing framework' },
          { category: 'auth', name: 'JWT', version: '', description: 'Token-based authentication' }
        ],
        components: [
          {
            id: 'comp1',
            category: 'frontend',
            type: 'context',
            title: 'AuthContext',
            content: 'React Context provider for global authentication state. Manages user login/logout, token refresh, and auth state across the entire application.',
            feature: 'Authentication',
            filePath: 'src/contexts/AuthContext.tsx',
            tags: ['auth', 'context', 'react'],
            relationships: [
              { id: 'rel1', targetId: 'comp3', relationType: 'uses', description: 'Uses API hooks for auth operations' },
              { id: 'rel2', targetId: 'comp4', relationType: 'depends_on', description: 'Depends on backend auth endpoints' }
            ],
            createdAt: new Date('2024-01-12'),
            updatedAt: new Date('2024-01-16')
          },
          {
            id: 'comp2',
            category: 'frontend',
            type: 'component',
            title: 'ProjectCard',
            content: 'Reusable card component for displaying project information with quick actions. Includes project name, description, status, and action buttons.',
            feature: 'Project Display',
            filePath: 'src/components/ProjectCard.tsx',
            tags: ['ui', 'component', 'projects'],
            relationships: [
              { id: 'rel1', targetId: 'comp3', relationType: 'uses', description: 'Fetches project data via hook' },
              { id: 'rel2', targetId: 'comp7', relationType: 'uses', description: 'Uses modal for actions' }
            ],
            createdAt: new Date('2024-01-14'),
            updatedAt: new Date('2024-01-18')
          },
          {
            id: 'comp3',
            category: 'frontend',
            type: 'hook',
            title: 'useProjects',
            content: 'Custom React hook for fetching and managing project data. Includes caching, error handling, and automatic refetching.',
            feature: 'Data Fetching',
            filePath: 'src/hooks/useProjects.ts',
            tags: ['hooks', 'data', 'react'],
            relationships: [
              { id: 'rel1', targetId: 'comp4', relationType: 'depends_on', description: 'Calls backend API endpoints' },
              { id: 'rel2', targetId: 'comp8', relationType: 'uses', description: 'Uses error handling utility' }
            ],
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15')
          },
          {
            id: 'comp4',
            category: 'backend',
            type: 'route',
            title: 'Project Routes',
            content: 'Express routes for project CRUD operations. Handles GET, POST, PUT, DELETE for projects with authentication and validation.',
            feature: 'API Endpoints',
            filePath: 'backend/src/routes/projects.ts',
            tags: ['api', 'express', 'routes'],
            relationships: [
              { id: 'rel1', targetId: 'comp5', relationType: 'uses', description: 'Uses auth middleware for protection' },
              { id: 'rel2', targetId: 'comp6', relationType: 'depends_on', description: 'Interacts with database models' }
            ],
            createdAt: new Date('2024-01-13'),
            updatedAt: new Date('2024-01-20')
          },
          {
            id: 'comp5',
            category: 'backend',
            type: 'middleware',
            title: 'Auth Middleware',
            content: 'Express middleware for JWT token validation and user authentication. Protects routes and injects user context into requests.',
            feature: 'Authentication',
            filePath: 'backend/src/middleware/auth.ts',
            tags: ['auth', 'middleware', 'security'],
            relationships: [
              { id: 'rel1', targetId: 'comp6', relationType: 'uses', description: 'Queries User model for validation' }
            ],
            createdAt: new Date('2024-01-11'),
            updatedAt: new Date('2024-01-12')
          },
          {
            id: 'comp6',
            category: 'database',
            type: 'model',
            title: 'Project Model',
            content: 'Mongoose schema and model for projects. Defines structure for notes, todos, devlogs, components, and relationships.',
            feature: 'Data Layer',
            filePath: 'backend/src/models/Project.ts',
            tags: ['database', 'mongoose', 'schema'],
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-18')
          },
          {
            id: 'comp7',
            category: 'frontend',
            type: 'component',
            title: 'Modal Component',
            content: 'Reusable modal dialog component with animations. Used throughout the app for confirmations, forms, and detail views.',
            feature: 'UI Components',
            filePath: 'src/components/Modal.tsx',
            tags: ['ui', 'modal', 'animation'],
            createdAt: new Date('2024-01-13'),
            updatedAt: new Date('2024-01-15')
          },
          {
            id: 'comp8',
            category: 'frontend',
            type: 'utility',
            title: 'Error Handler',
            content: 'Centralized error handling utility that formats API errors, logs to console, and displays user-friendly toast notifications.',
            feature: 'Error Handling',
            filePath: 'src/utils/errorHandler.ts',
            tags: ['utility', 'errors', 'toast'],
            relationships: [
              { id: 'rel1', targetId: 'comp9', relationType: 'uses', description: 'Uses toast service for notifications' }
            ],
            createdAt: new Date('2024-01-14'),
            updatedAt: new Date('2024-01-14')
          },
          {
            id: 'comp9',
            category: 'frontend',
            type: 'service',
            title: 'Toast Service',
            content: 'Toast notification service for displaying success, error, warning, and info messages to users with customizable duration and position.',
            feature: 'Notifications',
            filePath: 'src/services/toastService.ts',
            tags: ['notifications', 'ui', 'service'],
            createdAt: new Date('2024-01-12'),
            updatedAt: new Date('2024-01-12')
          },
          {
            id: 'comp10',
            category: 'infrastructure',
            type: 'config',
            title: 'Environment Config',
            content: 'Centralized configuration for environment variables, API URLs, and feature flags. Validates required env vars on startup.',
            feature: 'Configuration',
            filePath: 'backend/src/config/env.ts',
            tags: ['config', 'environment', 'setup'],
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-10')
          }
        ],
        deploymentData: {
          liveUrl: 'https://taskflow-demo.vercel.app',
          githubRepo: 'https://github.com/demo/taskflow',
          deploymentPlatform: 'Vercel + Railway',
          deploymentStatus: 'active',
          buildCommand: 'npm run build',
          startCommand: 'npm start',
          lastDeployDate: new Date('2024-01-20'),
          deploymentBranch: 'main',
          environmentVariables: [
            { key: 'NODE_ENV', value: 'production' },
            { key: 'DATABASE_URL', value: '***' },
            { key: 'JWT_SECRET', value: '***' }
          ],
          notes: 'Auto-deploys on push to main branch. Using Vercel for frontend and Railway for backend API.'
        }
      });

      await webAppProject.save();
      console.log('✓ Created project: TaskFlow');

      // Project 2: Mobile app
      const mobileAppProject = new Project({
        name: 'FitTrack - Fitness Companion',
        description: 'Cross-platform mobile app for tracking workouts and nutrition',
        color: '#10B981',
        category: 'Demo',
        ownerId: demoUser._id,
        userId: demoUser._id,
        status: 'planning',
        isPublic: true,
        publicSlug: 'demo-fittrack',
        publicDescription: 'Cross-platform mobile fitness app built with React Native. Track workouts, nutrition, and progress with an intuitive interface and offline support.',
        notes: [
          {
            id: 'note1',
            title: 'Feature Requirements',
            description: 'Core features for MVP',
            content: `# MVP Features

## Workout Tracking
- Log exercises with sets, reps, weight
- Track cardio sessions (time, distance, calories)
- Pre-built workout templates
- Custom workout creation

## Nutrition Logging
- Food diary with barcode scanner
- Calorie and macro tracking
- Water intake logging
- Meal photos

## Progress Tracking
- Body measurements
- Progress photos
- Weight trends
- Personal records`,
            createdAt: new Date('2024-01-05'),
            updatedAt: new Date('2024-01-08'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          }
        ],
        todos: [
          {
            id: 'todo1',
            title: 'Research React Native vs Flutter',
            description: 'Compare frameworks and make technology decision',
            priority: 'high',
            completed: true,
            status: 'completed',
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date('2024-01-05'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          },
          {
            id: 'todo2',
            title: 'Design app mockups in Figma',
            description: 'Create high-fidelity mockups for all main screens',
            priority: 'high',
            completed: false,
            status: 'in_progress',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
            createdAt: new Date('2024-01-06'),
            updatedAt: new Date('2024-01-10'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          },
          {
            id: 'todo3',
            title: 'Set up React Native project',
            description: 'Initialize project with Expo and configure dependencies',
            priority: 'medium',
            completed: false,
            status: 'not_started',
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-10'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          }
        ],
        devLogs: [
          {
            id: 'devlog1',
            title: 'Project Planning & Research',
            description: `Started the project by researching existing fitness apps and identifying gaps in the market.

Decided to focus on simplicity and ease of use, avoiding the complexity of apps like MyFitnessPal while maintaining powerful tracking features.

Chose React Native with Expo for cross-platform development.`,
            date: new Date('2024-01-05'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          }
        ],
        stack: [
          { category: 'framework', name: 'React Native', version: '0.73', description: 'Mobile framework' },
          { category: 'tooling', name: 'Expo', version: '50.x', description: 'React Native toolchain' },
          { category: 'state', name: 'Zustand', version: '4.x', description: 'State management' },
          { category: 'database', name: 'SQLite', version: '', description: 'Local storage' },
          { category: 'api', name: 'Axios', version: '1.x', description: 'HTTP client' }
        ],
        components: [
          {
            id: 'comp1',
            category: 'frontend',
            type: 'screen',
            title: 'WorkoutTracker',
            content: 'Main screen for logging workouts. Allows users to record exercises, sets, reps, and weight. Includes timer and rest period tracking.',
            feature: 'Workout Logging',
            filePath: 'src/screens/WorkoutTracker.tsx',
            tags: ['mobile', 'screen', 'tracking'],
            relationships: [
              { id: 'rel1', targetId: 'comp2', relationType: 'uses', description: 'Renders exercise cards' },
              { id: 'rel2', targetId: 'comp4', relationType: 'uses', description: 'Uses workout data store' }
            ],
            createdAt: new Date('2024-01-07'),
            updatedAt: new Date('2024-01-10')
          },
          {
            id: 'comp2',
            category: 'frontend',
            type: 'component',
            title: 'ExerciseCard',
            content: 'Card component for displaying exercise details including name, muscle group, and previous performance history.',
            feature: 'Exercise Display',
            filePath: 'src/components/ExerciseCard.tsx',
            tags: ['mobile', 'ui', 'component'],
            createdAt: new Date('2024-01-08'),
            updatedAt: new Date('2024-01-08')
          },
          {
            id: 'comp3',
            category: 'frontend',
            type: 'screen',
            title: 'Nutrition Logger',
            content: 'Screen for logging meals and tracking daily calorie/macro intake. Includes barcode scanner integration and meal photo uploads.',
            feature: 'Nutrition Tracking',
            filePath: 'src/screens/NutritionLogger.tsx',
            tags: ['mobile', 'screen', 'nutrition'],
            relationships: [
              { id: 'rel1', targetId: 'comp5', relationType: 'uses', description: 'Uses food database API' }
            ],
            createdAt: new Date('2024-01-09'),
            updatedAt: new Date('2024-01-12')
          },
          {
            id: 'comp4',
            category: 'frontend',
            type: 'store',
            title: 'Workout Store',
            content: 'Zustand state management store for workout data. Handles workout history, active session state, and exercise templates.',
            feature: 'State Management',
            filePath: 'src/stores/workoutStore.ts',
            tags: ['state', 'zustand', 'data'],
            relationships: [
              { id: 'rel1', targetId: 'comp6', relationType: 'depends_on', description: 'Persists to local SQLite database' }
            ],
            createdAt: new Date('2024-01-06'),
            updatedAt: new Date('2024-01-11')
          },
          {
            id: 'comp5',
            category: 'api',
            type: 'service',
            title: 'Food Database API',
            content: 'Integration with nutrition database API for food search and macro information. Includes caching and offline support.',
            feature: 'Nutrition Data',
            filePath: 'src/services/foodApi.ts',
            tags: ['api', 'nutrition', 'data'],
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-12')
          },
          {
            id: 'comp6',
            category: 'database',
            type: 'schema',
            title: 'SQLite Schema',
            content: 'Local database schema for storing workout history, exercise templates, and user preferences offline.',
            feature: 'Data Persistence',
            filePath: 'src/database/schema.ts',
            tags: ['database', 'sqlite', 'schema'],
            createdAt: new Date('2024-01-05'),
            updatedAt: new Date('2024-01-06')
          }
        ],
        deploymentData: {
          liveUrl: 'exp://expo.dev/@demo/fittrack',
          githubRepo: 'https://github.com/demo/fittrack',
          deploymentPlatform: 'Expo',
          deploymentStatus: 'inactive',
          buildCommand: 'expo build:android && expo build:ios',
          startCommand: 'expo start',
          deploymentBranch: 'main',
          environmentVariables: [
            { key: 'EXPO_PUBLIC_API_URL', value: 'https://api.fittrack.example' }
          ],
          notes: 'Mobile app in development. Planning to submit to App Store and Play Store soon.'
        }
      });

      await mobileAppProject.save();
      console.log('✓ Created project: FitTrack');

      // Project 3: CLI tool
      const cliProject = new Project({
        name: 'DevTools CLI',
        description: 'Command-line utilities for developer productivity',
        color: '#F59E0B',
        category: 'Demo',
        ownerId: demoUser._id,
        userId: demoUser._id,
        status: 'active',
        isPublic: true,
        publicSlug: 'demo-devtools-cli',
        publicDescription: 'Powerful command-line toolkit for developers. Scaffold projects, generate code, and automate common development tasks with an intuitive CLI interface.',
        notes: [
          {
            id: 'note1',
            title: 'Command Ideas',
            description: 'Brainstorming useful commands',
            content: `# Command Ideas

## Project Scaffolding
- \`devtools init\` - Initialize new project with templates
- \`devtools add <component>\` - Add common components

## Code Generation
- \`devtools gen model <name>\` - Generate model/schema
- \`devtools gen api <name>\` - Generate CRUD API endpoints

## Utilities
- \`devtools clean\` - Clean build artifacts
- \`devtools deps\` - Analyze dependencies
- \`devtools health\` - Check project health`,
            createdAt: new Date('2023-12-20'),
            updatedAt: new Date('2024-01-10'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          }
        ],
        todos: [
          {
            id: 'todo1',
            title: 'Implement init command with templates',
            description: '',
            priority: 'high',
            completed: true,
            status: 'completed',
            createdAt: new Date('2023-12-22'),
            updatedAt: new Date('2024-01-05'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          },
          {
            id: 'todo2',
            title: 'Add interactive prompts with inquirer',
            description: '',
            priority: 'medium',
            completed: true,
            status: 'completed',
            createdAt: new Date('2024-01-05'),
            updatedAt: new Date('2024-01-12'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          },
          {
            id: 'todo3',
            title: 'Publish to npm',
            description: 'Set up npm publishing workflow',
            priority: 'high',
            completed: false,
            status: 'blocked',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-18'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          }
        ],
        devLogs: [
          {
            id: 'devlog1',
            title: 'CLI Framework Setup',
            description: `Set up the CLI using Commander.js for argument parsing. Implemented basic command structure and help text.

Added chalk for colored output and ora for loading spinners. The CLI is starting to feel polished!`,
            date: new Date('2023-12-28'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          },
          {
            id: 'devlog2',
            title: 'Template System Working',
            description: `Built a flexible template system that can scaffold projects from predefined templates.

Users can now run \`devtools init react-ts\` and get a fully configured TypeScript React project with ESLint, Prettier, and Vite. Super satisfying to see it work!`,
            date: new Date('2024-01-08'),
            createdBy: demoUser._id,
            updatedBy: demoUser._id
          }
        ],
        stack: [
          { category: 'runtime', name: 'Node.js', version: '20.x', description: 'Runtime environment' },
          { category: 'utility', name: 'Commander.js', version: '11.x', description: 'CLI framework' },
          { category: 'utility', name: 'Inquirer', version: '9.x', description: 'Interactive prompts' },
          { category: 'utility', name: 'Chalk', version: '5.x', description: 'Terminal styling' },
          { category: 'testing', name: 'Vitest', version: '1.x', description: 'Testing framework' }
        ],
        components: [
          {
            id: 'comp1',
            category: 'backend',
            type: 'command',
            title: 'Init Command',
            content: 'Handles project initialization command. Prompts user for project type, scaffolds directory structure, and installs dependencies.',
            feature: 'Project Init',
            filePath: 'src/commands/init.ts',
            tags: ['cli', 'command', 'setup'],
            relationships: [
              { id: 'rel1', targetId: 'comp2', relationType: 'uses', description: 'Uses template engine for file generation' },
              { id: 'rel2', targetId: 'comp3', relationType: 'uses', description: 'Uses prompt handler for user input' }
            ],
            createdAt: new Date('2023-12-25'),
            updatedAt: new Date('2024-01-05')
          },
          {
            id: 'comp2',
            category: 'backend',
            type: 'utility',
            title: 'Template Engine',
            content: 'Template rendering system for generating project files from templates. Supports variable substitution and conditional blocks.',
            feature: 'Code Generation',
            filePath: 'src/utils/templateEngine.ts',
            tags: ['cli', 'templates', 'utility'],
            relationships: [
              { id: 'rel1', targetId: 'comp5', relationType: 'depends_on', description: 'Reads template files from filesystem' }
            ],
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date('2024-01-06')
          },
          {
            id: 'comp3',
            category: 'frontend',
            type: 'utility',
            title: 'Prompt Handler',
            content: 'Interactive CLI prompt system using Inquirer.js. Handles user input validation and provides autocomplete suggestions.',
            feature: 'User Interaction',
            filePath: 'src/utils/promptHandler.ts',
            tags: ['cli', 'prompts', 'interaction'],
            createdAt: new Date('2024-01-03'),
            updatedAt: new Date('2024-01-05')
          },
          {
            id: 'comp4',
            category: 'backend',
            type: 'command',
            title: 'Generate Command',
            content: 'Code generation command for creating models, routes, and API endpoints from templates. Supports custom generators.',
            feature: 'Code Generation',
            filePath: 'src/commands/generate.ts',
            tags: ['cli', 'command', 'generator'],
            relationships: [
              { id: 'rel1', targetId: 'comp2', relationType: 'uses', description: 'Uses template engine' }
            ],
            createdAt: new Date('2024-01-07'),
            updatedAt: new Date('2024-01-09')
          },
          {
            id: 'comp5',
            category: 'backend',
            type: 'service',
            title: 'File System Manager',
            content: 'Abstraction layer for file system operations with error handling, backup creation, and rollback capabilities.',
            feature: 'File Operations',
            filePath: 'src/services/fileSystemManager.ts',
            tags: ['filesystem', 'utility', 'safety'],
            createdAt: new Date('2023-12-28'),
            updatedAt: new Date('2024-01-02')
          },
          {
            id: 'comp6',
            category: 'backend',
            type: 'utility',
            title: 'Logger',
            content: 'Colored console logging utility with different log levels (info, warn, error, success) and formatting options.',
            feature: 'Logging',
            filePath: 'src/utils/logger.ts',
            tags: ['logging', 'console', 'utility'],
            createdAt: new Date('2023-12-26'),
            updatedAt: new Date('2023-12-27')
          }
        ],
        deploymentData: {
          liveUrl: 'https://www.npmjs.com/package/devtools-cli-demo',
          githubRepo: 'https://github.com/demo/devtools-cli',
          deploymentPlatform: 'npm',
          deploymentStatus: 'active',
          buildCommand: 'npm run build',
          startCommand: 'node dist/index.js',
          lastDeployDate: new Date('2024-01-15'),
          deploymentBranch: 'main',
          environmentVariables: [],
          notes: 'Published to npm registry. Install with: npm install -g devtools-cli-demo'
        }
      });

      await cliProject.save();
      console.log('✓ Created project: DevTools CLI');

      console.log('\n✅ Demo user seeded successfully with 3 projects!');
      console.log('\nDemo User Details:');
      console.log('  Email:', demoEmail);
      console.log('  User ID:', demoUser._id);
      console.log('\nYou can now use this account for demo purposes.');
    }

  } catch (error) {
    console.error('Error seeding demo user:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

seedDemoUser();
