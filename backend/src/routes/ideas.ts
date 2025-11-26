import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { blockDemoWrites } from '../middleware/blockDemoWrites';
import { User } from '../models/User';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
// blockDemoWrites applied per-route after requireAuth

// Get all ideas for the authenticated user
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ ideas: user.ideas || [] });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

// Create a new idea
router.post('/', requireAuth, blockDemoWrites, async (req: AuthRequest, res) => {
  try {
    const { title, description, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Validate lengths
    if (title.trim().length > 200) {
      return res.status(400).json({ error: `Title is too long (${title.trim().length} / 200 characters)` });
    }
    if (description && description.trim().length > 500) {
      return res.status(400).json({ error: `Description is too long (${description.trim().length} / 500 characters)` });
    }
    if (content.trim().length > 50000) {
      return res.status(400).json({ error: `Content is too long (${content.trim().length} / 50,000 characters)` });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newIdea = {
      id: uuidv4(),
      title: title.trim(),
      description: description?.trim() || '',
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    user.ideas = user.ideas || [];
    user.ideas.unshift(newIdea); // Add to beginning for latest first
    await user.save();

    res.status(201).json({ idea: newIdea });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to create idea' });
  }
});

// Update an existing idea
router.put('/:ideaId', requireAuth, blockDemoWrites, async (req: AuthRequest, res) => {
  try {
    const { ideaId } = req.params;
    const { title, description, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Validate lengths
    if (title.trim().length > 200) {
      return res.status(400).json({ error: `Title is too long (${title.trim().length} / 200 characters)` });
    }
    if (description && description.trim().length > 500) {
      return res.status(400).json({ error: `Description is too long (${description.trim().length} / 500 characters)` });
    }
    if (content.trim().length > 50000) {
      return res.status(400).json({ error: `Content is too long (${content.trim().length} / 50,000 characters)` });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ideaIndex = user.ideas?.findIndex(idea => idea.id === ideaId);
    if (ideaIndex === undefined || ideaIndex === -1) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    // Update the idea
    user.ideas[ideaIndex].title = title.trim();
    user.ideas[ideaIndex].description = description?.trim() || '';
    user.ideas[ideaIndex].content = content.trim();
    user.ideas[ideaIndex].updatedAt = new Date();

    await user.save();

    res.json({ idea: user.ideas[ideaIndex] });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to update idea' });
  }
});

// Delete an idea
router.delete('/:ideaId', requireAuth, blockDemoWrites, async (req: AuthRequest, res) => {
  try {
    const { ideaId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ideaIndex = user.ideas?.findIndex(idea => idea.id === ideaId);
    if (ideaIndex === undefined || ideaIndex === -1) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    // Remove the idea
    user.ideas.splice(ideaIndex, 1);
    await user.save();

    res.json({ message: 'Idea deleted successfully' });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to delete idea' });
  }
});

export default router;