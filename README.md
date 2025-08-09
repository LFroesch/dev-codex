# Dev Codex - Project Management Platform

A modern, clean full-stack development platform designed for developers and teams to organize, track, and collaborate on projects. Built with TypeScript, featuring complete type safety, modular architecture, and zero code duplication.

## 🚀 Features

### Core Project Management
- **Project Organization**: Create, organize, and track multiple development projects
- **Todo Management**: Task tracking with priorities and completion status  
- **Notes System**: Rich text notes with individual entries per project
- **Development Log**: Track progress and document development milestones
- **Documentation Templates**: Pre-built templates for APIs, models, routes, and more
- **Tech Stack Tracking**: Monitor technologies and packages used in projects

### Team Collaboration
- **Team Management**: Invite members with role-based permissions (owner/editor/viewer)
- **Project Sharing**: Share projects publicly or with specific team members
- **Notifications**: Real-time notifications for invitations and team activities
- **Public Discovery**: Discover public projects from other developers

### Advanced Features
- **Analytics Dashboard**: Track user engagement and project activity with leaderboards
- **Activity Tracking**: Real-time collaboration indicators and user session tracking
- **Billing Integration**: Stripe-powered subscription management with plan tiers
- **Admin Panel**: User management and system analytics for administrators
- **Public Pages**: Public profile and project pages with customizable visibility
- **Export System**: Export project data in multiple formats (JSON, Markdown, PDF)

### Real-time Features
- **Live Collaboration**: See active users and real-time activity indicators
- **Session Tracking**: Track user sessions and project engagement
- **Activity Logs**: Comprehensive logging of user actions and project changes
- **Notifications**: Real-time notifications for team activities and updates

### Security & Performance
- **Authentication**: JWT-based auth with Google OAuth integration
- **Rate Limiting**: API protection with intelligent rate limiting
- **Plan Enforcement**: Feature restrictions based on subscription tiers
- **Session Management**: Secure session tracking and analytics

## 🏗️ Architecture

### Frontend (`frontend/`)
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + DaisyUI components (Retro theme)
- **API Layer**: Modular services with BaseApiService pattern
- **State Management**: Custom hooks for loading, errors, and resources
- **Routing**: React Router v6 with nested layouts
- **Real-time**: Activity tracking and collaboration indicators

### Backend (`backend/`)
- **Runtime**: Node.js + TypeScript + Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with JWT and Google OAuth
- **Payment**: Stripe integration for subscriptions
- **Email**: Nodemailer for notifications
- **Analytics**: Custom analytics tracking with activity logging
- **Real-time**: Session tracking and user activity monitoring

### Shared Type System (`shared/types/`)
- **Type Safety**: Complete type sharing between frontend/backend
- **Organization**: Types organized by feature (user, project, team, analytics)
- **Consistency**: Single source of truth for all interfaces

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- MongoDB database
- Stripe account (for billing features)
- Google OAuth credentials (optional)

### Development
```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev
```

### Production
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables
Create `.env` files in both `backend/` and `frontend/` directories:

**Backend `.env`:**
```env
DATABASE_URI=mongodb://localhost:27017/dev-codex
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=your-stripe-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:5003
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

## 📁 Project Structure

```
project-manager/
├── shared/
│   └── types/              # Shared TypeScript interfaces
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── api/           # Modular API services
│   │   ├── hooks/         # Custom React hooks
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route-level page components
│   │   ├── services/      # Business logic services
│   │   └── utils/         # Utility functions
└── backend/               # Node.js backend API
    ├── src/
    │   ├── config/        # Database and configuration
    │   ├── middleware/    # Express middleware
    │   ├── models/        # Mongoose data models
    │   ├── routes/        # API route handlers
    │   ├── scripts/       # Utility scripts
    │   ├── services/      # Business logic services
    │   └── utils/         # Helper utilities
```

## 🔧 Development Scripts

### Root Level
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm start` - Start production server

### Backend Scripts
- `npm run create-admin` - Create admin user
- `npm run setup-stripe` - Initialize Stripe integration
- `npm run debug-billing` - Debug billing issues

## 🚀 Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server  
- **Tailwind CSS** - Utility-first CSS
- **DaisyUI** - Component library
- **React Query** - Server state management
- **React Router** - Client-side routing
- **Axios** - HTTP client

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **TypeScript** - Type safety
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **Passport.js** - Authentication middleware
- **Stripe** - Payment processing
- **Nodemailer** - Email service
- **JWT** - Token-based authentication

### DevOps & Tools
- **Concurrently** - Run multiple processes
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **TypeScript** - Type checking