import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { BaseCommandHandler } from '../BaseCommandHandler';
import { CommandResponse, ResponseType } from '../../types';
import { ParsedCommand, getFlag, getFlagCount, hasFlag } from '../../commandParser';
import { sanitizeText } from '../../../utils/validation';

/**
 * Handlers for Note CRUD operations
 */
export class NoteHandlers extends BaseCommandHandler {
  async handleAddNote(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags) - this is an error
    if (parsed.args.length > 0 && getFlagCount(parsed.flags) === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add note - Interactive wizard',
          '/add note --title="Note Title" --content="Note content"',
          '/add note --title="Meeting Notes" --content="Discussed project architecture..."',
          '/help add note'
        ]
      };
    }

    // Get flags
    const title = getFlag(parsed.flags, 'title') as string;
    const content = getFlag(parsed.flags, 'content') as string;

    // No args and no flags - pull up wizard
    if (parsed.args.length === 0 && getFlagCount(parsed.flags) === 0) {
      return {
        type: ResponseType.PROMPT,
        message: `✨ Add New Note`,
        data: {
          wizardType: 'add_note',
          steps: [
            {
              id: 'title',
              label: 'Note Title',
              type: 'text',
              required: true,
              placeholder: 'Enter note title'
            },
            {
              id: 'content',
              label: 'Content',
              type: 'textarea',
              required: true,
              placeholder: 'Enter note content'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_note'
        }
      };
    }

    // Validate required flags
    if (!title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --title flag is required',
        suggestions: [
          '/add note - Use wizard instead',
          '/add note --title="Note Title" --content="Note content"',
          '/help add note'
        ]
      };
    }

    if (!content) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --content flag is required',
        suggestions: [
          '/add note - Use wizard instead',
          '/add note --title="Note Title" --content="Note content"',
          '/help add note'
        ]
      };
    }

    const sanitizedTitle = sanitizeText(title);
    const sanitizedContent = sanitizeText(content);

    if (!sanitizedTitle || !sanitizedContent) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Title and content cannot be empty',
        suggestions: ['/help add note']
      };
    }

    const newNote = {
      id: uuidv4(),
      title: sanitizedTitle,
      description: '',
      content: sanitizedContent,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    project.notes.push(newNote);
    await project.save();

    return this.buildSuccessResponse(
      `📝 Added note "${sanitizedTitle}" to ${project.name}`,
      project,
      'add_note',
      { title: sanitizedTitle, preview: sanitizedContent.slice(0, 50) + (sanitizedContent.length > 50 ? '...' : '') }
    );
  }

  /**
   * Handle /add devlog command
   * Now requires flag-based syntax: /add devlog --title="..." --content="..."
   * Or use without flags to pull up an interactive wizard: /add devlog
   */

  async handleViewNotes(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const notes = resolution.project.notes || [];

    if (notes.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `📝 No notes found in ${resolution.project.name}`,
        suggestions: [`/add note`, `/add note --title="Note Title" --content="Content" @${resolution.project.name}`]
      };
    }

    return this.buildDataResponse(
      `📝 Notes in ${resolution.project.name} (${notes.length})`,
      resolution.project,
      'view_notes',
      {
        notes: notes.map((note: any) => ({
          id: note.id,
          title: note.title,
          preview: note.content?.slice(0, 100) + (note.content?.length > 100 ? '...' : ''),
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        }))
      }
    );
  }

  /**
   * Handle /view todos command
   */

  async handleEditNote(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // If no args, show selector wizard
    if (parsed.args.length === 0) {
      const notes = project.notes || [];

      if (notes.length === 0) {
        return {
          type: ResponseType.INFO,
          message: `📝 No notes found in ${project.name}`,
          suggestions: [`/add note`, `/add note --title="Note Title" --content="Content"`]
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✏️  Select Note to Edit`,
        data: {
          wizardType: 'edit_note_selector',
          steps: [
            {
              id: 'noteId',
              label: 'Select Note',
              type: 'select',
              required: true,
              options: notes.map((note: any) => ({
                value: note.id,
                label: `${note.title} - ${note.content?.slice(0, 50) || ''}${note.content?.length > 50 ? '...' : ''}`
              }))
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_note_selector'
        }
      };
    }

    const identifier = parsed.args[0];
    const note = this.findNote(project.notes, identifier);

    if (!note) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Note not found: "${identifier}"`,
        suggestions: [
          '/view notes - See all notes with #IDs',
          '/help edit note'
        ]
      };
    }

    // Check for direct flags (new syntax)
    const title = getFlag(parsed.flags, 'title') as string;
    const content = getFlag(parsed.flags, 'content') as string;

    // If any flags are provided, update those fields
    if (title || content) {
      let updated = false;

      if (title) {
        const sanitizedTitle = sanitizeText(title);
        note.title = sanitizedTitle;
        updated = true;
      }

      if (content) {
        note.content = sanitizeText(content);
        updated = true;
      }

      if (updated) {
        note.updatedAt = new Date();

        try {
          await project.save();
        } catch (saveError) {
          console.error('[EDIT NOTE] Save failed:', saveError);
          return {
            type: ResponseType.ERROR,
            message: `Failed to save note: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
            suggestions: ['/help edit note']
          };
        }

        return this.buildSuccessResponse(
          `📝 Updated note: "${note.title}"`,
          project,
          'edit_note'
        );
      }
    }

    // No flags - return interactive wizard
    return {
      type: ResponseType.PROMPT,
      message: `✏️ Edit Note: "${note.title}"`,
      data: {
        wizardType: 'edit_note',
        noteId: note.id,
        currentValues: {
          title: note.title,
          content: note.content
        },
        steps: [
          {
            id: 'title',
            label: 'Note Title',
            type: 'text',
            required: true,
            value: note.title
          },
          {
            id: 'content',
            label: 'Content',
            type: 'textarea',
            required: true,
            value: note.content
          }
        ]
      },
      metadata: {
        projectId: project._id.toString(),
        action: 'edit_note'
      }
    };
  }

  /**
   * Handle /edit devlog command - Edit an existing dev log entry
   */

  async handleDeleteNote(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const noteIdentifier = parsed.args.join(' ').trim();

    // No identifier provided - show selector wizard
    if (!noteIdentifier) {
      if (project.notes.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No notes to delete',
          suggestions: ['/add note']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🗑️  Select Note to Delete`,
        data: {
          wizardType: 'delete_note_selector',
          steps: [
            {
              id: 'noteId',
              label: 'Select Note',
              type: 'select',
              options: project.notes.map((n: any) => ({
                value: n.id,
                label: n.title
              })),
              required: true,
              placeholder: 'Select note to delete'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_note_selector'
        }
      };
    }

    const note = this.findNote(project.notes, noteIdentifier);

    if (!note) {
      return {
        type: ResponseType.ERROR,
        message: `Note not found: "${noteIdentifier}"`,
        suggestions: ['/view notes', '/help delete note']
      };
    }

    const hasConfirmation = hasFlag(parsed.flags, 'confirm') || hasFlag(parsed.flags, 'yes') || hasFlag(parsed.flags, 'y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_note_confirm',
          confirmationData: {
            itemTitle: note.title,
            itemType: 'note',
            command: `/delete note "${note.title}" --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete the note "${note.title}"?`,
              type: 'confirmation',
              required: true
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_note_confirm'
        }
      };
    }

    const noteTitle = note.title;
    project.notes = project.notes.filter((n: any) => n.id !== note.id);
    await project.save();

    return this.buildSuccessResponse(
      `🗑️  Deleted note: "${noteTitle}"`,
      project,
      'delete_note'
    );
  }

  /**
   * Find a note by UUID, index, or title
   */
  private findNote(notes: any[], identifier: string): any | null {
    // Try by UUID
    const byUuid = notes.find((note: any) => note.id === identifier);
    if (byUuid) return byUuid;

    // Try by index (1-based)
    const index = parseInt(identifier);
    if (!isNaN(index) && index > 0 && index <= notes.length) {
      return notes[index - 1];
    }

    // Try by partial title match
    const identifierLower = identifier.toLowerCase();
    return notes.find((note: any) =>
      note.title.toLowerCase().includes(identifierLower)
    ) || null;
  }
}
