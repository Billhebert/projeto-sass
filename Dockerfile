FROM node:18-alpine as builder

WORKDIR /app

# Copy root and frontend package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install all dependencies
RUN npm ci

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm ci

# Copy entire frontend source
COPY frontend . .

# Build frontend
RUN npm run build

# ============================================
# Final stage - Production image
# ============================================

FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl tini

# Copy root package files and install backend only
COPY package*.json ./
RUN npm ci --only=production

# Copy backend
COPY backend ./backend

# Create frontend dist directory
RUN mkdir -p frontend/dist

# Copy built frontend from builder
COPY --from=builder /app/frontend/dist ./frontend/dist

# Create logs directory
RUN mkdir -p logs data

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "backend/server.js"]
