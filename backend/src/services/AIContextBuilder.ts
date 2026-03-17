import { Project } from '../models/Project';
import { User as UserModel } from '../models/User';
import { logError } from '../config/logger';
import type { ContextEntity } from './AIClassifier';

const SECRET_PATTERN = /api[_-]?key|password|secret|token/i;

const DEFAULT_LIMITS = { maxTodos: 25, maxNotes: 15, maxDevLogs: 10, maxFeatures: 15 };

/**
 * Builds ambient context from MongoDB for the AI system prompt.
 * Includes # indices so the AI can reference items in commands.
 * Strips lines that look like secrets.
 */
export class AIContextBuilder {
  /** Full context (all sections). Used when no entity filter is available. */
  static async build(userId: string, projectId?: string): Promise<string> {
    return this._buildInternal(userId, projectId, null);
  }

  /**
   * Selective context — only includes sections matching the entity filter.
   * Always includes project name + description (negligible cost).
   * Empty set = all sections (safe fallback).
   */
  static async buildSelective(userId: string, projectId: string | undefined, entities: Set<ContextEntity>): Promise<string> {
    if (entities.size === 0) return this.build(userId, projectId);
    return this._buildInternal(userId, projectId, entities);
  }

  /** Shared builder. filter=null means include all sections. */
  private static async _buildInternal(userId: string, projectId: string | undefined, filter: Set<ContextEntity> | null): Promise<string> {
    const sections: string[] = [];

    // Load user's AI context preferences (falls back to defaults via Mongoose)
    const userDoc = await UserModel.findById(userId).select('aiContext').lean();
    const limits = { ...DEFAULT_LIMITS, ...userDoc?.aiContext };

    const include = (entity: ContextEntity) => !filter || filter.has(entity);

    try {
      if (projectId) {
        const project = await Project.findOne({
          _id: projectId,
          $or: [{ userId }, { ownerId: userId }],
        })
          .select('name description tags todos notes devLog features techStack')
          .lean();

        if (project) {
          // Always include project name + description
          sections.push(`## Current Project: ${project.name}`);
          if (project.description) {
            sections.push(sanitize(project.description));
          }

          // Tags
          if (include('tags')) {
            const tags = (project as any).tags || [];
            if (tags.length > 0) {
              sections.push(`Tags: ${tags.join(', ')}`);
            }
          }

          // Todos with indices (AI needs # to reference them)
          if (include('todos')) {
            const rawTodos = project.todos || [];
            const allTodos = rawTodos.length > limits.maxTodos
              ? [
                  ...rawTodos.filter((t: any) => t.status === 'in_progress'),
                  ...rawTodos.filter((t: any) => t.priority === 'high' && t.status !== 'in_progress'),
                  ...rawTodos.filter((t: any) => t.status !== 'in_progress' && t.priority !== 'high'),
                ].slice(0, limits.maxTodos)
              : rawTodos;
            if (allTodos.length > 0) {
              const todoHeader = rawTodos.length > limits.maxTodos
                ? `\n### Todos (showing ${allTodos.length} of ${rawTodos.length}, prioritized)`
                : '\n### Todos (use # index for commands)';
              sections.push(todoHeader);
              allTodos.forEach((t: any, i: number) => {
                const status = t.status || (t.completed ? 'completed' : 'not_started');
                const priority = t.priority || 'medium';
                const due = t.dueDate ? ` due:${new Date(t.dueDate).toLocaleDateString()}` : '';
                sections.push(`#${i + 1} [${status}] (${priority}) "${sanitize(t.title)}"${due}`);

                // Include subtasks with sub-indices
                const subtasks = t.subtasks || [];
                subtasks.forEach((st: any, si: number) => {
                  const stStatus = st.status || (st.completed ? 'completed' : 'not_started');
                  sections.push(`  #${i + 1}.${si + 1} [${stStatus}] "${sanitize(st.title)}"`);
                });
              });
            }
          }

          // Notes with indices
          if (include('notes')) {
            const notes = (project as any).notes || [];
            if (notes.length > 0) {
              sections.push(`\n### Notes (${notes.length})`);
              notes.slice(0, limits.maxNotes).forEach((n: any, i: number) => {
                sections.push(`#${i + 1} "${sanitize(n.title)}"${n.content ? ' — ' + sanitize(n.content).slice(0, 80) : ''}`);
              });
            }
          }

          // Devlog with indices
          if (include('devlog')) {
            const devlog = (project.devLog || [])
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            if (devlog.length > 0) {
              sections.push(`\n### Dev Log (${devlog.length}, showing recent)`);
              devlog.slice(0, limits.maxDevLogs).forEach((d: any, i: number) => {
                const date = new Date(d.date).toLocaleDateString();
                sections.push(`#${i + 1} ${date}: "${sanitize((d as any).title || '')}"${(d as any).description ? ' — ' + sanitize((d as any).description).slice(0, 80) : ''}`);
              });
            }
          }

          // Features with indices
          if (include('features')) {
            const features = (project.features || []) as any[];
            if (features.length > 0) {
              sections.push(`\n### Features (${features.length})`);
              features.slice(0, limits.maxFeatures).forEach((c: any, i: number) => {
                sections.push(`#${i + 1} ${c.category}/${c.type}: "${sanitize(c.title)}"${c.group ? ` [${c.group}]` : ''}`);
              });
            }
          }

          // Tech stack
          if (include('stack')) {
            const stack = (project as any).techStack || [];
            if (stack.length > 0) {
              sections.push(`\n### Tech Stack`);
              stack.forEach((s: any) => {
                sections.push(`- ${s.name}${s.category ? ` (${s.category})` : ''}${s.version ? ` v${s.version}` : ''}`);
              });
            }
          }
        }
      }

      // If no project context, list user's available projects
      if (sections.length === 0) {
        const userProjects = await Project.find(
          { $or: [{ userId }, { ownerId: userId }] },
          'name description category'
        ).lean().limit(20);

        if (userProjects.length > 0) {
          sections.push('No project selected. The user can switch with /swap. Available projects:');
          userProjects.forEach((p: any) => {
            sections.push(`- "${p.name}"${p.category ? ` (${p.category})` : ''}${p.description ? ` — ${p.description.slice(0, 60)}` : ''}`);
          });
          sections.push('\nSuggest /swap "[project name]" if the user mentions a specific project.');
        } else {
          sections.push('No projects yet. Help the user create their first project with /add project.');
        }
      }
    } catch (error) {
      logError('AIContextBuilder failed', error as Error, { userId, projectId });
      sections.push('(Project context unavailable)');
    }

    return sections.join('\n');
  }

