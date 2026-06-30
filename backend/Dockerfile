FROM php:8.2-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libzip-dev \
    zip \
    unzip \
    libpq-dev \
    git \
    curl

# Install PHP extensions for PostgreSQL
RUN docker-php-ext-install pdo pdo_pgsql zip

# Enable Apache mod_rewrite for Laravel routing
RUN a2enmod rewrite

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy all application files
COPY . .

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Update Apache DocumentRoot to point to Laravel's public directory
RUN sed -ri -e 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!/var/www/html/public!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Set proper permissions for Laravel
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Create startup script that runs migrations and links storage before Apache starts
RUN echo '#!/bin/bash\nset -e\nphp artisan storage:link --force 2>/dev/null || true\nphp artisan migrate --force 2>/dev/null || true\napache2-foreground' > /usr/local/bin/start.sh && chmod +x /usr/local/bin/start.sh

# Start via script
CMD ["/usr/local/bin/start.sh"]
