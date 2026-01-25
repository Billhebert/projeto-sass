# Projeto SASS - Deployment & Production Setup Guide

Complete guide to deploy the Projeto SASS Dashboard with Mercado Livre integration to production.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Mercado Livre App Configuration](#mercado-livre-app-configuration)
4. [Environment Setup](#environment-setup)
5. [Running the Application](#running-the-application)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)
8. [Security Checklist](#security-checklist)

---

## Prerequisites

Before starting, ensure you have:

- **Node.js**: v14 or higher (check with `node --version`)
- **npm**: v6 or higher (check with `npm --version`)
- **Git**: For version control
- **HTTPS Certificate**: Required for production OAuth (self-signed OK for dev)
- **Domain/Subdomain**: For production deployment
- **Mercado Livre Account**: To register your app in DevCenter

### Install Node.js

**Windows/macOS:**
- Download from https://nodejs.org/ (LTS version recommended)
- Run installer and follow prompts

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## Local Development Setup

### 1. Clone/Setup Project

```bash
cd your-project-directory
# Initialize git if not already done
git init

# Install dependencies
npm install
```

### 2. Directory Structure Check

Verify the backend structure exists:

```
projeto-sass/
├── backend/
│   ├── server.js                 (✓ Created)
│   ├── .env.example              (✓ Created)
│   ├── routes/
│   │   ├── auth.js              (✓ OAuth handler)
│   │   ├── webhooks.js          (✓ ML webhooks)
│   │   ├── accounts.js          (✓ Account management)
│   │   └── sync.js              (✓ Data sync)
│   ├── db/
│   │   └── accounts.js          (✓ Data persistence)
│   └── data/                     (Created at runtime)
├── src/
│   └── scripts/
│       └── mercado-livre/
│           ├── auth.js          (✓ Frontend auth)
│           ├── api-client.js    (✓ API client)
│           ├── secure-storage.js (✓ Token storage)
│           └── sync-manager.js  (✓ Data sync)
├── examples/
│   ├── auth/
│   │   └── mercado-livre-callback.html (✓ OAuth callback)
│   └── dashboard/
│       └── mercado-livre-accounts.html (✓ Account UI)
└── package.json                  (✓ Updated with backend deps)
```

---

## Mercado Livre App Configuration

### Step 1: Register App on Mercado Livre DevCenter

1. Go to **https://developers.mercadolibre.com**
2. Sign in with your Mercado Livre account
3. Click **"My Applications"** or **"Aplicaciones"**
4. Click **"Create New App"** or **"Crear nueva aplicación"**
5. Fill in:
   - **Name**: "Projeto SASS Dashboard" (or your app name)
   - **Category**: "Sales Tools" (or relevant category)
   - **Description**: "Multi-account Mercado Livre management dashboard"

### Step 2: Configure OAuth

In your app settings, configure:

#### Redirect URIs (Callback URLs)

Add ALL of these (one per line):

**Development:**
```
http://localhost:5000/examples/auth/mercado-livre-callback.html
http://localhost:3000/examples/auth/mercado-livre-callback.html
```

**Production:**
```
https://yourdomain.com/examples/auth/mercado-livre-callback.html
https://api.yourdomain.com/examples/auth/mercado-livre-callback.html
```

> **IMPORTANT**: The URL must exactly match the one in your `ML_REDIRECT_URI` environment variable. No trailing slashes, exact domain.

#### Requested Scopes

Select these scopes:
- ✓ **read** - Read user data, items, orders
- ✓ **write** - Modify items, prices, stock
- ✓ **offline_access** - Get refresh tokens

### Step 3: Get Your Credentials

After creating the app, you'll see:

- **Client ID** (e.g., `123456789`)
- **Client Secret** (e.g., `aBcDeFgHiJkLmNoPqRsTuVwXyZ`)

**IMPORTANT**: Never share your Client Secret! Store it securely.

---

## Environment Setup

### 1. Create .env File (Development)

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```
# Environment
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5000

# Mercado Livre OAuth
ML_CLIENT_ID=your_client_id_here
ML_CLIENT_SECRET=your_client_secret_here
ML_REDIRECT_URI=http://localhost:5000/examples/auth/mercado-livre-callback.html
```

Replace:
- `your_client_id_here` with your actual Client ID
- `your_client_secret_here` with your actual Client Secret

### 2. Create .env File (Production)

For production, create a new file or update the existing with:

```
# Environment
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

# Mercado Livre OAuth
ML_CLIENT_ID=your_client_id_here
ML_CLIENT_SECRET=your_client_secret_here
ML_REDIRECT_URI=https://yourdomain.com/examples/auth/mercado-livre-callback.html

# Security
VERIFY_SIGNATURES=true
```

> **SECURITY**: Never commit `.env` files to git. They're already in `.gitignore`.

---

## Running the Application

### Development Mode

**Terminal 1 - Backend (Node.js)**

```bash
cd backend
npm start
```

Expected output:
```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  PROJETO SASS - Backend Server                                ║
║  Environment: DEVELOPMENT                                      ║
║  Port: 3000                                                    ║
║  WebSocket: /ws                                               ║
║                                                                ║
║  API Endpoints:                                               ║
║    • POST   /api/auth/ml-callback     - OAuth token exchange  ║
║    • POST   /api/auth/ml-refresh      - Token refresh         ║
║    • GET    /api/accounts             - List accounts         ║
║    • POST   /api/accounts/:id/sync    - Sync account          ║
║    • POST   /api/webhooks/ml          - ML webhook events     ║
║    • GET    /health                   - Health check          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

**Terminal 2 - Frontend Server**

Use any HTTP server to serve the frontend. Options:

```bash
# Using Python 3
python -m http.server 5000 --directory ./

# Using Node.js http-server (install first: npm install -g http-server)
http-server -p 5000 -c-1

# Using Ruby
ruby -run -ehttpd . -p5000

# Using PHP
php -S localhost:5000
```

### Test the Connection

1. Open browser: `http://localhost:5000/examples/dashboard/index.html`
2. Click "Connect Mercado Livre Account"
3. Authorize on Mercado Livre
4. You'll be redirected back to the callback page
5. Account should appear in the dashboard

---

## Production Deployment

### Option 1: Deploy on VPS (Recommended)

#### 1.1 Server Setup

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs git

# Install Nginx (reverse proxy)
apt install -y nginx

# Install SSL certificate (Let's Encrypt)
apt install -y certbot python3-certbot-nginx
```

#### 1.2 Clone Project

```bash
cd /var/www
git clone your-repo-url projeto-sass
cd projeto-sass
npm install
```

#### 1.3 Configure Environment

```bash
cd backend
nano .env
```

Update with production values:

```
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

ML_CLIENT_ID=your_prod_client_id
ML_CLIENT_SECRET=your_prod_client_secret
ML_REDIRECT_URI=https://yourdomain.com/examples/auth/mercado-livre-callback.html

VERIFY_SIGNATURES=true
```

#### 1.4 Setup Nginx Reverse Proxy

Edit `/etc/nginx/sites-available/default`:

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL certificate paths
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Root directory for static files
    root /var/www/projeto-sass;
    
    # Backend proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Static files
    location / {
        try_files $uri $uri/ =404;
    }
}
```

Reload Nginx:

```bash
nginx -t  # Test config
systemctl restart nginx
```

#### 1.5 Setup SSL Certificate

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### 1.6 Setup PM2 (Process Manager)

```bash
npm install -g pm2

cd /var/www/projeto-sass/backend

# Start backend with PM2
pm2 start server.js --name "projeto-sass-backend" --env production

# Save PM2 config
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

#### 1.7 Verify Setup

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs projeto-sass-backend

# Health check
curl http://localhost:3000/health
```

### Option 2: Deploy on Heroku

#### 2.1 Create Heroku App

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create seu-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set ML_CLIENT_ID=your_client_id
heroku config:set ML_CLIENT_SECRET=your_client_secret
heroku config:set ML_REDIRECT_URI=https://seu-app-name.herokuapp.com/examples/auth/mercado-livre-callback.html
```

#### 2.2 Deploy

```bash
# Push to Heroku
git push heroku main

# View logs
heroku logs --tail
```

### Option 3: Deploy on Railway/Render

Both have similar free tier options. Follow their docs for Node.js deployment and set environment variables in the dashboard.

---

## Troubleshooting

### Issue: "Invalid Client ID" or "Client Secret" error

**Solution:**
1. Verify credentials in `.env` match your ML app settings
2. Check for extra spaces or quotes
3. Ensure you're using development credentials for `http://localhost` URLs

### Issue: Redirect URI mismatch

**Solution:**
1. The redirect URI must **exactly** match in three places:
   - ML DevCenter app settings
   - `backend/.env` `ML_REDIRECT_URI` variable
   - Frontend callback page URL in browser

2. Common issues:
   - Missing/extra `http://` or `https://`
   - Trailing slash difference (`/callback` vs `/callback/`)
   - Using `localhost` vs `127.0.0.1`
   - Port number mismatch

### Issue: Backend not responding to API calls

**Solution:**
1. Check backend is running: `npm start`
2. Verify port 3000 is not in use: `netstat -tlnp | grep 3000`
3. Check firewall allows port 3000
4. In production, verify Nginx is proxying correctly

### Issue: WebSocket connection failing

**Solution:**
1. Ensure Nginx has WebSocket upgrade headers (see Nginx config above)
2. Check client connecting to correct WS URL: `wss://yourdomain.com/ws`
3. Verify SSL certificate is valid

### Issue: Tokens not being saved

**Solution:**
1. Check browser console for crypto errors
2. Ensure `localStorage` is not disabled
3. Check `backend/data/` directory has write permissions

---

## Security Checklist

Before going to production, verify:

### ✓ Environment Variables
- [ ] `.env` file created and NOT committed to git
- [ ] All sensitive values filled in (CLIENT_SECRET, etc.)
- [ ] `NODE_ENV=production` set
- [ ] `VERIFY_SIGNATURES=true` enabled

### ✓ HTTPS/SSL
- [ ] Valid SSL certificate installed
- [ ] HTTP requests redirect to HTTPS
- [ ] No warnings in browser console about SSL

### ✓ OAuth Security
- [ ] Redirect URI exactly matches in all three places
- [ ] Client ID and Secret kept confidential
- [ ] Scopes limited to necessary permissions

### ✓ Secrets Management
- [ ] No credentials in source code
- [ ] No `.env` in git history
- [ ] Credentials rotated regularly
- [ ] Server logs don't contain sensitive data

### ✓ Data Security
- [ ] Tokens encrypted in localStorage (AES-256)
- [ ] No tokens in URLs or query parameters
- [ ] Database backups configured
- [ ] Data retention policy enforced

### ✓ API Security
- [ ] CORS properly configured
- [ ] Rate limiting implemented (optional)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (if using DB)

### ✓ Monitoring
- [ ] Error logging setup (Sentry/LogRocket)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Performance monitoring
- [ ] Security alerts configured

### ✓ Backups
- [ ] Database backups automated
- [ ] Configuration backups
- [ ] Code backups/version control
- [ ] Disaster recovery plan

---

## Next Steps

1. **Test Full OAuth Flow**
   - Register app on ML DevCenter
   - Connect account through dashboard
   - Verify data syncs correctly

2. **Setup Webhooks**
   - Configure webhook URL in ML app settings
   - Test webhook signature verification
   - Monitor webhook processing

3. **Monitor Production**
   - Setup error tracking
   - Configure alerts
   - Monitor resource usage

4. **Scale Application**
   - Setup load balancing if needed
   - Database optimization
   - Cache configuration

---

## Support & Documentation

- **Mercado Livre Docs**: https://developers.mercadolibre.com
- **Node.js Docs**: https://nodejs.org/docs/
- **Express Docs**: https://expressjs.com/
- **Nginx Docs**: https://nginx.org/en/docs/

---

## Version Info

- **Backend**: Node.js + Express.js
- **Frontend**: Vanilla JavaScript (ES6+)
- **Database**: File-based (development) - Migrate to MongoDB/PostgreSQL for production
- **Package Version**: Check `package.json` for current versions

---

Last Updated: January 24, 2025
