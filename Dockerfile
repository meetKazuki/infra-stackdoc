FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@8.6.1 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

RUN mkdir -p packages/core packages/renderer apps/web

COPY packages/core/package.json packages/core/
COPY packages/renderer/package.json packages/renderer
COPY apps/web/package.json apps/web

RUN pnpm install --frozen-lockfile

COPY packages packages
COPY apps apps
COPY tsconfig.json ./

RUN pnpm --filter @homelab-stackdoc/web build

FROM nginx:alpine

RUN apk add --no-cache curl

COPY --from=build /app/apps/web/dist /usr/share/nginx/html

COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Permissions-Policy "interest-cohort=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'none';" always;

    location / {
        try_files $uri $uri/ /index.html;
    }
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/json
        application/javascript
        application/xml
        image/svg+xml;
}
EOF

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1
