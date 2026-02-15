# Stage 1: Build the application
FROM node:18-alpine AS build

WORKDIR /app

# Accept build-time API URL
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Create template directory and certbot webroot
RUN mkdir -p /etc/nginx/templates /var/www/certbot

# Copy both nginx configs as templates
COPY nginx.conf /etc/nginx/templates/nginx.conf
COPY nginx-ssl.conf /etc/nginx/templates/nginx-ssl.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443

ENTRYPOINT ["/docker-entrypoint.sh"]
