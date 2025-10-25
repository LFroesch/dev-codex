import type { Project } from '../api/types';

export interface ExportOptions {
  basicInfo: boolean;
  description: boolean;
  tags: boolean;
  links: boolean;
  notes: boolean;
  todos: boolean;
  devLog: boolean;
  components: boolean;
  techStack: boolean;
  team: boolean;
  deploymentData: boolean;
  publicPageData: boolean;
  settings: boolean;
  timestamps: boolean;
}

export type ExportFormat = 'json' | 'prompt' | 'markdown';

export function generateExportData(selectedProject: Project, exportOptions: ExportOptions): any {
  const data: any = {};

  if (exportOptions.basicInfo) {
    data.basicInfo = {
      name: selectedProject.name,
      category: selectedProject.category,
      stagingEnvironment: selectedProject.stagingEnvironment,
      color: selectedProject.color,
    };
  }

  if (exportOptions.description && selectedProject.description) {
    data.description = selectedProject.description;
  }

  if (exportOptions.tags && selectedProject.tags) {
    data.tags = selectedProject.tags;
  }

  if (exportOptions.notes && selectedProject.notes?.length) {
    data.notes = selectedProject.notes;
  }

  if (exportOptions.todos && selectedProject.todos?.length) {
    data.todos = selectedProject.todos;
  }

  if (exportOptions.devLog && selectedProject.devLog?.length) {
    data.devLog = selectedProject.devLog;
  }

  if (exportOptions.components && selectedProject.components?.length) {
    data.components = selectedProject.components;
  }

  if (exportOptions.techStack && selectedProject.stack?.length) {
    data.techStack = selectedProject.stack;
  }

  if (exportOptions.team && selectedProject.team?.length) {
    data.team = selectedProject.team;
  }

  if (exportOptions.deploymentData && selectedProject.deploymentData) {
    data.deploymentData = selectedProject.deploymentData;
  }

  if (exportOptions.publicPageData && selectedProject.publicPageData) {
    data.publicPageData = selectedProject.publicPageData;
  }

  if (exportOptions.settings) {
    data.settings = {
      name: selectedProject.name,
      category: selectedProject.category,
      stagingEnvironment: selectedProject.stagingEnvironment,
      tags: selectedProject.tags || []
    };
  }

  if (exportOptions.timestamps) {
    data.timestamps = {
      createdAt: selectedProject.createdAt,
      updatedAt: selectedProject.updatedAt,
    };
  }

  return data;
}

export function generateJsonFormat(data: any): string {
  try {
    return JSON.stringify(data, (_, value) => {
      // Handle potential circular references and limit string length
      if (typeof value === 'string' && value.length > 10000) {
        return value.substring(0, 10000) + '... [truncated]';
      }
      return value;
    }, 2);
  } catch (error) {
    return `Error generating JSON: ${error}`;
  }
}

