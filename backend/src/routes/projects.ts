import express from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { requireAuth, requireAuthOrDemo, requireProjectAccess, AuthRequest } from '../middleware/auth';
import { blockDemoWrites } from '../middleware/blockDemoWrites';
import { validateProjectData, validateObjectId } from '../middleware/validation';
import TeamMember from '../models/TeamMember';
import ProjectInvitation from '../models/ProjectInvitation';
import Notification from '../models/Notification';
import { User } from '../models/User';
import { sendProjectInvitationEmail } from '../services/emailService';
import ActivityLog from '../models/ActivityLog';
import NoteLock from '../models/NoteLock';
import Favorite from '../models/Favorite';
import Post from '../models/Post';
import Comment from '../models/Comment';
import Analytics from '../models/Analytics';
import CompactedAnalytics from '../models/CompactedAnalytics';
import { checkProjectLimit, checkTeamMemberLimit } from '../middleware/planLimits';
import { trackProjectAccess } from '../middleware/analytics';
import { AnalyticsService } from '../middleware/analytics';
import activityLogger from '../services/activityLogger';
import { logInfo, logError, logWarn } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  importExportRateLimit,
  importSizeLimit,
  validateAndSanitizeImport,
  validateExportRequest,
  securityHeaders
} from '../middleware/importExportSecurity';
import { checkProjectLock } from '../middleware/projectLock';
import { asyncHandler, AppError, BadRequestError, NotFoundError, ConflictError } from '../utils/errorHandler';

const router = express.Router();

// Track project access for all routes
router.use(trackProjectAccess);

// Check for locked projects on all modification routes (PUT, POST, DELETE with :id)
router.use('/:id', (req, res, next) => {
  if (req.method === 'GET') {
    return next(); // Allow GET requests
  }
  return checkProjectLock(req as AuthRequest, res, next);
});

// Create project
router.post('/', requireAuth, blockDemoWrites, validateProjectData, checkProjectLimit, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { name, description, stagingEnvironment, color, category, tags } = req.body;

  if (!name || !description) {
    throw BadRequestError('Name and description are required', 'MISSING_FIELDS');
  }

  const project = new Project({
    name: name.trim(),
    description: description.trim(),
    notes: [], // Initialize as empty array
    todos: [],
    devLog: [],
    components: [],
    stack: [], // Unified tech stack
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
}));

// Get user's projects (owned + team projects)
router.get('/', requireAuthOrDemo, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const userId = req.userId!;

  // Get projects owned by user
  const ownedProjects = await Project.find({
    $or: [
      { userId: userId },
      { ownerId: userId }
    ]
  })
  .populate('todos.assignedTo', 'firstName lastName username displayPreference email')
  .populate('todos.createdBy', 'firstName lastName username displayPreference')
  .populate('todos.updatedBy', 'firstName lastName username displayPreference')
  .populate('notes.createdBy', 'firstName lastName username displayPreference')
  .populate('notes.updatedBy', 'firstName lastName username displayPreference')
  .populate('devLog.createdBy', 'firstName lastName username displayPreference')
  .populate('devLog.updatedBy', 'firstName lastName username displayPreference')
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
      .populate('todos.assignedTo', 'firstName lastName username displayPreference email')
      .populate('todos.createdBy', 'firstName lastName username displayPreference')
      .populate('todos.updatedBy', 'firstName lastName username displayPreference')
      .populate('notes.createdBy', 'firstName lastName username displayPreference')
      .populate('notes.updatedBy', 'firstName lastName username displayPreference')
      .populate('devLog.createdBy', 'firstName lastName username displayPreference')
      .populate('devLog.updatedBy', 'firstName lastName username displayPreference')
      .sort({ createdAt: -1 })
    : [];

  // Combine and format projects, marking ownership status
  const allProjects = [
    ...ownedProjects.map(p => ({ ...formatProjectResponse(p), isOwner: true })),
    ...teamProjects.map(p => ({ ...formatProjectResponse(p), isOwner: false }))
  ];

  res.json({ projects: allProjects });
}));

// Get single project
router.get('/:id', requireAuthOrDemo, requireProjectAccess('view'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const project = await Project.findById(req.params.id)
    .populate('todos.assignedTo', 'firstName lastName username displayPreference email')
    .populate('todos.createdBy', 'firstName lastName username displayPreference')
    .populate('todos.updatedBy', 'firstName lastName username displayPreference')
    .populate('notes.createdBy', 'firstName lastName username displayPreference')
    .populate('notes.updatedBy', 'firstName lastName username displayPreference')
    .populate('devLog.createdBy', 'firstName lastName username displayPreference')
    .populate('devLog.updatedBy', 'firstName lastName username displayPreference');

  if (!project) {
    throw NotFoundError('Project not found');
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
}));

