# Creator OS Deployment Guide

## Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.12+
- PostgreSQL with pgvector (or use Docker)

---

## Quick Start (Development)

```bash
# 1. Clone and setup
git clone https://github.com/yourusername/creator-os.git
cd creator-os

# 2. Copy environment file
cp .env.example .env
# Edit .env with your API keys (at minimum, add HF_TOKEN or GEMINI_API_KEY)

# 3. Start services
docker-compose up -d

# 4. Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 5. Extension
cd ../extension
npm install
npm run build
# Load dist/ folder in Chrome: chrome://extensions/ → Load unpacked

# 6. Web App
cd ../web-app
npm install
npm run dev
```

---

## Production Deployment

### Step 1: Configure Environment

```bash
# Create production .env file
cp .env.example .env

# Edit with production values:
nano .env
```

**Required Variables:**
```env
ENVIRONMENT=production
DATABASE_URL=postgresql://user:password@db-host:5432/creator_os
SECRET_KEY=<generate with: openssl rand -hex 32>
POSTGRES_USER=creator_admin
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=creator_os
```

**AI Provider (choose at least one):**
```env
HF_TOKEN=hf_xxxxx           # Free: huggingface.co/settings/tokens
GEMINI_API_KEY=xxxx         # Free: aistudio.google.com/apikey
OPENAI_API_KEY=sk-xxxxx     # Paid: platform.openai.com/api-keys
```

### Step 2: Update Extension API URL

Edit `extension/src/background/index.ts`:
```typescript
const API_BASE = 'https://api.yourdomain.com/api/v1';
```

Rebuild extension:
```bash
cd extension
npm run build
```

### Step 3: Deploy with Docker

```bash
# Deploy production stack
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Step 4: Configure Nginx (Optional - for HTTPS)

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Extension Distribution

### For Chrome Web Store:

1. Build production extension:
   ```bash
   cd extension
   VITE_API_BASE=https://api.yourdomain.com npm run build
   ```

2. Create ZIP:
   ```bash
   cd dist
   zip -r ../creator-os-extension.zip .
   ```

3. Upload to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)

### For Manual Distribution:

Provide users the `dist/` folder to load as unpacked extension.

---

## Health Checks

| Service | Endpoint | Expected |
|---------|----------|----------|
| Backend | `GET /health` | `{"status": "ok"}` |
| API | `GET /api/v1/auth/test` | `{"status": "working"}` |

---

## Troubleshooting

### "No AI API key configured"
Add at least one of: `HF_TOKEN`, `GEMINI_API_KEY`, or `OPENAI_API_KEY` to `.env`

### "Failed to fetch" in extension
1. Check backend is running: `curl http://localhost:8000/health`
2. Check CORS settings in `backend/app/main.py`

### Database connection errors
1. Check `DATABASE_URL` is correct
2. Ensure PostgreSQL is running: `docker-compose ps`

---

## Security Checklist

- [ ] SECRET_KEY is unique and not the default
- [ ] Database passwords are strong (16+ chars)
- [ ] HTTPS enabled in production
- [ ] .env file is NOT in version control
- [ ] CORS restricted to your domains only
