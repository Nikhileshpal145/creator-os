from celery import Celery
import os
from kombu import Queue

# Get Redis URL from env or default
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "creator_os",
    broker=redis_url,
    backend=redis_url,
    include=["app.worker"] # Ensure tasks are registered
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_default_queue='default',
    task_queues=(
        Queue('default', routing_key='default'),
        Queue('high_priority', routing_key='high_priority'),
    ),
    # Periodic tasks (Beat)
    beat_schedule = {
        'check-scheduled-posts-every-minute': {
            'task': 'app.worker.check_scheduled_posts',
            'schedule': 60.0, # Every 60 seconds
        },
    }
)