// Update project
router.put('/:id', requireAuth, blockDemoWrites, validateProjectData, requireProjectAccess('edit'), checkProjectLock, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  // SEC-005 FIX: Whitelist allowed fields to prevent mass assignment vulnerability
  const allowedFields = [
    'name', 'description', 'notes', 'todos', 'devLog', 'components',
    'stack', 'stagingEnvironment', 'color', 'category', 'tags',
    'deploymentData', 'isArchived', 'isShared', 'isPublic',
    'publicSlug', 'publicShortDescription', 'publicDescription', 'publicVisibility'
  ];

  const updateData: any = {};
  allowedFields.forEach(field => {
    if (field in req.body) {
      updateData[field] = req.body[field];
    }
  });

  logInfo('Project update request', { projectId: req.params.id, updateData });

  if (updateData.name && !updateData.name.trim()) {
    throw BadRequestError('Name cannot be empty', 'EMPTY_NAME');
  }

  if (updateData.description && !updateData.description.trim()) {
    throw BadRequestError('Description cannot be empty', 'EMPTY_DESCRIPTION');
  }

  if (updateData.stagingEnvironment && !['development', 'staging', 'production'].includes(updateData.stagingEnvironment)) {
    throw BadRequestError('Invalid staging environment', 'INVALID_ENVIRONMENT');
  }

  // Get the old project data for change tracking
  const oldProject = await Project.findById(req.params.id);
  if (!oldProject) {
    throw NotFoundError('Project not found');
  }

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );
  
  logInfo('Project after update', { deploymentData: project?.deploymentData });

  if (!project) {
    throw NotFoundError('Project not found');
  }

  res.json({
    message: 'Project updated successfully',
    project: formatProjectResponse(project)
  });
}));

// Archive/Unarchive project
router.patch('/:id/archive', requireAuth, blockDemoWrites, requireProjectAccess('manage'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { isArchived } = req.body;
  
  if (typeof isArchived !== 'boolean') {
    throw BadRequestError('isArchived must be a boolean value', 'INVALID_TYPE');
  }

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { isArchived },
    { new: true, runValidators: true }
  );

  if (!project) {
    throw NotFoundError('Project not found');
  }

  res.json({
    message: `Project ${isArchived ? 'archived' : 'unarchived'} successfully`,
    project: formatProjectResponse(project)
  });
}));

// Delete project (owner only)
router.delete('/:id', requireAuth, blockDemoWrites, requireProjectAccess('manage'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  // Only project owner can delete the project
  if (!req.projectAccess?.isOwner) {
    throw new AppError(403, 'Access denied: Only project owner can delete the project', 'OWNER_ONLY');
  }

  const project = await Project.findByIdAndDelete(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found');
  }

  // CASCADE DELETE: Clean up all associated data to prevent orphaned records
  await Promise.all([
    // Team & Collaboration
    TeamMember.deleteMany({ projectId: req.params.id }),

    // Activity & Notifications
    ActivityLog.deleteMany({ projectId: req.params.id }),
    Notification.deleteMany({ relatedProjectId: req.params.id }),

    // Locks & State
    NoteLock.deleteMany({ projectId: req.params.id }),

    // Social Features
    Favorite.deleteMany({ projectId: req.params.id }),
    Post.deleteMany({ $or: [
      { projectId: req.params.id },
      { linkedProjectId: req.params.id }
    ]}),
    Comment.deleteMany({ projectId: req.params.id }),

    // Analytics
    Analytics.deleteMany({ 'eventData.projectId': req.params.id }),
    CompactedAnalytics.deleteMany({ projectId: req.params.id })

    // Note: ProjectInvitations are kept for audit purposes (intentional)
  ]);

  logInfo('Project deleted with cascade cleanup', {
    projectId: req.params.id,
    projectName: project.name,
    userId: req.userId
  });

  res.json({ message: 'Project deleted successfully' });
}));

// NOTES MANAGEMENT - NEW ROUTES
router.post('/:id/notes', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { title, description, content } = req.body;
  
  if (!title || !title.trim() || !content || !content.trim()) {
    throw BadRequestError('Title and content are required', 'MISSING_FIELDS');
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found');
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
}));

