"""
Simple FastAPI server for Creator OS - Local-First Architecture
Phase 1: Foundation - Just prove the connection works
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Creator OS - Simple Server",
    description="Local-first AI assistant for content creators",
    version="2.0.0"
)

# CORS - Allow extension to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"(http://localhost:\d+|chrome-extension://.*)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("=" * 60)
    logger.info("🚀 Creator OS Simple Server Starting")
    logger.info("=" * 60)
    logger.info("Server running on http://localhost:8000")
    logger.info("Ready to receive extension requests...")
    logger.info("=" * 60)

@app.get("/")
def root():
    """Health check endpoint"""
    logger.info("Health check requested")
    return {
        "status": "online",
        "service": "Creator OS",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/ping")
def ping():
    """
    Phase 1: Simple ping endpoint to prove extension-server connection
    """
    logger.info("📡 PING received from extension")
    return {
        "message": "Server connected ✅",
        "timestamp": datetime.now().isoformat(),
        "phase": "1 - Foundation"
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server directly...")
    uvicorn.run(
        "simple_server:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="debug"
    )
