FROM php:8.3-fpm-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    postgresql-dev \
    libzip-dev \
    oniguruma-dev \
    bash \
    curl

# Install and enable required PHP extensions
RUN docker-php-ext-install \
    pdo_pgsql \
    pgsql \
    bcmath \
    mbstring \
    opcache \
    zip

# Configure PHP-FPM to listen on 127.0.0.1:9000
RUN sed -i 's|^listen = .*|listen = 127.0.0.1:9000|' /usr/local/etc/php-fpm.d/docker.conf

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy application files
COPY . .

# Run composer installation for production
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Set directory permissions for web runtime
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache && \
    chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Copy Nginx configuration and entrypoint script
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["web"]
