import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { BaseCommandHandler } from '../BaseCommandHandler';
import { CommandResponse, ResponseType } from '../../types';
import { ParsedCommand, getFlag, getFlagCount, hasFlag } from '../../commandParser';
import { sanitizeText } from '../../../utils/validation';

/**
 * Handlers for DevLog CRUD operations
 */
export class DevLogHandlers extends BaseCommandHandler {
  async handleAddDevLog(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags) - this is an error
    if (parsed.args.length > 0 && getFlagCount(parsed.flags) === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add devlog - Interactive wizard',
          '/add devlog --title="Entry Title" --content="What I worked on today..."',
          '/add devlog --title="Bug Fix" --content="Fixed memory leak in user service"',
          '/help add devlog'
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
        message: `✨ Add New Dev Log Entry`,
        data: {
          wizardType: 'add_devlog',
          steps: [
            {
              id: 'title',
              label: 'Title',
              type: 'text',
              required: false,
              placeholder: 'Optional entry title'
            },
            {
              id: 'content',
              label: 'Content',
              type: 'textarea',
              required: true,
              placeholder: 'What did you work on today?'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_devlog'
        }
      };
    }

    // Validate required flags
    if (!title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --title flag is required',
        suggestions: [
          '/add devlog - Use wizard instead',
          '/add devlog --title="Entry Title" --content="Entry content"',
          '/help add devlog'
        ]
      };
    }

