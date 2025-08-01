import express from 'express';
import { Project } from '../models/Project';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { checkProjectLimit } from '../middleware/planLimits';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

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
      userId: req.userId
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

// Get user's projects
router.get('/', async (req: AuthRequest, res) => {
  try {
    const projects = await Project.find({ userId: req.userId }).sort({ createdAt: -1 });
    const formattedProjects = projects.map(formatProjectResponse);
    res.json({ projects: formattedProjects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single project
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ project: formatProjectResponse(project) });
  } catch (error) {
    console.error('Get single project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project
router.put('/:id', async (req: AuthRequest, res) => {
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

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

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
router.patch('/:id/archive', async (req: AuthRequest, res) => {
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

// Delete project
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// NOTES MANAGEMENT - NEW ROUTES
router.post('/:id/notes', async (req: AuthRequest, res) => {
  try {
    const { title, description, content } = req.body;
    
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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

router.put('/:id/notes/:noteId', async (req: AuthRequest, res) => {
  try {
    const { title, description, content } = req.body;

    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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

router.delete('/:id/notes/:noteId', async (req: AuthRequest, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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
router.post('/:id/technologies', async (req: AuthRequest, res) => {
  try {
    const { category, name, version } = req.body;
    
    if (!category || !name) {
      return res.status(400).json({ message: 'Category and name are required' });
    }

    const validCategories = ['styling', 'database', 'framework', 'runtime', 'deployment', 'testing', 'tooling'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid technology category' });
    }

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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

router.delete('/:id/technologies/:category/:name', async (req: AuthRequest, res) => {
  try {
    const { category, name } = req.params;

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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
router.post('/:id/packages', async (req: AuthRequest, res) => {
  try {
    const { category, name, version, description } = req.body;
    
    if (!category || !name) {
      return res.status(400).json({ message: 'Category and name are required' });
    }

    const validCategories = ['ui', 'state', 'routing', 'forms', 'animation', 'utility', 'api', 'auth', 'data'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid package category' });
    }

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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

router.delete('/:id/packages/:category/:name', async (req: AuthRequest, res) => {
  try {
    const { category, name } = req.params;

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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
router.post('/:id/todos', async (req: AuthRequest, res) => {
  try {
    const { text, description, priority } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Todo text is required' });
    }

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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

router.put('/:id/todos/:todoId', async (req: AuthRequest, res) => {
  try {
    const { text, description, priority, completed } = req.body;

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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

router.delete('/:id/todos/:todoId', async (req: AuthRequest, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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
router.post('/:id/devlog', async (req: AuthRequest, res) => {
  try {
    const { title, description, entry } = req.body;
    
    if (!entry || !entry.trim()) {
      return res.status(400).json({ message: 'Dev log entry is required' });
    }

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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

router.put('/:id/devlog/:entryId', async (req: AuthRequest, res) => {
  try {
    const { title, description, entry } = req.body;
    
    if (!entry || !entry.trim()) {
      return res.status(400).json({ message: 'Dev log entry is required' });
    }

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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

router.delete('/:id/devlog/:entryId', async (req: AuthRequest, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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
router.post('/:id/docs', async (req: AuthRequest, res) => {
  try {
    const { type, title, content } = req.body;
    
    if (!type || !title || !content) {
      return res.status(400).json({ message: 'Type, title, and content are required' });
    }

    const validTypes = ['Model', 'Route', 'API', 'Util', 'ENV', 'Auth', 'Runtime', 'Framework'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid doc type' });
    }

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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

router.put('/:id/docs/:docId', async (req: AuthRequest, res) => {
  try {
    const { type, title, content } = req.body;

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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

router.delete('/:id/docs/:docId', async (req: AuthRequest, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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
router.post('/:id/links', async (req: AuthRequest, res) => {
  try {
    const { title, url, type } = req.body;
    
    if (!title || !url) {
      return res.status(400).json({ message: 'Title and URL are required' });
    }

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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

router.put('/:id/links/:linkId', async (req: AuthRequest, res) => {
  try {
    const { title, url, type } = req.body;

    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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

router.delete('/:id/links/:linkId', async (req: AuthRequest, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.userId });

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
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

export default router;