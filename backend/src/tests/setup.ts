import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock the auth middleware globally for all tests
jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    // Check for Bearer token
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret') as any;
        req.userId = decoded.userId;
        req.user = { _id: decoded.userId, email: decoded.email, role: decoded.role || 'user', isAdmin: decoded.isAdmin || false };
        next();
      } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
      }
    }
    // Check for cookie token
    else if (req.cookies && req.cookies.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET || 'test_secret') as any;
        req.userId = decoded.userId;
        req.user = { _id: decoded.userId, email: decoded.email, role: decoded.role || 'user', isAdmin: decoded.isAdmin || false };
        next();
      } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
      }
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  },
  requireAuthOrDemo: async (req: any, res: any, next: any) => {
    // Same as requireAuth for tests - demo user will still need to auth with a token
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret') as any;
        req.userId = decoded.userId;
        req.user = { _id: decoded.userId, email: decoded.email, role: decoded.role || 'user', isAdmin: decoded.isAdmin || false };
        next();
      } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
      }
    } else if (req.cookies && req.cookies.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET || 'test_secret') as any;
        req.userId = decoded.userId;
        req.user = { _id: decoded.userId, email: decoded.email, role: decoded.role || 'user', isAdmin: decoded.isAdmin || false };
        next();
      } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
      }
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  },
  requireAdmin: (req: any, res: any, next: any) => {
    if (req.user && req.user.isAdmin) {
      next();
    } else {
      res.status(403).json({ message: 'Admin access required' });
    }
  },
  requireProjectAccess: jest.fn().mockImplementation((permission: string) => {
    return async (req: any, res: any, next: any) => {
      const { id: projectId } = req.params;
      const userId = req.userId;

      try {
        if (!userId || !projectId) {
          return res.status(401).json({ message: 'Missing authentication or project ID' });
        }

        // Import models dynamically to avoid circular dependencies
        const Project = (await import('../models/Project')).Project;
        const TeamMember = (await import('../models/TeamMember')).default;

        // Check if project exists
        const project = await Project.findById(projectId);
        if (!project) {
          return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user is the owner
        const isOwner = project.userId?.toString() === userId || project.ownerId?.toString() === userId;

        if (isOwner) {
          req.projectAccess = {
            isOwner: true,
            role: 'owner',
            canEdit: true,
            canManageTeam: true,
          };
          return next();
        }

        // Check team membership
        const teamMember = await TeamMember.findOne({
          projectId: new mongoose.Types.ObjectId(projectId),
          userId: new mongoose.Types.ObjectId(userId),
        });

        if (!teamMember) {
          return res.status(403).json({ message: 'Access denied: Not a team member' });
        }

        // Set project access based on role
        const canEdit = teamMember.role === 'editor' || teamMember.role === 'owner';
        const canManageTeam = teamMember.role === 'owner';

        req.projectAccess = {
          isOwner: false,
          role: teamMember.role,
          canEdit,
          canManageTeam,
        };

        // Check permission
        if (permission === 'edit' && !canEdit) {
          return res.status(403).json({ message: 'Edit permission required' });
        }
        if (permission === 'manage' && !canManageTeam) {
          return res.status(403).json({ message: 'Manage permission required' });
        }

        next();
      } catch (error) {
        console.error('Project access check error:', error);
        res.status(500).json({ message: 'Server error' });
      }
    };
  })
}));

// Mock ProjectCache to prevent setInterval from hanging tests
jest.mock('../services/ProjectCache', () => {
  class MockProjectCache {
    private cache = new Map();
    private hits = 0;
    private misses = 0;

    get(userId: string) {
      const entry = this.cache.get(userId);
      if (!entry) {
        this.misses++;
        return null;
      }
      this.hits++;
      return entry.data;
    }

    set(userId: string, projects: any[], ttl?: number) {
      this.cache.set(userId, { data: projects, expiresAt: Date.now() + 300000 });
    }

    invalidate(userId: string) {
      this.cache.delete(userId);
    }

    clear() {
      this.cache.clear();
    }

    getStats() {
      return {
        size: this.cache.size,
        hits: this.hits,
        misses: this.misses,
        hitRate: this.hits / (this.hits + this.misses) || 0
      };
    }

    destroy() {
      this.clear();
    }
  }

  return {
    ProjectCache: MockProjectCache,
    projectCache: new MockProjectCache()
  };
});

// Connect to the global MongoDB server (created in globalSetup.ts)
beforeAll(async () => {
  try {
    const mongoUri = (global as any).__MONGO_URI__;

    if (!mongoUri) {
      throw new Error('MongoDB URI not found. Global setup may have failed.');
    }

    // Connect to the shared in-memory database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000
      });
    }
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
}, 10000);

// Cleanup after each test file
afterAll(async () => {
  try {
    // Disconnect mongoose but DON'T stop the MongoDB server
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
});

// Clear database before each test
beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({}).catch(() => {
        // Ignore errors during cleanup
      });
    }
  }
});