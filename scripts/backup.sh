#!/bin/bash

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/backup_$TIMESTAMP.sql"
CONTAINER_SERVICE="db"
DB_USER="admin"
DB_NAME="creator_os"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "Starting backup for $DB_NAME..."
if docker-compose -f docker-compose.prod.yml exec -T $CONTAINER_SERVICE pg_dump -U $DB_USER $DB_NAME > "$FILENAME"; then
    echo "Backup successful: $FILENAME"
    
    # Compress
    gzip "$FILENAME"
    echo "Compressed to $FILENAME.gz"
    
    # Cleanup old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete
    echo "Old backups cleaned up."
else
    echo "Backup failed!"
    exit 1
fi