// Note lock management routes
router.post('/:id/notes/:noteId/lock', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const noteId = req.params.noteId;
  const projectId = req.params.id;
  const userId = req.userId!;

  // Get user details
  const user = await User.findById(userId);
  if (!user) {
    throw NotFoundError('User not found');
  }

  // Check if note is already locked by someone else
  const existingLock = await NoteLock.findOne({ noteId, projectId });
  if (existingLock && existingLock.userId.toString() !== userId.toString()) {
    throw new AppError(423, 'Note is currently being edited by another user', 'NOTE_LOCKED');
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
}));

router.delete('/:id/notes/:noteId/lock', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
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
}));

router.put('/:id/notes/:noteId/lock/heartbeat', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
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
}));

router.get('/:id/notes/:noteId/lock', requireAuth, requireProjectAccess('view'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
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
}));

router.put('/:id/notes/:noteId', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { title, description, content } = req.body;
  const noteId = req.params.noteId;
  const projectId = req.params.id;
  const userId = req.userId!;

  if (!title || !title.trim() || !content || !content.trim()) {
    throw BadRequestError('Title and content are required', 'MISSING_FIELDS');
  }

  // Check if note is locked by someone else
  const lock = await NoteLock.findOne({ noteId, projectId });
  if (lock && lock.userId.toString() !== userId.toString()) {
    throw new AppError(423, 'Note is currently being edited by another user', 'NOTE_LOCKED');
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found');
  }

  const note = project.notes.find(n => n.id === req.params.noteId);
  if (!note) {
    throw NotFoundError('Note not found');
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
}));

router.delete('/:id/notes/:noteId', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found');
  }

  project.notes = project.notes.filter(n => n.id !== req.params.noteId);
  await project.save();

  res.json({ message: 'Note deleted successfully' });
}));

// TECH STACK MANAGEMENT (Unified Stack)
router.post('/:id/technologies', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { category, name, version, description } = req.body;

  if (!category || !name) {
    throw BadRequestError('Category and name are required', 'MISSING_FIELDS');
  }

  const validCategories = ['styling', 'database', 'framework', 'runtime', 'deployment', 'testing', 'tooling'];
  if (!validCategories.includes(category)) {
    throw BadRequestError('Invalid technology category', 'INVALID_CATEGORY');
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found');
  }

  const existingItem = project.stack.find(
    item => item.category === category && item.name === name
  );

  if (existingItem) {
    throw BadRequestError('Technology already added to this category', 'DUPLICATE_TECH');
  }

  const newItem = {
    category,
    name: name.trim(),
    version: version?.trim() || '',
    description: description?.trim() || ''
  };

  project.stack.push(newItem);
  await project.save();

  res.json({
    message: 'Technology added successfully',
    technology: newItem
  });
}));

router.delete('/:id/technologies/:category/:name', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { category, name } = req.params;

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found');
  }

  project.stack = project.stack.filter(
    item => !(item.category === category && item.name === decodeURIComponent(name))
  );
  await project.save();

  res.json({ message: 'Technology removed successfully' });
}));

router.put('/:id/technologies/:category/:name', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { category, name } = req.params;
  const { version } = req.body;

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found');
  }

  const stackItem = project.stack.find(
    item => item.category === category && item.name === decodeURIComponent(name)
  );

  if (!stackItem) {
    throw NotFoundError('Technology not found');
  }

  // Update the technology version
  if (version !== undefined) stackItem.version = version;

  await project.save();

  res.json({
    message: 'Technology updated successfully',
    technology: stackItem
  });
}));

