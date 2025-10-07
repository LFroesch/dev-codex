import express from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { requireAuth, requireProjectAccess, AuthRequest } from '../middleware/auth';
import { validateProjectData, validateObjectId } from '../middleware/validation';
import TeamMember from '../models/TeamMember';
import ProjectInvitation from '../models/ProjectInvitation';
import Notification from '../models/Notification';
import { User } from '../models/User';
import { sendProjectInvitationEmail } from '../services/emailService';
import { checkProjectLimit } from '../middleware/planLimits';
import { trackProjectAccess } from '../middleware/analytics';
import { AnalyticsService } from '../middleware/analytics';
import activityLogger from '../services/activityLogger';
import { v4 as uuidv4 } from 'uuid';
import NoteLock from '../models/NoteLock';
import {
  importExportRateLimit,
  importSizeLimit,
  validateAndSanitizeImport,
  validateExportRequest,
  securityHeaders
} from '../middleware/importExportSecurity';

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
    })
    .populate('todos.assignedTo', 'firstName lastName email')
    .populate('todos.createdBy', 'firstName lastName')
    .populate('todos.updatedBy', 'firstName lastName')
    .populate('notes.createdBy', 'firstName lastName')
    .populate('notes.updatedBy', 'firstName lastName')
    .populate('devLog.createdBy', 'firstName lastName')
    .populate('devLog.updatedBy', 'firstName lastName')
    .sort({ createdAt: -1 });

    // Get projects where user is a team member (optimized: single query with lean())
    const teamProjectIds = await TeamMember.find({ userId })
      .select('projectId')
      .lean()
      .then(memberships => memberships.map(tm => tm.projectId));
    
    const teamProjects = teamProjectIds.length > 0
      ? await Project.find({
          _id: { $in: teamProjectIds },
          // Exclude projects user already owns
          $nor: [
            { userId: userId },
            { ownerId: userId }
          ]
        })
        .populate('todos.assignedTo', 'firstName lastName email')
        .populate('todos.createdBy', 'firstName lastName')
        .populate('todos.updatedBy', 'firstName lastName')
        .populate('notes.createdBy', 'firstName lastName')
        .populate('notes.updatedBy', 'firstName lastName')
        .populate('devLog.createdBy', 'firstName lastName')
        .populate('devLog.updatedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
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
    const project = await Project.findById(req.params.id)
      .populate('todos.assignedTo', 'firstName lastName email')
      .populate('todos.createdBy', 'firstName lastName')
      .populate('todos.updatedBy', 'firstName lastName')
      .populate('notes.createdBy', 'firstName lastName')
      .populate('notes.updatedBy', 'firstName lastName')
      .populate('devLog.createdBy', 'firstName lastName')
      .populate('devLog.updatedBy', 'firstName lastName');

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
    
    console.log('Project update request:', {
      projectId: req.params.id,
      updateData: JSON.stringify(updateData, null, 2)
    });
    
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
    
    console.log('Project after update:', {
      deploymentData: project?.deploymentData
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }


    res.json({
      message: 'Project updated successfully',
      project: formatProjectResponse(project)
    });
  } catch (error: any) {
    console.error('Update project error:', error);
    if (error.name === 'ValidationError') {
      console.error('Validation details:', error.errors);
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.errors 
      });
    }
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

