import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { blockDemoWrites } from '../middleware/blockDemoWrites';
import { User } from '../models/User';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, BadRequestError, NotFoundError } from '../utils/errorHandler';

const router = express.Router();
// blockDemoWrites applied per-route after requireAuth

// Get all ideas for the authenticated user
router.get('/', requireAuth, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  res.json({ ideas: user.ideas || [] });
}));

// Create a new idea
router.post('/', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { title, description, content } = req.body;

  if (!title || !content) {
    throw BadRequestError('Title and content are required', 'REQUIRED_FIELDS');
  }

  // Validate lengths
  if (title.trim().length > 200) {
    throw BadRequestError(`Title is too long (${title.trim().length} / 200 characters)`, 'TITLE_TOO_LONG');
  }
  if (description && description.trim().length > 500) {
    throw BadRequestError(`Description is too long (${description.trim().length} / 500 characters)`, 'DESCRIPTION_TOO_LONG');
  }
  if (content.trim().length > 50000) {
    throw BadRequestError(`Content is too long (${content.trim().length} / 50,000 characters)`, 'CONTENT_TOO_LONG');
  }

  const user = await User.findById(req.userId);
  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
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
}));

// Update an existing idea
router.put('/:ideaId', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { ideaId } = req.params;
  const { title, description, content } = req.body;

  if (!title || !content) {
    throw BadRequestError('Title and content are required', 'REQUIRED_FIELDS');
  }

  // Validate lengths
  if (title.trim().length > 200) {
    throw BadRequestError(`Title is too long (${title.trim().length} / 200 characters)`, 'TITLE_TOO_LONG');
  }
  if (description && description.trim().length > 500) {
    throw BadRequestError(`Description is too long (${description.trim().length} / 500 characters)`, 'DESCRIPTION_TOO_LONG');
  }
  if (content.trim().length > 50000) {
    throw BadRequestError(`Content is too long (${content.trim().length} / 50,000 characters)`, 'CONTENT_TOO_LONG');
  }

  const user = await User.findById(req.userId);
  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  const ideaIndex = user.ideas?.findIndex(idea => idea.id === ideaId);
  if (ideaIndex === undefined || ideaIndex === -1) {
    throw NotFoundError('Idea not found', 'IDEA_NOT_FOUND');
  }

  // Update the idea
  user.ideas[ideaIndex].title = title.trim();
  user.ideas[ideaIndex].description = description?.trim() || '';
  user.ideas[ideaIndex].content = content.trim();
  user.ideas[ideaIndex].updatedAt = new Date();

  await user.save();

  res.json({ idea: user.ideas[ideaIndex] });
}));

// Delete an idea
router.delete('/:ideaId', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { ideaId } = req.params;

  const user = await User.findById(req.userId);
  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  const ideaIndex = user.ideas?.findIndex(idea => idea.id === ideaId);
  if (ideaIndex === undefined || ideaIndex === -1) {
    throw NotFoundError('Idea not found', 'IDEA_NOT_FOUND');
  }

  // Remove the idea
  user.ideas.splice(ideaIndex, 1);
  await user.save();

  res.json({ message: 'Idea deleted successfully' });
}));

export default router;