  AI Commands

  1. Natural Language Interface

  ASK = 'ask',
  CHAT = 'chat',

  // Usage:
  '/ask what are my high priority tasks due this week?'
  '/ask who is working on the authentication feature?'
  '/chat how can I improve my project workflow?'

  // AI parses intent and executes relevant commands or provides answers

  2. Smart Task Breakdown

  BREAKDOWN = 'breakdown',
  EXPAND = 'expand',

  // Usage:
  '/breakdown Build user authentication system @project'
  // AI suggests:
  // 1. Design database schema for users
  // 2. Implement JWT token generation
  // 3. Create login/signup endpoints
  // 4. Add password hashing with bcrypt
  // 5. Write authentication middleware
  // ... and auto-creates todos

  '/expand todo 5' // AI breaks down complex todo into subtasks

  3. Code/Doc Analysis

  ANALYZE = 'analyze',
  REVIEW = 'review',
  EXPLAIN = 'explain',

  // Usage:
  '/analyze @project'
  // AI reviews all notes/docs/devlog and provides:
  // - Common patterns/issues
  // - Suggested improvements
  // - Missing documentation
  // - Technical debt areas

  '/review /path/to/code.ts' // AI code review
  '/explain this function does X Y Z' // AI explains technical concept

  4. Smart Suggestions

  SUGGEST = 'suggest',
  RECOMMEND = 'recommend',

  // Usage:
  '/suggest next' // What should I work on next?
  '/suggest tech for authentication' // Recommend tech stack choices
  '/suggest assignee for todo 5' // Who should handle this based on history?
  '/suggest priority' // Analyze todos and suggest priority adjustments

  5. Automated Summaries

  SUMMARIZE = 'summarize',
  DIGEST = 'digest',

  // Usage:
  '/summarize week' // AI summary of all activity this week
  '/digest @project' // Project status digest
  '/summarize meeting notes 1-5' // Summarize multiple notes

  6. Smart Search & Discovery

  FIND_SIMILAR = 'find_similar',
  RELATED = 'related',

  // Usage:
  '/find similar to todo 5' // Find related tasks/notes
  '/related authentication' // Show all items related to topic

  7. Predictive Features

  PREDICT = 'predict',
  ESTIMATE = 'estimate',

  // Usage:
  '/predict completion @project' // When will project be done?
  '/estimate Build API endpoints' // How long will this take?

  8. Auto-categorization

  AUTO_TAG = 'auto_tag',
  AUTO_CATEGORIZE = 'auto_categorize',

  // Usage:
  '/auto tag all @project' // AI tags all items intelligently
  '/auto categorize' // Suggests categories for items

  9. Context-Aware Help

  HELP_ME = 'help_me',
  HOW_DO_I = 'how_do_i',

  // Usage:
  '/help me deploy this project'
  '/how do i set up CI/CD?'
  // AI provides step-by-step guidance with actual commands

  10. Proactive Assistant (Clippy-style)

  // Runs automatically in background, shows suggestions:
  "👀 I noticed you have 3 overdue todos. Want me to reschedule them?"
  "💡 You've been working on auth for 2 weeks. Should I create a progress report?"
  "🚀 Your deployment URL hasn't been updated in a while. Want to check it?"

  Architecture

  Backend Structure

  // backend/src/services/ai/
  ├── aiService.ts          // Main AI orchestrator
  ├── openaiClient.ts       // OpenAI API integration
  ├── contextBuilder.ts     // Build context from project data
  ├── promptTemplates.ts    // Reusable prompts
  ├── streamHandler.ts      // Stream responses to frontend
  └── handlers/
      ├── AnalyzeHandler.ts
      ├── SuggestHandler.ts
      ├── AskHandler.ts
      └── BreakdownHandler.ts

  aiService.ts:
  import OpenAI from 'openai';

  export class AIService {
    private openai: OpenAI;
    private contextBuilder: ContextBuilder;

    constructor() {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.contextBuilder = new ContextBuilder();
    }

    async ask(query: string, userId: string, projectId?: string) {
      // Build context from user's project data
      const context = await this.contextBuilder.buildContext({
        userId,
        projectId,
        includeTodos: true,
        includeNotes: true,
        includeStack: true,
        limit: 50 // Recent items
      });

      const prompt = this.buildPrompt(query, context);

      // Stream response
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: true,
      });

      return stream;
    }

    async breakdown(taskDescription: string, projectId: string) {
      const context = await this.contextBuilder.buildProjectContext(projectId);

      const prompt = `
        Given this project context:
        ${context}
        
        Break down this task into actionable subtasks:
        "${taskDescription}"
        
        Respond with JSON array of subtasks with:
        - title: string
        - description: string
        - priority: 'low' | 'medium' | 'high'
        - estimatedHours: number
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
    }

    async analyze(projectId: string, userId: string) {
      const fullContext = await this.contextBuilder.buildFullContext(projectId);

      const prompt = `
        Analyze this project and provide:
        1. Health score (0-100)
        2. Key accomplishments
        3. Bottlenecks/blockers
        4. Recommendations
        5. Risk areas
        
        Project data:
        ${JSON.stringify(fullContext, null, 2)}
      `;

      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });

      return stream;
    }

    async suggest(type: 'next' | 'tech' | 'assignee', options: any) {
      // Different suggestion types
      switch(type) {
        case 'next':
          return this.suggestNextTask(options.userId, options.projectId);
        case 'tech':
          return this.suggestTech(options.requirement);
        case 'assignee':
          return this.suggestAssignee(options.todoId);
      }
    }
  }

  contextBuilder.ts:
  export class ContextBuilder {
    async buildContext(options: ContextOptions): Promise<string> {
      const { userId, projectId, includeTodos, includeNotes } = options;

      let context = '';

      if (projectId) {
        const project = await Project.findById(projectId);
        context += `Project: ${project.name}\n`;
        context += `Description: ${project.description}\n`;
        context += `Category: ${project.category}\n\n`;
      }

      if (includeTodos) {
        const todos = await Todo.find({ projectId }).limit(50).sort('-createdAt');
        context += `Recent Todos:\n`;
        todos.forEach(todo => {
          context += `- [${todo.status}] ${todo.title} (${todo.priority})\n`;
        });
        context += '\n';
      }

      if (includeNotes) {
        const notes = await Note.find({ projectId }).limit(20).sort('-createdAt');
        context += `Recent Notes:\n`;
        notes.forEach(note => {
          context += `- ${note.text}\n`;
        });
      }

      // Add stack info, team members, etc.

      return context;
    }
  }

  promptTemplates.ts:
  export const SYSTEM_PROMPT = `
  You are Clippy, an AI assistant embedded in a project management terminal.
  You help users manage their projects through natural language commands.

  Capabilities:
  - Answer questions about user's projects, todos, notes, and team
  - Suggest next actions and priorities
  - Break down complex tasks into subtasks
  - Analyze project health and provide insights
  - Recommend technologies and best practices

  Personality:
  - Helpful and proactive (like Clippy!)
  - Concise but friendly
  - Use emojis occasionally (👀 💡 🚀)
  - Suggest actual terminal commands when relevant

  When users ask questions, search through the provided context.
  If you can help by suggesting a command, format it as: 
  "Try running: /command args"
  `;

  export const ANALYZE_PROMPT = `
  Analyze this project thoroughly and provide:

  1. **Health Score** (0-100)
     - Consider: task completion rate, overdue items, activity level
     
  2. **Momentum** (increasing/stable/decreasing)
     - Based on recent activity patterns

  3. **Key Accomplishments** (last 2 weeks)
     - Major todos completed
     - Important features shipped

  4. **Blockers & Risks**
     - Overdue high-priority items
     - Under-staffed areas
     - Technical debt indicators

  5. **Recommendations**
     - Specific, actionable suggestions
     - Priority order

  Keep it concise and actionable.
  `;

  Frontend Integration

  CommandResponse.tsx - Add AI response rendering:

  // Add new response type
  if (response.data?.aiResponse) {
    return <AIResponseRenderer 
      response={response.data.aiResponse}
      isStreaming={response.data.isStreaming}
      onCommandSuggest={(cmd) => onCommandClick?.(cmd)}
    />;
  }

  AIResponseRenderer.tsx:
  export const AIResponseRenderer: React.FC<{
    response: string;
    isStreaming: boolean;
    onCommandSuggest: (cmd: string) => void;
  }> = ({ response, isStreaming, onCommandSuggest }) => {
    // Parse AI response for command suggestions
    const commandPattern = /`(\/[^`]+)`/g;
    const parts = response.split(commandPattern);

    return (
      <div className="mt-3 space-y-2">
        {/* Clippy avatar */}
        <div className="flex items-start gap-3">
          <div className="text-2xl flex-shrink-0">
            📎 {/* Or custom Clippy SVG */}
          </div>

          <div className="flex-1 bg-base-200 rounded-lg p-3 border-thick">
            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex items-center gap-2 mb-2 text-xs text-base-content/60">
                <div className="animate-pulse">●</div>
                <span>Thinking...</span>
              </div>
            )}

            {/* Render response with clickable commands */}
            <div className="prose prose-sm max-w-none text-base-content/80">
              {parts.map((part, i) => {
                if (i % 2 === 1) {
                  // This is a command
                  return (
                    <button
                      key={i}
                      onClick={() => onCommandSuggest(part)}
                      className="inline-flex items-center gap-1 text-xs bg-primary/20 hover:bg-primary/30 text-primary px-2 py-1 rounded font-mono border-2 border-primary/30
  cursor-pointer transition-colors"
                    >
                      {part}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  );
                }
                return <span key={i}>{part}</span>;
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  Streaming API Endpoint

  backend/src/routes/ai.ts:
  router.post('/ai/ask', async (req: AuthRequest, res: Response) => {
    try {
      const { query, projectId } = req.body;
      const userId = req.user!.id;

      const aiService = new AIService();
      const stream = await aiService.ask(query, userId, projectId);

      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Stream chunks to client
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();

    } catch (error) {
      logError('AI ask error', error as Error);
      res.status(500).json({ error: 'AI request failed' });
    }
  });

  Frontend API client:
  // frontend/src/api/ai.ts
  export const askAI = async (
    query: string,
    projectId: string | undefined,
    onChunk: (text: string) => void
  ): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/ai/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ query, projectId }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            onChunk(parsed.content);
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  };

  Proactive Clippy Features

  Clippy suggestions that appear automatically:

  // backend/src/services/ai/clippyService.ts
  export class ClippyService {
    async getProactiveSuggestions(userId: string, projectId: string) {
      const suggestions = [];

      // Check for overdue todos
      const overdueTodos = await Todo.find({
        projectId,
        dueDate: { $lt: new Date() },
        status: 'pending'
      });

      if (overdueTodos.length > 0) {
        suggestions.push({
          type: 'warning',
          icon: '⚠️',
          message: `You have ${overdueTodos.length} overdue todos. Want me to reschedule them?`,
          actions: [
            { label: 'Show me', command: '/todos --overdue' },
            { label: 'Reschedule all', command: '/bulk due +1week --overdue' }
          ]
        });
      }

      // Check for stale deployment
      const deployment = await Deployment.findOne({ projectId });
      if (deployment && isOlderThan(deployment.updatedAt, 30, 'days')) {
        suggestions.push({
          type: 'info',
          icon: '🚀',
          message: "Your deployment info hasn't been updated in a month.",
          actions: [
            { label: 'Update now', command: '/set deployment' }
          ]
        });
      }

      // Suggest task breakdown for complex todos
      const complexTodos = await Todo.find({
        projectId,
        text: { $regex: /.{100,}/ }, // Long description
        subtasks: { $size: 0 }
      });

      if (complexTodos.length > 0) {
        suggestions.push({
          type: 'suggestion',
          icon: '💡',
          message: `I found ${complexTodos.length} complex todos without subtasks. Want me to break them down?`,
          actions: [
            { label: 'Break down', command: `/breakdown todo ${complexTodos[0].id}` }
          ]
        });
      }

      return suggestions;
    }
  }

  Display in terminal:
  // Show Clippy suggestions in a special section
  <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-3 mb-4">
    <div className="flex items-start gap-3">
      <span className="text-2xl">📎</span>
      <div className="flex-1">
        <div className="text-sm font-semibold mb-1">
          {suggestion.icon} {suggestion.message}
        </div>
        <div className="flex gap-2">
          {suggestion.actions.map(action => (
            <button
              key={action.command}
              onClick={() => runCommand(action.command)}
              className="text-xs btn-primary-sm"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
      <button className="text-xs opacity-50 hover:opacity-100">✕</button>
    </div>
  </div>

  This creates a true "Clippy" experience where the AI is proactive, helpful, and deeply integrated into your workflow! The key is making it feel natural in the terminal
  environment while providing real value.