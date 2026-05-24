# MIT License - Copyright (c) fintonlabs.com

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && mkdir -p /etc/nginx/ssl

EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- --no-check-certificate https://localhost/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
