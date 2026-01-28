FROM node:18-alpine as builder

# Build stage for React frontend
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy frontend files
COPY frontend ./frontend

# Install all dependencies (including frontend)
RUN npm ci

# Change to frontend directory and build
WORKDIR /app/frontend
RUN npm run build

# ============================================
# Final stage - Production image
# ============================================

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl tini

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend application
COPY backend ./backend

# Create frontend dist directory
RUN mkdir -p frontend/dist

# Copy built frontend from builder stage
COPY --from=builder /app/frontend/dist ./frontend/dist

# Create necessary directories
RUN mkdir -p logs data

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use tini as PID 1 to handle signals properly (Alpine alternative to dumb-init)
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "backend/server.js"]
