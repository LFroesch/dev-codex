import express, { Response, Request } from 'express';
import { User } from '../models/User';
import { Project } from '../models/Project';
import mongoose from 'mongoose';
import { asyncHandler, NotFoundError, ForbiddenError } from '../utils/errorHandler';

const router = express.Router();

// Get public project by ID or slug
router.get('/project/:identifier', asyncHandler(async (req: Request, res: Response) => {
  const { identifier } = req.params;
  
  // Try to find by publicSlug first, then by ID
  let project;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    project = await Project.findById(identifier)
      .populate('ownerId', 'firstName lastName username displayPreference email isPublic publicSlug');
  } else {
    project = await Project.findOne({ publicSlug: identifier })
      .populate('ownerId', 'firstName lastName username displayPreference email isPublic publicSlug');
  }

  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Check if project is public
  if (!project.isPublic) {
    throw ForbiddenError('Project is not public', 'PROJECT_NOT_PUBLIC');
  }

    // Get visibility settings with defaults
    const visibility = project.publicVisibility || {
      description: true,
      tags: true,
      components: true,
      techStack: true,
      timestamps: true,
      devLog: true,
    };

    // Return sanitized public project data based on visibility settings
    const publicProject: any = {
      id: project._id,
      name: project.name,
      color: project.color,
      category: project.category,
      publicSlug: project.publicSlug,
      publicVisibility: project.publicVisibility,
      // Owner info (only if owner profile is also public)
      owner: (project.ownerId && typeof project.ownerId === 'object') ? {
        id: (project.ownerId as any)._id,
        firstName: (project.ownerId as any).firstName,
        lastName: (project.ownerId as any).lastName,
        username: (project.ownerId as any).username,
        displayPreference: (project.ownerId as any).displayPreference,
        displayName: (project.ownerId as any).displayPreference === 'username'
          ? `@${(project.ownerId as any).username}`
          : `${(project.ownerId as any).firstName} ${(project.ownerId as any).lastName}`,
        isPublic: (project.ownerId as any).isPublic,
        publicSlug: (project.ownerId as any).publicSlug
      } : null
    };

    // Add fields based on visibility settings
    if (visibility.description) {
      publicProject.description = project.publicDescription || project.description;
      publicProject.publicShortDescription = project.publicShortDescription;
      publicProject.publicDescription = project.publicDescription;
    }
    
    if (visibility.tags && project.tags?.length) {
      publicProject.tags = project.tags;
    }
    
    if (visibility.components && project.components?.length) {
      publicProject.components = project.components;
    }
    
    if (visibility.techStack) {
      if (project.stack?.length) {
        publicProject.technologies = project.stack;
      }
    }
    
    if (visibility.timestamps) {
      publicProject.createdAt = project.createdAt;
      publicProject.updatedAt = project.updatedAt;
    }

    if (visibility.devLog && project.devLog?.length) {
      publicProject.devLog = project.devLog;
    }

    // Always include deployment data if it exists (replaces links functionality)
    if (project.deploymentData) {
      publicProject.deploymentData = project.deploymentData;
    }

  res.json({
    success: true,
    project: publicProject
  });
}));

// Get public user profile by ID, slug, or username
router.get('/user/:identifier', asyncHandler(async (req: Request, res: Response) => {
  const { identifier } = req.params;

  // Try to find by publicSlug, username, or ID
  let user;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    user = await User.findById(identifier);
  } else {
    // Try publicSlug first, then username
    user = await User.findOne({
      $or: [
        { publicSlug: identifier },
        { username: identifier.toLowerCase() }
      ]
    });
  }

  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  // Check if user profile is public
  if (!user.isPublic) {
    throw ForbiddenError('User profile is not public', 'USER_NOT_PUBLIC');
  }

    // Get user's public projects
    const publicProjects = await Project.find({
      ownerId: user._id,
      isPublic: true,
      isArchived: false
    }).select('name description publicShortDescription publicDescription color category tags publicSlug createdAt updatedAt stack');

    // Return sanitized public user data
    const publicUser = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      displayPreference: user.displayPreference,
      displayName: user.displayPreference === 'username'
        ? `@${user.username}`
        : `${user.firstName} ${user.lastName}`,
      bio: user.bio || '',
      publicDescription: user.publicDescription || '',
      publicSlug: user.publicSlug,
      createdAt: user.createdAt,
      projects: publicProjects.map(project => ({
        id: project._id,
        name: project.name,
        description: project.publicShortDescription || project.description,
        publicShortDescription: project.publicShortDescription,
        publicDescription: project.publicDescription,
        color: project.color,
        category: project.category,
        tags: project.tags,
        publicSlug: project.publicSlug,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        technologies: project.stack?.slice(0, 5) || [] // Limit for preview
      }))
    };

  res.json({
    success: true,
    user: publicUser
  });
}));

