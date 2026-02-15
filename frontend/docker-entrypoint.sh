#!/bin/sh
set -e

# Check if SSL certs exist and DOMAIN is set
if [ -n "$DOMAIN" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "SSL certificates found for $DOMAIN — enabling HTTPS"
    # Substitute domain variable in SSL config
    envsubst '${DOMAIN}' < /etc/nginx/templates/nginx-ssl.conf > /etc/nginx/conf.d/default.conf
else
    echo "No SSL certificates — running HTTP only"
    cp /etc/nginx/templates/nginx.conf /etc/nginx/conf.d/default.conf
fi

exec nginx -g "daemon off;"
