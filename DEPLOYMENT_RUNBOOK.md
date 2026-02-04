# Production Deployment Runbook

Complete guide for deploying Projeto SASS to production on vendata.com.br.

**Estimated Time**: 30-60 minutes
**Prerequisites**: Docker, Docker Compose, Linux server

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Server Setup](#server-setup)
3. [Environment Configuration](#environment-configuration)
4. [SSL/TLS Setup](#ssltls-setup)
5. [Docker Deployment](#docker-deployment)
6. [Verification](#verification)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Plan](#rollback-plan)

---

## Pre-Deployment Checklist

### Required Resources

- [ ] Linux server (Ubuntu 20.04+ or RHEL 8+)
- [ ] Domain: vendata.com.br (DNS configured)
- [ ] SSL certificate (Let's Encrypt free)
- [ ] Minimum 2GB RAM, 20GB storage
- [ ] Docker 20.10+
- [ ] Docker Compose 1.29+

### Team Preparation

- [ ] All team members have SSH access
- [ ] Backup procedures documented
- [ ] Rollback plan tested
- [ ] Monitoring configured
- [ ] Support contacts listed

### Code Preparation

- [ ] All tests passing: `npm test`
- [ ] Frontend built: `npm run build`
- [ ] No hardcoded secrets in code
- [ ] Environment variables documented
- [ ] Recent commit tagged as release

### Security

- [ ] Database passwords changed from defaults
- [ ] JWT_SECRET is 64+ character random string
- [ ] ADMIN_TOKEN is complex and unique
- [ ] All credentials in .env.production (not version controlled)
- [ ] Firewall rules configured

---

## Server Setup

### Step 1: Connect to Server

```bash
ssh root@your-server-ip
```

### Step 2: Update System

```bash
apt update && apt upgrade -y
apt install -y curl git wget gnupg lsb-release ca-certificates
```

### Step 3: Install Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker root
```

### Step 4: Install Docker Compose

```bash
curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### Step 5: Create Application Directory

```bash
mkdir -p /opt/projeto-sass
cd /opt/projeto-sass
git clone https://github.com/Billhebert/projeto-sass.git .
```

### Step 6: Create Required Directories

```bash
mkdir -p data/mongo data/logs
chmod 755 data
```

---

## Environment Configuration

### Step 1: Create Production Environment File

```bash
cp .env.production.example .env.production
nano .env.production
```

### Step 2: Generate Secure Secrets

```bash
# Generate 64-char random string for JWT_SECRET
openssl rand -base64 48

# Generate 32-char random string for passwords
openssl rand -hex 16

# Generate complex ADMIN_TOKEN
openssl rand -base64 32
```

### Step 3: Update .env.production

```bash
# Set all the following values:
JWT_SECRET=<your-64-char-secret>
MONGO_PASSWORD=<your-mongo-password>
REDIS_PASSWORD=<your-redis-password>
ADMIN_TOKEN=<your-admin-token>
SESSION_SECRET=<your-session-secret>

# Verify values are set
grep -E "SECRET|PASSWORD|TOKEN" .env.production
```

### Step 4: Configure Email Provider

See [EMAIL_PROVIDER_SETUP.md](./EMAIL_PROVIDER_SETUP.md) for detailed instructions.

**For Now (Test Mode)**:

```bash
EMAIL_MODE=test
```

---

## SSL/TLS Setup

### Step 1: Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### Step 2: Create Nginx Config (Before SSL)

```bash
cat > /etc/nginx/sites-available/vendata.com.br <<'EOF'
server {
    listen 80;
    server_name vendata.com.br api.vendata.com.br;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}
EOF

ln -s /etc/nginx/sites-available/vendata.com.br /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

### Step 3: Generate SSL Certificate

```bash
certbot certonly --webroot \
  -w /var/www/certbot \
  -d vendata.com.br \
  -d api.vendata.com.br \
  --email seu-email@example.com \
  --agree-tos \
  --non-interactive
```

### Step 4: Configure Production Nginx

```bash
cp nginx.prod.conf /etc/nginx/sites-available/vendata.com.br
# Edit certificate paths in the file
nano /etc/nginx/sites-available/vendata.com.br

# Test and reload
nginx -t && systemctl reload nginx
```

### Step 5: Setup Auto-Renewal

```bash
certbot renew --dry-run
systemctl enable certbot.timer
```

---

## Docker Deployment

### Step 1: Build and Start Containers

```bash
cd /opt/projeto-sass

# Load environment
export $(cat .env.production | xargs)

# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
sleep 15
docker compose -f docker-compose.prod.yml ps
```

### Step 2: Verify Services

```bash
# Check all containers are running
docker compose ps

# Expected output:
# API: Up (healthy)
# Frontend: Up (healthy)
# MongoDB: Up (healthy)
# Redis: Up (healthy)
# Nginx: Up

# Check logs
docker compose logs api | tail -20
docker compose logs frontend | tail -20
```

### Step 3: Initialize Database

```bash
# MongoDB collections will auto-create
# Verify connection
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"
```

---

## Verification

### Step 1: Test API Endpoints

```bash
# Health check
curl -s https://api.vendata.com.br/health | jq .

# Expected:
# {
#   "status": "ok",
#   "environment": "production",
#   "mongodb": { "connected": true }
# }
```

### Step 2: Test Frontend

```bash
# Check frontend is served
curl -s -I https://vendata.com.br | head -5

# Expected:
# HTTP/2 200
# content-type: text/html
```

### Step 3: Test Registration

```bash
TIMESTAMP=$(date +%s)
curl -X POST https://api.vendata.com.br/api/user/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test${TIMESTAMP}@example.com\",
    \"password\": \"TestPassword123!\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }"

# Expected: 201 Created with user data
```

### Step 4: Test Admin Panel

```bash
# Access admin panel
curl -s https://vendata.com.br/admin | grep -q "Admin" && echo "✓ Admin panel accessible"
```

### Step 5: SSL Certificate Verification

```bash
# Check SSL certificate
curl -vI https://vendata.com.br 2>&1 | grep -E "subject=|issuer="

# Expected: Let's Encrypt certificate
```

---

## Post-Deployment

### Step 1: Setup Monitoring

```bash
# Check logs daily
docker compose logs api | tail -100 > /var/log/projeto-sass/app.log

# Setup log rotation
cat > /etc/logrotate.d/projeto-sass <<'EOF'
/var/log/projeto-sass/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
EOF
```

### Step 2: Backup Configuration

```bash
# Create backup directory
mkdir -p /backups/projeto-sass

# Backup environment file (encrypted)
gpg --symmetric .env.production
cp .env.production.gpg /backups/projeto-sass/

# Backup procedure
cat > /opt/projeto-sass/backup.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker compose exec -T mongo mongodump --out /backup/mongo-$DATE
tar czf /backups/projeto-sass/db-$DATE.tar.gz /backup/mongo-$DATE
rm -rf /backup/mongo-$DATE
echo "Backup completed: $DATE"
EOF

chmod +x /opt/projeto-sass/backup.sh

# Schedule daily backups
echo "0 2 * * * /opt/projeto-sass/backup.sh" | crontab -
```

### Step 3: Performance Optimization

```bash
# Adjust Docker resource limits in docker-compose.prod.yml
# Monitor memory usage
docker stats

# Configure swap if needed
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

### Step 4: Create Deployment Checklist

```bash
cat > /opt/projeto-sass/DEPLOYMENT_CHECKLIST.md <<'EOF'
# Post-Deployment Checklist

## Day 1
- [ ] Monitor API logs for errors
- [ ] Test user registration/login
- [ ] Check email delivery (if configured)
- [ ] Verify admin panel works
- [ ] Check database backups

## Week 1
- [ ] Monitor error rates
- [ ] Check response times
- [ ] Review user feedback
- [ ] Test role-based access
- [ ] Verify security headers

## Month 1
- [ ] Optimize database indexes
- [ ] Review and adjust resource limits
- [ ] Update dependencies
- [ ] Performance testing with 5K users
- [ ] Disaster recovery drill
EOF
```

---

## Troubleshooting

### API Container Not Starting

```bash
# Check logs
docker compose logs api

# Common issues:
# - MongoDB not connected: Check MONGODB_URI
# - Port already in use: Check port 3011
# - JWT_SECRET not set: Verify .env.production

# Restart
docker compose restart api
```

### Frontend Not Loading

```bash
# Check frontend container
docker compose logs frontend

# Rebuild if needed
docker compose up -d --build frontend

# Clear browser cache and reload
```

### Nginx SSL Issues

```bash
# Test nginx config
nginx -t

# View certificate details
openssl x509 -in /etc/letsencrypt/live/vendata.com.br/fullchain.pem -text -noout

# Reload nginx
systemctl reload nginx
```

### High Memory Usage

```bash
# Check which service is using memory
docker stats

# Adjust container limits in docker-compose.prod.yml
# Restart service
docker compose restart api
```

### Database Connection Issues

```bash
# Check MongoDB is running
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"

# View MongoDB logs
docker compose logs mongo | tail -50

# Check credentials
echo $MONGODB_URI
```

---

## Rollback Plan

### Quick Rollback (Last 24 hours)

```bash
# If deployment has issues, revert to previous version
cd /opt/projeto-sass

# Stop current deployment
docker compose down

# Checkout previous version
git log --oneline | head -5
git checkout <previous-commit>

# Restore .env.production
# (should be outside git repo)

# Start previous version
docker compose up -d

# Verify
curl -s https://api.vendata.com.br/health
```

### Restore from Backup

```bash
# Stop containers
docker compose down

# Restore database
tar xzf /backups/projeto-sass/db-<date>.tar.gz
docker compose exec -T mongo mongorestore /backup/mongo-<date>

# Start services
docker compose up -d

# Verify
docker compose ps
```

### Full Rollback Procedure

```bash
#!/bin/bash
# 1. Stop all services
docker compose down

# 2. Restore backed up data
LATEST_BACKUP=$(ls -t /backups/projeto-sass/db-*.tar.gz | head -1)
tar xzf $LATEST_BACKUP
docker compose exec -T mongo mongorestore /backup/mongo-$(basename $LATEST_BACKUP)

# 3. Checkout previous code
git checkout <backup-commit>

# 4. Verify .env.production is current
diff .env.production .env.production.bak

# 5. Restart
docker compose up -d

# 6. Verify
docker compose ps
curl https://api.vendata.com.br/health
```

---

## Maintenance Tasks

### Daily

- [ ] Monitor error logs
- [ ] Check database size
- [ ] Verify backups completed

### Weekly

- [ ] Review user registrations
- [ ] Check email delivery rates
- [ ] Performance metrics review

### Monthly

- [ ] Database optimization
- [ ] Security patch updates
- [ ] Capacity planning
- [ ] Cost analysis

### Quarterly

- [ ] Disaster recovery drill
- [ ] Security audit
- [ ] Performance optimization
- [ ] Feature release planning

---

## Support Contacts

- **DevOps Lead**: [name] [email]
- **Database Admin**: [name] [email]
- **Security Officer**: [name] [email]
- **Support Team**: [email]

---

## Additional Resources

- [EMAIL_PROVIDER_SETUP.md](./EMAIL_PROVIDER_SETUP.md) - Email configuration
- [SCALABILITY_KUBERNETES.md](./SCALABILITY_KUBERNETES.md) - Scaling to 5K+ users
- [ROLES_PERMISSIONS_API.md](./ROLES_PERMISSIONS_API.md) - Role-based access control
- [API Documentation](./api-docs.md) - API endpoints reference