// TODO MANAGEMENT
router.post('/:id/todos', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { text, description, priority, status, dueDate, reminderDate, assignedTo, parentTodoId } = req.body;
  
  if (!text || !text.trim()) {
    throw BadRequestError('Todo text is required', 'MISSING_TODO_TEXT');
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found');
  }

  // Validate assignedTo user is a team member or project owner for shared projects
  if (assignedTo && project.isShared) {
    const isOwner = project.ownerId?.toString() === assignedTo || project.userId?.toString() === assignedTo;
    const isTeamMember = await TeamMember.findOne({ 
      projectId: project._id, 
      userId: assignedTo 
    });
    if (!isOwner && !isTeamMember) {
      throw BadRequestError('Assigned user must be a team member or project owner', 'INVALID_ASSIGNEE');
    }
  }

  const newTodo = {
    id: uuidv4(),
    title: text.trim(),
    description: description?.trim() || '',
    priority: priority || 'medium',
    completed: false,
    status: status || 'not_started',
    dueDate: dueDate ? new Date(dueDate) : undefined,
    reminderDate: reminderDate ? new Date(reminderDate) : undefined,
    assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined,
    parentTodoId: parentTodoId || undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
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
        todoTitle: newTodo.title,
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
    logWarn('Failed to log todo creation', { error });
  }

  // Create assignment notification if assigning to someone else
  if (assignedTo && assignedTo !== req.userId?.toString()) {
    logInfo(`Creating assignment notification for user ${assignedTo}, todo: ${text.trim()}`);
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
      logInfo(`Assignment notification created successfully`);
    } catch (notifError) {
      logWarn('Failed to create assignment notification', { error: notifError });
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
        newTodo.title,
        undefined,
        req.get('user-agent'),
        req.ip
      );
    } catch (error) {
      logError('Failed to log todo assignment:', error as Error);
    }
  }

  res.json({
    message: 'Todo added successfully',
    todo: newTodo
  });
}));

router.put('/:id/todos/:todoId', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { text, description, priority, completed, status, dueDate, reminderDate, assignedTo, parentTodoId } = req.body;

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found');
  }

  const todo = project.todos.find(t => t.id === req.params.todoId);
  if (!todo) {
    throw NotFoundError('Todo not found');
  }

  // Validate assignedTo user is a team member or project owner for shared projects
  if (assignedTo && project.isShared) {
    const isOwner = project.ownerId?.toString() === assignedTo || project.userId?.toString() === assignedTo;
    const isTeamMember = await TeamMember.findOne({ 
      projectId: project._id, 
      userId: assignedTo 
    });
    if (!isOwner && !isTeamMember) {
      throw BadRequestError('Assigned user must be a team member or project owner', 'INVALID_ASSIGNEE');
    }
  }

  // Store original values for activity logging
  const originalValues = {
    text: todo.title,
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

  if (text !== undefined) todo.title = text.trim();
  if (description !== undefined) todo.description = description.trim();
  if (priority !== undefined) todo.priority = priority;
  if (completed !== undefined) todo.completed = completed;
  if (status !== undefined) todo.status = status;
  if (dueDate !== undefined) todo.dueDate = dueDate ? new Date(dueDate) : undefined;
  if (reminderDate !== undefined) todo.reminderDate = reminderDate ? new Date(reminderDate) : undefined;
  if (assignedTo !== undefined) todo.assignedTo = assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined;
  if (parentTodoId !== undefined) todo.parentTodoId = parentTodoId;
  todo.updatedBy = req.userId ? new mongoose.Types.ObjectId(req.userId) : undefined;
  (todo as any).updatedAt = new Date();

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
          todo.title,
          undefined,
          req.get('user-agent'),
          req.ip
        );
      } catch (error) {
        logError(`Failed to log todo ${mapping.field} update:`, error as Error);
      }
    }
  }

  // Create assignment notification if assigned to a new user
  if (assignedTo && assignedTo !== previousAssignedTo && assignedTo !== req.userId?.toString()) {
    await Notification.create({
      userId: assignedTo,
      type: 'todo_assigned',
      title: 'Todo Assigned',
      message: `You have been assigned a todo: "${todo.title}"`,
      relatedProjectId: project._id,
      relatedTodoId: todo.id,
      actionUrl: `/projects/${project._id}`
    });
  }

  res.json({
    message: 'Todo updated successfully',
    todo: todo
  });
}));

router.delete('/:id/todos/:todoId', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found');
  }

  // Find the todo to get its details before deletion
  const todoToDelete = project.todos.find(t => t.id === req.params.todoId);
  
  if (!todoToDelete) {
    throw NotFoundError('Todo not found');
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
        todoTitle: todoToDelete.title,
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
    logError('Failed to log todo deletion:', error as Error);
  }

  project.todos = project.todos.filter(t => t.id !== req.params.todoId);
  await project.save();

  res.json({ message: 'Todo deleted successfully' });
}));

// DEV LOG MANAGEMENT
router.post('/:id/devlog', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { title, description} = req.body;

  if (!description || !description.trim()) {
    throw BadRequestError('Dev log description is required', 'DESCRIPTION_REQUIRED');
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  const newEntry = {
    id: uuidv4(),
    title: title?.trim() || '',
    description: description?.trim() || '',
    date: new Date()
  };

  project.devLog.push(newEntry);
  await project.save();

  res.json({
    message: 'Dev log entry added successfully',
    entry: newEntry
  });
}));

