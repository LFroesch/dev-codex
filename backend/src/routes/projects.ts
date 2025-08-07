import express from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { requireAuth, requireProjectAccess, AuthRequest } from '../middleware/auth';
import TeamMember from '../models/TeamMember';
import ProjectInvitation from '../models/ProjectInvitation';
import Notification from '../models/Notification';
import { User } from '../models/User';
import { sendProjectInvitationEmail } from '../services/emailService';
import { checkProjectLimit } from '../middleware/planLimits';
import { trackProjectAccess } from '../middleware/analytics';
import { AnalyticsService } from '../middleware/analytics';
import { trackFieldChanges, trackArrayChanges } from '../utils/trackFieldChanges';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);
router.use(trackProjectAccess); // Track project access

// Create project
router.post('/', checkProjectLimit, async (req: AuthRequest, res) => {
  try {
    const { name, description, stagingEnvironment, color, category, tags } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    const project = new Project({
      name: name.trim(),
      description: description.trim(),
      notes: [], // Initialize as empty array
      todos: [],
      devLog: [],
      docs: [],
      selectedTechnologies: [],
      selectedPackages: [],
      stagingEnvironment: stagingEnvironment || 'development',
      links: [],
      color: color || '#3B82F6',
      category: category || 'general',
      tags: tags || [],
      userId: req.userId, // Legacy field for compatibility
      ownerId: req.userId // New owner field
    });

    await project.save();
    res.status(201).json({
      message: 'Project created successfully',
      project: formatProjectResponse(project)
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's projects (owned + team projects)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    
    // Get projects owned by user
    const ownedProjects = await Project.find({ 
      $or: [
        { userId: userId },
        { ownerId: userId }
      ]
    }).sort({ createdAt: -1 });

    // Get projects where user is a team member
    const teamMemberships = await TeamMember.find({ userId }).select('projectId');
    const teamProjectIds = teamMemberships.map(tm => tm.projectId);
    
    const teamProjects = teamProjectIds.length > 0 
      ? await Project.find({ 
          _id: { $in: teamProjectIds },
          // Exclude projects user already owns
          $nor: [
            { userId: userId },
            { ownerId: userId }
          ]
        }).sort({ createdAt: -1 })
      : [];

    // Combine and format projects, marking ownership status
    const allProjects = [
      ...ownedProjects.map(p => ({ ...formatProjectResponse(p), isOwner: true })),
      ...teamProjects.map(p => ({ ...formatProjectResponse(p), isOwner: false }))
    ];

    res.json({ projects: allProjects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single project
router.get('/:id', requireProjectAccess('view'), async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ 
      project: {
        ...formatProjectResponse(project),
        userRole: req.projectAccess?.role,
        canEdit: req.projectAccess?.canEdit,
        canManageTeam: req.projectAccess?.canManageTeam,
        isOwner: req.projectAccess?.isOwner
      }
    });
  } catch (error) {
    console.error('Get single project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project
router.put('/:id', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const updateData = { ...req.body };
    
    if (updateData.name && !updateData.name.trim()) {
      return res.status(400).json({ message: 'Name cannot be empty' });
    }
    
    if (updateData.description && !updateData.description.trim()) {
      return res.status(400).json({ message: 'Description cannot be empty' });
    }

    if (updateData.stagingEnvironment && !['development', 'staging', 'production'].includes(updateData.stagingEnvironment)) {
      return res.status(400).json({ message: 'Invalid staging environment' });
    }

    // Get the old project data for change tracking
    const oldProject = await Project.findById(req.params.id);
    if (!oldProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Track field changes
    await trackFieldChanges(
      req,
      project._id.toString(),
      project.name,
      oldProject.toObject(),
      updateData
    );

    res.json({
      message: 'Project updated successfully',
      project: formatProjectResponse(project)
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Archive/Unarchive project
router.patch('/:id/archive', requireProjectAccess('manage'), async (req: AuthRequest, res) => {
  try {
    const { isArchived } = req.body;
    
    if (typeof isArchived !== 'boolean') {
      return res.status(400).json({ message: 'isArchived must be a boolean value' });
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isArchived },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({
      message: `Project ${isArchived ? 'archived' : 'unarchived'} successfully`,
      project: formatProjectResponse(project)
    });
  } catch (error) {
    console.error('Archive project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete project (owner only)
router.delete('/:id', requireProjectAccess('manage'), async (req: AuthRequest, res) => {
  try {
    // Only project owner can delete the project
    if (!req.projectAccess?.isOwner) {
      return res.status(403).json({ message: 'Only project owner can delete the project' });
    }

    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Clean up team members and invitations
    await TeamMember.deleteMany({ projectId: req.params.id });
    // Note: We might want to keep invitations for audit purposes

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// NOTES MANAGEMENT - NEW ROUTES
router.post('/:id/notes', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { title, description, content } = req.body;
    
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const newNote = {
      id: uuidv4(),
      title: title.trim(),
      description: description?.trim() || '',
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    project.notes.push(newNote);
    await project.save();

    res.json({
      message: 'Note added successfully',
      note: newNote
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/notes/:noteId', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { title, description, content } = req.body;

    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const note = project.notes.find(n => n.id === req.params.noteId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    note.title = title.trim();
    note.description = description?.trim() || '';
    note.content = content.trim();
    note.updatedAt = new Date();

    await project.save();

    res.json({
      message: 'Note updated successfully',
      note: note
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id/notes/:noteId', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.notes = project.notes.filter(n => n.id !== req.params.noteId);
    await project.save();

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// TECH STACK MANAGEMENT
router.post('/:id/technologies', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { category, name, version } = req.body;
    
    if (!category || !name) {
      return res.status(400).json({ message: 'Category and name are required' });
    }

    const validCategories = ['styling', 'database', 'framework', 'runtime', 'deployment', 'testing', 'tooling'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid technology category' });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const existingTech = project.selectedTechnologies.find(
      tech => tech.category === category && tech.name === name
    );

    if (existingTech) {
      return res.status(400).json({ message: 'Technology already added to this category' });
    }

    const newTech = {
      category,
      name: name.trim(),
      version: version?.trim() || ''
    };

    project.selectedTechnologies.push(newTech);
    await project.save();

    res.json({
      message: 'Technology added successfully',
      technology: newTech
    });
  } catch (error) {
    console.error('Add technology error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id/technologies/:category/:name', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { category, name } = req.params;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.selectedTechnologies = project.selectedTechnologies.filter(
      tech => !(tech.category === category && tech.name === decodeURIComponent(name))
    );
    await project.save();

    res.json({ message: 'Technology removed successfully' });
  } catch (error) {
    console.error('Remove technology error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PACKAGES MANAGEMENT
router.post('/:id/packages', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { category, name, version, description } = req.body;
    
    if (!category || !name) {
      return res.status(400).json({ message: 'Category and name are required' });
    }

    const validCategories = ['ui', 'state', 'routing', 'forms', 'animation', 'utility', 'api', 'auth', 'data'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid package category' });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const existingPackage = project.selectedPackages.find(
      pkg => pkg.category === category && pkg.name === name
    );

    if (existingPackage) {
      return res.status(400).json({ message: 'Package already added to this category' });
    }

    const newPackage = {
      category,
      name: name.trim(),
      version: version?.trim() || '',
      description: description?.trim() || ''
    };

    project.selectedPackages.push(newPackage);
    await project.save();

    res.json({
      message: 'Package added successfully',
      package: newPackage
    });
  } catch (error) {
    console.error('Add package error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id/packages/:category/:name', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { category, name } = req.params;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.selectedPackages = project.selectedPackages.filter(
      pkg => !(pkg.category === category && pkg.name === decodeURIComponent(name))
    );
    await project.save();

    res.json({ message: 'Package removed successfully' });
  } catch (error) {
    console.error('Remove package error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// TODO MANAGEMENT
router.post('/:id/todos', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { text, description, priority } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Todo text is required' });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const newTodo = {
      id: uuidv4(),
      text: text.trim(),
      description: description?.trim() || '',
      priority: priority || 'medium',
      completed: false,
      createdAt: new Date()
    };

    project.todos.push(newTodo);
    await project.save();

    res.json({
      message: 'Todo added successfully',
      todo: newTodo
    });
  } catch (error) {
    console.error('Add todo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/todos/:todoId', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { text, description, priority, completed } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const todo = project.todos.find(t => t.id === req.params.todoId);
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    if (text !== undefined) todo.text = text.trim();
    if (description !== undefined) todo.description = description.trim();
    if (priority !== undefined) todo.priority = priority;
    if (completed !== undefined) todo.completed = completed;

    await project.save();

    res.json({
      message: 'Todo updated successfully',
      todo: todo
    });
  } catch (error) {
    console.error('Update todo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id/todos/:todoId', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.todos = project.todos.filter(t => t.id !== req.params.todoId);
    await project.save();

    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Delete todo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DEV LOG MANAGEMENT
router.post('/:id/devlog', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { title, description, entry } = req.body;
    
    if (!entry || !entry.trim()) {
      return res.status(400).json({ message: 'Dev log entry is required' });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const newEntry = {
      id: uuidv4(),
      title: title?.trim() || '',
      description: description?.trim() || '',
      entry: entry.trim(),
      date: new Date()
    };

    project.devLog.push(newEntry);
    await project.save();

    res.json({
      message: 'Dev log entry added successfully',
      entry: newEntry
    });
  } catch (error) {
    console.error('Add dev log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/devlog/:entryId', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { title, description, entry } = req.body;
    
    if (!entry || !entry.trim()) {
      return res.status(400).json({ message: 'Dev log entry is required' });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const devLogEntry = project.devLog.find(e => e.id === req.params.entryId);
    if (!devLogEntry) {
      return res.status(404).json({ message: 'Dev log entry not found' });
    }

    if (title !== undefined) devLogEntry.title = title.trim();
    if (description !== undefined) devLogEntry.description = description.trim();
    devLogEntry.entry = entry.trim();

    await project.save();

    res.json({
      message: 'Dev log entry updated successfully',
      entry: devLogEntry
    });
  } catch (error) {
    console.error('Update dev log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id/devlog/:entryId', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.devLog = project.devLog.filter(e => e.id !== req.params.entryId);
    await project.save();

    res.json({ message: 'Dev log entry deleted successfully' });
  } catch (error) {
    console.error('Delete dev log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DOCS MANAGEMENT
router.post('/:id/docs', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { type, title, content } = req.body;
    
    if (!type || !title || !content) {
      return res.status(400).json({ message: 'Type, title, and content are required' });
    }

    const validTypes = ['Model', 'Route', 'API', 'Util', 'ENV', 'Auth', 'Runtime', 'Framework'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid doc type' });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const newDoc = {
      id: uuidv4(),
      type: type,
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    project.docs.push(newDoc);
    await project.save();

    res.json({
      message: 'Doc added successfully',
      doc: newDoc
    });
  } catch (error) {
    console.error('Add doc error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/docs/:docId', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { type, title, content } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const doc = project.docs.find(d => d.id === req.params.docId);
    if (!doc) {
      return res.status(404).json({ message: 'Doc not found' });
    }

    if (type !== undefined) {
      const validTypes = ['Model', 'Route', 'API', 'Util', 'ENV', 'Auth', 'Runtime', 'Framework'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: 'Invalid doc type' });
      }
      doc.type = type;
    }
    if (title !== undefined) doc.title = title.trim();
    if (content !== undefined) doc.content = content.trim();
    doc.updatedAt = new Date();

    await project.save();

    res.json({
      message: 'Doc updated successfully',
      doc: doc
    });
  } catch (error) {
    console.error('Update doc error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id/docs/:docId', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.docs = project.docs.filter(d => d.id !== req.params.docId);
    await project.save();

    res.json({ message: 'Doc deleted successfully' });
  } catch (error) {
    console.error('Delete doc error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// LINKS MANAGEMENT
router.post('/:id/links', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { title, url, type } = req.body;
    
    if (!title || !url) {
      return res.status(400).json({ message: 'Title and URL are required' });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const newLink = {
      id: uuidv4(),
      title: title.trim(),
      url: url.trim(),
      type: type || 'other'
    };

    project.links.push(newLink);
    await project.save();

    res.json({
      message: 'Link added successfully',
      link: newLink
    });
  } catch (error) {
    console.error('Add link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/links/:linkId', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { title, url, type } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const link = project.links.find(l => l.id === req.params.linkId);
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    if (title !== undefined) link.title = title.trim();
    if (url !== undefined) link.url = url.trim();
    if (type !== undefined) link.type = type;

    await project.save();

    res.json({
      message: 'Link updated successfully',
      link: link
    });
  } catch (error) {
    console.error('Update link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id/links/:linkId', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.links = project.links.filter(l => l.id !== req.params.linkId);
    await project.save();

    res.json({ message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Delete link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to format project response
function formatProjectResponse(project: any) {
  return {
    id: project._id,
    name: project.name,
    description: project.description,
    notes: project.notes,
    todos: project.todos,
    devLog: project.devLog,
    docs: project.docs,
    selectedTechnologies: project.selectedTechnologies || [],
    selectedPackages: project.selectedPackages || [],
    stagingEnvironment: project.stagingEnvironment,
    links: project.links,
    color: project.color,
    category: project.category,
    tags: project.tags,
    isArchived: project.isArchived,
    isShared: project.isShared,
    isPublic: project.isPublic,
    publicSlug: project.publicSlug,
    publicDescription: project.publicDescription,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

// TEAM MANAGEMENT ROUTES

// GET /api/projects/:id/members - Get team members for a project
router.get('/:id/members', requireAuth, requireProjectAccess('view'), async (req: AuthRequest, res) => {
  try {
    const { id: projectId } = req.params;

    const members = await TeamMember.find({ projectId })
      .populate('userId', 'firstName lastName email')
      .populate('invitedBy', 'firstName lastName email')
      .sort({ joinedAt: -1 });

    // Also include the project owner
    const project = await Project.findById(projectId)
      .populate('ownerId', 'firstName lastName email');

    const owner = project?.ownerId ? {
      _id: project.ownerId._id,
      userId: project.ownerId,
      role: 'owner' as const,
      invitedBy: null,
      joinedAt: project.createdAt,
      isOwner: true,
    } : null;

    const allMembers = owner ? [owner, ...members] : members;

    res.json({
      success: true,
      members: allMembers,
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ message: 'Server error fetching team members' });
  }
});

// POST /api/projects/:id/invite - Invite user to project
router.post('/:id/invite', requireAuth, requireProjectAccess('manage'), async (req: AuthRequest, res) => {
  try {
    const { id: projectId } = req.params;
    const { email, role = 'viewer' } = req.body;
    const inviterUserId = req.userId!;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ message: 'Role must be editor or viewer' });
    }

    // Check if project exists and get project details
    const project = await Project.findById(projectId).populate('ownerId', 'firstName lastName');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is trying to invite themselves
    const inviter = await User.findById(inviterUserId);
    if (inviter?.email.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({ message: 'Cannot invite yourself to the project' });
    }

    // Check if user is already a member
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      const existingMember = await TeamMember.findOne({
        projectId,
        userId: existingUser._id,
      });

      if (existingMember) {
        return res.status(400).json({ message: 'User is already a team member' });
      }

      // Check if user is the owner
      if (project.ownerId?.toString() === existingUser._id.toString()) {
        return res.status(400).json({ message: 'User is already the project owner' });
      }
    }

    // Check if there's already a pending invitation
    const existingInvitation = await ProjectInvitation.findOne({
      projectId,
      inviteeEmail: email.toLowerCase(),
      status: 'pending',
    });

    if (existingInvitation) {
      return res.status(400).json({ message: 'Invitation already sent to this email' });
    }

    // Create invitation
    const invitation = new ProjectInvitation({
      projectId,
      inviterUserId,
      inviteeEmail: email.toLowerCase(),
      inviteeUserId: existingUser?._id,
      role,
      token: require('crypto').randomBytes(32).toString('hex'), // Generate token explicitly
    });

    await invitation.save();

    // Create notification if user exists
    if (existingUser) {
      await Notification.create({
        userId: existingUser._id,
        type: 'project_invitation',
        title: 'Project Invitation',
        message: `${inviter?.firstName} ${inviter?.lastName} invited you to collaborate on "${project.name}"`,
        actionUrl: `/notifications/invitation/${invitation._id}`,
        relatedProjectId: project._id,
        relatedInvitationId: invitation._id,
      });
    }

    // Send invitation email
    try {
      const inviterName = `${inviter?.firstName || ''} ${inviter?.lastName || ''}`.trim() || 'Someone';
      await sendProjectInvitationEmail(
        email,
        inviterName,
        project.name,
        invitation.token,
        role
      );
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Continue without failing the invitation creation
    }

    // Mark project as shared
    if (!project.isShared) {
      project.isShared = true;
      await project.save();
    }

    res.json({
      success: true,
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation._id,
        email: invitation.inviteeEmail,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ message: 'Server error sending invitation' });
  }
});

// DELETE /api/projects/:id/members/:userId - Remove team member
router.delete('/:id/members/:userId', requireAuth, requireProjectAccess('manage'), async (req: AuthRequest, res) => {
  try {
    const { id: projectId, userId: memberUserId } = req.params;

    // Check if trying to remove the owner
    const project = await Project.findById(projectId);
    if (project?.ownerId?.toString() === memberUserId) {
      return res.status(400).json({ message: 'Cannot remove the project owner' });
    }

    // Remove team member
    const deletedMember = await TeamMember.findOneAndDelete({
      projectId,
      userId: memberUserId,
    });

    if (!deletedMember) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    // Create notification for removed user
    await Notification.create({
      userId: memberUserId,
      type: 'team_member_removed',
      title: 'Removed from Project',
      message: `You have been removed from "${project?.name}"`,
      relatedProjectId: projectId,
    });

    res.json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({ message: 'Server error removing team member' });
  }
});

// PATCH /api/projects/:id/members/:userId - Update team member role
router.patch('/:id/members/:userId', requireAuth, requireProjectAccess('manage'), async (req: AuthRequest, res) => {
  try {
    const { id: projectId, userId: memberUserId } = req.params;
    const { role } = req.body;

    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ message: 'Role must be editor or viewer' });
    }

    // Check if trying to change the owner's role
    const project = await Project.findById(projectId);
    if (project?.ownerId?.toString() === memberUserId) {
      return res.status(400).json({ message: 'Cannot change the owner role' });
    }

    // Update team member role
    const updatedMember = await TeamMember.findOneAndUpdate(
      { projectId, userId: memberUserId },
      { role },
      { new: true }
    ).populate('userId', 'firstName lastName email');

    if (!updatedMember) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    res.json({
      success: true,
      message: 'Team member role updated successfully',
      member: updatedMember,
    });
  } catch (error) {
    console.error('Update team member role error:', error);
    res.status(500).json({ message: 'Server error updating team member role' });
  }
});

export default router;