FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl tini

# Copy root package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend
COPY backend ./backend

# Copy pre-built frontend dist folder
COPY frontend/dist ./frontend/dist

# Create logs directory
RUN mkdir -p logs data

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "backend/server.js"]