    if (!content) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --content flag is required',
        suggestions: [
          '/add devlog - Use wizard instead',
          '/add devlog --title="Entry Title" --content="Entry content"',
          '/help add devlog'
        ]
      };
    }

    const sanitizedTitle = sanitizeText(title);
    const sanitizedContent = sanitizeText(content);

    if (!sanitizedTitle || !sanitizedContent) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Title and content cannot be empty',
        suggestions: ['/help add devlog']
      };
    }

    const newEntry = {
      id: uuidv4(),
      title: sanitizedTitle,
      description: sanitizedContent,
      date: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    project.devLog.push(newEntry);
    await project.save();

    return this.buildSuccessResponse(
      `📋 Added dev log entry "${sanitizedTitle}" to ${project.name}`,
      project,
      'add_devlog',
      { preview: sanitizedContent.slice(0, 50) + (sanitizedContent.length > 50 ? '...' : '') }
    );
  }

  /**
   * Handle /add component command
   * Now requires flag-based syntax: /add component --feature="..." --category=... --type=... --title="..." --content="..."
   * Or use without flags to pull up an interactive wizard: /add component
   */

  async handleViewDevLog(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const devLog = resolution.project.devLog || [];

    if (devLog.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `📋 No dev log entries found in ${resolution.project.name}`,
        suggestions: [`/add devlog @${resolution.project.name}`]
      };
    }

    return this.buildDataResponse(
      `📋 Dev Log in ${resolution.project.name} (${devLog.length} entries)`,
      resolution.project,
      'view_devlog',
      {
        entries: devLog.map((entry: any) => ({
          id: entry.id,
          title: entry.title,
          description: entry.description,
          date: entry.date
        })).reverse()
      }
    );
  }

  /**
   * Handle /view components command - Shows structure by default, grouped by features
   */

  async handleEditDevLog(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // If no args, show selector wizard
    if (parsed.args.length === 0) {
      const entries = project.devLog || [];

      if (entries.length === 0) {
        return {
          type: ResponseType.INFO,
          message: `📓 No dev log entries found in ${project.name}`,
          suggestions: [`/add devlog`, `/push "Implemented feature X"`]
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✏️  Select Dev Log Entry to Edit`,
        data: {
          wizardType: 'edit_devlog_selector',
          steps: [
            {
              id: 'entryId',
              label: 'Select Entry',
              type: 'select',
              required: true,
              options: entries.map((entry: any) => ({
                value: entry.id,
                label: `${entry.title ? entry.title + ' - ' : ''}${entry.description?.slice(0, 50) || ''}${entry.description?.length > 50 ? '...' : ''}`
              }))
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_devlog_selector'
        }
      };
    }

    const identifier = parsed.args[0];
    const entry = this.findDevLogEntry(project.devLog, identifier);

    if (!entry) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Dev log entry not found: "${identifier}"`,
        suggestions: [
          '/view devlog - See all entries with #IDs',
          '/help edit devlog'
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
        entry.title = sanitizedTitle;
        updated = true;
      }

      if (content) {
        entry.description = sanitizeText(content);
        updated = true;
      }

      if (updated) {
        entry.date = new Date();

        try {
          await project.save();
        } catch (saveError) {
          console.error('[EDIT DEVLOG] Save failed:', saveError);
          return {
            type: ResponseType.ERROR,
            message: `Failed to save dev log: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
            suggestions: ['/help edit devlog']
          };
        }

        return this.buildSuccessResponse(
          `📋 Updated dev log entry`,
          project,
          'edit_devlog'
        );
      }
    }

    // No flags - return interactive wizard
    return {
      type: ResponseType.PROMPT,
      message: `✏️ Edit Dev Log Entry`,
      data: {
        wizardType: 'edit_devlog',
        entryId: entry.id,
        currentValues: {
          title: entry.title || '',
          content: entry.description || ''
        },
        steps: [
          {
            id: 'title',
            label: 'Title',
            type: 'text',
            required: false,
            value: entry.title || ''
          },
          {
            id: 'content',
            label: 'Content',
            type: 'textarea',
            required: true,
            value: entry.description || ''
          }
        ]
      },
      metadata: {
        projectId: project._id.toString(),
        action: 'edit_devlog'
      }
    };
  }

  /**
   * Handle /edit component command - Edit an existing component
   */

  async handleDeleteDevLog(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const identifier = parsed.args.join(' ').trim();

    // No identifier provided - show selector wizard
    if (!identifier) {
      if (project.devLog.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No devlog entries to delete',
          suggestions: ['/add devlog']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🗑️  Select Devlog Entry to Delete`,
        data: {
          wizardType: 'delete_devlog_selector',
          steps: [
            {
              id: 'entryId',
              label: 'Select Entry',
              type: 'select',
              options: project.devLog.map((e: any) => ({
                value: e.id,
                label: e.title || e.description?.substring(0, 50) || 'Untitled entry'
              })),
              required: true,
              placeholder: 'Select devlog entry to delete'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_devlog_selector'
        }
      };
    }

    const entry = this.findDevLogEntry(project.devLog, identifier);

    if (!entry) {
      return {
        type: ResponseType.ERROR,
        message: `Dev log entry not found: "${identifier}"`,
        suggestions: ['/view devlog', '/help delete devlog']
      };
    }

    const hasConfirmation = hasFlag(parsed.flags, 'confirm') || hasFlag(parsed.flags, 'yes') || hasFlag(parsed.flags, 'y');

    if (!hasConfirmation) {
      const entryTitle = entry.title || entry.description?.substring(0, 50) || 'Untitled entry';
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_devlog_confirm',
          confirmationData: {
            itemTitle: entryTitle,
            itemType: 'dev log entry',
            command: `/delete devlog ${identifier} --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete this dev log entry?`,
              type: 'confirmation',
              required: true
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_devlog_confirm'
        }
      };
    }

    project.devLog = project.devLog.filter((e: any) => e.id !== entry.id);
    await project.save();

    return this.buildSuccessResponse(
      `🗑️  Deleted dev log entry`,
      project,
      'delete_devlog'
    );
  }

  /**
   * Find a dev log entry by UUID, index, or description
   */
  private findDevLogEntry(devLog: any[], identifier: string): any | null {
    // Try by UUID
    const byUuid = devLog.find((entry: any) => entry.id === identifier);
    if (byUuid) return byUuid;

    // Try by index (1-based)
    const index = parseInt(identifier);
    if (!isNaN(index) && index > 0 && index <= devLog.length) {
      return devLog[index - 1];
    }

    // Try by partial description match
    const identifierLower = identifier.toLowerCase();
    return devLog.find((entry: any) =>
      entry.description && entry.description.toLowerCase().includes(identifierLower)
    ) || null;
  }
}
