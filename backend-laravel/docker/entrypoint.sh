#!/bin/sh
set -e

MODE="${1:-web}"

case "$MODE" in
    web)
        echo "=== [CampusLink] Starting Web Service (Nginx + PHP-FPM) ==="
        PORT="${PORT:-8000}"
        echo "Configuring Nginx to bind on 0.0.0.0:${PORT}..."
        sed -i "s/__PORT__/${PORT}/g" /etc/nginx/nginx.conf

        # Ensure PHP-FPM socket directory exists
        mkdir -p /var/run
        rm -f /var/run/php-fpm.sock

        # Start PHP-FPM in background
        php-fpm -D -R

        # Trap termination signals for graceful shutdown
        trap 'echo "[CampusLink] Stopping Web Service..."; kill $(jobs -p) 2>/dev/null; exit 0' SIGINT SIGTERM EXIT

        echo "Starting Nginx in foreground..."
        exec nginx -g "daemon off;"
        ;;

    worker)
        echo "=== [CampusLink] Starting Dedicated Background Queue Worker ==="
        echo "Nginx and PHP-FPM are NOT started in worker mode."
        exec php artisan queue:work --queue=default,notifications --tries=3 --timeout=90 --sleep=3 --max-jobs=500 --max-time=3600
        ;;

    cron)
        echo "=== [CampusLink] Executing Scheduled Tasks (schedule:run) ==="
        echo "Nginx and PHP-FPM are NOT started in cron mode."
        php artisan schedule:run --no-interaction
        EXIT_CODE=$?
        echo "Scheduled tasks completed with exit code ${EXIT_CODE}."
        exit ${EXIT_CODE}
        ;;

    *)
        echo "=== [CampusLink] Executing Custom Command: $@ ==="
        exec "$@"
        ;;
esac
