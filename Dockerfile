FROM node:18-alpine as builder

# Build stage for React frontend
WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm ci

COPY frontend . .

RUN npm run build

# ============================================
# Final stage - Production image
# ============================================

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache dumb-init curl

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend application
COPY backend ./backend

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

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start application
CMD ["node", "backend/server.js"]
