# Creator OS

AI-powered content creation operating system for social media creators.

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ and npm
- **Python** 3.10+
- **PostgreSQL** (or Docker for containerized DB)

### Step 1: Clone the Repository
```bash
git clone https://github.com/Nikhileshpal145/creator-os.git
cd creator-os
```

### Step 2: Set Up Environment Variables
```bash
# Copy example env files
cp .env.example .env
cp backend/.env.example backend/.env

# Edit the .env file with your API keys
nano backend/.env
```

**Required environment variables in `backend/.env`:**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/creator_os
SECRET_KEY=your-secure-secret-key-here
HF_TOKEN=your-hugging-face-token
```

### Step 3: Set Up Backend
```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# OR: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run database migrations (requires PostgreSQL running)
alembic upgrade head
```

### Step 4: Set Up Web App
```bash
cd ../web-app

# Install dependencies
npm install
```

### Step 5: Build Extension
```bash
cd ../extension

# Install dependencies
npm install

# Build extension
npm run build
```

---

## 🏃 Running the Project

### Option A: Run All Services (Recommended)
Open 3 terminal windows:

**Terminal 1 - Backend API:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Web App:**
```bash
cd web-app
npm run dev
```

**Terminal 3 - Extension (if making changes):**
```bash
cd extension
npm run dev  # Watch mode for development
```

### Option B: Quick Commands
```bash
# Backend (from project root)
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Web App (from project root)
cd web-app && npm run dev
```

---

## 🔌 Loading the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension/dist/` folder
5. The Creator OS extension icon should appear in your toolbar

---

## 🌐 Access Points

| Service | URL |
|---------|-----|
| **Web Dashboard** | http://localhost:5173 |
| **Backend API** | http://localhost:8000 |
| **API Documentation** | http://localhost:8000/docs |
| **Health Check** | http://localhost:8000/health |

---

## 📖 Project Structure

```
creator-os/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── api/v1/   # REST endpoints
│   │   ├── models/   # Database models (SQLModel)
│   │   ├── services/ # Business logic & AI
│   │   └── core/     # Config, auth, database
│   ├── alembic/      # Database migrations
│   └── tests/        # Backend tests
├── web-app/          # React dashboard
│   └── src/
├── extension/        # Chrome extension
│   ├── src/
│   └── dist/         # Built extension (load this in Chrome)
└── docker-compose.yml
```

---

## 🐳 Docker Deployment

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🧪 Running Tests

```bash
# Backend tests
cd backend
source venv/bin/activate
pytest

# Frontend lint
cd web-app
npm run lint

# Extension build check
cd extension
npm run build
```

---

## 🔑 Getting API Keys

| Key | Purpose | Get it from |
|-----|---------|------------|
| `HF_TOKEN` | Hugging Face AI | https://huggingface.co/settings/tokens |
| `GEMINI_API_KEY` | Google Gemini (optional) | https://aistudio.google.com/apikey |
| `OPENAI_API_KEY` | OpenAI (optional) | https://platform.openai.com/api-keys |

---

## 📊 System Architecture

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ SocialAccount : "connects"
    User ||--o{ ContentDraft : "creates"
    User ||--o{ StrategyAction : "receives"
    User ||--o{ ContentPrediction : "receives"
    User ||--o{ WeeklyStrategy : "receives"

    ContentDraft ||--o{ ContentPerformance : "has history"
    ContentDraft }|--|| SocialAccount : "posted to"

    StrategyAction }|--|| ContentPattern : "based on"
    
    User {
        uuid id
        string email
        string tier
        string business_name
    }

    SocialAccount {
        uuid id
        string platform
        string account_name
        string access_token_encrypted
        bool is_active
    }

    ContentDraft {
        uuid id
        string text_content
        string status
        jsonb ai_analysis
    }
```

### Core Workflows

#### Data Ingestion Flow
```mermaid
flowchart LR
    Browser[Browser Extension] -->|Scrapes DOM| Scraper[Content Script]
    Scraper -->|Extracts Metrics| Payload[Data Payload]
    Payload -->|POST /scrape/page| API[Backend API]
    API -->|Process| Service[ScrapeService]
    Service -->|Save| DB[(Database)]
    DB -->|Trigger| AI[Analysis Engine]
```

#### AI Intelligence Loop
```mermaid
flowchart TD
    Start(Scheduler / Cron) --> Fetch[Fetch New Analytics]
    Fetch --> DB[(SocialAccount / ScrapedData)]
    DB --> Engine[Intelligence Engine]
    
    Engine --> Detect[Detect Patterns]
    Engine --> Predict[Predict Performance]
    
    Detect --> Strategy[Create StrategyAction]
    Predict --> Forecast[Create ContentPrediction]
    
    Strategy --> DB
    Forecast --> DB
    
    DB --> Dashboard[User Dashboard]
```

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.