export function generatePromptFormat(data: any, selectedProject: Project, customAiRequest: string = ''): string {
  const requestSection = customAiRequest.trim() 
    ? customAiRequest 
    : `[Please replace this text with what you need help with regarding this project. For example:
- Code review or optimization suggestions
- Architecture advice
- Debugging assistance
- Feature implementation guidance
- Testing strategies
- Performance improvements
- Security considerations
- Deployment help
- Documentation improvements]`;

  let prompt = `# Project Context for AI Assistant for "${selectedProject.name}"

${selectedProject.description ? `**Description:** ${selectedProject.description}` : ''}

## 🤖 MY REQUEST:
${requestSection}

## 📋 PROJECT OVERVIEW`;

  if (data.basicInfo) {
    prompt += `
**Project Name:** ${data.basicInfo.name}`;
    if (data.basicInfo.category) prompt += `
**Category:** ${data.basicInfo.category}`;
    if (data.basicInfo.stagingEnvironment) prompt += `
**Current Environment:** ${data.basicInfo.stagingEnvironment}`;
    if (data.basicInfo.color) prompt += `
**Theme Color:** ${data.basicInfo.color}`;
  }

  if (data.tags) {
    prompt += `

**Tags/Keywords:** ${data.tags.length ? data.tags.join(' • ') : 'None'}`;
  }

  if (data.techStack?.length) {
    prompt += `

## ⚡ TECH STACK
**Stack:** ${data.techStack.map((item: any) => `${item.name} (${item.category})`).join(' • ')}`;
  }

  if (data.team?.length) {
    prompt += `

## 👥 TEAM MEMBERS
**Total Members:** ${data.team.length}

`;
    data.team.forEach((member: any) => {
      const name = member.userId ?
        `${member.userId.firstName || ''} ${member.userId.lastName || ''}`.trim() ||
        member.userId.email :
        'Unknown';
      const role = member.role || 'member';
      prompt += `• **${name}** - ${role}\n`;
    });
  }

  if (data.settings) {
    prompt += `

## ⚙️ PROJECT SETTINGS
**Category:** ${data.settings.category || 'General'}
**Environment:** ${data.settings.stagingEnvironment || 'Development'}
**Tags:** ${data.settings.tags?.length ? data.settings.tags.join(' • ') : 'None'}`;
  }

  if (data.todos?.length) {
    const completedTodos = data.todos.filter((todo: any) => todo?.completed);
    const pendingTodos = data.todos.filter((todo: any) => todo && !todo.completed);
    
    prompt += `

## ✅ CURRENT TASKS (${completedTodos.length} completed, ${pendingTodos.length} pending)`;
    
    if (pendingTodos.length > 0) {
      prompt += `

**🚧 Pending Tasks:**`;
      pendingTodos.forEach((todo: any) => {
        if (todo?.text) {
          prompt += `
• ${todo.title}${todo.description ? ` - ${todo.description}` : ''}`;
          if (todo.priority) prompt += ` [${todo.priority.toUpperCase()} PRIORITY]`;
        }
      });
    }

    if (completedTodos.length > 0) {
      prompt += `

**✅ Completed Tasks:**`;
      completedTodos.forEach((todo: any) => {
        if (todo?.text) {
          prompt += `
• ${todo.title}${todo.description ? ` - ${todo.description}` : ''}`;
        }
      });
    }
  }

  if (data.devLog?.length) {
    const recentEntries = data.devLog.slice(-5);
    prompt += `

## 📝 RECENT DEVELOPMENT LOG`;
    recentEntries.forEach((entry: any) => {
      const entryContent = entry.description?.length > 500 ? 
        entry.entry.substring(0, 500) + '...' : 
        entry.entry || '';
      prompt += `

**${entry.date}${entry.title ? ' - ' + entry.title : ''}**
${entryContent}`;
    });
    if (data.devLog.length > 5) {
      prompt += `

*(Showing ${recentEntries.length} most recent entries out of ${data.devLog.length} total)*`;
    }
  }

  if (data.notes?.length) {
    prompt += `

## 📋 PROJECT NOTES`;
    data.notes.forEach((note: any) => {
      const noteContent = note.content?.length > 1000 ? 
        note.content.substring(0, 1000) + '...' : 
        note.content || '';
      prompt += `

**${note.title || 'Untitled Note'}**
${noteContent}`;
    });
  }

  if (data.components?.length) {
    prompt += `

## 🧩 FEATURE COMPONENTS`;
    const componentsByFeature = data.components.reduce((acc: any, component: any) => {
      const feature = component.feature || 'Ungrouped';
      if (!acc[feature]) acc[feature] = [];
      acc[feature].push(component);
      return acc;
    }, {});

    Object.entries(componentsByFeature).forEach(([feature, components]: [string, any]) => {
      prompt += `

**${feature}:**`;
      components.forEach((component: any) => {
        const componentContent = component.content?.length > 800 ?
          component.content.substring(0, 800) + '...' :
          component.content || '';
        prompt += `
• **[${component.type}] ${component.title || 'Untitled'}:** ${componentContent}`;
      });
    });
  }

  if (data.deploymentData) {
    prompt += `

## 🚀 DEPLOYMENT INFO`;
    if (data.deploymentData.liveUrl) prompt += `
**Live URL:** ${data.deploymentData.liveUrl}`;
    if (data.deploymentData.githubUrl) prompt += `
**GitHub Repository:** ${data.deploymentData.githubUrl}`;
    if (data.deploymentData.deploymentPlatform) prompt += `
**Hosting Platform:** ${data.deploymentData.deploymentPlatform}`;
    if (data.deploymentData.environment) prompt += `
**Environment:** ${data.deploymentData.environment}`;
  }

  if (data.publicPageData?.isPublic) {
    prompt += `

## 🌐 PUBLIC PAGE INFO`;
    if (data.publicPageData.publicTitle) prompt += `
**Public Title:** ${data.publicPageData.publicTitle}`;
    if (data.publicPageData.publicDescription) prompt += `
**Public Description:** ${data.publicPageData.publicDescription}`;
    if (data.publicPageData.publicTags?.length) prompt += `
**Public Tags:** ${data.publicPageData.publicTags.join(' • ')}`;
  }

  if (data.timestamps) {
    const created = new Date(data.timestamps.createdAt);
    const updated = new Date(data.timestamps.updatedAt);
    const daysSinceCreated = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceUpdated = Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24));
    
    prompt += `

## ⏱️ PROJECT TIMELINE
**Created:** ${created.toLocaleDateString()} (${daysSinceCreated} days ago)
**Last Updated:** ${updated.toLocaleDateString()} (${daysSinceUpdated} days ago)`;
  }

  prompt += `

---`;

  return prompt;
}

