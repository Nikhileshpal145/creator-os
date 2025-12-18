FROM python:3.9-slim

WORKDIR /app

COPY ../backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["celery", "-A", "workers.celery_app", "worker", "--loglevel=info"]