// Note lock management routes
router.post('/:id/notes/:noteId/lock', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const noteId = req.params.noteId;
    const projectId = req.params.id;
    const userId = req.userId!;

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if note is already locked by someone else
    const existingLock = await NoteLock.findOne({ noteId, projectId });
    if (existingLock && existingLock.userId.toString() !== userId.toString()) {
      return res.status(423).json({ 
        message: 'Note is currently being edited by another user',
        lockedBy: {
          email: existingLock.userEmail,
          name: existingLock.userName
        }
      });
    }

    // If locked by current user, extend the lock
    if (existingLock && existingLock.userId.toString() === userId.toString()) {
      existingLock.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      existingLock.lastHeartbeat = new Date();
      await existingLock.save();
      
      return res.json({ 
        message: 'Lock extended',
        lock: existingLock
      });
    }

    // Create new lock
    const lock = new NoteLock({
      noteId,
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(userId),
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    await lock.save();

    // Signal to other users in the project that this note is now locked
    if ((global as any).io) {
      (global as any).io.to(`project-${projectId}`).emit('note-locked', {
        noteId,
        lockedBy: {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
        }
      });
    }

    res.json({ 
      message: 'Note locked successfully',
      lock
    });
  } catch (error) {
    console.error('Lock note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id/notes/:noteId/lock', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const noteId = req.params.noteId;
    const projectId = req.params.id;
    const userId = req.userId!;

    const lock = await NoteLock.findOne({ noteId, projectId, userId });
    if (lock) {
      await NoteLock.deleteOne({ _id: lock._id });
      
      // Signal to other users that this note is now unlocked
      if ((global as any).io) {
        (global as any).io.to(`project-${projectId}`).emit('note-unlocked', {
          noteId
        });
      }
    }

    res.json({ message: 'Note unlocked successfully' });
  } catch (error) {
    console.error('Unlock note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/notes/:noteId/lock/heartbeat', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const noteId = req.params.noteId;
    const projectId = req.params.id;
    const userId = req.userId!;

    const lock = await NoteLock.findOne({ noteId, projectId, userId });
    if (lock) {
      lock.lastHeartbeat = new Date();
      lock.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Extend by 10 minutes
      await lock.save();
    }

    res.json({ message: 'Heartbeat updated' });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/notes/:noteId/lock', requireProjectAccess('view'), async (req: AuthRequest, res) => {
  try {
    const noteId = req.params.noteId;
    const projectId = req.params.id;

    const lock = await NoteLock.findOne({ noteId, projectId });
    
    if (!lock) {
      return res.json({ locked: false });
    }

    res.json({ 
      locked: true,
      lockedBy: {
        email: lock.userEmail,
        name: lock.userName,
        isCurrentUser: lock.userId.toString() === req.userId!.toString()
      }
    });
  } catch (error) {
    console.error('Check lock error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/notes/:noteId', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { title, description, content } = req.body;
    const noteId = req.params.noteId;
    const projectId = req.params.id;
    const userId = req.userId!;

    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Check if note is locked by someone else
    const lock = await NoteLock.findOne({ noteId, projectId });
    if (lock && lock.userId.toString() !== userId.toString()) {
      return res.status(423).json({ 
        message: 'Note is currently being edited by another user',
        lockedBy: {
          email: lock.userEmail,
          name: lock.userName
        }
      });
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

    // Release the lock after successful save
    if (lock && lock.userId.toString() === userId.toString()) {
      await NoteLock.deleteOne({ _id: lock._id });
      
      // Signal that note is unlocked and updated
      if ((global as any).io) {
        (global as any).io.to(`project-${projectId}`).emit('note-unlocked', {
          noteId
        });
        (global as any).io.to(`project-${projectId}`).emit('note-updated', {
          noteId,
          note: note
        });
      }
    }

    // Send broadcast event to all team members (we'll add this notification for real-time updates)
    const teamMemberIds = await TeamMember.find({ projectId: new mongoose.Types.ObjectId(projectId) })
      .select('userId')
      .lean();
    
    for (const member of teamMemberIds) {
      if (member.userId.toString() !== userId.toString()) {
        // Create a notification for other team members about the note update
        await Notification.create({
          userId: member.userId,
          type: 'project_shared',
          title: 'Note Updated',
          message: `"${note.title}" was updated in ${project.name}`,
          relatedProjectId: project._id,
          metadata: {
            noteId: note.id,
            action: 'note_updated'
          }
        });
      }
    }

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

router.put('/:id/technologies/:category/:name', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { category, name } = req.params;
    const { version } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const technology = project.selectedTechnologies.find(
      tech => tech.category === category && tech.name === decodeURIComponent(name)
    );

    if (!technology) {
      return res.status(404).json({ message: 'Technology not found' });
    }

    // Update the technology version
    if (version !== undefined) technology.version = version;

    await project.save();

    res.json({ 
      message: 'Technology updated successfully',
      technology: technology
    });
  } catch (error) {
    console.error('Update technology error:', error);
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

router.put('/:id/packages/:category/:name', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { category, name } = req.params;
    const { version } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const packageItem = project.selectedPackages.find(
      pkg => pkg.category === category && pkg.name === decodeURIComponent(name)
    );

    if (!packageItem) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Update the package version
    if (version !== undefined) packageItem.version = version;

    await project.save();

    res.json({ 
      message: 'Package updated successfully',
      package: packageItem
    });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// TODO MANAGEMENT
router.post('/:id/todos', requireProjectAccess('edit'), async (req: AuthRequest, res) => {
  try {
    const { text, description, priority, status, dueDate, reminderDate, assignedTo, parentTodoId } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Todo text is required' });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Validate assignedTo user is a team member or project owner for shared projects
    if (assignedTo && project.isShared) {
      const isOwner = project.ownerId?.toString() === assignedTo || project.userId?.toString() === assignedTo;
      const isTeamMember = await TeamMember.findOne({ 
        projectId: project._id, 
        userId: assignedTo 
      });
      if (!isOwner && !isTeamMember) {
        return res.status(400).json({ message: 'Assigned user must be a team member or project owner' });
      }
    }

    const newTodo = {
      id: uuidv4(),
      text: text.trim(),
      description: description?.trim() || '',
      priority: priority || 'medium',
      completed: false,
      status: status || 'not_started',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      reminderDate: reminderDate ? new Date(reminderDate) : undefined,
      assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined,
      parentTodoId: parentTodoId || undefined,
      createdAt: new Date(),
      createdBy: req.userId ? new mongoose.Types.ObjectId(req.userId) : undefined
    };

    project.todos.push(newTodo);
    await project.save();

    // Log todo creation activity
    try {
      await activityLogger.logResourceCreation(
        req.params.id,
        req.userId!,
        (req as any).sessionId || req.headers['x-session-id'] || 'unknown',
        'todo',
        newTodo.id,
        {
          todoTitle: newTodo.text,
          priority: newTodo.priority,
          status: newTodo.status,
          isSubtask: !!parentTodoId,
          assignedTo: assignedTo,
          dueDate: newTodo.dueDate,
          reminderDate: newTodo.reminderDate
        },
        req.get('user-agent'),
        req.ip
      );
    } catch (error) {
      console.error('Failed to log todo creation:', error);
    }

    // Create assignment notification if assigning to someone else
    if (assignedTo && assignedTo !== req.userId?.toString()) {
      console.log(`Creating assignment notification for user ${assignedTo}, todo: ${text.trim()}`);
      try {
        await Notification.create({
          userId: assignedTo,
          type: 'todo_assigned',
          title: 'Todo Assigned',
          message: `You have been assigned a new todo: "${text.trim()}"`,
          relatedProjectId: project._id,
          relatedTodoId: newTodo.id,
          actionUrl: `/projects/${project._id}`
        });
        console.log(`Assignment notification created successfully`);
      } catch (notifError) {
        console.error('Failed to create assignment notification:', notifError);
      }

      // Log todo assignment activity with user name
      try {
        const assignedUser = await User.findById(assignedTo).select('firstName lastName');
        const assignedUserName = assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : assignedTo;
        
        await activityLogger.logFieldUpdate(
          req.params.id,
          req.userId!,
          (req as any).sessionId || req.headers['x-session-id'] || 'unknown',
          'todo',
          newTodo.id,
          'assignedTo',
          null,
          assignedUserName,
          newTodo.text,
          undefined,
          req.get('user-agent'),
          req.ip
        );
      } catch (error) {
        console.error('Failed to log todo assignment:', error);
      }
    }

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
    const { text, description, priority, completed, status, dueDate, reminderDate, assignedTo, parentTodoId } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const todo = project.todos.find(t => t.id === req.params.todoId);
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    // Validate assignedTo user is a team member or project owner for shared projects
    if (assignedTo && project.isShared) {
      const isOwner = project.ownerId?.toString() === assignedTo || project.userId?.toString() === assignedTo;
      const isTeamMember = await TeamMember.findOne({ 
        projectId: project._id, 
        userId: assignedTo 
      });
      if (!isOwner && !isTeamMember) {
        return res.status(400).json({ message: 'Assigned user must be a team member or project owner' });
      }
    }

    // Store original values for activity logging
    const originalValues = {
      text: todo.text,
      description: todo.description,
      priority: todo.priority,
      completed: todo.completed,
      status: todo.status,
      dueDate: todo.dueDate,
      reminderDate: todo.reminderDate,
      assignedTo: todo.assignedTo?.toString(),
      parentTodoId: todo.parentTodoId
    };

    const previousAssignedTo = todo.assignedTo?.toString();

    if (text !== undefined) todo.text = text.trim();
    if (description !== undefined) todo.description = description.trim();
    if (priority !== undefined) todo.priority = priority;
    if (completed !== undefined) todo.completed = completed;
    if (status !== undefined) todo.status = status;
    if (dueDate !== undefined) todo.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (reminderDate !== undefined) todo.reminderDate = reminderDate ? new Date(reminderDate) : undefined;
    if (assignedTo !== undefined) todo.assignedTo = assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined;
    if (parentTodoId !== undefined) todo.parentTodoId = parentTodoId;
    todo.updatedBy = req.userId ? new mongoose.Types.ObjectId(req.userId) : undefined;

    await project.save();

    // Log field changes for activity tracking
    const fieldMappings = [
      { field: 'text', oldValue: originalValues.text, newValue: text },
      { field: 'description', oldValue: originalValues.description, newValue: description },
      { field: 'priority', oldValue: originalValues.priority, newValue: priority },
      { field: 'completed', oldValue: originalValues.completed, newValue: completed },
      { field: 'status', oldValue: originalValues.status, newValue: status },
      { field: 'dueDate', oldValue: originalValues.dueDate, newValue: dueDate },
      { field: 'reminderDate', oldValue: originalValues.reminderDate, newValue: reminderDate },
      { field: 'assignedTo', oldValue: originalValues.assignedTo, newValue: assignedTo },
      { field: 'parentTodoId', oldValue: originalValues.parentTodoId, newValue: parentTodoId }
    ];

    for (const mapping of fieldMappings) {
      if (mapping.newValue !== undefined && mapping.oldValue !== mapping.newValue) {
        try {
          let logOldValue = mapping.oldValue;
          let logNewValue = mapping.newValue;

          // Resolve user names for assignedTo field
          if (mapping.field === 'assignedTo') {
            if (mapping.oldValue) {
              const oldUser = await User.findById(mapping.oldValue).select('firstName lastName');
              logOldValue = oldUser ? `${oldUser.firstName} ${oldUser.lastName}` : mapping.oldValue;
            }
            if (mapping.newValue) {
              const newUser = await User.findById(mapping.newValue).select('firstName lastName');
              logNewValue = newUser ? `${newUser.firstName} ${newUser.lastName}` : mapping.newValue;
            }
          }

          await activityLogger.logFieldUpdate(
            req.params.id,
            req.userId!,
            (req as any).sessionId || req.headers['x-session-id'] || 'unknown',
            'todo',
            req.params.todoId,
            mapping.field,
            logOldValue,
            logNewValue,
            todo.text,
            undefined,
            req.get('user-agent'),
            req.ip
          );
        } catch (error) {
          console.error(`Failed to log todo ${mapping.field} update:`, error);
        }
      }
    }

    // Create assignment notification if assigned to a new user
    if (assignedTo && assignedTo !== previousAssignedTo && assignedTo !== req.userId?.toString()) {
      await Notification.create({
        userId: assignedTo,
        type: 'todo_assigned',
        title: 'Todo Assigned',
        message: `You have been assigned a todo: "${todo.text}"`,
        relatedProjectId: project._id,
        relatedTodoId: todo.id,
        actionUrl: `/projects/${project._id}`
      });
    }

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

    // Find the todo to get its details before deletion
    const todoToDelete = project.todos.find(t => t.id === req.params.todoId);
    
    if (!todoToDelete) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    // Log todo deletion activity
    try {
      await activityLogger.logResourceDeletion(
        req.params.id,
        req.userId!,
        (req as any).sessionId || req.headers['x-session-id'] || 'unknown',
        'todo',
        req.params.todoId,
        {
          todoTitle: todoToDelete.text,
          priority: todoToDelete.priority,
          status: todoToDelete.status,
          completed: todoToDelete.completed,
          isSubtask: !!todoToDelete.parentTodoId,
          assignedTo: todoToDelete.assignedTo?.toString(),
          dueDate: todoToDelete.dueDate,
          reminderDate: todoToDelete.reminderDate
        },
        req.get('user-agent'),
        req.ip
      );
    } catch (error) {
      console.error('Failed to log todo deletion:', error);
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
    color: project.color,
    category: project.category,
    tags: project.tags,
    isArchived: project.isArchived,
    isShared: project.isShared,
    isPublic: project.isPublic,
    publicSlug: project.publicSlug,
    publicDescription: project.publicDescription,
    deploymentData: project.deploymentData,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

// TEAM MANAGEMENT ROUTES

// GET /api/projects/:id/members - Get team members for a project
router.get('/:id/members', requireAuth, requireProjectAccess('view'), async (req: AuthRequest, res) => {
  try {
    const { id: projectId } = req.params;

    // Optimized: Single aggregation query instead of populate calls
    const members = await TeamMember.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId)
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'invitedBy',
          foreignField: '_id',
          as: 'inviterInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $unwind: '$inviterInfo'
      },
      {
        $project: {
          _id: 1,
          userId: {
            _id: '$userInfo._id',
            firstName: '$userInfo.firstName',
            lastName: '$userInfo.lastName',
            email: '$userInfo.email'
          },
          role: 1,
          joinedAt: 1,
          invitedBy: {
            _id: '$inviterInfo._id',
            firstName: '$inviterInfo.firstName',
            lastName: '$inviterInfo.lastName',
            email: '$inviterInfo.email'
          }
        }
      },
      {
        $sort: { joinedAt: -1 }
      }
    ]);

    // Get project owner info
    const project = await Project.findById(projectId)
      .select('ownerId createdAt')
      .populate('ownerId', 'firstName lastName email')
      .lean();

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


// Export project data (GET /api/projects/:id/export)
router.get('/:id/export', 
  importExportRateLimit,
  securityHeaders,
  requireAuth, 
  requireProjectAccess('view'), 
  validateExportRequest,
  async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id;
    
    // Get project with all data
    const project = await Project.findById(projectId)
      .populate('ownerId', 'firstName lastName email')
      .lean();
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get team members
    const teamMembers = await TeamMember.find({ projectId })
      .populate('userId', 'firstName lastName email')
      .lean();

    // Sanitize the data for export
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: req.userId,
      project: {
        // Basic project info
        name: project.name,
        description: project.description,
        stagingEnvironment: project.stagingEnvironment,
        color: project.color,
        category: project.category,
        tags: project.tags,
        isArchived: project.isArchived,
        
        // Project content
        notes: project.notes || [],
        todos: project.todos?.map(todo => ({
          id: todo.id,
          text: todo.text,
          description: todo.description,
          priority: todo.priority,
          completed: todo.completed,
          status: todo.status,
          dueDate: todo.dueDate,
          reminderDate: todo.reminderDate,
          parentTodoId: todo.parentTodoId,
          createdAt: todo.createdAt
        })) || [],
        devLog: project.devLog || [],
        docs: project.docs || [],
        
        // Tech stack
        selectedTechnologies: project.selectedTechnologies || [],
        selectedPackages: project.selectedPackages || [],
        
        // Deployment (sanitized - no sensitive data)
        deploymentData: {
          liveUrl: project.deploymentData?.liveUrl || '',
          githubRepo: project.deploymentData?.githubRepo || '',
          deploymentPlatform: project.deploymentData?.deploymentPlatform || '',
          deploymentStatus: project.deploymentData?.deploymentStatus || 'inactive',
          buildCommand: project.deploymentData?.buildCommand || '',
          startCommand: project.deploymentData?.startCommand || '',
          deploymentBranch: project.deploymentData?.deploymentBranch || 'main',
          notes: project.deploymentData?.notes || ''
          // Note: environmentVariables excluded for security
        },
        
        // Metadata
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      
      // Team info (sanitized)
      team: {
        owner: project.ownerId ? {
          firstName: (project.ownerId as any).firstName,
          lastName: (project.ownerId as any).lastName,
          email: (project.ownerId as any).email
        } : null,
        members: teamMembers.map(member => ({
          role: member.role,
          joinedAt: member.joinedAt,
          user: {
            firstName: (member.userId as any).firstName,
            lastName: (member.userId as any).lastName,
            email: (member.userId as any).email
          }
        }))
      }
    };

    // Check export size limit
    const exportSize = JSON.stringify(exportData).length;
    if (exportSize > 100 * 1024 * 1024) { // 100MB limit
      console.warn(`Export size ${exportSize} bytes exceeds limit for project ${projectId}`);
      return res.status(413).json({
        error: 'Export too large',
        message: 'Project data exceeds maximum export size limit',
        size: exportSize,
        limit: 100 * 1024 * 1024
      });
    }

    // Set headers for file download with security measures
    const sanitizedName = project.name.replace(/[^a-zA-Z0-9\-_]/g, '_').substring(0, 50);
    const filename = `${sanitizedName}_export_${new Date().toISOString().split('T')[0]}.json`;
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', exportSize.toString());
    
    // Log export activity for security monitoring
    console.log(`Project export: ${projectId} by user ${req.userId}, size: ${exportSize} bytes`);
    
    res.json(exportData);
    
  } catch (error) {
    console.error('Export project error:', error);
    res.status(500).json({ message: 'Server error exporting project' });
  }
});

// Import project data (POST /api/projects/import)
router.post('/import', 
  importExportRateLimit,
  securityHeaders,
  importSizeLimit,
  requireAuth, 
  checkProjectLimit,
  validateAndSanitizeImport,
  async (req: AuthRequest, res) => {
  try {
    // Input validation and sanitization is now handled by middleware
    const importData = req.body;
    const { project: projectData } = importData;

    // Create sanitized project data with enhanced validation
    const sanitizedProject = {
      name: projectData.name.trim().substring(0, 100),
      description: projectData.description.trim().substring(0, 500),
      stagingEnvironment: ['development', 'staging', 'production'].includes(projectData.stagingEnvironment) 
        ? projectData.stagingEnvironment : 'development',
      color: typeof projectData.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(projectData.color) 
        ? projectData.color : '#3B82F6',
      category: typeof projectData.category === 'string' ? projectData.category.trim().substring(0, 50) : 'general',
      tags: Array.isArray(projectData.tags) 
        ? projectData.tags.filter((tag: any) => typeof tag === 'string' && tag.trim()).map((tag: any) => tag.trim().substring(0, 30)).slice(0, 10)
        : [],
      isArchived: Boolean(projectData.isArchived),
      
      // Content arrays with enhanced validation (already sanitized by middleware)
      notes: Array.isArray(projectData.notes) ? projectData.notes.map((note: any) => ({
        id: note.id || uuidv4(),
        title: (note.title || '').substring(0, 200),
        description: (note.description || '').substring(0, 500),
        content: (note.content || '').substring(0, 50000),
        createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
        updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date()
      })).slice(0, 100) : [],
      
      todos: Array.isArray(projectData.todos) ? projectData.todos.map((todo: any) => ({
        id: todo.id || uuidv4(),
        text: (todo.text || '').substring(0, 500),
        description: (todo.description || '').substring(0, 1000),
        priority: ['low', 'medium', 'high'].includes(todo.priority) ? todo.priority : 'medium',
        completed: Boolean(todo.completed),
        status: ['not_started', 'in_progress', 'blocked', 'completed'].includes(todo.status) ? todo.status : 'not_started',
        dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
        reminderDate: todo.reminderDate ? new Date(todo.reminderDate) : undefined,
        parentTodoId: typeof todo.parentTodoId === 'string' ? todo.parentTodoId : undefined,
        createdAt: todo.createdAt ? new Date(todo.createdAt) : new Date(),
        createdBy: req.userId,
        updatedBy: req.userId
      })).slice(0, 500) : [],
      
      devLog: Array.isArray(projectData.devLog) ? projectData.devLog.map((log: any) => ({
        id: log.id || uuidv4(),
        title: (log.title || '').substring(0, 200),
        description: (log.description || '').substring(0, 500),
        entry: (log.entry || '').substring(0, 10000),
        date: log.date ? new Date(log.date) : new Date()
      })).slice(0, 200) : [],
      
      docs: Array.isArray(projectData.docs) ? projectData.docs.map((doc: any) => ({
        id: doc.id || uuidv4(),
        type: ['Model', 'Route', 'API', 'Util', 'ENV', 'Auth', 'Runtime', 'Framework'].includes(doc.type) 
          ? doc.type : 'API',
        title: (doc.title || '').substring(0, 200),
        content: (doc.content || '').substring(0, 50000),
        createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date()
      })).slice(0, 100) : [],
      
      selectedTechnologies: Array.isArray(projectData.selectedTechnologies) 
        ? projectData.selectedTechnologies.filter((tech: any) => 
            tech && typeof tech === 'object' && tech.category && tech.name
          ).map((tech: any) => ({
            category: ['styling', 'database', 'framework', 'runtime', 'deployment', 'testing', 'tooling'].includes(tech.category)
              ? tech.category : 'tooling',
            name: tech.name.substring(0, 100),
            version: (tech.version || '').substring(0, 20)
          })).slice(0, 50) : [],
          
      selectedPackages: Array.isArray(projectData.selectedPackages)
        ? projectData.selectedPackages.filter((pkg: any) => 
            pkg && typeof pkg === 'object' && pkg.category && pkg.name
          ).map((pkg: any) => ({
            category: ['ui', 'state', 'routing', 'forms', 'animation', 'utility', 'api', 'auth', 'data'].includes(pkg.category)
              ? pkg.category : 'utility',
            name: pkg.name.substring(0, 100),
            version: (pkg.version || '').substring(0, 20),
            description: (pkg.description || '').substring(0, 200)
          })).slice(0, 100) : [],
      
      // Deployment data (excluding sensitive environment variables)
      deploymentData: projectData.deploymentData && typeof projectData.deploymentData === 'object' ? {
        liveUrl: (projectData.deploymentData.liveUrl || '').substring(0, 200),
        githubRepo: (projectData.deploymentData.githubRepo || '').substring(0, 200),
        deploymentPlatform: (projectData.deploymentData.deploymentPlatform || '').substring(0, 100),
        deploymentStatus: ['active', 'inactive', 'error'].includes(projectData.deploymentData.deploymentStatus)
          ? projectData.deploymentData.deploymentStatus : 'inactive',
        buildCommand: (projectData.deploymentData.buildCommand || '').substring(0, 500),
        startCommand: (projectData.deploymentData.startCommand || '').substring(0, 500),
        deploymentBranch: (projectData.deploymentData.deploymentBranch || 'main').substring(0, 100),
        environmentVariables: [], // Always empty for security
        notes: (projectData.deploymentData.notes || '').substring(0, 2000)
      } : {
        liveUrl: '',
        githubRepo: '',
        deploymentPlatform: '',
        deploymentStatus: 'inactive',
        buildCommand: '',
        startCommand: '',
        deploymentBranch: 'main',
        environmentVariables: [],
        notes: ''
      },
      
      // Set ownership
      userId: req.userId,
      ownerId: req.userId,
      isShared: false,
      isPublic: false
    };

    // Create the new project
    const newProject = new Project(sanitizedProject);
    await newProject.save();

    // Enhanced logging for security monitoring
    const importSize = JSON.stringify(req.body).length;
    console.log(`Project import: ${newProject._id} by user ${req.userId}, size: ${importSize} bytes, name: "${newProject.name}"`);
    
    // Log the activity
    try {
      await activityLogger.log({
        projectId: newProject._id.toString(),
        userId: req.userId!,
        sessionId: (req as any).sessionId || req.headers['x-session-id'] || 'import-session',
        action: 'project_imported',
        resourceType: 'project',
        resourceId: newProject._id.toString(),
        details: {
          resourceName: newProject.name,
          metadata: {
            importVersion: importData.version || 'unknown',
            importSize: importSize,
            itemCounts: {
              notes: sanitizedProject.notes.length,
              todos: sanitizedProject.todos.length,
              devLog: sanitizedProject.devLog.length,
              docs: sanitizedProject.docs.length,
              technologies: sanitizedProject.selectedTechnologies.length,
              packages: sanitizedProject.selectedPackages.length
            }
          }
        }
      });
    } catch (logError) {
      console.error('Failed to log import activity:', logError);
    }

    res.status(201).json({
      success: true,
      message: 'Project imported successfully',
      project: {
        _id: newProject._id,
        name: newProject.name,
        description: newProject.description
      }
    });
    
  } catch (error) {
    console.error('Import project error:', error);
    if (error instanceof mongoose.Error.ValidationError) {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation error during import',
        errors: errorMessages 
      });
    }
    res.status(500).json({ message: 'Server error importing project' });
  }
});

export default router;