export function generateMarkdownFormat(data: any, selectedProject: Project): string {
  let markdown = `# ${selectedProject.name}\n\n`;

  if (data.basicInfo) {
    markdown += `## Basic Information\n\n`;
    markdown += `- **Name:** ${data.basicInfo.name}\n`;
    if (data.basicInfo.category) markdown += `- **Category:** ${data.basicInfo.category}\n`;
    if (data.basicInfo.stagingEnvironment) markdown += `- **Environment:** ${data.basicInfo.stagingEnvironment}\n`;
    markdown += `\n`;
  }

  if (data.description) {
    markdown += `## Description\n\n${data.description}\n\n`;
  }

  if (data.tags) {
    markdown += `## Tags\n\n${data.tags.length ? data.tags.map((tag: string) => `\`${tag}\``).join(', ') : 'None'}\n\n`;
  }

  if (data.notes?.length) {
    markdown += `## Notes\n\n`;
    data.notes.forEach((note: any) => {
      const noteContent = note.content?.length > 2000 ? 
        note.content.substring(0, 2000) + '...' : 
        note.content || '';
      markdown += `### ${note.title || 'Untitled Note'}\n${noteContent}\n\n`;
    });
  }

  if (data.todos?.length) {
    markdown += `## Todo Items\n\n`;
    data.todos.forEach((todo: any) => {
      const todoDesc = todo.description?.length > 200 ? 
        todo.description.substring(0, 200) + '...' : 
        todo.description;
      markdown += `- [${todo.completed ? 'x' : ' '}] **${todo.title || 'Untitled Task'}**${todoDesc ? `: ${todoDesc}` : ''}\n`;
    });
    markdown += `\n`;
  }

  if (data.devLog?.length) {
    markdown += `## Development Log\n\n`;
    data.devLog.forEach((entry: any) => {
      const entryContent = entry.description?.length > 1500 ? 
        entry.entry.substring(0, 1500) + '...' : 
        entry.entry || '';
      markdown += `### ${entry.date} - ${entry.title || 'Development Entry'}\n${entryContent}\n\n`;
    });
  }

  if (data.components?.length) {
    markdown += `## Components\n\n`;
    const componentsByFeature = data.components.reduce((acc: any, component: any) => {
      const feature = component.feature || 'Ungrouped';
      if (!acc[feature]) acc[feature] = [];
      acc[feature].push(component);
      return acc;
    }, {});

    Object.entries(componentsByFeature).forEach(([feature, components]: [string, any]) => {
      markdown += `### ${feature}\n\n`;
      (components as any[]).forEach((component: any) => {
        const componentContent = component.content?.length > 2000 ?
          component.content.substring(0, 2000) + '...' :
          component.content || '';
        markdown += `#### [${component.type}] ${component.title || 'Untitled'}\n${componentContent}\n\n`;
      });
    });
  }

  if (data.techStack?.length) {
    markdown += `## Tech Stack\n\n`;
    markdown += `${data.techStack.map((item: any) => `- **${item.name}** (${item.category})${item.version ? ` - v${item.version}` : ''}`).join('\n')}\n\n`;
  }

  if (data.team?.length) {
    markdown += `## Team Members\n\n`;
    data.team.forEach((member: any) => {
      const name = member.userId ?
        `${member.userId.firstName || ''} ${member.userId.lastName || ''}`.trim() ||
        member.userId.email :
        'Unknown';
      const role = member.role || 'member';
      markdown += `- **${name}** - ${role}\n`;
    });
    markdown += `\n`;
  }

  if (data.settings) {
    markdown += `## Project Settings\n\n`;
    markdown += `- **Category:** ${data.settings.category || 'General'}\n`;
    markdown += `- **Environment:** ${data.settings.stagingEnvironment || 'Development'}\n`;
    if (data.settings.tags?.length) {
      markdown += `- **Tags:** ${data.settings.tags.map((tag: string) => `\`${tag}\``).join(', ')}\n`;
    }
    markdown += `\n`;
  }

  if (data.deploymentData) {
    markdown += `## Deployment\n\n`;
    if (data.deploymentData.liveUrl) markdown += `- **Live URL:** ${data.deploymentData.liveUrl}\n`;
    if (data.deploymentData.githubUrl) markdown += `- **GitHub:** ${data.deploymentData.githubUrl}\n`;
    if (data.deploymentData.deploymentPlatform) markdown += `- **Platform:** ${data.deploymentData.deploymentPlatform}\n`;
    markdown += `\n`;
  }

  if (data.timestamps) {
    markdown += `## Timestamps\n\n`;
    markdown += `- **Created:** ${new Date(data.timestamps.createdAt).toLocaleDateString()}\n`;
    markdown += `- **Updated:** ${new Date(data.timestamps.updatedAt).toLocaleDateString()}\n`;
  }

  return markdown;
}

export function formatExportData(data: any, format: ExportFormat, selectedProject: Project, customAiRequest?: string): string {
  switch (format) {
    case 'json':
      return generateJsonFormat(data);
    case 'prompt':
      return generatePromptFormat(data, selectedProject, customAiRequest);
    case 'markdown':
      return generateMarkdownFormat(data, selectedProject);
    default:
      return generateJsonFormat(data);
  }
}