// Get public projects for discovery
router.get('/projects', asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 12,
    category,
    tag,
    search
  } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Check if current user is demo user (via cookie or Authorization header)
    let isCurrentUserDemo = false;
    let currentUserId: string | null = null;

    try {
      const jwt = await import('jsonwebtoken');
      const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        currentUserId = decoded.userId;

        // Check if this user is the demo user
        if (currentUserId) {
          const user = await User.findById(currentUserId).select('isDemo').lean();
          isCurrentUserDemo = user?.isDemo || false;
        }
      }
    } catch (err) {
      // Token validation failed or no token - treat as non-demo user
    }

    // Build query
    // For demo users: show both demo projects AND real user projects (everything)
    // For real users: exclude demo user projects
    const demoUser = await User.findOne({ isDemo: true }).select('_id').lean();
    const query: any = {
      isPublic: true,
      isArchived: false
    };

    if (demoUser && !isCurrentUserDemo) {
      // Real users don't see demo projects
      query.ownerId = { $ne: demoUser._id };
    }
    // Demo users see everything (no filter applied)

    if (category && category !== 'all') {
      query.category = category;
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    // SEC-006 FIX: Sanitize search input to prevent NoSQL injection
    let sanitizedSearch = '';
    if (search && typeof search === 'string') {
      // Escape regex special characters
      sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    if (sanitizedSearch) {
      // Search in project fields and also match projects by owner names
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
        { publicShortDescription: { $regex: sanitizedSearch, $options: 'i' } },
        { publicDescription: { $regex: sanitizedSearch, $options: 'i' } },
        { tags: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    let projects, total;

    if (sanitizedSearch) {
      // Use aggregation for user name search
      const searchRegex = { $regex: sanitizedSearch, $options: 'i' };
      
      const aggregationPipeline = [
        {
          $match: {
            isPublic: true,
            isArchived: false,
            // Only exclude demo projects for real users (not for demo users)
            ...(demoUser && !isCurrentUserDemo ? { ownerId: { $ne: demoUser._id } } : {}),
            ...(category && category !== 'all' ? { category } : {}),
            ...(tag ? { tags: { $in: [tag] } } : {})
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'ownerId',
            foreignField: '_id',
            as: 'owner'
          }
        },
        {
          $match: {
            $or: [
              { name: searchRegex },
              { description: searchRegex },
              { publicShortDescription: searchRegex },
              { publicDescription: searchRegex },
              { tags: searchRegex },
              { 'owner.firstName': searchRegex },
              { 'owner.lastName': searchRegex }
            ]
          }
        },
        {
          $addFields: {
            ownerId: { $arrayElemAt: ['$owner', 0] }
          }
        },
        {
          $project: {
            name: 1,
            description: 1,
            publicShortDescription: 1,
            publicDescription: 1,
            color: 1,
            category: 1,
            tags: 1,
            publicSlug: 1,
            createdAt: 1,
            updatedAt: 1,
            stack: 1,
            'ownerId.firstName': 1,
            'ownerId.lastName': 1,
            'ownerId.username': 1,
            'ownerId.displayPreference': 1,
            'ownerId.publicSlug': 1,
            'ownerId.isPublic': 1,
            'ownerId._id': 1
          }
        },
        { $sort: { updatedAt: -1 as -1 } }
      ];

      const [projectsResult, countResult] = await Promise.all([
        Project.aggregate([
          ...aggregationPipeline,
          { $skip: skip },
          { $limit: parseInt(limit as string) }
        ]),
        Project.aggregate([
          ...aggregationPipeline,
          { $count: 'total' }
        ])
      ]);

      projects = projectsResult;
      total = countResult.length > 0 ? countResult[0].total : 0;
    } else {
      // Regular query without search
      [projects, total] = await Promise.all([
        Project.find(query)
          .populate('ownerId', 'firstName lastName username displayPreference publicSlug isPublic')
          .select('name description publicShortDescription publicDescription color category tags publicSlug createdAt updatedAt stack')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(parseInt(limit as string)),
        Project.countDocuments(query)
      ]);
    }

    const publicProjects = projects.map((project: any) => {
      // Handle both aggregation results and populated results
      const owner = project.ownerId;

      return {
        id: project._id,
        name: project.name,
        description: project.publicShortDescription || project.description,
        publicShortDescription: project.publicShortDescription,
        color: project.color,
        category: project.category,
        tags: project.tags,
        publicSlug: project.publicSlug,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        technologies: project.stack?.slice(0, 3) || [],
        owner: (owner?.isPublic) ? {
          id: owner._id,
          firstName: owner.firstName,
          lastName: owner.lastName,
          username: owner.username,
          displayPreference: owner.displayPreference,
          displayName: owner.displayPreference === 'username'
            ? `@${owner.username}`
            : `${owner.firstName} ${owner.lastName}`,
          publicSlug: owner.publicSlug
        } : null
      };
    });

  res.json({
    success: true,
    projects: publicProjects,
    pagination: {
      current: parseInt(page as string),
      pages: Math.ceil(total / parseInt(limit as string)),
      total,
      hasNext: skip + projects.length < total,
      hasPrev: parseInt(page as string) > 1
    }
  });
}));

// Get categories and tags for filtering
router.get('/filters', asyncHandler(async (req: Request, res: Response) => {
  const [categories, tags] = await Promise.all([
    Project.distinct('category', { isPublic: true, isArchived: false }),
    Project.distinct('tags', { isPublic: true, isArchived: false })
  ]);

  res.json({
    success: true,
    categories: categories.filter(Boolean),
    tags: tags.filter(Boolean).flat()
  });
}));

// Search for public users
router.get('/users/search', asyncHandler(async (req: Request, res: Response) => {
  const { search, page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 50); // Max 50 per page
  const skip = (pageNum - 1) * limitNum;

  // Build query for public users only (exclude demo user)
  const query: any = {
    isPublic: true,
    isDemo: { $ne: true }
  };

  // Add search filter if provided
  if (search && typeof search === 'string' && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { username: searchRegex },
      { firstName: searchRegex },
      { lastName: searchRegex },
      { bio: searchRegex }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('firstName lastName username email displayPreference isPublic publicSlug bio createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(query)
  ]);

  res.json({
    success: true,
    users,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  });
}));

export default router;