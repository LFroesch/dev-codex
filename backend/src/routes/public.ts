import express from 'express';
import { User } from '../models/User';
import { Project } from '../models/Project';
import mongoose from 'mongoose';

const router = express.Router();

// Get public project by ID or slug
router.get('/project/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by publicSlug first, then by ID
    let project;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      project = await Project.findById(identifier)
        .populate('ownerId', 'firstName lastName email isPublic publicSlug');
    } else {
      project = await Project.findOne({ publicSlug: identifier })
        .populate('ownerId', 'firstName lastName email isPublic publicSlug');
    }

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if project is public
    if (!project.isPublic) {
      return res.status(403).json({ message: 'Project is not public' });
    }

    // Get visibility settings with defaults
    const visibility = project.publicVisibility || {
      description: true,
      tags: true,
      links: true,
      docs: true,
      techStack: true,
      timestamps: true,
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
        isPublic: (project.ownerId as any).isPublic,
        publicSlug: (project.ownerId as any).publicSlug
      } : null
    };

    // Add fields based on visibility settings
    if (visibility.description) {
      publicProject.description = project.publicDescription || project.description;
    }
    
    if (visibility.tags && project.tags?.length) {
      publicProject.tags = project.tags;
    }
    
    if (visibility.links && project.links?.length) {
      publicProject.links = project.links;
    }
    
    if (visibility.docs && project.docs?.length) {
      publicProject.docs = project.docs;
    }
    
    if (visibility.techStack) {
      if (project.selectedTechnologies?.length || project.selectedPackages?.length) {
        publicProject.technologies = [
          ...(project.selectedTechnologies || []),
          ...(project.selectedPackages || [])
        ];
      }
    }
    
    if (visibility.timestamps) {
      publicProject.createdAt = project.createdAt;
      publicProject.updatedAt = project.updatedAt;
    }

    res.json({
      success: true,
      project: publicProject
    });
  } catch (error) {
    console.error('Get public project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get public user profile by ID or slug
router.get('/user/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by publicSlug first, then by ID
    let user;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      user = await User.findById(identifier);
    } else {
      user = await User.findOne({ publicSlug: identifier });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user profile is public
    if (!user.isPublic) {
      return res.status(403).json({ message: 'User profile is not public' });
    }

    // Get user's public projects
    const publicProjects = await Project.find({ 
      ownerId: user._id, 
      isPublic: true,
      isArchived: false
    }).select('name description publicDescription color category tags publicSlug createdAt updatedAt selectedTechnologies');

    // Return sanitized public user data
    const publicUser = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio || '',
      publicDescription: user.publicDescription || '',
      publicSlug: user.publicSlug,
      createdAt: user.createdAt,
      projects: publicProjects.map(project => ({
        id: project._id,
        name: project.name,
        description: project.publicDescription || project.description,
        publicDescription: project.publicDescription,
        color: project.color,
        category: project.category,
        tags: project.tags,
        publicSlug: project.publicSlug,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        technologies: project.selectedTechnologies?.slice(0, 5) || [] // Limit for preview
      }))
    };

    res.json({
      success: true,
      user: publicUser
    });
  } catch (error) {
    console.error('Get public user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get public projects for discovery
router.get('/projects', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      tag, 
      search 
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Build query
    const query: any = { 
      isPublic: true, 
      isArchived: false 
    };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { publicDescription: { $regex: search, $options: 'i' } }
      ];
    }

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('ownerId', 'firstName lastName publicSlug isPublic')
        .select('name description publicDescription color category tags publicSlug createdAt updatedAt selectedTechnologies')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Project.countDocuments(query)
    ]);

    const publicProjects = projects.map(project => ({
      id: project._id,
      name: project.name,
      description: project.publicDescription || project.description,
      color: project.color,
      category: project.category,
      tags: project.tags,
      publicSlug: project.publicSlug,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      technologies: project.selectedTechnologies?.slice(0, 3) || [],
      owner: ((project.ownerId as any)?.isPublic) ? {
        id: (project.ownerId as any)._id,
        firstName: (project.ownerId as any).firstName,
        lastName: (project.ownerId as any).lastName,
        publicSlug: (project.ownerId as any).publicSlug
      } : null
    }));

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
  } catch (error) {
    console.error('Get public projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get categories and tags for filtering
router.get('/filters', async (req, res) => {
  try {
    const [categories, tags] = await Promise.all([
      Project.distinct('category', { isPublic: true, isArchived: false }),
      Project.distinct('tags', { isPublic: true, isArchived: false })
    ]);

    res.json({
      success: true,
      categories: categories.filter(Boolean),
      tags: tags.filter(Boolean).flat()
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;