router.put('/:id/devlog/:entryId', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { title, description } = req.body;

  if (!description || !description.trim()) {
    throw BadRequestError('Dev log description is required', 'DESCRIPTION_REQUIRED');
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  const devLogEntry = project.devLog.find(e => e.id === req.params.entryId);
  if (!devLogEntry) {
    throw NotFoundError('Dev log entry not found', 'DEVLOG_NOT_FOUND');
  }

  if (title !== undefined) devLogEntry.title = title.trim();
  if (description !== undefined) devLogEntry.description = description.trim();
  
  await project.save();

  res.json({
    message: 'Dev log entry updated successfully',
    entry: devLogEntry
  });
}));

router.delete('/:id/devlog/:entryId', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  project.devLog = project.devLog.filter(e => e.id !== req.params.entryId);
  await project.save();

  res.json({ message: 'Dev log entry deleted successfully' });
}));

// Helper function for calculating string similarity (Jaccard similarity)
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

// Helper function to detect relationships between components (auto-detection on creation)
function detectRelationships(newComponent: any, existingComponents: any[]): any[] {
  const detectedRelationships: any[] = [];
  const newContent = newComponent.content.toLowerCase();
  const newTitle = newComponent.title.toLowerCase();

  existingComponents.forEach((targetComponent) => {
    const targetTitle = targetComponent.title.toLowerCase();

    // Check if new component mentions target by title
    if (newContent.includes(targetTitle) || newTitle.includes(targetTitle)) {
      detectedRelationships.push({
        id: uuidv4(),
        targetId: targetComponent.id,
        relationType: 'mentions',
        description: 'Auto-detected: Component mentions this in content or title'
      });
    }

    // Check for similar titles (potential duplicates)
    const similarity = calculateSimilarity(newComponent.title, targetComponent.title);
    if (similarity > 0.6) {
      detectedRelationships.push({
        id: uuidv4(),
        targetId: targetComponent.id,
        relationType: 'similar',
        description: `Auto-detected: ${Math.round(similarity * 100)}% title similarity`
      });
    }
  });

  return detectedRelationships;
}

// COMPONENT MANAGEMENT (Feature Components)
router.post('/:id/components', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { category, type, title, content, feature, filePath, tags, relationships, metadata } = req.body;

  if (!category || !type || !title || !content || !feature) {
    throw BadRequestError('Category, type, title, content, and feature are required', 'REQUIRED_FIELDS');
  }

  const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];
  if (!validCategories.includes(category)) {
    throw BadRequestError('Invalid component category', 'INVALID_CATEGORY');
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  const newComponent = {
    id: uuidv4(),
    category: category,
    type: type.trim(),
    title: title.trim(),
    content: content.trim(),
    feature: feature.trim(),
    filePath: filePath?.trim() || '',
    tags: tags || [],
    relationships: [] as any[],
    metadata: metadata || {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Auto-detect relationships with existing components (runs only on creation)
  const autoDetectedRelationships = detectRelationships(newComponent, project.components);

  // Combine manually provided relationships with auto-detected ones
  const manualRelationships = (relationships || []).map((rel: any) => ({
    id: uuidv4(),
    targetId: rel.targetId,
    relationType: rel.relationType,
    description: rel.description || ''
  }));

  newComponent.relationships = [...manualRelationships, ...autoDetectedRelationships];

  project.components.push(newComponent);
  await project.save();

  res.json({
    message: 'Component added successfully',
    component: newComponent
  });
}));

router.put('/:id/components/:componentId', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { category, type, title, content, feature, filePath, tags, relationships, metadata } = req.body;

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  const component = project.components.find(c => c.id === req.params.componentId);
  if (!component) {
    throw NotFoundError('Component not found', 'COMPONENT_NOT_FOUND');
  }

  if (category !== undefined) {
    const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];
    if (!validCategories.includes(category)) {
      throw BadRequestError('Invalid component category', 'INVALID_CATEGORY');
    }
    component.category = category;
  }
  if (type !== undefined) component.type = type.trim();
  if (title !== undefined) component.title = title.trim();
  if (content !== undefined) component.content = content.trim();
  if (feature !== undefined) component.feature = feature.trim();
  if (filePath !== undefined) component.filePath = filePath.trim();
  if (tags !== undefined) component.tags = tags;
  if (relationships !== undefined) {
    component.relationships = relationships.map((rel: any) => ({
      id: rel.id || uuidv4(),
      targetId: rel.targetId,
      relationType: rel.relationType,
      description: rel.description || ''
    }));
  }
  if (metadata !== undefined) component.metadata = metadata;
  component.updatedAt = new Date();

  await project.save();

  res.json({
    message: 'Component updated successfully',
    component: component
  });
}));

