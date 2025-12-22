# Creator OS

AI-powered content creation operating system.
# Creator OS - System Architecture

## Entity Relationship Diagram (ERD)

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
        datetime last_synced_at
    }

    ContentDraft {
        uuid id
        string text_content
        string status
        jsonb ai_analysis
    }

    ContentPerformance {
        uuid id
        int views
        int likes
        int comments
        datetime recorded_at
    }

    StrategyAction {
        uuid id
        string action_type
        string status
        string predicted_impact
        datetime recommended_time
    }
```

---

## Core Workflows

### 1. Social Account Connection (OAuth)
Direct API access allows Creator OS to fetch verified analytics and post content.

```mermaid
sequenceDiagram
    participant User
    participant Frontend (Dashboard)
    participant Backend (OAuth API)
    participant Provider (Google/Meta)
    participant DB

    User->>Frontend: Clicks "Connect YouTube"
    Frontend->>Backend: GET /auth/youtube/connect
    Backend-->>Frontend: 307 Redirect (to Google)
    Frontend->>Provider: User Authorizes App
    Provider->>Backend: Callback with Authorization Code
    Backend->>Provider: Exchange Code for Access Token
    Provider-->>Backend: Returns Access/Refresh Function
    Backend->>DB: Encrypt & Store in SocialAccount
    Backend->>Frontend: Redirect to Dashboard (Success)
```

### 2. Data Ingestion & Scraping
The browser extension acts as a sensory organ, capturing real-time data from user browsing.

```mermaid
flowchart LR
    Browser[Browser Extension] -->|Scrapes DOM| Scraper[Content Script]
    Scraper -->|Extracts Metrics| Payload[Data Payload]
    Payload -->|POST /scrape/page| API[Backend API]
    API -->|Process| Service[ScrapeService]
    Service -->|Save| DB[(Database)]
    DB -->|Trigger| AI[Analysis Engine]
```

### 3. AI Intelligence Loop
Background processes analyze data to generate actionable strategy.

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

### 4. Natural Language Query (JARVIS)
User asks questions about their data using natural language.

```mermaid
sequenceDiagram
    participant User
    participant Chat UI
    participant NLQueryService
    participant LLM (Gemini/GPT)
    participant DB

    User->>Chat UI: "How is my growth this week?"
    Chat UI->>NLQueryService: POST /query/ask
    NLQueryService->>DB: Fetch relevant User Context & Analytics
    NLQueryService->>LLM: Prompt with Data + User Query
    LLM-->>NLQueryService: Natural Language Explanation
    NLQueryService-->>Chat UI: Response
    Chat UI->>User: Display Answer
```

## Directory Structure Overview

-   **`backend/app/models`**: Database Schema (SQLModel)
-   **`backend/app/api/v1`**: REST Endpoints (FastAPI)
-   **`backend/app/services`**: Business Logic & AI Orchestration
-   **`web-app`**: React Dashboard (Frontend)
-   **`extension`**: Chrome Extension (Data Ingestion)
