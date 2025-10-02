// AI-Powered Brain Dump Assistant - Prototype
// This page will integrate with AI to process natural language commands
// and create tasks, notes, dev logs, etc. across user's projects
// See BRAINDUMP_IMPLEMENTATION.md for full architecture details

import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Project } from '../api';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface ContextType {
  user: { id: string; email: string; firstName: string; lastName: string } | null;
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    projectId?: string;
    projectName?: string;
    action?: 'create_todo' | 'create_note' | 'create_devlog' | 'query' | 'brain_dump';
    success?: boolean;
  };
}

const BrainDumpPage: React.FC = () => {
  const { user } = useOutletContext<ContextType>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load user's projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch('/api/projects', {
          credentials: 'include'
        });
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };

    if (user) {
      loadProjects();
    }

    // Add welcome message
    setMessages([{
      id: '1',
      type: 'system',
      content: '👋 Welcome to Brain Dump! I\'m your AI assistant (prototype). Try commands like:\n\n• "@ProjectName add a todo for X"\n• "@ProjectName create a note about Y"\n• "What todos are in @ProjectName?"\n• Or just dump your thoughts and I\'ll help organize them!',
      timestamp: new Date()
    }]);
  }, [user]);

  // Auto-scroll to bottom when new messages arrive (only for new messages, not initial load)
  useEffect(() => {
    if (messages.length > 1) {
      // Use scrollIntoView with block: 'nearest' to avoid jarring jumps
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages.length]);

  // Handle @ mentions
  useEffect(() => {
    const text = inputText.slice(0, cursorPosition);
    const lastAtIndex = text.lastIndexOf('@');

    if (lastAtIndex !== -1 && lastAtIndex === text.length - 1) {
      // Just typed @
      setFilteredProjects(projects);
      setShowSuggestions(true);
    } else if (lastAtIndex !== -1) {
      const searchTerm = text.slice(lastAtIndex + 1);
      const filtered = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProjects(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [inputText, cursorPosition, projects]);

  const handleSelectProject = (project: Project) => {
    const text = inputText.slice(0, cursorPosition);
    const lastAtIndex = text.lastIndexOf('@');
    const before = inputText.slice(0, lastAtIndex);
    const after = inputText.slice(cursorPosition);
    const newText = `${before}@${project.name} ${after}`;
    setInputText(newText);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const parseCommand = (text: string): { action: string; project?: Project; content: string } => {
    // Extract @mentions
    const projectMention = text.match(/@([^\s]+)/);
    const project = projectMention
      ? projects.find(p => p.name.toLowerCase() === projectMention[1].toLowerCase())
      : undefined;

    const lowerText = text.toLowerCase();

    // Determine action type
    if (lowerText.includes('add a todo') || lowerText.includes('create a todo') || lowerText.includes('todo for')) {
      return { action: 'create_todo', project, content: text };
    } else if (lowerText.includes('add a note') || lowerText.includes('create a note') || lowerText.includes('note about')) {
      return { action: 'create_note', project, content: text };
    } else if (lowerText.includes('dev log') || lowerText.includes('devlog')) {
      return { action: 'create_devlog', project, content: text };
    } else if (lowerText.includes('what') || lowerText.includes('show') || lowerText.includes('list')) {
      return { action: 'query', project, content: text };
    } else {
      return { action: 'brain_dump', project, content: text };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Parse command (PROTOTYPE - will be AI-powered)
    const { action, project, content } = parseCommand(inputText);

    // Simulate AI response
    setTimeout(() => {
      let responseContent = '';
      const metadata: Message['metadata'] = {};

      if (!project && (action === 'create_todo' || action === 'create_note' || action === 'create_devlog')) {
        responseContent = '❌ Please specify a project using @ProjectName';
        metadata.success = false;
      } else {
        switch (action) {
          case 'create_todo':
            responseContent = `✅ **[PROTOTYPE]** Would create a todo in **${project?.name}**\n\n*In production, this will:*\n- Parse the todo text and extract title, description, priority, due date\n- Create the todo via API\n- Return confirmation`;
            metadata.projectId = project?.id;
            metadata.projectName = project?.name;
            metadata.success = true;
            break;

          case 'create_note':
            responseContent = `✅ **[PROTOTYPE]** Would create a note in **${project?.name}**\n\n*In production, this will:*\n- Extract note title and content\n- Create the note via API\n- Return confirmation with link`;
            metadata.projectId = project?.id;
            metadata.projectName = project?.name;
            metadata.success = true;
            break;

          case 'create_devlog':
            responseContent = `✅ **[PROTOTYPE]** Would create a dev log entry in **${project?.name}**\n\n*In production, this will:*\n- Extract dev log content\n- Create entry via API\n- Return confirmation`;
            metadata.projectId = project?.id;
            metadata.projectName = project?.name;
            metadata.success = true;
            break;

          case 'query':
            if (project) {
              responseContent = `📊 **[PROTOTYPE]** Would show data from **${project.name}**\n\n*In production, this will:*\n- Query the project data\n- Return formatted results (todos, notes, stats, etc.)\n- Allow follow-up questions`;
              metadata.projectId = project.id;
              metadata.projectName = project.name;
            } else {
              responseContent = `📊 **[PROTOTYPE]** Would show overview of all projects\n\n*In production, this will:*\n- Aggregate data across projects\n- Return insights and summaries`;
            }
            metadata.success = true;
            break;

          case 'brain_dump':
            responseContent = `🧠 **[PROTOTYPE]** Received your brain dump!\n\n*In production, this will:*\n- Analyze the content with AI\n- Suggest what type of items to create (todos, notes, ideas)\n- Ask for clarification if needed\n- Auto-categorize by project if mentioned\n\nYour input: "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"`;
            metadata.success = true;
            break;
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        metadata
      };

      setMessages(prev => [...prev, assistantMessage]);
    }, 300);

    setInputText('');

    // Focus back on input after sending
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="space-y-4">
      {/* Header Info Card */}
      <div className="section-container">
        <div className="section-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="section-icon">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold">Brain Dump Assistant</h1>
                <p className="text-xs text-base-content/60 mt-0.5">
                  Natural language interface for project management
                </p>
              </div>
            </div>
            <div className="badge badge-warning gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              PROTOTYPE
            </div>
          </div>
        </div>
        <div className="section-content">
          <div className="bg-info/10 border-2 border-info/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-info flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">About This Feature</h3>
                <p className="text-xs text-base-content/70 leading-relaxed">
                  This is a prototype of an AI-powered assistant that will help you manage projects using natural language.
                  Type commands like "@ProjectName add a todo for X" or just dump your thoughts and let the AI organize them.
                  See <code className="bg-base-200 px-1.5 py-0.5 rounded text-xs">BRAINDUMP_IMPLEMENTATION.md</code> for full details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation Area */}
      <div className="section-container">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <div className="section-icon">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span>Conversation</span>
            <div className="ml-auto text-xs text-base-content/60">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </div>
          </div>
        </div>
        <div className="section-content p-0">
          <div className="space-y-4 h-[500px] overflow-y-auto p-4 scroll-smooth">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-4 shadow-md ${
                    message.type === 'user'
                      ? 'bg-primary border-2 border-primary/20'
                      : message.type === 'system'
                      ? 'bg-info/10 border-2 border-info/30'
                      : 'bg-base-200 border-2 border-base-content/20'
                  }`}
                  style={message.type === 'user' ? { color: getContrastTextColor('primary') } : {}}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {message.type === 'user' ? (
                        <div className="w-6 h-6 rounded-full bg-base-100 flex items-center justify-center text-xs">
                          👤
                        </div>
                      ) : message.type === 'system' ? (
                        <div className="w-6 h-6 rounded-full bg-info/20 flex items-center justify-center text-xs">
                          💡
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                          🤖
                        </div>
                      )}
                      <div className="text-xs font-semibold">
                        {message.type === 'user' ? 'You' : message.type === 'system' ? 'System' : 'AI Assistant'}
                      </div>
                    </div>
                    <div className="text-xs opacity-60 ml-auto">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                  {message.metadata?.projectName && (
                    <div className="mt-3 pt-3 border-t border-current/20">
                      <div className="flex items-center gap-2 text-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="font-medium">Project:</span>
                        <span className="opacity-80">{message.metadata.projectName}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="section-container">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <div className="section-icon">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span>Your Command</span>
          </div>
        </div>
        <div className="section-content">
          <form onSubmit={handleSubmit} className="relative">
            {/* @ Mention Suggestions */}
            {showSuggestions && (
              <div className="absolute bottom-full mb-2 w-full bg-base-100 border-2 border-base-content/20 rounded-lg shadow-xl max-h-64 overflow-y-auto z-50">
                <div className="p-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-base-content/60 px-2 py-2 bg-base-200 rounded-t-lg sticky top-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Select a project ({filteredProjects.length})
                  </div>
                  <div className="mt-1 space-y-1">
                    {filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => handleSelectProject(project)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-base-200 transition-colors border-2 border-transparent hover:border-base-content/10"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full border-2 border-base-content/20"
                            style={{ backgroundColor: project.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{project.name}</div>
                            {project.description && (
                              <div className="text-xs text-base-content/60 truncate">{project.description}</div>
                            )}
                          </div>
                          {project.category && (
                            <span className="text-xs px-2 py-1 bg-base-200 rounded-full text-base-content/70">
                              {project.category}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex gap-3">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setCursorPosition(e.target.selectionStart);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  onClick={(e) => setCursorPosition(e.currentTarget.selectionStart)}
                  placeholder="Try: '@ProjectName add a todo for implementing auth' or just dump your thoughts..."
                  className="textarea textarea-bordered flex-1 min-h-[100px] resize-none text-sm"
                  rows={4}
                />
                <button
                  type="submit"
                  className="btn btn-primary flex flex-col gap-1 h-auto px-6"
                  style={{ color: getContrastTextColor('primary') }}
                  disabled={!inputText.trim()}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span className="text-xs font-semibold">Send</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-base-content/60 bg-base-200/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Tips:</span>
                  </div>
                  <kbd className="kbd kbd-xs">@</kbd>
                  <span>mention project</span>
                  <span className="text-base-content/40">•</span>
                  <kbd className="kbd kbd-xs">Enter</kbd>
                  <span>send</span>
                  <span className="text-base-content/40">•</span>
                  <kbd className="kbd kbd-xs">Shift+Enter</kbd>
                  <span>new line</span>
                </div>
                <div className="text-base-content/40">
                  {inputText.length} characters
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Quick Examples */}
      <div className="section-container">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <div className="section-icon">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span>Example Commands</span>
            <span className="text-xs text-base-content/60 ml-auto">Click to try</span>
          </div>
        </div>
        <div className="section-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                icon: '✅',
                title: 'Create Todo',
                command: '@MyProject add a todo for fixing the login bug',
                color: 'success'
              },
              {
                icon: '📝',
                title: 'Create Note',
                command: '@MyProject create a note about the API architecture',
                color: 'info'
              },
              {
                icon: '🔍',
                title: 'Query Project',
                command: 'What are the high priority todos in @MyProject?',
                color: 'warning'
              },
              {
                icon: '🧠',
                title: 'Brain Dump',
                command: 'Need to implement auth, refactor database, and update docs',
                color: 'secondary'
              },
            ].map((example, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(example.command)}
                className="card-interactive p-4 text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className={`text-2xl flex-shrink-0`}>
                    {example.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm mb-1">{example.title}</div>
                    <div className="text-xs text-base-content/70 line-clamp-2">
                      {example.command}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-base-content/40 group-hover:text-primary transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="section-container">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <div className="section-icon">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <span>Planned Features</span>
          </div>
        </div>
        <div className="section-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: '🎯', title: 'Smart Parsing', desc: 'AI extracts tasks, priorities, and dates from natural language' },
              { icon: '🔗', title: 'Project Context', desc: 'Understands your projects and suggests relevant actions' },
              { icon: '📊', title: 'Query Data', desc: 'Ask questions about your projects and get instant answers' },
              { icon: '🤝', title: 'Team Mentions', desc: 'Assign tasks to team members using @mentions' },
              { icon: '📅', title: 'Date Parsing', desc: 'Natural date understanding ("next Friday", "in 2 weeks")' },
              { icon: '💾', title: 'Conversation Memory', desc: 'Maintains context across messages for follow-ups' },
            ].map((feature, idx) => (
              <div key={idx} className="bg-base-200/50 rounded-lg p-4 border-2 border-base-content/10">
                <div className="text-2xl mb-2">{feature.icon}</div>
                <div className="font-semibold text-sm mb-1">{feature.title}</div>
                <div className="text-xs text-base-content/60">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrainDumpPage;