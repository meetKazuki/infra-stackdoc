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

# Copy built files
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# SPA routing: send all requests to index.html
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
EOF

EXPOSE 80