router.delete('/:id/components/:componentId', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  project.components = project.components.filter(c => c.id !== req.params.componentId);
  await project.save();

  res.json({ message: 'Component deleted successfully' });
}));

// RELATIONSHIP MANAGEMENT
router.post('/:id/components/:componentId/relationships', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { targetId, relationType, description } = req.body;

  if (!targetId || !relationType) {
    throw BadRequestError('targetId and relationType are required', 'REQUIRED_FIELDS');
  }

  const validRelationTypes = ['uses', 'implements', 'extends', 'depends_on', 'calls', 'contains'];
  if (!validRelationTypes.includes(relationType)) {
    throw BadRequestError('Invalid relationship type', 'INVALID_RELATION_TYPE');
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  const component = project.components.find(c => c.id === req.params.componentId);
  if (!component) {
    throw NotFoundError('Component not found', 'COMPONENT_NOT_FOUND');
  }

  // Verify target component exists
  const targetComponent = project.components.find(c => c.id === targetId);
  if (!targetComponent) {
    throw NotFoundError('Target component not found', 'TARGET_NOT_FOUND');
  }

  // Check for duplicate relationship
  const existingRelationship = component.relationships?.find(
    r => r.targetId === targetId && r.relationType === relationType
  );
  if (existingRelationship) {
    throw ConflictError('Relationship already exists', 'RELATIONSHIP_EXISTS');
  }

  // Create shared relationship ID for bidirectional linking
  const sharedRelationshipId = uuidv4();

  // Create forward relationship (A -> B)
  const forwardRelationship = {
    id: sharedRelationshipId,
    targetId,
    relationType,
    description: description || ''
  };

  // Create inverse relationship (B -> A)
  const inverseRelationship = {
    id: sharedRelationshipId, // Same ID for linking
    targetId: req.params.componentId,
    relationType,
    description: description || ''
  };

  if (!component.relationships) {
    component.relationships = [];
  }
  if (!targetComponent.relationships) {
    targetComponent.relationships = [];
  }

  component.relationships.push(forwardRelationship);
  targetComponent.relationships.push(inverseRelationship);

  component.updatedAt = new Date();
  targetComponent.updatedAt = new Date();

  await project.save();

  res.json({
    message: 'Relationship added successfully',
    relationship: forwardRelationship
  });
}));

router.delete('/:id/components/:componentId/relationships/:relationshipId', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  const component = project.components.find(c => c.id === req.params.componentId);
  if (!component) {
    throw NotFoundError('Component not found', 'COMPONENT_NOT_FOUND');
  }

  if (!component.relationships) {
    throw NotFoundError('Relationship not found', 'RELATIONSHIP_NOT_FOUND');
  }

  const relationshipIndex = component.relationships.findIndex(r => r.id === req.params.relationshipId);
  if (relationshipIndex === -1) {
    throw NotFoundError('Relationship not found', 'RELATIONSHIP_NOT_FOUND');
  }

  // Remove relationship from source component
  component.relationships.splice(relationshipIndex, 1);
  component.updatedAt = new Date();

  // Remove the inverse relationship from all other components (since they share the same ID)
  project.components.forEach(otherComponent => {
    if (otherComponent.id !== req.params.componentId && otherComponent.relationships) {
      const inverseIndex = otherComponent.relationships.findIndex(r => r.id === req.params.relationshipId);
      if (inverseIndex !== -1) {
        otherComponent.relationships.splice(inverseIndex, 1);
        otherComponent.updatedAt = new Date();
      }
    }
  });

  await project.save();

  res.json({ message: 'Relationship deleted successfully' });
}));


