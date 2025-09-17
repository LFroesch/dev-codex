# Dev Codex - Project Management Platform

A modern project management platform built for developers and development teams.

## Quick Start

```bash
# Clone and install
git clone https://github.com/LFroesch/project-management.git
cd project-management
npm install

# Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Start development
npm run dev
```

## Environment Variables

Required variables in `backend/.env`:
```bash
MONGODB_URI=mongodb://localhost:27017/dev-codex
JWT_SECRET=your-secure-secret
FRONTEND_URL=http://localhost:5002
CORS_ORIGINS=http://localhost:5002
```

## Development

- **Frontend:** http://localhost:5002
- **Backend:** http://localhost:5003

```bash
npm run dev          # Start development servers
npm run build        # Build for production  
npm start            # Start production server
npm run test:all     # Run all tests
```

## Features

- Project management with todos, notes, and dev logs
- Team collaboration with role-based permissions
- Real-time collaborative editing
- Stripe billing integration
- Admin dashboard and analytics
- Export/import project data

## Tech Stack

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS  
**Backend:** Node.js + Express + TypeScript + MongoDB  
**Auth:** JWT + Passport.js + Google OAuth  
**Real-time:** Socket.io  
**Testing:** Jest + Vitest (160+ tests)  

## Deployment

See deployment configuration in `.github/workflows/` for Digital Ocean setup.

Health endpoints: `/api/health`, `/api/ready`, `/api/live`

## License

ISC License