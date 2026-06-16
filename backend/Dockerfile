# Build Frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .

RUN npm run build

# Build Backend
FROM node:22-alpine AS backend-builder

WORKDIR /backend

COPY backend/package*.json ./
RUN npm install

COPY backend/ .

RUN npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Copy package files from backend
COPY backend/package.json backend/package-lock.json* ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built backend
COPY --from=backend-builder /backend/dist ./dist

# Copy built frontend
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["node", "dist/server.js"]