// Helper function to format project response
function formatProjectResponse(project: any) {
  return {
    id: project._id,
    name: project.name,
    description: project.description,
    notes: project.notes,
    todos: project.todos,
    devLog: project.devLog,
    components: project.components,
    stack: project.stack || [], // Unified tech stack
    stagingEnvironment: project.stagingEnvironment,
    color: project.color,
    category: project.category,
    tags: project.tags,
    isArchived: project.isArchived,
    isLocked: project.isLocked || false,
    lockedReason: project.lockedReason,
    isShared: project.isShared,
    isPublic: project.isPublic,
    publicSlug: project.publicSlug,
    publicShortDescription: project.publicShortDescription,
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
            username: '$userInfo.username',
            displayPreference: '$userInfo.displayPreference',
            displayName: {
              $cond: {
                if: { $eq: ['$userInfo.displayPreference', 'username'] },
                then: { $concat: ['@', '$userInfo.username'] },
                else: { $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'] }
              }
            },
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
    logError('Get team members error:', error as Error);
    res.status(500).json({ message: 'Server error fetching team members' });
  }
});

// POST /api/projects/:id/invite - Invite user to project (with team member limit check)
router.post('/:id/invite', requireAuth, blockDemoWrites, requireProjectAccess('manage'), checkTeamMemberLimit, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id: projectId } = req.params;
  const { email, role = 'viewer' } = req.body;
  const inviterUserId = req.userId!;

  if (!email || !email.includes('@')) {
    throw BadRequestError('Valid email is required', 'INVALID_EMAIL');
  }

  if (!['editor', 'viewer'].includes(role)) {
    throw BadRequestError('Role must be editor or viewer', 'INVALID_ROLE');
  }

  // Check if project exists and get project details
  const project = await Project.findById(projectId).populate('ownerId', 'firstName lastName');
  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Check if user is trying to invite themselves
  const inviter = await User.findById(inviterUserId);
  if (inviter?.email.toLowerCase() === email.toLowerCase()) {
    throw BadRequestError('Cannot invite yourself to the project', 'SELF_INVITE');
  }

  // Check if user is already a member
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const existingMember = await TeamMember.findOne({
      projectId,
      userId: existingUser._id,
    });

    if (existingMember) {
      throw BadRequestError('User is already a team member', 'ALREADY_MEMBER');
    }

    // Check if user is the owner
    if (project.ownerId?.toString() === existingUser._id.toString()) {
      throw BadRequestError('User is already the project owner', 'ALREADY_OWNER');
    }
  }

  // Check if there's already a pending invitation
  const existingInvitation = await ProjectInvitation.findOne({
    projectId,
    inviteeEmail: email.toLowerCase(),
    status: 'pending',
  });

  if (existingInvitation) {
    throw BadRequestError('Invitation already sent to this email', 'ALREADY_INVITED');
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
        message: `${inviter?.displayPreference === 'username' ? `@${inviter?.username}` : `${inviter?.firstName} ${inviter?.lastName}`} invited you to collaborate on "${project.name}"`,
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
      logError('Failed to send invitation email:', emailError as Error);
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
}));

// DELETE /api/projects/:id/members/:userId - Remove team member
router.delete('/:id/members/:userId', requireAuth, blockDemoWrites, requireProjectAccess('manage'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id: projectId, userId: memberUserId } = req.params;

  // Check if trying to remove the owner
  const project = await Project.findById(projectId);
  if (project?.ownerId?.toString() === memberUserId) {
    throw BadRequestError('Cannot remove the project owner', 'CANNOT_REMOVE_OWNER');
  }

  // Remove team member
  const deletedMember = await TeamMember.findOneAndDelete({
    projectId,
    userId: memberUserId,
  });

  if (!deletedMember) {
    throw NotFoundError('Team member not found', 'MEMBER_NOT_FOUND');
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
}));

// PATCH /api/projects/:id/members/:userId - Update team member role
router.patch('/:id/members/:userId', requireAuth, blockDemoWrites, requireProjectAccess('manage'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id: projectId, userId: memberUserId } = req.params;
  const { role } = req.body;

  if (!['editor', 'viewer'].includes(role)) {
    throw BadRequestError('Role must be editor or viewer', 'INVALID_ROLE');
  }

  // Check if trying to change the owner's role
  const project = await Project.findById(projectId);
  if (project?.ownerId?.toString() === memberUserId) {
    throw BadRequestError('Cannot change the owner role', 'CANNOT_CHANGE_OWNER_ROLE');
  }

  // Update team member role
  const updatedMember = await TeamMember.findOneAndUpdate(
    { projectId, userId: memberUserId },
    { role },
    { new: true }
  ).populate('userId', 'firstName lastName username displayPreference email');

  if (!updatedMember) {
    throw NotFoundError('Team member not found', 'MEMBER_NOT_FOUND');
  }

  res.json({
    success: true,
    message: 'Team member role updated successfully',
    member: updatedMember,
  });
}));


