import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContrastTextColor } from '../utils/contrastTextColor';

const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('getting-started');

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'projects', title: 'Projects & Teams', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h1a1 1 0 011 1v5m-4 0h4' },
    { id: 'todos', title: 'Tasks & Todos', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'notifications', title: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'collaboration', title: 'Collaboration', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'tips', title: 'Tips & Shortcuts', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Quick Start</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/create-project')}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary/10 p-2 rounded group-hover:bg-primary/20 transition-colors">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Create Project</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-base-content/70">Start your first project</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/notes')}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-success/10 p-2 rounded group-hover:bg-success/20 transition-colors">
                      <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Notes</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-base-content/70">Rich text editor & tasks</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/stack')}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-info/10 p-2 rounded group-hover:bg-info/20 transition-colors">
                      <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Tech Stack</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-base-content/70">Manage technologies</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/docs')}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-warning/10 p-2 rounded group-hover:bg-warning/20 transition-colors">
                      <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Docs</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-base-content/70">Documentation center</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/deployment')}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-error/10 p-2 rounded group-hover:bg-error/20 transition-colors">
                      <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Deploy</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-base-content/70">Deploy & monitor</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/discover')}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-secondary/10 p-2 rounded group-hover:bg-secondary/20 transition-colors">
                      <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Discover</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-base-content/70">Explore public projects</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'projects':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Projects & Teams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/create-project')}>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2 rounded group-hover:bg-primary/20 transition-colors">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">New Project</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-base-content/80">Create & configure projects</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/')}>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-secondary/10 p-2 rounded group-hover:bg-secondary/20 transition-colors">
                      <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h3 className="font-semibold">Team Management</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-base-content/80">Invite & manage team members</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/settings')}>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-info/10 p-2 rounded group-hover:bg-info/20 transition-colors">
                      <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Project Settings</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-base-content/80">Configure permissions & visibility</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/discover')}>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-success/10 p-2 rounded group-hover:bg-success/20 transition-colors">
                      <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Public Projects</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-base-content/80">Share & discover projects</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'todos':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Tasks & Todos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/notes')}>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2 rounded group-hover:bg-primary/20 transition-colors">
                      <kbd className="kbd kbd-sm text-primary">☐</kbd>
                    </div>
                    <h3 className="font-semibold">Checkboxes</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-base-content/80">Create interactive task lists</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/notes')}>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-success/10 p-2 rounded group-hover:bg-success/20 transition-colors">
                      <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Due Dates</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-base-content/80">Set deadlines & reminders</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/')}>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-info/10 p-2 rounded group-hover:bg-info/20 transition-colors">
                      <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Assignment</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-base-content/80">Assign tasks to team members</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/')}>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-warning/10 p-2 rounded group-hover:bg-warning/20 transition-colors">
                      <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Notifications</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-base-content/80">Smart alerts & reminders</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'notifications':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Notifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/')}>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-warning/10 p-2 rounded group-hover:bg-warning/20 transition-colors">
                      <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Notification Bell</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-base-content/80">View & manage alerts</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/account-settings')}>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-error/10 p-2 rounded group-hover:bg-error/20 transition-colors">
                      <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Settings</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-base-content/80">Configure preferences</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'collaboration':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Collaboration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/notes')}>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-secondary/10 p-2 rounded group-hover:bg-secondary/20 transition-colors">
                      <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Real-time Editing</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-base-content/80">Live collaboration features</p>
                </div>
              </div>

              <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group"
                   onClick={() => navigate('/discover')}>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-info/10 p-2 rounded group-hover:bg-info/20 transition-colors">
                      <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <h3 className="font-semibold">Public Sharing</h3>
                    <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-base-content/80">Share projects publicly</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'tips':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Tips & Shortcuts</h2>
            <div className="space-y-4">
              <div className="shadow-md rounded-lg border-2 border-base-content/20 bg-base-100">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-3">Editor Shortcuts</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-2 bg-base-100 rounded border-2 border-base-content/20 hover:border-base-300/50 cursor-pointer transition-all hover:shadow-sm group"
                         onClick={() => navigate('/notes')}>
                      <kbd className="kbd kbd-sm group-hover:bg-primary group-hover:text-primary-content transition-colors">**B**</kbd>
                      <span className="text-sm"><strong>Bold</strong> text formatting</span>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-base-100 rounded border-2 border-base-content/20 hover:border-base-300/50 cursor-pointer transition-all hover:shadow-sm group"
                         onClick={() => navigate('/notes')}>
                      <kbd className="kbd kbd-sm group-hover:bg-primary group-hover:text-primary-content transition-colors">*I*</kbd>
                      <span className="text-sm"><em>Italic</em> text formatting</span>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-base-100 rounded border-2 border-base-content/20 hover:border-base-300/50 cursor-pointer transition-all hover:shadow-sm group"
                         onClick={() => navigate('/notes')}>
                      <kbd className="kbd kbd-sm group-hover:bg-primary group-hover:text-primary-content transition-colors">`code`</kbd>
                      <span className="text-sm font-mono">Inline code</span>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-base-100 rounded border-2 border-base-content/20 hover:border-base-300/50 cursor-pointer transition-all hover:shadow-sm group"
                         onClick={() => navigate('/notes')}>
                      <kbd className="kbd kbd-sm group-hover:bg-primary group-hover:text-primary-content transition-colors">☐</kbd>
                      <span className="text-sm">Add checkboxes</span>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-base-100 rounded border-2 border-base-content/20 hover:border-base-300/50 cursor-pointer transition-all hover:shadow-sm group"
                         onClick={() => navigate('/notes')}>
                      <kbd className="kbd kbd-sm group-hover:bg-primary group-hover:text-primary-content transition-colors">- [ ]</kbd>
                      <span className="text-sm">Checkbox syntax</span>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-base-100 rounded border-2 border-base-content/20 hover:border-base-300/50 cursor-pointer transition-all hover:shadow-sm group"
                         onClick={() => navigate('/notes')}>
                      <kbd className="kbd kbd-sm group-hover:bg-primary group-hover:text-primary-content transition-colors">Ctrl+S</kbd>
                      <span className="text-sm">Manual save</span>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="shadow-md rounded-lg border-2 border-base-content/20 bg-base-100">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-3">Productivity Tips</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-3 p-2 bg-base-100 rounded border-2 border-base-content/20 hover:border-base-300/50 transition-all cursor-pointer hover:shadow-sm group"
                         onClick={() => navigate('/notes')}>
                      <span className="text-lg">⏰</span>
                      <span className="text-sm flex-1"><strong>Set Reminders:</strong> Use reminder dates for important tasks</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-base-100 rounded border-2 border-base-content/20 hover:border-base-300/50 transition-all cursor-pointer hover:shadow-sm group"
                         onClick={() => navigate('/notes')}>
                      <span className="text-lg">☐</span>
                      <span className="text-sm flex-1"><strong>Use Checkboxes:</strong> Track task completion with the new checkbox feature</span>
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
          </div>
        );
        
      default:
        return <div>Section not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
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
        <div className="text-center py-8 mt-8 border-t border-base-300">
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
              className="btn btn-ghost gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </div>
        </div>

        {/* Floating Quick Actions */}
        <div className="fixed bottom-6 right-6 z-50">
          <div className="dropdown dropdown-top dropdown-end">
            <label tabIndex={0} className="btn btn-primary btn-circle shadow-lg hover:shadow-xl transition-all" style={{ color: getContrastTextColor('primary') }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </label>
            <ul tabIndex={0} className="dropdown-content menu p-2 shadow-xl bg-base-100 rounded-box w-52 mb-2 border border-base-300">
              <li>
                <button onClick={() => navigate('/notes')} className="gap-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Try Editor Features
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/')} className="gap-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Check Notifications
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/news')} className="gap-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                  </svg>
                  What's New?
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/account-settings')} className="gap-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3H5a2 2 0 00-2 2v12a4 4 0 004 4h2a2 2 0 002-2V5a2 2 0 00-2-2z" />
                  </svg>
                  Change Theme
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;