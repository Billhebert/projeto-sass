# Docker Setup Guide

## Overview

The projeto-sass application is containerized using Docker for easy deployment and development. This guide covers building, running, and managing the Docker containers.

## Prerequisites

- Docker 20.10+
- Docker Compose 1.29+

## File Structure

```
projeto-sass/
├── backend/
│   ├── Dockerfile              # Backend container definition
│   └── .dockerignore           # Files to exclude from build
├── frontend/
│   ├── Dockerfile              # Frontend container definition
│   └── .dockerignore           # Files to exclude from build
├── docker-compose.yml          # Multi-container orchestration
├── nginx.conf                  # Nginx configuration
└── .env.example                # Environment variables template
```

## Building Images

### Build All Services
```bash
docker-compose build
```

### Build Specific Service
```bash
# Build backend
docker-compose build api

# Build frontend
docker-compose build frontend

# Build with no cache
docker-compose build --no-cache
```

## Running Containers

### Start All Services
```bash
docker-compose up
```

### Start in Background
```bash
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f mongo
```

### Stop Services
```bash
docker-compose down
```

### Stop and Remove Volumes
```bash
docker-compose down -v
```

## Services

### Backend API (Port 3011)
- **Container**: projeto-sass-api
- **Image**: built from `./backend/Dockerfile`
- **Health Check**: `/health` endpoint
- **Dependencies**: MongoDB, Redis

### Frontend (Port 5173)
- **Container**: projeto-sass-frontend
- **Image**: built from `./frontend/Dockerfile`
- **Health Check**: HTTP GET request
- **Dependencies**: API service

### MongoDB (Port 27017)
- **Image**: mongo:7.0
- **Container**: projeto-sass-mongo
- **Database**: projeto-sass
- **Default Credentials**: admin/changeme
- **Volume**: mongo-data (persistent)

### Redis (Port 6379)
- **Image**: redis:7-alpine
- **Container**: projeto-sass-redis
- **Default Password**: changeme
- **Volume**: redis-data (persistent)

### Nginx (Ports 80, 443)
- **Image**: nginx:latest
- **Container**: projeto-sass-nginx
- **Config**: `./nginx.conf`
- **SSL**: `./ssl/` directory

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

### Key Variables

```env
# Development/Production
NODE_ENV=production

# Database
MONGO_USER=admin
MONGO_PASSWORD=changeme
MONGO_INITDB_DATABASE=projeto-sass

# Redis
REDIS_PASSWORD=changeme

# API Configuration
JWT_SECRET=your_secret_key_here
LOG_LEVEL=info

# Mercado Libre Integration
MERCADO_LIBRE_ACCESS_TOKEN=your_token_here
MERCADO_LIBRE_USER_ID=your_user_id_here
```

## Development Workflow

### Local Development (Without Docker)
```bash
# Terminal 1: Backend
cd backend
npm install
npm start

# Terminal 2: Frontend
cd frontend
npm install
npm run dev

# Terminal 3: MongoDB (if not running)
mongod
```

### Development with Docker
```bash
# Create environment file
cp .env.example .env

# Build images
docker-compose build

# Start all services
docker-compose up

# Access services
# Frontend: http://localhost:5173
# API: http://localhost:3011
# API Docs: http://localhost:3011/api-docs
# MongoDB: localhost:27017
```

## Health Checks

Each service has health checks configured:

```bash
# Check service health
docker-compose ps

# Manual health check
curl http://localhost:3011/health
curl http://localhost:5173
curl -u admin:changeme mongodb://localhost:27017
```

## Common Tasks

### Access MongoDB Shell
```bash
docker-compose exec mongo mongosh
```

### Access API Logs
```bash
docker-compose logs api --tail=100
```

### Rebuild and Restart
```bash
docker-compose build && docker-compose up -d
```

### Fresh Start (Remove All Data)
```bash
docker-compose down -v
docker-compose build
docker-compose up
```

### Scale Services (if applicable)
```bash
# Not typically used for this setup, but for reference
docker-compose up -d --scale api=2
```

## Production Deployment

### Using Docker Hub

1. Tag images:
```bash
docker tag projeto-sass-api:latest yourusername/projeto-sass-api:1.0.0
docker tag projeto-sass-frontend:latest yourusername/projeto-sass-frontend:1.0.0
```

2. Push to registry:
```bash
docker push yourusername/projeto-sass-api:1.0.0
docker push yourusername/projeto-sass-frontend:1.0.0
```

3. Update docker-compose.yml to use images from registry:
```yaml
services:
  api:
    image: yourusername/projeto-sass-api:1.0.0
  frontend:
    image: yourusername/projeto-sass-frontend:1.0.0
```

### Security Best Practices

1. **Change Default Passwords**:
   - MongoDB: Change `MONGO_PASSWORD`
   - Redis: Change `REDIS_PASSWORD`
   - JWT: Set strong `JWT_SECRET`

2. **Use Environment Files**:
   - Never commit `.env` files
   - Use `.env.example` for documentation

3. **SSL/TLS Configuration**:
   - Place SSL certificates in `./ssl/` directory
   - Update `nginx.conf` for HTTPS

4. **Resource Limits**:
   Add to docker-compose.yml services:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 512M
   ```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs <service-name>

# Rebuild without cache
docker-compose build --no-cache <service-name>
```

### Port Already in Use
```bash
# Find process using port
lsof -i :3011
lsof -i :5173

# Change port in docker-compose.yml
ports:
  - "3012:3011"  # Change first number
```

### Database Connection Issues
```bash
# Verify MongoDB is healthy
docker-compose exec mongo mongosh

# Check Redis connectivity
docker-compose exec redis redis-cli ping
```

### Frontend Can't Connect to API
- Verify `VITE_API_URL` environment variable
- Check network connectivity between containers
- Verify firewall rules

## Monitoring

### Using Docker Dashboard
```bash
# View all containers
docker ps

# View container stats
docker stats
```

### Using Docker Compose
```bash
# View all services
docker-compose ps

# View resource usage
docker stats projeto-sass-api projeto-sass-frontend
```

## Backup and Restore

### Backup MongoDB
```bash
docker-compose exec mongo mongodump --archive=/data/db/backup.archive
docker cp projeto-sass-mongo:/data/db/backup.archive ./backup.archive
```

### Restore MongoDB
```bash
docker cp ./backup.archive projeto-sass-mongo:/data/db/
docker-compose exec mongo mongorestore --archive=/data/db/backup.archive
```

## References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Image](https://hub.docker.com/_/mongo)
- [Redis Docker Image](https://hub.docker.com/_/redis)
- [Nginx Docker Image](https://hub.docker.com/_/nginx)
