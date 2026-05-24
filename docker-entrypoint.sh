#!/bin/sh
# Generate a self-signed cert on first start (valid 10 years)
if [ ! -f /etc/nginx/ssl/cert.pem ]; then
  echo "Generating self-signed SSL certificate..."
  openssl req -x509 -newkey rsa:4096 \
    -keyout /etc/nginx/ssl/key.pem \
    -out    /etc/nginx/ssl/cert.pem \
    -days   3650 -nodes \
    -subj   "/CN=${SSL_COMMON_NAME:-aether-midi}"
fi

exec nginx -g "daemon off;"