  /**
   * Full context with no truncation — all todos, notes, devlog, features.
   * Used by /context full for external AI exports.
   */
  static async buildFull(userId: string, projectId?: string, entity?: string): Promise<string> {
    const sections: string[] = [];
    const filter = entity && entity !== 'all' && entity !== 'full' ? entity : null;

    try {
      if (projectId) {
        const project = await Project.findOne({
          _id: projectId,
          $or: [{ userId }, { ownerId: userId }],
        })
          .select('name description tags todos notes devLog features techStack')
          .lean();

        if (project) {
          sections.push(`## Project: ${project.name}`);
          if (!filter && project.description) {
            sections.push(`> ${sanitize(project.description).split('\n').join('\n> ')}`);
          }

          if (!filter) {
            const tags = (project as any).tags || [];
            if (tags.length > 0) {
              sections.push(`**Tags:** ${tags.map((t: string) => `\`${t}\``).join(' ')}`);
            }
          }

          // ALL todos
          if (!filter || filter === 'todos') {
            const allTodos = project.todos || [];
            if (allTodos.length > 0) {
              const lines = [`### Todos (${allTodos.length})`, ''];
              allTodos.forEach((t: any, i: number) => {
                const check = t.completed ? '~~' : '';
                const status = t.status || (t.completed ? 'completed' : 'not_started');
                const priority = t.priority || 'medium';
                const due = t.dueDate ? ` · due ${new Date(t.dueDate).toLocaleDateString()}` : '';
                const desc = t.content ? `\n  ${t.content}` : '';
                lines.push(`- **#${i + 1}** ${check}${t.title}${check} · \`${status}\` · \`${priority}\`${due}${desc}`);

                const subtasks = t.subtasks || [];
                subtasks.forEach((st: any, si: number) => {
                  const stCheck = st.completed ? '~~' : '';
                  const stStatus = st.status || (st.completed ? 'completed' : 'not_started');
                  lines.push(`  - **#${i + 1}.${si + 1}** ${stCheck}${st.title}${stCheck} · \`${stStatus}\``);
                });
              });
              sections.push(lines.join('\n'));
            }
          }

          // ALL notes (no limit)
          if (!filter || filter === 'notes') {
            const notes = (project as any).notes || [];
            if (notes.length > 0) {
              const lines = [`### Notes (${notes.length})`, ''];
              notes.forEach((n: any, i: number) => {
                const preview = n.content ? ` — ${n.content.slice(0, 120)}${n.content.length > 120 ? '...' : ''}` : '';
                lines.push(`- **#${i + 1}** ${n.title}${preview}`);
              });
              sections.push(lines.join('\n'));
            }
          }

          // ALL devlog (no limit)
          if (!filter || filter === 'devlog') {
            const devlog = (project.devLog || [])
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            if (devlog.length > 0) {
              const lines = [`### Dev Log (${devlog.length})`, ''];
              devlog.forEach((d: any, i: number) => {
                const date = new Date(d.date).toLocaleDateString();
                const title = (d as any).title || 'Untitled';
                const desc = (d as any).description ? ` — ${(d as any).description.slice(0, 120)}${(d as any).description.length > 120 ? '...' : ''}` : '';
                lines.push(`- **#${i + 1}** \`${date}\` ${title}${desc}`);
              });
              sections.push(lines.join('\n'));
            }
          }

          // ALL features (no limit)
          if (!filter || filter === 'features') {
            const features = (project.features || []) as any[];
            if (features.length > 0) {
              const lines = [`### Features (${features.length})`, ''];
              features.forEach((c: any, i: number) => {
                const feature = c.group ? ` · \`${c.group}\`` : '';
                const desc = c.content ? ` — ${c.content.slice(0, 120)}${c.content.length > 120 ? '...' : ''}` : '';
                lines.push(`- **#${i + 1}** \`${c.category}/${c.type}\` ${c.title}${feature}${desc}`);
              });
              sections.push(lines.join('\n'));
            }
          }

          // Tech stack
          if (!filter || filter === 'stack') {
            const stack = (project as any).techStack || [];
            if (stack.length > 0) {
              const lines = [`### Tech Stack (${stack.length})`, ''];
              stack.forEach((s: any) => {
                const ver = s.version ? ` \`v${s.version}\`` : '';
                const cat = s.category ? ` · ${s.category}` : '';
                lines.push(`- **${s.name}**${ver}${cat}`);
              });
              sections.push(lines.join('\n'));
            }
          }
        }
      }

      if (sections.length === 0) {
        sections.push('No project currently selected. Use `/swap` to select a project first.');
      }
    } catch (error) {
      logError('AIContextBuilder.buildFull failed', error as Error, { userId, projectId });
      sections.push('(Project context unavailable)');
    }

    return sections.join('\n\n');
  }
}

/** Strip lines that look like they contain secrets */
function sanitize(text: string): string {
  return text
    .split('\n')
    .filter(line => !SECRET_PATTERN.test(line))
    .join('\n');
}
