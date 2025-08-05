# Multi-stage Docker build for Dev Codex
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install
RUN npm install --prefix backend
RUN npm install --prefix frontend

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built application
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/frontend/dist ./frontend/dist

# Copy environment files
COPY --from=builder /app/backend/.env* ./backend/

# Expose port
EXPOSE 5003

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["node", "backend/dist/app.js"]