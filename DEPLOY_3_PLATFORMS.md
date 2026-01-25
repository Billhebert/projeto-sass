# Deploy Projeto SASS to 3 Different Platforms

Complete step-by-step guide to deploy the Projeto SASS Dashboard to production using 3 popular hosting options: **DigitalOcean VPS**, **Docker/Container**, and **Heroku Cloud**.

## Quick Links
- **Option 1**: [DigitalOcean / AWS EC2 / Linode VPS](#option-1-linux-vps-digitalocean--aws-ec2--linode)
- **Option 2**: [Docker Containerization](#option-2-docker-containerization)
- **Option 3**: [Heroku Cloud Platform](#option-3-heroku-cloud-platform)

---

## Option 1: Linux VPS (DigitalOcean / AWS EC2 / Linode)

### Step 1: Create & Configure VPS

#### DigitalOcean Droplet:
1. Go to https://cloud.digitalocean.com/
2. Click **"Create"** → **"Droplet"**
3. Select:
   - **OS**: Ubuntu 22.04 LTS (Recommended)
   - **Plan**: $6-12/month (2GB RAM, 1 vCPU minimum)
   - **Region**: Closest to your users
   - **SSH Key**: Add your SSH public key (or password)
4. Click **"Create"**
5. Copy the IP address (e.g., `123.45.67.89`)

#### AWS EC2:
1. Go to https://console.aws.amazon.com/ec2/
2. Launch instance with Ubuntu 22.04 LTS
3. Security group: Allow HTTP (80) and HTTPS (443)
4. Create/use key pair
5. Copy Public IPv4 address

### Step 2: Connect to VPS

```bash
# Via SSH (Linux/macOS/Windows WSL2)
ssh root@YOUR_VPS_IP

# Or with specific key file
ssh -i /path/to/key.pem ubuntu@YOUR_VPS_IP
```

### Step 3: System Setup (Run Once)

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs npm

# Install Git
sudo apt-get install -y git

# Install MongoDB (if not using cloud MongoDB)
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Nginx
sudo apt-get install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install certbot for SSL (Let's Encrypt)
sudo apt-get install -y certbot python3-certbot-nginx
```

### Step 4: Clone & Setup Application

```bash
# Create app directory
sudo mkdir -p /var/www/projeto-sass
cd /var/www/projeto-sass

# Clone repository
sudo git clone https://github.com/YOUR_USERNAME/projeto-sass.git .

# Set permissions
sudo chown -R $USER:$USER /var/www/projeto-sass

# Install dependencies
npm install

# Create .env file with production credentials
nano backend/.env

# Fill in:
# NODE_ENV=production
# MONGODB_URI=mongodb://localhost:27017/projeto-sass
# ML_CLIENT_ID=your_real_id
# ML_CLIENT_SECRET=your_real_secret
# ML_REDIRECT_URI=https://yourdomain.com/examples/auth/mercado-livre-callback.html
# FRONTEND_URL=https://yourdomain.com
```

### Step 5: Configure MongoDB (Optional)

If using MongoDB Atlas (Cloud):
```bash
# Update .env with Atlas connection string
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/projeto-sass
```

If using local MongoDB, set up authentication:
```bash
# Connect to MongoDB
mongosh

# Create database and user
use projeto-sass
db.createUser({
  user: "admin",
  pwd: "your_secure_password",
  roles: ["dbOwner", "userAdmin"]
})

exit
```

### Step 6: Setup SSL with Let's Encrypt

```bash
# Stop Nginx temporarily
sudo systemctl stop nginx

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates stored in: /etc/letsencrypt/live/yourdomain.com/
```

### Step 7: Configure Nginx

Create Nginx config file:
```bash
sudo nano /etc/nginx/sites-available/projeto-sass
```

Paste this configuration:
```nginx
upstream api {
    server localhost:3000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Proxy to Node.js
    location / {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/projeto-sass /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t  # Test configuration
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 8: Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Make it start on boot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs
```

### Step 9: Setup Auto-Renewal for SSL

```bash
# Test renewal
sudo certbot renew --dry-run

# If successful, Certbot will auto-renew
# Check: sudo systemctl enable certbot.timer
```

### Step 10: Verify Deployment

```bash
# Check health endpoint
curl https://yourdomain.com/health

# Check PM2 status
pm2 status
pm2 logs

# Check Nginx status
sudo systemctl status nginx

# Monitor server
htop
```

### VPS Deployment Summary

```bash
# All in one command (after initial setup):
cd /var/www/projeto-sass && git pull && npm install && pm2 restart all
```

---

## Option 2: Docker Containerization

### Step 1: Install Docker

#### macOS/Windows:
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Install and start Docker
3. Verify: `docker --version`

#### Linux:
```bash
# Install Docker
sudo apt-get install -y docker.io docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker-compose --version
```

### Step 2: Build Docker Image

```bash
# Navigate to project
cd /path/to/projeto-sass

# Build image
docker build -t projeto-sass:latest .

# Verify image
docker images | grep projeto-sass
```

### Step 3: Setup Docker Compose

The `docker-compose.yml` is already configured. Review it:

```bash
cat docker-compose.yml
```

Create `.env.docker` file:
```bash
cat > backend/.env.production << EOF
NODE_ENV=production
MONGODB_URI=mongodb://mongo:27017/projeto-sass
ML_CLIENT_ID=your_real_id
ML_CLIENT_SECRET=your_real_secret
ML_REDIRECT_URI=https://yourdomain.com/examples/auth/mercado-livre-callback.html
FRONTEND_URL=https://yourdomain.com
LOG_LEVEL=info
PORT=3000
EOF
```

### Step 4: Run with Docker Compose

```bash
# Start services (API, MongoDB, Nginx)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Step 5: Deploy to Production (Docker)

#### Option A: DigitalOcean App Platform

1. Push image to Docker Hub or GitHub Container Registry:
```bash
# Tag image
docker tag projeto-sass:latest your-registry/projeto-sass:latest

# Login (if using Docker Hub)
docker login

# Push
docker push your-registry/projeto-sass:latest
```

2. Go to DigitalOcean App Platform: https://cloud.digitalocean.com/apps
3. Create new app
4. Select Docker container source
5. Point to your container image
6. Configure environment variables (from `.env`)
7. Set resource limits (512MB RAM minimum)
8. Deploy

#### Option B: AWS ECS / EKS

```bash
# Create ECR repository
aws ecr create-repository --repository-name projeto-sass

# Push to ECR
docker tag projeto-sass:latest YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/projeto-sass:latest
docker push YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/projeto-sass:latest

# Deploy using CloudFormation or ECS Console
```

#### Option C: Local Docker Swarm / Kubernetes

```bash
# Single node deployment
docker run -d \
  --name projeto-sass \
  -p 3000:3000 \
  --env-file backend/.env.production \
  projeto-sass:latest

# With Kubernetes
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: projeto-sass
spec:
  replicas: 3
  selector:
    matchLabels:
      app: projeto-sass
  template:
    metadata:
      labels:
        app: projeto-sass
    spec:
      containers:
      - name: api
        image: projeto-sass:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: projeto-sass-config
EOF
```

### Docker Deployment Summary

```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Option 3: Heroku Cloud Platform

### Step 1: Create Heroku Account

1. Go to https://www.heroku.com/
2. Sign up (free tier available)
3. Verify email
4. Create new app

### Step 2: Install Heroku CLI

```bash
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# macOS
brew tap heroku/brew && brew install heroku

# Verify
heroku --version

# Login
heroku login
```

### Step 3: Configure Heroku App

```bash
# Create app
heroku create projeto-sass-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set ML_CLIENT_ID="your_real_id"
heroku config:set ML_CLIENT_SECRET="your_real_secret"
heroku config:set ML_REDIRECT_URI="https://projeto-sass-app.herokuapp.com/examples/auth/mercado-livre-callback.html"

# Add MongoDB (MongoDB Atlas or Heroku add-on)
heroku config:set MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/projeto-sass"

# Verify config
heroku config
```

### Step 4: Configure Procfile

Create `Procfile` in root:
```
web: npm run start
worker: npm run worker
```

Or update existing one:
```bash
cat > Procfile << EOF
web: node backend/server.js
EOF
```

### Step 5: Deploy to Heroku

```bash
# Add Heroku remote
git remote add heroku https://git.heroku.com/projeto-sass-app.git

# Deploy
git push heroku main

# Or if on master branch
git push heroku master

# View logs
heroku logs --tail

# Verify app is running
heroku open
curl https://projeto-sass-app.herokuapp.com/health
```

### Step 6: Scale Dynos (Optional)

```bash
# View current dynos
heroku ps

# Upgrade from free to paid (Eco Plan $5/month)
heroku dyno:type eco

# Scale to multiple dynos
heroku ps:scale web=2
heroku ps:scale worker=1
```

### Step 7: Setup MongoDB (MongoDB Atlas)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster (free tier available)
3. Create database user
4. Get connection string
5. Add to Heroku: `heroku config:set MONGODB_URI="..."`

### Heroku Deployment Summary

```bash
# One command deployment
git push heroku main

# Monitor
heroku logs --tail
heroku open
```

---

## Comparison Table

| Feature | VPS | Docker | Heroku |
|---------|-----|--------|--------|
| **Cost** | $6-12/mo | $0-20/mo | $7+/mo |
| **Setup Time** | 30-60 min | 10-15 min | 5 min |
| **Difficulty** | Medium | Easy | Very Easy |
| **Control** | Full | Full | Limited |
| **Scalability** | Manual | Automatic | Built-in |
| **Free Tier** | No | Yes | Yes (limited) |
| **SSL** | Free (Let's Encrypt) | Manual | Automatic |
| **Database** | Local or Atlas | Local or Atlas | Atlas (recommended) |
| **Best For** | Full control | Production | Quick launch |

---

## Common Deployment Issues

### Issue 1: MongoDB Connection Error

**Solution:**
```bash
# Check connection string format
# Should be: mongodb://host:port/database
# Or: mongodb+srv://user:pass@cluster.mongodb.net/database

# If local MongoDB:
sudo systemctl status mongod
sudo systemctl restart mongod
```

### Issue 2: Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

### Issue 3: SSL Certificate Error

```bash
# Renew certificate
sudo certbot renew --force-renewal

# Check certificate validity
sudo certbot certificates

# Redirect HTTP to HTTPS in Nginx (see above)
```

### Issue 4: Mercado Livre Redirect URI Mismatch

**Solution:**
1. Go to https://developers.mercadolibre.com/your-apps
2. Edit your app
3. Update Redirect URI to match deployment domain:
   - VPS: `https://yourdomain.com/examples/auth/mercado-livre-callback.html`
   - Docker: `https://your-app.herokuapp.com/examples/auth/mercado-livre-callback.html`
   - Heroku: `https://projeto-sass-app.herokuapp.com/examples/auth/mercado-livre-callback.html`

### Issue 5: Environment Variables Not Loading

```bash
# VPS (PM2)
pm2 show projeto-sass
pm2 env projeto-sass  # Check variables

# Docker
docker exec -it app-name printenv | grep NODE_ENV

# Heroku
heroku config
```

---

## Post-Deployment Checklist

- [ ] Domain points to server
- [ ] SSL certificate is valid
- [ ] Health endpoint responds: `curl https://domain.com/health`
- [ ] MongoDB is connected and accessible
- [ ] Mercado Livre OAuth redirect URI is registered
- [ ] Environment variables are set correctly
- [ ] Application logs are being collected
- [ ] Backups are scheduled (if VPS)
- [ ] Monitoring/alerts are configured
- [ ] Rate limiting is active
- [ ] CORS is properly configured
- [ ] Tests pass: `npm test`
- [ ] Application starts on reboot

---

## Quick Reference Commands

### VPS Commands
```bash
# Check app status
pm2 status

# View logs
pm2 logs proyecto-sass

# Restart app
pm2 restart all

# SSH to server
ssh -i key.pem ubuntu@IP_ADDRESS
```

### Docker Commands
```bash
# Build & run
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Rebuild image
docker-compose build --no-cache
```

### Heroku Commands
```bash
# Deploy
git push heroku main

# View logs
heroku logs --tail

# Open app
heroku open

# Scale dynos
heroku ps:scale web=2
```

---

## Support & Resources

- **Projeto SASS Docs**: See `README.md` and `PRODUCTION_READY.md`
- **Mercado Livre API**: https://developers.mercadolibre.com/
- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **DigitalOcean**: https://www.digitalocean.com/docs
- **Docker**: https://docs.docker.com/
- **Heroku**: https://devcenter.heroku.com/

For issues or questions, check the main documentation or create an issue on GitHub.

