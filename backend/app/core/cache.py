import json
import functools
from fastapi import Request, Response
# from app.core.celery_app import celery # Re-using the Redis connection from Celery
import redis
import os

# Direct Redis Connection
# In production, use environment variable or default to service name
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/1")
redis_client = redis.from_url(REDIS_URL)

def cache_response(expire_seconds: int = 300):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # 1. Generate a unique Cache Key based on User ID or Request URL
            # Accessing 'request' from kwargs (FastAPI dependency injection)
            request = kwargs.get('request') 
            user_id = kwargs.get('user_id') # Assuming you pass user_id to the route
            
            if user_id:
                key = f"cache:dashboard:{user_id}"
            else:
                key = f"cache:global:{func.__name__}"

            try:
                # 2. Check Redis
                cached_data = redis_client.get(key)
                if cached_data:
                    print(f"⚡ HIT CACHE: {key}")
                    return json.loads(cached_data)
            except Exception as e:
                print(f"⚠️ Redis Error: {e}")
                # Fallback to DB if Redis fails

            # 3. Run the actual heavy DB function
            response_data = await func(*args, **kwargs)

            try:
                # 4. Save to Redis
                print(f"🐢 MISS CACHE (DB CALL): {key}")
                redis_client.setex(
                    key,
                    expire_seconds,
                    json.dumps(response_data, default=str) # default=str handles Datetime objects
                )
            except Exception as e:
                print(f"⚠️ Redis Write Error: {e}")
            
            return response_data
        return wrapper
    return decorator
