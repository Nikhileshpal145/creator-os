from celery import Celery

celery_app = Celery("creator_os", broker="redis://localhost:6379/0")

celery_app.conf.task_routes = {
    "workers.tasks.*": {"queue": "main-queue"},
}

# Import and apply beat schedule
from workers.scheduler import configure_beat
configure_beat(celery_app)
