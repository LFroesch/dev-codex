FROM node:22-alpine AS build

WORKDIR /app

# Install root deps
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy shared (used by both backend and frontend)
COPY shared/ shared/

# Install + build backend
COPY backend/package*.json backend/
RUN npm ci --prefix backend --ignore-scripts
COPY backend/ backend/
RUN npm run build --prefix backend

# Install + build frontend
COPY frontend/package*.json frontend/
RUN npm ci --prefix frontend --ignore-scripts
COPY frontend/ frontend/
RUN npm run build --prefix frontend

# --- Production image ---
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json backend/
RUN npm ci --prefix backend --omit=dev --ignore-scripts

COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/frontend/dist frontend/dist
COPY --from=build /app/shared shared

ENV NODE_ENV=production
EXPOSE 5003

CMD ["npm", "start"]
