# Creator OS Deployment Guide

Complete guide for deploying Creator OS in development and production environments.

## Prerequisites

- Docker & Docker Compose v2.x
- Node.js 20+ (for local development)
- Python 3.12+ (for local development)
- A domain name (for production)
- SSL certificate (for production HTTPS)

---

## Quick Start (Development)

```bash
# 1. Clone and setup
git clone https://github.com/yourusername/creator-os.git
cd creator-os

# 2. Copy environment file
cp .env.example .env
# Edit .env with your API keys (at minimum, add HF_TOKEN or GEMINI_API_KEY)

# 3. Start database services
docker-compose up -d

# 4. Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 5. Web App (new terminal)
cd web-app
npm install
npm run dev

# 6. Extension
cd extension
npm install
npm run build
# Load dist/ folder in Chrome: chrome://extensions/ → Load unpacked
```

---

## Production Deployment

### Step 1: Configure Environment

```bash
# Create production .env file
cp .env.example .env

# Generate a secure secret key
SECRET_KEY=$(openssl rand -hex 32)
echo "SECRET_KEY=$SECRET_KEY" >> .env
```

**Required Variables:**
```env
ENVIRONMENT=production
DATABASE_URL=postgresql://user:password@db:5432/creator_os
SECRET_KEY=<your-generated-secret>
POSTGRES_USER=creator_admin
POSTGRES_PASSWORD=<strong-password-16-chars-min>
POSTGRES_DB=creator_os

# Token encryption key (Fernet) - REQUIRED in production
TOKEN_ENCRYPTION_KEY=<your-fernet-base64-key>

# At least one AI provider
GEMINI_API_KEY=your_key_here

# CORS - Set your actual domains!
ALLOWED_ORIGINS=https://app.yourdomain.com,https://yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
FRONTEND_API_URL=https://api.yourdomain.com/api/v1
```

Important: `TOKEN_ENCRYPTION_KEY` must be a valid Fernet key (URL-safe base64). This key is mandatory when `ENVIRONMENT=production` and will be validated at startup to prevent insecure deployments. Generate one locally with:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Add it to your `.env`:

```env
TOKEN_ENCRYPTION_KEY=<paste-generated-key-here>
```

Keep this secret safe (do not commit `.env` to source control). If this key is missing or invalid in production, the backend will fail-fast with a clear error message.

### Step 2: Deploy with Docker Compose

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Check all services are healthy
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 3: Run Database Migrations

```bash
# Enter the backend container
docker-compose -f docker-compose.prod.yml exec backend bash

# Run migrations
alembic upgrade head
```

### Step 4: Configure HTTPS (Recommended)

#### Option A: Using Nginx + Let's Encrypt

Create `/etc/nginx/sites-available/creator-os`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com app.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com app.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Install certbot and get certificates
sudo certbot --nginx -d api.yourdomain.com -d app.yourdomain.com
```

#### Option B: Using Cloudflare

1. Add your domain to Cloudflare
2. Enable "Full (strict)" SSL mode
3. Point DNS to your server IP

---

## Extension Distribution

### Chrome Web Store

```bash
# Build production extension
cd extension
VITE_API_BASE=https://api.yourdomain.com npm run build

# Create ZIP for upload
cd dist && zip -r ../creator-os-extension.zip .
```

Upload to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)

### Manual Distribution

Provide users the `dist/` folder to load as unpacked extension in developer mode.

---

## Monitoring & Operations

### Health Checks

| Service | Endpoint | Expected |
|---------|----------|----------|
| API Gateway | `GET /health` | `{"status": "ok"}` |
| Backend | `GET /api/v1/auth/test` | `{"status": "working"}` |
| Docs | `GET /docs` | OpenAPI UI |

### Database Backup

```bash
# Manual backup
./scripts/backup.sh

# View backups
ls -la backups/
```

### Scaling

```bash
# Scale backend replicas
docker-compose -f docker-compose.prod.yml up -d --scale backend=5

# Scale workers
docker-compose -f docker-compose.prod.yml up -d --scale worker=4
```

---

## Troubleshooting

### "No AI API key configured"

Add at least one of these to your `.env`:
- `HF_TOKEN` - Free at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
- `GEMINI_API_KEY` - Free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- `OPENAI_API_KEY` - Paid at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### "Failed to fetch" in Extension

1. Check backend health: `curl http://localhost/health`
2. Verify CORS includes your extension origin
3. Check network tab for actual error

### Database Connection Errors

```bash
# Check if database is running
docker-compose -f docker-compose.prod.yml ps db

# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Verify connection string
docker-compose -f docker-compose.prod.yml exec backend python -c "from app.db.session import engine; print(engine.url)"
```

### Container Keeps Restarting

```bash
# Check container logs
docker-compose -f docker-compose.prod.yml logs backend

# Check health status
docker inspect --format='{{json .State.Health}}' creator-os-backend-1
```

---

## Security Checklist

- [ ] `SECRET_KEY` is unique (not the default value)
- [ ] Database passwords are strong (16+ characters)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] `.env` file is NOT in version control
- [ ] `ALLOWED_ORIGINS` restricted to your domains only
- [ ] Sentry DSN configured for error tracking
- [ ] Regular database backups scheduled
- [ ] Docker images are from trusted sources

---

## Architecture Overview

```
┌─────────────┐     ┌───────────────────────────────────────┐
│   Browser   │────▶│              Nginx (Port 80/443)      │
│  Extension  │     │  - /api/* → Backend (×3 replicas)     │
└─────────────┘     │  - /* → Web App (React SPA)           │
                    └───────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│    Web App    │           │    Backend    │           │    Workers    │
│  (React/Vite) │           │   (FastAPI)   │           │   (Celery)    │
└───────────────┘           └───────────────┘           └───────────────┘
                                   │                           │
                                   ▼                           ▼
                            ┌───────────────┐           ┌───────────────┐
                            │  PostgreSQL   │           │     Redis     │
                            │  (pgvector)   │           │  (Cache/MQ)   │
                            └───────────────┘           └───────────────┘
```