// Export project data (GET /api/projects/:id/export)
router.get('/:id/export', 
  importExportRateLimit,
  securityHeaders,
  requireAuth, 
  requireProjectAccess('view'), 
  validateExportRequest,
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const projectId = req.params.id;
  
  // Get project with all data
  const project = await Project.findById(projectId)
    .populate('ownerId', 'firstName lastName email')
    .lean();
  
  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

    // Get team members
    const teamMembers = await TeamMember.find({ projectId })
      .populate('userId', 'firstName lastName username displayPreference email')
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
          title: todo.title,
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
        components: project.components || [],

        // Tech stack (unified)
        stack: project.stack || [],

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
      logWarn(`Export size ${exportSize} bytes exceeds limit for project ${projectId}`);
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
  logInfo(`Project export: ${projectId} by user ${req.userId}, size: ${exportSize} bytes`);
  
  res.json(exportData);
}));

// Import project data (POST /api/projects/import)
router.post('/import', 
  importExportRateLimit,
  securityHeaders,
  importSizeLimit,
  requireAuth, 
  checkProjectLimit,
  validateAndSanitizeImport,
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
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
        title: (todo.title || '').substring(0, 500),
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
        date: log.date ? new Date(log.date) : new Date()
      })).slice(0, 200) : [],
      
      components: Array.isArray(projectData.components) ? projectData.components.map((component: any) => ({
        id: component.id || uuidv4(),
        type: ['Core', 'API', 'Data', 'UI', 'Config', 'Security', 'Docs', 'Dependencies'].includes(component.type)
          ? component.type : 'Core',
        title: (component.title || '').substring(0, 200),
        content: (component.content || '').substring(0, 50000),
        feature: (component.feature || 'Ungrouped').substring(0, 100),
        createdAt: component.createdAt ? new Date(component.createdAt) : new Date(),
        updatedAt: component.updatedAt ? new Date(component.updatedAt) : new Date()
      })).slice(0, 100) : [],

      // Unified stack (supports both old format and new)
      stack: Array.isArray(projectData.stack)
        ? projectData.stack.filter((item: any) =>
            item && typeof item === 'object' && item.category && item.name
          ).map((item: any) => ({
            category: item.category,
            name: item.name.substring(0, 100),
            version: (item.version || '').substring(0, 20),
            description: (item.description || '').substring(0, 200)
          })).slice(0, 150)
        : [
            // Legacy: Merge selectedTechnologies and selectedPackages if present
            ...(Array.isArray(projectData.selectedTechnologies)
              ? projectData.selectedTechnologies.filter((tech: any) =>
                  tech && typeof tech === 'object' && tech.category && tech.name
                ).map((tech: any) => ({
                  category: tech.category,
                  name: tech.name.substring(0, 100),
                  version: (tech.version || '').substring(0, 20),
                  description: ''
                }))
              : []),
            ...(Array.isArray(projectData.selectedPackages)
              ? projectData.selectedPackages.filter((pkg: any) =>
                  pkg && typeof pkg === 'object' && pkg.category && pkg.name
                ).map((pkg: any) => ({
                  category: pkg.category,
                  name: pkg.name.substring(0, 100),
                  version: (pkg.version || '').substring(0, 20),
                  description: (pkg.description || '').substring(0, 200)
                }))
              : [])
          ].slice(0, 150),

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
    logInfo(`Project import: ${newProject._id} by user ${req.userId}, size: ${importSize} bytes, name: "${newProject.name}"`);
    
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
              components: sanitizedProject.components.length,
              stack: sanitizedProject.stack.length
            }
          }
        }
      });
    } catch (logError) {
      logWarn('Failed to log import activity:', { error: logError });
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
}));

// TEST ONLY: Manually lock/unlock a project for testing
router.post('/:id/test-lock', requireAuth, blockDemoWrites, requireProjectAccess('edit'), asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { lock } = req.body;
  const project = await Project.findById(req.params.id);
  
  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  project.isLocked = lock === true;
  project.lockedReason = lock ? 'Test lock - simulate plan downgrade' : undefined;
  await project.save();

  res.json({ 
    success: true, 
    isLocked: project.isLocked,
    message: lock ? 'Project locked for testing' : 'Project unlocked'
  });
}));

export default router;
