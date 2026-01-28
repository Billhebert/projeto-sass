# 🚀 Production Deployment Guide - Projeto SASS

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [AWS Deployment](#aws-deployment)
3. [DigitalOcean Deployment](#digitalocean-deployment)
4. [Heroku Deployment](#heroku-deployment)
5. [Self-Hosted Deployment](#self-hosted-deployment)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Security
- [ ] All secrets are in environment variables (.env is in .gitignore)
- [ ] JWT_SECRET is 32+ characters and randomly generated
- [ ] HTTPS/SSL certificates are valid (not self-signed)
- [ ] All dependencies have been audited (`npm audit`)
- [ ] No sensitive data in git history

### Code Quality
- [ ] All tests pass (`npm test`)
- [ ] Frontend builds successfully (`npm run frontend:build`)
- [ ] No console.log() statements in production code
- [ ] Error handling is comprehensive
- [ ] Logging is configured for production

### Infrastructure
- [ ] Database backups are configured
- [ ] Monitoring and alerting are in place
- [ ] Load balancer is configured (if needed)
- [ ] CDN is configured (if needed)
- [ ] Logging service is configured (Sentry, Datadog, etc.)

### Database
- [ ] MongoDB is secured with authentication
- [ ] Database indexes are created
- [ ] Backup strategy is implemented
- [ ] Database replication is configured (if needed)
- [ ] Database encryption at rest is enabled (if available)

---

## AWS Deployment

### Option 1: AWS Elastic Beanstalk (Recommended for SaaS)

#### Prerequisites
```bash
npm install -g @aws-amplify/cli
pip install awsebcli
aws configure  # Setup AWS credentials
```

#### Step-by-Step

1. **Initialize Elastic Beanstalk**
```bash
eb init -p "Node.js 18 running on 64bit Amazon Linux 2" projeto-sass
```

2. **Create environment**
```bash
eb create production-env \
  --envvars NODE_ENV=production,LOG_LEVEL=info \
  --instance-type t3.small \
  --scale 2
```

3. **Configure environment variables**
```bash
eb setenv \
  JWT_SECRET=your_secret_key \
  MONGODB_URI=your_mongodb_uri \
  REDIS_URL=your_redis_url \
  FRONTEND_URL=your_domain.com
```

4. **Deploy application**
```bash
git add .
git commit -m "Deploy to production"
eb deploy production-env
```

5. **Monitor logs**
```bash
eb logs -f
eb health
```

### Option 2: AWS ECS + Fargate (Container-based)

1. **Create ECR repository**
```bash
aws ecr create-repository --repository-name projeto-sass
```

2. **Build and push Docker image**
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

docker build -t projeto-sass:latest .
docker tag projeto-sass:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/projeto-sass:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/projeto-sass:latest
```

3. **Create ECS cluster**
```bash
aws ecs create-cluster --cluster-name projeto-sass-prod
```

4. **Register task definition** (see `aws/ecs-task-definition.json`)

5. **Create service**
```bash
aws ecs create-service \
  --cluster projeto-sass-prod \
  --service-name api-service \
  --task-definition projeto-sass:1 \
  --desired-count 2 \
  --launch-type FARGATE
```

### Option 3: AWS Lambda + API Gateway

1. **Install serverless framework**
```bash
npm install -g serverless
serverless create --template aws-nodejs --path projeto-sass-lambda
```

2. **Configure serverless.yml**
```yaml
service: projeto-sass-api
provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    NODE_ENV: production
    JWT_SECRET: ${env:JWT_SECRET}
    MONGODB_URI: ${env:MONGODB_URI}
```

3. **Deploy**
```bash
serverless deploy
```

---

## DigitalOcean Deployment

### Option 1: App Platform (Easiest)

1. **Connect GitHub repository**
2. **Create app.yaml**
```yaml
name: projeto-sass
services:
  - name: api
    http_port: 3000
    source_dir: backend
    build_command: npm install && npm run frontend:build
    run_command: npm start
    envs:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        scope: RUN_AND_BUILD_TIME
        value: ${JWT_SECRET}
databases:
  - name: mongo
    engine: MONGODB
    version: "7"
  - name: redis
    engine: REDIS
    version: "7"
```

3. **Push to repository and deploy**

### Option 2: Droplet + Docker Compose

1. **Create Droplet (4GB RAM, Ubuntu 22.04)**
```bash
# SSH into droplet
ssh root@your_droplet_ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt-get install docker-compose
```

2. **Setup project**
```bash
cd /var/www
git clone your_repo_url projeto-sass
cd projeto-sass

# Create .env
cp backend/.env.example backend/.env
# Edit .env with production values
nano backend/.env
```

3. **Configure reverse proxy (Nginx)**
```bash
apt-get install nginx
# Create nginx config (see below)
systemctl start nginx
systemctl enable nginx
```

4. **Start services**
```bash
docker compose up -d
docker compose logs -f
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

5. **Setup SSL (Let's Encrypt)**
```bash
apt-get install certbot python3-certbot-nginx
certbot certonly --nginx -d yourdomain.com
```

---

## Heroku Deployment

1. **Install Heroku CLI**
```bash
npm install -g heroku
heroku login
```

2. **Create app**
```bash
heroku create seu-app-name
```

3. **Add environment variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret_key
heroku config:set MONGODB_URI=your_mongodb_uri
```

4. **Add buildpacks**
```bash
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-static
```

5. **Create static.json**
```json
{
  "root": "frontend/dist"
}
```

6. **Deploy**
```bash
git push heroku main
```

---

## Self-Hosted Deployment

### Prerequisites
- Ubuntu 22.04 LTS server
- 4GB+ RAM
- 20GB+ SSD
- SSH access

### Full Setup Script

```bash
#!/bin/bash

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# Install MongoDB
curl https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list << EOF
deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse
EOF
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Redis
sudo apt-get install -y redis-server

# Install Nginx
sudo apt-get install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Setup firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Clone repository
cd /var/www
sudo git clone your_repo_url projeto-sass
cd projeto-sass

# Install dependencies
npm ci
cd frontend && npm ci && npm run build && cd ..

# Create ecosystem.config.js for PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: "api",
    script: "./backend/server.js",
    instances: 2,
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    error_file: "./logs/api-error.log",
    out_file: "./logs/api-out.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z"
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup -u $USER --hp /home/$USER

# Start MongoDB and Redis
sudo systemctl start mongod
sudo systemctl start redis-server
sudo systemctl enable mongod
sudo systemctl enable redis-server

echo "Setup complete!"
```

---

## Post-Deployment

### Monitoring Setup

1. **Health Check**
```bash
curl https://yourdomain.com/health
```

2. **Monitoring Services**
   - Sentry (Error tracking)
   - Datadog (Performance monitoring)
   - New Relic (Application performance)
   - Prometheus + Grafana (Custom metrics)

3. **Logging**
```bash
# View logs
pm2 logs api

# Setup log rotation
sudo apt-get install logrotate
```

### Backup Strategy

```bash
# MongoDB backup
mongodump --uri "mongodb://user:pass@localhost/projeto-sass" \
  --out /backups/mongo-$(date +%Y%m%d)

# Backup to S3
aws s3 sync /backups/ s3://seu-bucket/backups/
```

### SSL Certificate Renewal

```bash
# Auto-renewal with certbot
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Troubleshooting

### API not responding
```bash
# Check if service is running
pm2 list
pm2 logs api

# Check ports
sudo netstat -tlnp | grep :3000

# Restart service
pm2 restart api
```

### Database connection issues
```bash
# Test MongoDB
mongo mongodb://localhost:27017/projeto-sass

# Check Redis
redis-cli ping

# View environment variables
heroku config  # For Heroku
eb printenv    # For Elastic Beanstalk
```

### Out of memory
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Increase PM2 memory
pm2 start api --max-memory-restart 1G
```

### SSL certificate issues
```bash
# Renew certificate
sudo certbot renew

# Check certificate expiration
openssl s_client -connect yourdomain.com:443 -showcerts
```

---

## Performance Optimization

### Enable Gzip Compression
```nginx
gzip on;
gzip_types text/plain text/css text/xml text/javascript 
           application/json application/javascript;
gzip_min_length 1000;
```

### Enable Caching
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### Database Query Optimization
```javascript
// Add indexes
db.users.createIndex({ email: 1 });
db.accounts.createIndex({ userId: 1 });
```

---

## Scaling Strategy

### Horizontal Scaling (Multiple servers)
- Use load balancer (AWS ELB, Nginx)
- Implement session management (Redis)
- Use database replication (MongoDB replica set)

### Vertical Scaling (Bigger server)
- Increase server resources
- Optimize database queries
- Enable caching (Redis)

---

## Maintenance

### Regular Tasks
- [ ] Review and rotate API keys (monthly)
- [ ] Update dependencies (weekly)
- [ ] Check disk space (daily)
- [ ] Review error logs (daily)
- [ ] Database backups (daily)
- [ ] Security scanning (weekly)

---

## Support & Documentation

- **API Docs**: https://yourdomain.com/api-docs
- **Health Check**: https://yourdomain.com/health
- **Metrics**: https://yourdomain.com/metrics
- **GitHub Issues**: Report issues on GitHub

---

Last updated: January 2025
