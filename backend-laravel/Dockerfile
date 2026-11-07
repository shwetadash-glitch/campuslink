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

# Configure PHP-FPM to use local socket
RUN sed -i 's|^listen = .*|listen = /var/run/php-fpm.sock|' /usr/local/etc/php-fpm.d/www.conf && \
    sed -i 's|^;listen.owner = .*|listen.owner = www-data|' /usr/local/etc/php-fpm.d/www.conf && \
    sed -i 's|^;listen.group = .*|listen.group = www-data|' /usr/local/etc/php-fpm.d/www.conf && \
    sed -i 's|^;listen.mode = .*|listen.mode = 0660|' /usr/local/etc/php-fpm.d/www.conf

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
