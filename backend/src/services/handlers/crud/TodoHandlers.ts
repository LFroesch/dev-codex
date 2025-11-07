import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { BaseCommandHandler } from '../BaseCommandHandler';
import { CommandResponse, ResponseType } from '../../types';
import { ParsedCommand, getFlag, getFlagCount, hasFlag } from '../../commandParser';
import { sanitizeText, validateTodoText, parseDueDate, formatDueDate, formatTime12Hour } from '../../../utils/validation';
import { AnalyticsService } from '../../../middleware/analytics';

/**
 * Handlers for Todo and Subtask CRUD operations
 */
export class TodoHandlers extends BaseCommandHandler {
  async handleAddTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags) - this is an error
    if (parsed.args.length > 0 && getFlagCount(parsed.flags) === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add todo - Interactive wizard',
          '/add todo --title="your todo title"',
          '/add todo --title="fix bug" --content="detailed description" --priority=high',
          '/help add todo'
        ]
      };
    }

    // Get flags
    const title = getFlag(parsed.flags, 'title') as string;
    const content = getFlag(parsed.flags, 'content') as string;
    const priority = getFlag(parsed.flags, 'priority') as string;
    const status = getFlag(parsed.flags, 'status') as string;
    const due = getFlag(parsed.flags, 'due') as string;

    // No args and no flags - pull up wizard
    if (parsed.args.length === 0 && getFlagCount(parsed.flags) === 0) {
      return {
        type: ResponseType.PROMPT,
        message: `✨ Add New Todo`,
        data: {
          wizardType: 'add_todo',
          steps: [
            {
              id: 'title',
              label: 'Title',
              type: 'text',
              required: true,
              placeholder: 'Enter todo title'
            },
            {
              id: 'content',
              label: 'Description',
              type: 'textarea',
              required: false,
              placeholder: 'Optional description'
            },
            {
              id: 'priority',
              label: 'Priority',
              type: 'select',
              options: ['low', 'medium', 'high'],
              required: true,
              value: 'medium'
            },
            {
              id: 'status',
              label: 'Status',
              type: 'select',
              options: ['not_started', 'in_progress', 'completed', 'blocked'],
              required: true,
              value: 'not_started'
            },
            {
              id: 'due',
              label: 'Due Date',
              type: 'text',
              required: false,
              placeholder: 'MM-DD-YYYY 8:00PM or MM-DD 21:00 (optional)'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_todo'
        }
      };
    }

    // Validate required flags
    if (!title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --title flag is required',
        suggestions: [
          '/add todo - Use wizard instead',
          '/add todo --title="your todo title"',
          '/add todo --title="fix authentication bug" --priority=high',
          '/help add todo'
        ]
      };
    }

    // Validate title
    const validation = validateTodoText(title);
    if (!validation.isValid) {
      return {
        type: ResponseType.ERROR,
        message: validation.error || 'Invalid todo title',
        suggestions: ['/help add todo']
      };
    }

    // Validate priority if provided
    if (priority && !['low', 'medium', 'high'].includes(priority.toLowerCase())) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Invalid priority. Must be: low, medium, or high',
        suggestions: ['/add todo --title="task" --priority=high']
      };
    }

    // Validate status if provided
    const validStatuses = ['not_started', 'in_progress', 'completed', 'blocked'];
    if (status && !validStatuses.includes(status.toLowerCase())) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        suggestions: ['/add todo --title="task" --status=in_progress']
      };
    }

    // Parse and validate due date if provided
    let dueDate: Date | undefined;
    if (due) {
      const dueDateParse = parseDueDate(due);
      if (!dueDateParse.isValid) {
        return {
          type: ResponseType.ERROR,
          message: `❌ ${dueDateParse.error}`,
          suggestions: [
            '/add todo --title="task" --due="12-25-2025 8:00PM"',
            '/add todo --title="task" --due="3-15 9:30AM" (defaults to current year)',
            '/add todo --title="task" --due="12-31 21:00" (24-hour format)',
            '/help add todo'
          ]
        };
      }
      dueDate = dueDateParse.date;
    }

    const newTodo = {
      id: uuidv4(),
      title: validation.sanitized!,
      description: content ? sanitizeText(content) : '',
      priority: (priority?.toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
      completed: false,
      status: (status?.toLowerCase() as 'not_started' | 'in_progress' | 'completed' | 'blocked') || 'not_started',
      dueDate,
      createdAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    project.todos.push(newTodo);
    await project.save();

    // Track analytics
    try {
      console.log('[TODO ANALYTICS] Tracking todo create:', {
        userId: this.userId,
        projectId: project._id.toString(),
        priority: newTodo.priority
      });

      const result = await AnalyticsService.trackEvent(this.userId, 'feature_used', {
        feature: 'todo_create_terminal',
        category: 'engagement',
        projectId: project._id.toString(),
        projectName: project.name,
        metadata: {
          priority: newTodo.priority,
          hasDueDate: !!dueDate
        }
      });

      console.log('[TODO ANALYTICS] Track result:', result ? 'SUCCESS' : 'NULL (throttled or limit reached)');
    } catch (error) {
      console.error('[TODO ANALYTICS] Failed to track terminal todo create:', error);
    }

    const dueDateMsg = dueDate ? ` (due: ${formatDueDate(dueDate)})` : '';
    return this.buildSuccessResponse(
      `✅ Added todo: "${validation.sanitized}"${dueDateMsg} to ${project.name}`,
      project,
      'add_todo'
    );
  }

  /**
   * Handle /add note command
   * Now requires flag-based syntax: /add note --title="..." --content="..."
   * Or use without flags to pull up an interactive wizard: /add note
   */

  async handleViewTodos(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const allTodos = resolution.project.todos || [];
    const parentTodos = allTodos.filter((t: any) => !t.parentTodoId);

    if (parentTodos.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `✅ No todos found in ${resolution.project.name}`,
        suggestions: [`/add todo`, `/add todo --title="Task" --priority=high @${resolution.project.name}`]
      };
    }

    // Build hierarchical structure with subtasks
    // Include index for each todo in the global list (for command usage)
    const todosWithSubtasks = parentTodos.map((todo: any, parentIndex: number) => {
      const subtasks = allTodos.filter((t: any) => t.parentTodoId === todo.id);
      return {
        id: todo.id,
        index: parentIndex + 1, // 1-based index for parent todos
        title: todo.title,
        description: todo.description,
        priority: todo.priority,
        status: todo.status,
        completed: todo.completed,
        dueDate: todo.dueDate,
        reminderDate: todo.reminderDate,
        assignedTo: todo.assignedTo,
        subtasks: subtasks.map((sub: any) => {
          // Find the global index of this subtask in allTodos
          const globalIndex = allTodos.findIndex((t: any) => t.id === sub.id);
          return {
            id: sub.id,
            index: globalIndex + 1, // 1-based index for subtasks in global todos list
            title: sub.title,
            description: sub.description,
            priority: sub.priority,
            status: sub.status,
            completed: sub.completed,
            dueDate: sub.dueDate,
            reminderDate: sub.reminderDate,
            assignedTo: sub.assignedTo
          };
        })
      };
    });

    const completed = parentTodos.filter((t: any) => t.completed).length;
    const pending = parentTodos.length - completed;
    const totalSubtasks = allTodos.filter((t: any) => t.parentTodoId).length;

    return this.buildDataResponse(
      `✅ Todos in ${resolution.project.name} (${pending} pending, ${completed} completed${totalSubtasks > 0 ? `, ${totalSubtasks} subtasks` : ''})`,
      resolution.project,
      'view_todos',
      {
        todos: todosWithSubtasks,
        hierarchical: true
      }
    );
  }

  /**
   * Handle /view devlog command
   */

  async handleCompleteTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const todoIdentifier = parsed.args.join(' ').trim();
    const todo = this.findTodo(project.todos, todoIdentifier);

    if (!todo) {
      return {
        type: ResponseType.ERROR,
        message: `Todo not found: "${todoIdentifier}"`,
        suggestions: ['/view todos', '/help complete']
      };
    }

    todo.completed = true;
    todo.status = 'completed';
    await project.save();

    // Track analytics
    try {
      await AnalyticsService.trackEvent(this.userId, 'feature_used', {
        feature: 'todo_complete_terminal',
        category: 'engagement',
        projectId: project._id.toString(),
        projectName: project.name,
        metadata: {
          completed: true
        }
      });
    } catch (error) {
      console.error('Failed to track terminal todo complete:', error);
    }

    return this.buildSuccessResponse(
      `✅ Marked todo as completed: "${todo.title}"`,
      project,
      'complete_todo'
    );
  }

  /**
   * Handle /assign command - Assign todo to user
   */

  async handleAssignTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    if (parsed.args.length < 2) {
      return {
        type: ResponseType.ERROR,
        message: 'Usage: /assign [todo] [user email]',
        suggestions: ['/help assign']
      };
    }

    // Last arg is the email, everything before is the todo identifier
    const userEmail = parsed.args[parsed.args.length - 1];
    const todoIdentifier = parsed.args.slice(0, -1).join(' ').trim();

    const todo = this.findTodo(project.todos, todoIdentifier);

    if (!todo) {
      return {
        type: ResponseType.ERROR,
        message: `Todo not found: "${todoIdentifier}"`,
        suggestions: ['/view todos', '/help assign']
      };
    }

    // Find user in project members
    const { User } = await import('../../../models/User');
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return {
        type: ResponseType.ERROR,
        message: `User not found: ${userEmail}`,
        suggestions: ['/view team']
      };
    }

    // Check if user is the owner or a team member
    const isOwner = project.ownerId?.toString() === user._id.toString() ||
                    project.userId?.toString() === user._id.toString();

    const TeamMember = (await import('../../../models/TeamMember')).default;
    const teamMember = await TeamMember.findOne({
      projectId: project._id,
      userId: user._id
    });

    if (!teamMember && !isOwner) {
      return {
        type: ResponseType.ERROR,
        message: `${userEmail} is not a member of this project`,
        suggestions: ['/invite ' + userEmail]
      };
    }

    todo.assignedTo = user._id;
    await project.save();

    return this.buildSuccessResponse(
      `✅ Assigned todo "${todo.title}" to ${user.firstName} ${user.lastName}`,
      project,
      'assign_todo'
    );
  }

  /**
   * Handle /push command - Push completed todo to devlog
   */

  async handlePushTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const todoIdentifier = parsed.args.join(' ').trim();
    if (!todoIdentifier) {
      return {
        type: ResponseType.ERROR,
        message: 'Please specify a todo to push to devlog',
        suggestions: ['/view todos', '/help push']
      };
    }

    // Filter out subtasks - only allow pushing parent todos via numeric index
    const todo = this.findTodo(
      project.todos.filter((t: any) => !t.parentTodoId),
      todoIdentifier
    );
    if (!todo) {
      return {
        type: ResponseType.ERROR,
        message: `Todo not found: "${todoIdentifier}"`,
        suggestions: ['/view todos', '/help push']
      };
    }

    // Create devlog entry from todo - preserve todo's description
    let todoDescription = typeof todo.description === 'object'
      ? JSON.stringify(todo.description, null, 2)
      : (todo.description || '');

    // Find and aggregate subtask descriptions
    const subtasks = project.todos.filter((t: any) => t.parentTodoId === todo.id);
    if (subtasks.length > 0) {
      const subtaskDescriptions = subtasks
        .map((st: any) => {
          const stDesc = typeof st.description === 'object'
            ? JSON.stringify(st.description, null, 2)
            : (st.description || '');
          return `- ${st.title}${stDesc ? ': ' + stDesc : ''}`;
        })
        .join('\n');

      if (todoDescription) {
        todoDescription += '\n\nSubtasks:\n' + subtaskDescriptions;
      } else {
        todoDescription = 'Subtasks:\n' + subtaskDescriptions;
      }
    }

    const devlogEntry = {
      id: uuidv4(),
      title: todo.title,
      description: todoDescription,
      date: new Date()
    };

    project.devLog.push(devlogEntry);

    // Remove todo and all its subtasks from list
    project.todos = project.todos.filter((t: any) =>
      t.id !== todo.id && t.parentTodoId !== todo.id
    );

    await project.save();

    return this.buildSuccessResponse(
      `✅ Pushed todo to devlog and removed: "${todo.title}"`,
      project,
      'push_todo',
      {
        devlogEntry: {
          title: devlogEntry.title,
          description: devlogEntry.description,
          date: devlogEntry.date
        }
      }
    );
  }

  /**
   * Handle /add subtask command - Add subtask to a todo
   */

  async handleAddSubtask(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags) - this is an error
    if (parsed.args.length > 0 && getFlagCount(parsed.flags) === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add subtask - Interactive wizard',
          '/add subtask --parent="parent todo" --title="subtask title"',
          '/add subtask --parent="implement feature" --title="write tests" --priority=high',
          '/help add subtask'
        ]
      };
    }

    // Get flags
    const parentIdentifier = getFlag(parsed.flags, 'parent') as string;
    const title = getFlag(parsed.flags, 'title') as string;
    const content = getFlag(parsed.flags, 'content') as string;
    const priority = getFlag(parsed.flags, 'priority') as string;
    const status = getFlag(parsed.flags, 'status') as string;
    const due = getFlag(parsed.flags, 'due') as string;

    // No args and no flags - pull up wizard
    if (parsed.args.length === 0 && getFlagCount(parsed.flags) === 0) {
      // Get all parent todos (non-subtask todos)
      const parentTodos = project.todos.filter((t: any) => !t.parentTodoId);

      if (parentTodos.length === 0) {
        return {
          type: ResponseType.ERROR,
          message: 'No parent todos found. Add a todo first.',
          suggestions: ['/add todo', '/view todos']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✨ Add New Subtask`,
        data: {
          wizardType: 'add_subtask',
          steps: [
            {
              id: 'parent',
              label: 'Parent Todo',
              type: 'select',
              options: parentTodos.map((t: any) => ({ value: t.id, label: t.title })),
              required: true,
              placeholder: 'Select parent todo'
            },
            {
              id: 'title',
              label: 'Subtask Title',
              type: 'text',
              required: true,
              placeholder: 'Enter subtask title'
            },
            {
              id: 'content',
              label: 'Description',
              type: 'textarea',
              required: false,
              placeholder: 'Optional description'
            },
            {
              id: 'priority',
              label: 'Priority',
              type: 'select',
              options: ['low', 'medium', 'high'],
              required: true,
              value: 'medium'
            },
            {
              id: 'status',
              label: 'Status',
              type: 'select',
              options: ['not_started', 'in_progress', 'completed', 'blocked'],
              required: true,
              value: 'not_started'
            },
            {
              id: 'due',
              label: 'Due Date',
              type: 'text',
              required: false,
              placeholder: 'MM-DD-YYYY 8:00PM or MM-DD 21:00 (optional)'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_subtask'
        }
      };
    }

    // Validate required flags
    if (!parentIdentifier || !title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --parent and --title flags are required',
        suggestions: [
          '/add subtask - Use wizard instead',
          '/add subtask --parent="parent todo" --title="subtask title"',
          '/help add subtask'
        ]
      };
    }

    // Find parent todo using the parent identifier (could be ID or title)
    const parentTodo = this.findTodo(project.todos.filter((t: any) => !t.parentTodoId), parentIdentifier);

    if (!parentTodo) {
      return {
        type: ResponseType.ERROR,
        message: `Parent todo not found: "${parentIdentifier}"`,
        suggestions: ['/view todos', '/help add subtask']
      };
    }

    // Validate title
    const validation = validateTodoText(title);
    if (!validation.isValid) {
      return {
        type: ResponseType.ERROR,
        message: validation.error || 'Invalid subtask title',
        suggestions: ['/help add subtask']
      };
    }

    // Parse due date if provided
    let dueDate: Date | undefined;
    if (due) {
      const parsedDue = parseDueDate(due);
      if (!parsedDue.isValid) {
        return {
          type: ResponseType.ERROR,
          message: `❌ ${parsedDue.error}`,
          suggestions: ['/help add subtask']
        };
      }
      dueDate = parsedDue.date;
    }

    const newSubtask = {
      id: uuidv4(),
      title: validation.sanitized!,
      description: content || '',
      priority: (priority as any) || parentTodo.priority || 'medium' as const,
      completed: false,
      status: (status as any) || 'not_started' as const,
      parentTodoId: parentTodo.id,
      dueDate,
      createdAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    project.todos.push(newSubtask);
    await project.save();

    return this.buildSuccessResponse(
      `✅ Added subtask "${validation.sanitized}" to "${parentTodo.title}"`,
      project,
      'add_subtask',
      {
        parentTodo: parentTodo.title,
        subtask: validation.sanitized
      }
    );
  }

  /**
   * Handle /view subtasks command - View subtasks for a todo
   */

  async handleViewSubtasks(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const todoIdentifier = parsed.args.join(' ').trim();
    const parentTodo = this.findTodo(
      resolution.project.todos.filter((t: any) => !t.parentTodoId),
      todoIdentifier
    );

    if (!parentTodo) {
      return {
        type: ResponseType.ERROR,
        message: `Todo not found: "${todoIdentifier}"`,
        suggestions: ['/view todos', '/help view subtasks']
      };
    }

    const subtasks = resolution.project.todos.filter((t: any) => t.parentTodoId === parentTodo.id);

    if (subtasks.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `No subtasks found for "${parentTodo.title}"`,
        suggestions: [`/add subtask "${parentTodo.title}" "subtask text"`]
      };
    }

    const completed = subtasks.filter((s: any) => s.completed).length;
    const pending = subtasks.length - completed;

    return this.buildDataResponse(
      `📋 Subtasks for "${parentTodo.title}" (${pending} pending, ${completed} completed)`,
      resolution.project,
      'view_subtasks',
      {
        parentTodo: {
          id: parentTodo.id,
          title: parentTodo.title
        },
        subtasks: subtasks.map((subtask: any) => ({
          id: subtask.id,
          title: subtask.title,
          description: subtask.description,
          priority: subtask.priority,
          status: subtask.status,
          completed: subtask.completed,
          dueDate: subtask.dueDate,
          reminderDate: subtask.reminderDate,
          assignedTo: subtask.assignedTo
        }))
      }
    );
  }

  /**
   * Handle /edit todo command - Edit an existing todo
   */

  async handleEditTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // If no args, show selector wizard
    if (parsed.args.length === 0) {
      const todos = project.todos || [];

      if (todos.length === 0) {
        return {
          type: ResponseType.INFO,
          message: `📋 No todos found in ${project.name}`,
          suggestions: [`/add todo`, `/add todo "Task description"`]
        };
      }

      // Build todo options with parent context for subtasks
      const todoOptions = todos.map((todo: any) => {
        let label = `${todo.completed ? '✓' : '○'} `;

        // If it's a subtask, show parent title
        if (todo.parentTodoId) {
          const parent = todos.find((t: any) => t.id === todo.parentTodoId);
          if (parent) {
            label += `subtask [${parent.title}] - ${todo.title}`;
          } else {
            label += `subtask - ${todo.title}`;
          }
        } else {
          label += todo.title;
        }

        if (todo.priority) {
          label += ` [${todo.priority}]`;
        }

        return {
          value: todo.id,
          label
        };
      });

      return {
        type: ResponseType.PROMPT,
        message: `✏️  Select Todo to Edit`,
        data: {
          wizardType: 'edit_todo_selector',
          steps: [
            {
              id: 'todoId',
              label: 'Select Todo',
              type: 'select',
              required: true,
              options: todoOptions
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_todo_selector'
        }
      };
    }

    const identifier = parsed.args[0];
    const todo = this.findTodo(project.todos, identifier);

    if (!todo) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Todo not found: "${identifier}"`,
        suggestions: [
          '/view todos - See all todos with #IDs',
          '/help edit todo'
        ]
      };
    }

    // Check for direct flags (new syntax)
    const title = getFlag(parsed.flags, 'title') as string;
    const content = getFlag(parsed.flags, 'content') as string;
    const priority = getFlag(parsed.flags, 'priority') as string;
    const status = getFlag(parsed.flags, 'status') as string;
    const due = getFlag(parsed.flags, 'due') as string;

    // If any flags are provided, update those fields
    if (title || content || priority || status || due) {
      let updated = false;

      if (title) {
        const validation = validateTodoText(title);
        if (!validation.isValid) {
          return {
            type: ResponseType.ERROR,
            message: validation.error || 'Invalid todo title',
            suggestions: ['/help edit todo']
          };
        }
        todo.title = validation.sanitized!;
        updated = true;
      }

      if (content) {
        todo.description = sanitizeText(content);
        updated = true;
      }

      if (priority) {
        if (!['low', 'medium', 'high'].includes(priority.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: 'Priority must be: low, medium, or high',
            suggestions: ['/help edit todo']
          };
        }
        todo.priority = priority.toLowerCase() as 'low' | 'medium' | 'high';
        updated = true;
      }

      if (status) {
        const validStatuses = ['not_started', 'in_progress', 'completed', 'blocked'];
        if (!validStatuses.includes(status.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: `Status must be one of: ${validStatuses.join(', ')}`,
            suggestions: ['/help edit todo']
          };
        }
        todo.status = status.toLowerCase() as any;
        updated = true;
      }

      if (due) {
        const dueDateParse = parseDueDate(due);
        if (!dueDateParse.isValid) {
          return {
            type: ResponseType.ERROR,
            message: `❌ ${dueDateParse.error}`,
            suggestions: [
              '/edit todo 1 --due="12-25-2025 8:00PM"',
              '/edit todo 1 --due="3-15 9:30AM" (defaults to current year)',
              '/edit todo 1 --due="12-31 21:00" (24-hour format)',
              '/help edit todo'
            ]
          };
        }
        todo.dueDate = dueDateParse.date;
        updated = true;
      }

      if (updated) {
        try {
          await project.save();
        } catch (saveError) {
          console.error('[EDIT TODO] Save failed:', saveError);
          return {
            type: ResponseType.ERROR,
            message: `Failed to save todo: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
            suggestions: ['/help edit todo']
          };
        }

        return this.buildSuccessResponse(
          `✅ Updated todo: "${todo.title}"`,
          project,
          'edit_todo'
        );
      }
    }

    // No flags - return interactive wizard
    // Format dueDate for display if it exists
    let dueDateStr = '';
    if (todo.dueDate) {
      const month = todo.dueDate.getMonth() + 1;
      const day = todo.dueDate.getDate();
      const year = todo.dueDate.getFullYear();
      const hasTime = todo.dueDate.getHours() !== 0 || todo.dueDate.getMinutes() !== 0;

      dueDateStr = `${month}-${day}-${year}`;
      if (hasTime) {
        const timeStr = formatTime12Hour(todo.dueDate.getHours(), todo.dueDate.getMinutes());
        dueDateStr += ` ${timeStr}`;
      }
    }

    // Build steps array - only include subtasks if this is NOT a subtask itself
    const steps: any[] = [
      {
        id: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        value: todo.title
      },
      {
        id: 'content',
        label: 'Content',
        type: 'textarea',
        required: false,
        value: todo.description || ''
      },
      {
        id: 'priority',
        label: 'Priority',
        type: 'select',
        options: ['low', 'medium', 'high'],
        required: true,
        value: todo.priority
      },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: ['not_started', 'in_progress', 'completed', 'blocked'],
        required: true,
        value: todo.status
      },
      {
        id: 'due',
        label: 'Due Date',
        type: 'text',
        required: false,
        value: dueDateStr,
        placeholder: 'MM-DD-YYYY 8:00PM or MM-DD 21:00 (optional)'
      }
    ];

    // Only add subtasks field if this is a parent todo (not a subtask itself)
    if (!todo.parentTodoId) {
      const subtasks = project.todos.filter((t: any) => t.parentTodoId === todo.id);
      steps.push({
        id: 'subtasks',
        label: 'Subtasks',
        type: 'subtasks',
        required: false,
        value: subtasks.map((subtask: any) => ({
          id: subtask.id,
          title: subtask.title,
          description: subtask.description || '',
          priority: subtask.priority,
          status: subtask.status,
          completed: subtask.completed,
          dueDate: subtask.dueDate
        }))
      });
    }

    return {
      type: ResponseType.PROMPT,
      message: `✏️ Edit ${todo.parentTodoId ? 'Subtask' : 'Todo'}: "${todo.title}"`,
      data: {
        wizardType: 'edit_todo',
        todoId: todo.id,
        currentValues: {
          title: todo.title,
          content: todo.description || '',
          priority: todo.priority,
          status: todo.status,
          due: dueDateStr
        },
        steps
      },
      metadata: {
        projectId: project._id.toString(),
        action: 'edit_todo'
      }
    };
  }

  /**
   * Handle /edit subtask command - Edit an existing subtask
   */

  async handleEditSubtask(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // No args provided - show selector wizard
    if (parsed.args.length === 0) {
      const subtasks = project.todos.filter((t: any) => t.parentTodoId);

      if (subtasks.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No subtasks to edit',
          suggestions: ['/add subtask']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✏️  Select Subtask to Edit`,
        data: {
          wizardType: 'edit_subtask_selector',
          steps: [
            {
              id: 'subtaskId',
              label: 'Select Subtask',
              type: 'select',
              options: subtasks.map((s: any) => {
                const parent = project.todos.find((t: any) => t.id === s.parentTodoId);
                return {
                  value: s.id,
                  label: `${s.title} (parent: ${parent?.title || 'unknown'})`
                };
              }),
              required: true,
              placeholder: 'Select subtask to edit'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_subtask_selector'
        }
      };
    }

    // Need both parent index and subtask index
    if (parsed.args.length < 2) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid syntax. Usage: /edit subtask <parent_index> <subtask_index>`,
        suggestions: [
          '/edit subtask 1 2 - Edit 2nd subtask of todo #1',
          '/edit subtask 1 2 --title="Updated title" - Direct edit',
          '/help edit subtask'
        ]
      };
    }

    const parentIndex = parseInt(parsed.args[0]);
    const subtaskIndex = parseInt(parsed.args[1]);

    // Validate parent index
    if (isNaN(parentIndex) || parentIndex < 1) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid parent todo index: "${parsed.args[0]}"`,
        suggestions: [
          '/view todos - See all todos with indices',
          '/edit subtask 1 2 - Example syntax',
          '/help edit subtask'
        ]
      };
    }

    // Get all parent todos (excluding subtasks)
    const parentTodos = project.todos.filter((t: any) => !t.parentTodoId);

    if (parentIndex > parentTodos.length) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Parent todo #${parentIndex} not found (only ${parentTodos.length} parent todos exist)`,
        suggestions: ['/view todos', '/help edit subtask']
      };
    }

    const parentTodo = parentTodos[parentIndex - 1];

    // Get subtasks for this parent
    const parentSubtasks = project.todos.filter((t: any) => t.parentTodoId === parentTodo.id);

    if (parentSubtasks.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Parent todo #${parentIndex} "${parentTodo.title}" has no subtasks`,
        suggestions: [
          `/add subtask "${parentTodo.title}" "subtask text"`,
          '/view todos',
          '/help edit subtask'
        ]
      };
    }

    // Validate subtask index
    if (isNaN(subtaskIndex) || subtaskIndex < 1) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid subtask index: "${parsed.args[1]}"`,
        suggestions: [
          `/view todos - Parent #${parentIndex} has ${parentSubtasks.length} subtask(s)`,
          '/edit subtask 1 2 - Example syntax',
          '/help edit subtask'
        ]
      };
    }

    if (subtaskIndex > parentSubtasks.length) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Subtask #${subtaskIndex} not found (parent #${parentIndex} only has ${parentSubtasks.length} subtask(s))`,
        suggestions: [
          '/view todos',
          '/help edit subtask'
        ]
      };
    }

    const subtask = parentSubtasks[subtaskIndex - 1];

    // Check for direct flags (new syntax)
    const title = getFlag(parsed.flags, 'title') as string;
    const content = getFlag(parsed.flags, 'content') as string;
    const priority = getFlag(parsed.flags, 'priority') as string;
    const status = getFlag(parsed.flags, 'status') as string;
    const due = getFlag(parsed.flags, 'due') as string;

    // If any flags are provided, update those fields
    if (title || content || priority || status || due) {
      let updated = false;

      if (title) {
        const validation = validateTodoText(title);
        if (!validation.isValid) {
          return {
            type: ResponseType.ERROR,
            message: validation.error || 'Invalid subtask title',
            suggestions: ['/help edit subtask']
          };
        }
        subtask.title = validation.sanitized!;
        updated = true;
      }

      if (content) {
        subtask.description = sanitizeText(content);
        updated = true;
      }

      if (priority) {
        if (!['low', 'medium', 'high'].includes(priority.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: 'Priority must be: low, medium, or high',
            suggestions: ['/help edit subtask']
          };
        }
        subtask.priority = priority.toLowerCase() as 'low' | 'medium' | 'high';
        updated = true;
      }

      if (status) {
        const validStatuses = ['not_started', 'in_progress', 'completed', 'blocked'];
        if (!validStatuses.includes(status.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: `Status must be one of: ${validStatuses.join(', ')}`,
            suggestions: ['/help edit subtask']
          };
        }
        subtask.status = status.toLowerCase() as any;
        updated = true;
      }

      if (due) {
        const dueDateParse = parseDueDate(due);
        if (!dueDateParse.isValid) {
          return {
            type: ResponseType.ERROR,
            message: `❌ ${dueDateParse.error}`,
            suggestions: [
              '/edit subtask 1 --due="12-25-2025 8:00PM"',
              '/edit subtask 1 --due="3-15 9:30AM" (defaults to current year)',
              '/edit subtask 1 --due="12-31 21:00" (24-hour format)',
              '/help edit subtask'
            ]
          };
        }
        subtask.dueDate = dueDateParse.date;
        updated = true;
      }

      if (updated) {
        try {
          await project.save();
        } catch (saveError) {
          console.error('[EDIT SUBTASK] Save failed:', saveError);
          return {
            type: ResponseType.ERROR,
            message: `Failed to save subtask: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
            suggestions: ['/help edit subtask']
          };
        }

        return this.buildSuccessResponse(
          `✅ Updated subtask: "${subtask.title}"`,
          project,
          'edit_subtask'
        );
      }
    }

    // No flags - return interactive wizard
    // Format dueDate for display if it exists
    let dueDateStr = '';
    if (subtask.dueDate) {
      const month = subtask.dueDate.getMonth() + 1;
      const day = subtask.dueDate.getDate();
      const year = subtask.dueDate.getFullYear();
      const hasTime = subtask.dueDate.getHours() !== 0 || subtask.dueDate.getMinutes() !== 0;

      dueDateStr = `${month}-${day}-${year}`;
      if (hasTime) {
        const timeStr = formatTime12Hour(subtask.dueDate.getHours(), subtask.dueDate.getMinutes());
        dueDateStr += ` ${timeStr}`;
      }
    }

    return {
      type: ResponseType.PROMPT,
      message: `✏️ Edit Subtask: "${subtask.title}"`,
      data: {
        wizardType: 'edit_subtask',
        subtaskId: subtask.id,
        parentTodoId: subtask.parentTodoId,
        currentValues: {
          title: subtask.title,
          content: subtask.description || '',
          priority: subtask.priority,
          status: subtask.status,
          due: dueDateStr
        },
        steps: [
          {
            id: 'title',
            label: 'Title',
            type: 'text',
            required: true,
            value: subtask.title
          },
          {
            id: 'content',
            label: 'Content',
            type: 'textarea',
            required: false,
            value: subtask.description || ''
          },
          {
            id: 'priority',
            label: 'Priority',
            type: 'select',
            options: ['low', 'medium', 'high'],
            required: true,
            value: subtask.priority
          },
          {
            id: 'status',
            label: 'Status',
            type: 'select',
            options: ['not_started', 'in_progress', 'completed', 'blocked'],
            required: true,
            value: subtask.status
          },
          {
            id: 'due',
            label: 'Due Date',
            type: 'text',
            required: false,
            value: dueDateStr,
            placeholder: 'MM-DD-YYYY 8:00PM or MM-DD 21:00 (optional)'
          }
        ]
      },
      metadata: {
        projectId: project._id.toString(),
        action: 'edit_subtask'
      }
    };
  }

  /**
   * Handle /edit note command - Edit an existing note
   */

  async handleDeleteTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const todoIdentifier = parsed.args.join(' ').trim();

    // No identifier provided - show selector wizard
    if (!todoIdentifier) {
      const todos = project.todos.filter((t: any) => !t.parentTodoId); // Don't include subtasks in selector

      if (todos.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No todos to delete',
          suggestions: ['/add todo']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🗑️  Select Todo to Delete`,
        data: {
          wizardType: 'delete_todo_selector',
          steps: [
            {
              id: 'todoId',
              label: 'Select Todo',
              type: 'select',
              options: todos.map((t: any) => ({
                value: t.id,
                label: `${t.title}${t.completed ? ' ✓' : ''}`
              })),
              required: true,
              placeholder: 'Select todo to delete'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_todo_selector'
        }
      };
    }

    // Filter out subtasks - only allow deleting parent todos via numeric index
    const todo = this.findTodo(
      project.todos.filter((t: any) => !t.parentTodoId),
      todoIdentifier
    );

    if (!todo) {
      return {
        type: ResponseType.ERROR,
        message: `Todo not found: "${todoIdentifier}"`,
        suggestions: ['/view todos', '/delete subtask', '/help delete todo']
      };
    }

    // Check for confirmation flag
    const hasConfirmation = hasFlag(parsed.flags, 'confirm') || hasFlag(parsed.flags, 'yes') || hasFlag(parsed.flags, 'y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_todo_confirm',
          confirmationData: {
            itemTitle: todo.title,
            itemType: 'todo',
            command: `/delete todo "${todo.title}" --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete the todo "${todo.title}"?`,
              type: 'confirmation',
              required: true
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_todo_confirm'
        }
      };
    }

    // Delete the todo and any subtasks
    const todoTitle = todo.title;
    project.todos = project.todos.filter((t: any) =>
      t.id !== todo.id && t.parentTodoId !== todo.id
    );
    await project.save();

    // Track analytics
    try {
      await AnalyticsService.trackEvent(this.userId, 'feature_used', {
        feature: 'todo_delete_terminal',
        category: 'engagement',
        projectId: project._id.toString(),
        projectName: project.name
      });
    } catch (error) {
      console.error('Failed to track terminal todo delete:', error);
    }

    return this.buildSuccessResponse(
      `🗑️  Deleted todo: "${todoTitle}"`,
      project,
      'delete_todo'
    );
  }

  /**
   * Handle /delete note command - Delete a note with confirmation
   */

  async handleDeleteSubtask(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // No args provided - show selector wizard
    if (parsed.args.length === 0) {
      const subtasks = project.todos.filter((t: any) => t.parentTodoId);

      if (subtasks.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No subtasks to delete',
          suggestions: ['/add subtask']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🗑️  Select Subtask to Delete`,
        data: {
          wizardType: 'delete_subtask_selector',
          steps: [
            {
              id: 'subtaskId',
              label: 'Select Subtask',
              type: 'select',
              options: subtasks.map((s: any) => {
                const parent = project.todos.find((t: any) => t.id === s.parentTodoId);
                return {
                  value: s.id,
                  label: `${s.title} (parent: ${parent?.title || 'unknown'})`
                };
              }),
              required: true,
              placeholder: 'Select subtask to delete'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_subtask_selector'
        }
      };
    }

    // Need both parent index and subtask index
    if (parsed.args.length < 2) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid syntax. Usage: /delete subtask <parent_index> <subtask_index>`,
        suggestions: [
          '/delete subtask 1 2 - Delete 2nd subtask of todo #1',
          '/delete subtask 1 2 --confirm - Skip confirmation',
          '/help delete subtask'
        ]
      };
    }

    const parentIndex = parseInt(parsed.args[0]);
    const subtaskIndex = parseInt(parsed.args[1]);

    // Validate parent index
    if (isNaN(parentIndex) || parentIndex < 1) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid parent todo index: "${parsed.args[0]}"`,
        suggestions: [
          '/view todos - See all todos with indices',
          '/delete subtask 1 2 - Example syntax',
          '/help delete subtask'
        ]
      };
    }

    // Get all parent todos (excluding subtasks)
    const parentTodos = project.todos.filter((t: any) => !t.parentTodoId);

    if (parentIndex > parentTodos.length) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Parent todo #${parentIndex} not found (only ${parentTodos.length} parent todos exist)`,
        suggestions: ['/view todos', '/help delete subtask']
      };
    }

    const parentTodo = parentTodos[parentIndex - 1];

    // Get subtasks for this parent
    const parentSubtasks = project.todos.filter((t: any) => t.parentTodoId === parentTodo.id);

    if (parentSubtasks.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Parent todo #${parentIndex} "${parentTodo.title}" has no subtasks`,
        suggestions: [
          '/view todos',
          '/help delete subtask'
        ]
      };
    }

    // Validate subtask index
    if (isNaN(subtaskIndex) || subtaskIndex < 1) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid subtask index: "${parsed.args[1]}"`,
        suggestions: [
          `/view todos - Parent #${parentIndex} has ${parentSubtasks.length} subtask(s)`,
          '/delete subtask 1 2 - Example syntax',
          '/help delete subtask'
        ]
      };
    }

    if (subtaskIndex > parentSubtasks.length) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Subtask #${subtaskIndex} not found (parent #${parentIndex} only has ${parentSubtasks.length} subtask(s))`,
        suggestions: [
          '/view todos',
          '/help delete subtask'
        ]
      };
    }

    const subtask = parentSubtasks[subtaskIndex - 1];

    const hasConfirmation = hasFlag(parsed.flags, 'confirm') || hasFlag(parsed.flags, 'yes') || hasFlag(parsed.flags, 'y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_subtask_confirm',
          confirmationData: {
            itemTitle: subtask.title,
            itemType: 'subtask',
            command: `/delete subtask ${parentIndex} ${subtaskIndex} --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete the subtask "${subtask.title}"?`,
              type: 'confirmation',
              required: true
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_subtask_confirm'
        }
      };
    }

    const subtaskTitle = subtask.title;
    project.todos = project.todos.filter((t: any) => t.id !== subtask.id);
    await project.save();

    return this.buildSuccessResponse(
      `🗑️  Deleted subtask: "${subtaskTitle}"`,
      project,
      'delete_subtask'
    );
  }

  /**
   * Find a note by UUID, index, or title
   */
  private findNote(notes: any[], identifier: string): any | null {
    // Try to find by UUID (exact match) - PRIORITY 1
    const byUuid = notes.find((note: any) => note.id === identifier);
    if (byUuid) {
      return byUuid;
    }

    // Try to find by index (1-based) - PRIORITY 2
    const index = parseInt(identifier);
    if (!isNaN(index) && index > 0 && index <= notes.length) {
      return notes[index - 1];
    }

    // Try to find by partial title match (case insensitive) - PRIORITY 3
    const identifierLower = identifier.toLowerCase();
    const byTitle = notes.find((note: any) =>
      note.title.toLowerCase().includes(identifierLower)
    );
    if (byTitle) {
    } else {
    }
    return byTitle || null;
  }

  /**
   * Find a dev log entry by UUID, index, or content
   */
  private findDevLogEntry(devLog: any[], identifier: string): any | null {
    // Try to find by UUID (exact match) - PRIORITY 1
    const byUuid = devLog.find((entry: any) => entry.id === identifier);
    if (byUuid) {
      return byUuid;
    }

    // Try to find by index (1-based) - PRIORITY 2
    const index = parseInt(identifier);
    if (!isNaN(index) && index > 0 && index <= devLog.length) {
      return devLog[index - 1];
    }

    // Try to find by partial description match (case insensitive) - PRIORITY 3
    const identifierLower = identifier.toLowerCase();
    const byDescription = devLog.find((entry: any) =>
      entry.description && entry.description.toLowerCase().includes(identifierLower)
    );
    if (byDescription) {
    } else {
    }
    return byDescription || null;
  }

  /**
   * Find a component by ID, UUID, index, or title
   */
  private findComponent(components: any[], identifier: string): any | null {
    // Try to find by UUID (exact match)
    const byUuid = components.find((component: any) => component.id === identifier);
    if (byUuid) return byUuid;

    // Try to find by numeric index (1-based)
    const index = parseInt(identifier);
    if (!isNaN(index) && index > 0 && index <= components.length) {
      return components[index - 1];
    }

    // Try to find by partial title match (case insensitive)
    const identifierLower = identifier.toLowerCase();
    return components.find((component: any) =>
      component.title.toLowerCase().includes(identifierLower)
    ) || null;
  }

  /**
   * Find a todo by UUID, index, or text
   */
  private findTodo(todos: any[], identifier: string): any | null {
    // Try to find by UUID (exact match) - PRIORITY 1
    const byUuid = todos.find((todo: any) => todo.id === identifier);
    if (byUuid) {
      return byUuid;
    }

    // Try to find by index (1-based) - PRIORITY 2
    const index = parseInt(identifier);
    if (!isNaN(index) && index > 0 && index <= todos.length) {
      return todos[index - 1];
    }

    // Try to find by partial title match (case insensitive) - PRIORITY 3
    const identifierLower = identifier.toLowerCase();
    const byTitle = todos.find((todo: any) =>
      todo.title.toLowerCase().includes(identifierLower)
    );
    if (byTitle) {
    } else {
    }
    return byTitle || null;
  }

  /**
   * Handle /add relationship command - Add a relationship between components
   */
}
