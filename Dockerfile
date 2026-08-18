# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS deps
WORKDIR /app

# Coolify passes the application's runtime NODE_ENV into the build environment too.
# pnpm skips devDependencies when NODE_ENV=production, breaking the husky prepare
# hook and the build tooling (@nestjs/cli, @swc/cli, vite) further down — none of
# that belongs to the runtime image anyway. Force it back for every build stage;
# the api stage sets its own NODE_ENV=production for the actual runtime image.
ENV NODE_ENV=development

RUN corepack enable && corepack prepare pnpm@8.6.1 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./

COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/docs/package.json apps/docs/
COPY packages/core/package.json packages/core/
COPY packages/renderer/package.json packages/renderer/

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

FROM deps AS web-builder
RUN pnpm --filter @homelab-stackdoc/web... build

FROM deps AS docs-builder
RUN pnpm --filter @homelab-stackdoc/docs build

FROM deps AS api-builder
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm --filter @homelab-stackdoc/api... build && \
    pnpm --filter @homelab-stackdoc/api deploy /app/api-prod --prod

FROM nginx:alpine AS web

RUN apk add --no-cache curl
COPY --from=web-builder /app/apps/web/dist /usr/share/nginx/html

COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

FROM nginx:alpine AS docs

RUN apk add --no-cache curl && rm -rf /usr/share/nginx/html/*
COPY --from=docs-builder /app/apps/docs/build /usr/share/nginx/html/docs

COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location /docs/ {
        try_files $uri $uri/ /docs/index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/docs/ || exit 1

FROM node:24-alpine AS api
WORKDIR /app

COPY --from=api-builder /app/api-prod/node_modules ./node_modules
COPY --from=api-builder /app/api-prod/package.json ./
COPY --from=api-builder /app/apps/api/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/templates || exit 1

CMD ["node", "dist/main.js"]
