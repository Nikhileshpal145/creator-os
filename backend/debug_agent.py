import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.append(os.getcwd())

from app.services.agent_service import CreatorAgent
from app.db.session import engine
from sqlmodel import Session
from dotenv import load_dotenv, find_dotenv

# Try to find .env
env_file = find_dotenv(usecwd=True)
print(f"Loading .env from: {env_file}")
load_dotenv(env_file)

def debug_agent():
    print("--- Debugging CreatorAgent ---")
    
    # Check keys
    keys = {
        "GOOGLE_API_KEY": os.getenv("GOOGLE_API_KEY"),
        "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY"),
        "OPENROUTER_API_KEY": os.getenv("OPENROUTER_API_KEY"),
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
        "DEEPSEEK_API_KEY": os.getenv("DEEPSEEK_API_KEY"),
    }
    
    print("API Keys configured:")
    for k, v in keys.items():
        if v and not v.strip().startswith("#"): # Ignore comments if any leaked into value
             print(f"  {k}: {v[:4]}...{v[-4:]}")
        else:
             print(f"  {k}: Not set or Empty")

    if not any(v and not v.strip().startswith("#") for v in keys.values()):
        print("\n❌ CRITICAL: No valid API keys found! Please set GEMINI_API_KEY or OPENAI_API_KEY in .env")
        return

    print("\nInitializing Agent...")
    try:
        with Session(engine) as db:
            agent = CreatorAgent(db=db, user_id="nikhilesh")
            print("✅ Agent initialized.")
            
            print("Attempting chat...")
            response = agent.chat("Hello, are you working?")
            print(f"\nResponse:\n{response}")
            
            if "I encountered an error" in response.get("content", ""):
                print("\n❌ Agent returned error message.")
            else:
                print("\n✅ Agent working correctly.")
                
    except Exception as e:
        print(f"\n❌ Exception during execution: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_agent()
