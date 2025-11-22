import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { tutorialAPI } from '../api/tutorial';

const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('getting-started');

  const handleRestartTutorial = async () => {
    try {
      // Reset tutorial on backend
      await tutorialAPI.resetTutorial();

      // Clear session storage
      sessionStorage.removeItem('tutorialWelcomeShown');

      // Add a small delay before reload to ensure state is cleared
      await new Promise(resolve => setTimeout(resolve, 100));

      // Reload the page to get fresh user data, then start tutorial
      window.location.href = '/projects?startTutorial=true';
    } catch (error) {
      console.error('Failed to reset tutorial:', error);
    }
  };

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'terminal', title: 'Terminal Commands', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'tips', title: 'Tips & Shortcuts', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'faq', title: 'FAQ', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Quick Start</h2>

            {/* Tutorial Section */}
            <div className="alert shadow-lg border-2 border-primary">
              <div className="flex-1">
                <svg className="w-6 h-6 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-bold">Interactive Tutorial</h3>
                  <div className="text-xs">Take a guided tour through all 14 steps of the app</div>
                </div>
              </div>
              <div className="flex-none">
                <button
                  onClick={handleRestartTutorial}
                  className="btn btn-sm btn-primary"
                  style={{ color: getContrastTextColor('primary') }}
                >
                  Start Tutorial
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/projects')}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary/10 p-2 rounded group-hover:bg-primary/20 transition-colors">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Projects</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-base-content/70">Create & manage projects</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/terminal')}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-success/10 p-2 rounded group-hover:bg-success/20 transition-colors">
                      <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Terminal</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-base-content/70">CLI-style interface</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/notes')}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-info/10 p-2 rounded group-hover:bg-info/20 transition-colors">
                      <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Notes & Todos</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-base-content/70">Markdown editor with todos</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/stack')}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-warning/10 p-2 rounded group-hover:bg-warning/20 transition-colors">
                      <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Tech Stack</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-base-content/70">Track technologies</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/features')}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-error/10 p-2 rounded group-hover:bg-error/20 transition-colors">
                      <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00 2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Features Graph</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-base-content/70">Visualize architecture</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/sharing')}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-secondary/10 p-2 rounded group-hover:bg-secondary/20 transition-colors">
                      <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Team Collaboration</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-base-content/70">Invite team members</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'terminal':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Terminal Commands</h2>
            <p className="text-base-content/70">Use <kbd className="kbd kbd-sm">/help</kbd> in the terminal to see all available commands. Here are some common ones:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-base-200 rounded-lg border border-base-content/20">
                <kbd className="kbd kbd-sm">/new</kbd>
                <p className="text-sm mt-1 text-base-content/70">Create a new item (note/todo/devlog)</p>
              </div>
              <div className="p-3 bg-base-200 rounded-lg border border-base-content/20">
                <kbd className="kbd kbd-sm">/view</kbd>
                <p className="text-sm mt-1 text-base-content/70">View all items in current project/section</p>
              </div>
              <div className="p-3 bg-base-200 rounded-lg border border-base-content/20">
                <kbd className="kbd kbd-sm">/search</kbd>
                <p className="text-sm mt-1 text-base-content/70">Search across all content</p>
              </div>
              <div className="p-3 bg-base-200 rounded-lg border border-base-content/20">
                <kbd className="kbd kbd-sm">/stale</kbd>
                <p className="text-sm mt-1 text-base-content/70">Find items not updated recently</p>
              </div>
              <div className="p-3 bg-base-200 rounded-lg border border-base-content/20">
                <kbd className="kbd kbd-sm">/project</kbd>
                <p className="text-sm mt-1 text-base-content/70">Switch to a different project</p>
              </div>
              <div className="p-3 bg-base-200 rounded-lg border border-base-content/20">
                <kbd className="kbd kbd-sm">/stack</kbd>
                <p className="text-sm mt-1 text-base-content/70">Manage technology stack</p>
              </div>
            </div>
          </div>
        );
        
      case 'faq':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>

            <div className="space-y-3">
              <div className="collapse collapse-arrow bg-base-200 border border-base-content/20">
                <input type="radio" name="faq-accordion" defaultChecked />
                <div className="collapse-title font-semibold">How do I create a new project?</div>
                <div className="collapse-content">
                  <p className="text-sm">Click the "+" button in the top header, then select your project and use the Terminal or navigate to different sections.</p>
                </div>
              </div>

              <div className="collapse collapse-arrow bg-base-200 border border-base-content/20">
                <input type="radio" name="faq-accordion" />
                <div className="collapse-title font-semibold">How do I invite team members?</div>
                <div className="collapse-content">
                  <p className="text-sm">Go to the Sharing page from the navigation menu, then enter their email or username to send an invitation.</p>
                </div>
              </div>

              <div className="collapse collapse-arrow bg-base-200 border border-base-content/20">
                <input type="radio" name="faq-accordion" />
                <div className="collapse-title font-semibold">Can I use markdown in notes?</div>
                <div className="collapse-content">
                  <p className="text-sm">Yes! The notes editor supports full markdown syntax including **bold**, *italic*, `code`, lists, checkboxes, and more.</p>
                </div>
              </div>

              <div className="collapse collapse-arrow bg-base-200 border border-base-content/20">
                <input type="radio" name="faq-accordion" />
                <div className="collapse-title font-semibold">How do I make my project public?</div>
                <div className="collapse-content">
                  <p className="text-sm">Navigate to the Public page and set a unique slug for your project. Toggle visibility to make it discoverable in the community feed.</p>
                </div>
              </div>

              <div className="collapse collapse-arrow bg-base-200 border border-base-content/20">
                <input type="radio" name="faq-accordion" />
                <div className="collapse-title font-semibold">What terminal commands are available?</div>
                <div className="collapse-content">
                  <p className="text-sm">Type <kbd className="kbd kbd-sm">/help</kbd> in the Terminal to see all commands. Common ones include <kbd className="kbd kbd-sm">/new</kbd>, <kbd className="kbd kbd-sm">/list</kbd>, and <kbd className="kbd kbd-sm">/search</kbd>.</p>
                </div>
              </div>

              <div className="collapse collapse-arrow bg-base-200 border border-base-content/20">
                <input type="radio" name="faq-accordion" />
                <div className="collapse-title font-semibold">How do I export my project data?</div>
                <div className="collapse-content">
                  <p className="text-sm">Go to Settings and use the Export Project feature to download all your project data as JSON.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'tips':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Tips</h2>
            <div className="space-y-4">
              
                <div className="p-6">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-3 p-2 bg-base-100 rounded border-2 border-base-content/20 hover:border-base-300/50 transition-all cursor-pointer hover:shadow-sm group"
                         onClick={() => navigate('/notes?section=todos')}>
                      <span className="text-lg">⏰</span>
                      <span className="text-sm flex-1"><strong>Set Reminders:</strong> Use reminder dates for important todos</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-base-100 rounded border-2 border-base-content/20 hover:border-base-300/50 transition-all cursor-pointer hover:shadow-sm group"
                         onClick={() => navigate('/')}>
                      <span className="text-lg">📊</span>
                      <span className="text-sm flex-1"><strong>Regular Reviews:</strong> Check your notification bell daily</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-base-100 rounded border-2 border-base-content/20 hover:border-base-300/50 transition-all cursor-pointer hover:shadow-sm group"
                         onClick={() => navigate('/notes')}>
                      <span className="text-lg">👥</span>
                      <span className="text-sm flex-1"><strong>Team Communication:</strong> Use project notes for team updates</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-base-100 rounded border-2 border-base-content/20 hover:border-base-300/50 transition-all cursor-pointer hover:shadow-sm group"
                         onClick={() => navigate('/account-settings')}>
                      <span className="text-lg">🎨</span>
                      <span className="text-sm flex-1"><strong>Theme Customization:</strong> Choose themes that work best for you</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return <div>Section not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="max-w-7xl mx-auto p-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-8 gap-4">
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary gap-2"
            style={{ color: getContrastTextColor('primary') }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>
          
          <div className="text-center flex-1">
            <h1 className="text-2xl sm:text-4xl font-bold text-base-content">
              Help & Documentation
            </h1>
            <p className="text-sm sm:text-lg text-base-content/70 mt-2">
              Learn how to make the most of your project management workflow
            </p>
          </div>
          
          <div className="w-0 sm:w-32"></div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="card bg-base-100 border-2 border-base-content/20 lg:sticky lg:top-4">
              <div className="card-body p-4">
                <h3 className="font-semibold mb-4">Topics</h3>
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2 lg:space-y-2">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <button
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full text-left p-2 rounded flex items-center gap-2 text-sm transition-colors ${
                          activeSection === section.id 
                            ? 'bg-primary' 
                            : 'hover:bg-base-200'
                        }`}
                        style={activeSection === section.id ? { color: getContrastTextColor('primary') } : {}}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                        </svg>
                        {section.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="shadow-md rounded-lg border-2 border-base-content/20 bg-base-100">
              <div className="p-4 sm:p-8">
                {renderContent()}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Footer */}
        <div className="text-center py-8 mt-8 border-t border-base-content/20">
          <p className="text-base-content/70 mb-6 text-lg">
            Ready to get started?
          </p>
          <div className="flex justify-center items-center space-x-4 flex-wrap gap-4">
            <button 
              onClick={() => navigate('/notes')}
              className="btn btn-primary gap-2 shadow-lg hover:shadow-xl transition-shadow"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Start Creating
            </button>
            <button 
              onClick={() => navigate('/support')}
              className="btn btn-outline gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Get Support
            </button>
            <button 
              onClick={() => navigate('/account-settings')}
              className="btn btn-outline gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;