from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.config import settings
import redis

# Initialize Redis connection for rate limiting
# We define a custom key function if we want to rate limit by user ID later
def get_user_ip_key(request):
    return get_remote_address(request)

# Configure Limiter
# storage_uri will use the REDIS_URL from settings
limiter = Limiter(
    key_func=get_user_ip_key,
    storage_uri=settings.REDIS_URL,
    default_limits=["100/minute"]
)
