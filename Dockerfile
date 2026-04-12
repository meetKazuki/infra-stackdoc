# ── Stage 1: Base Builder ──────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.6.1 --activate

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copy all package.json files to cache dependencies
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/renderer/package.json packages/renderer/

RUN pnpm install --frozen-lockfile

# Copy source code and build topologically
COPY . .
RUN pnpm run -r build

# Create lean API bundle with production deps only
RUN pnpm --filter @homelab-stackdoc/api deploy /app/api-prod --prod

# ── Stage 2: Production Web (Target: web) ──────────────────────────
FROM nginx:alpine AS web

RUN apk add --no-cache curl
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
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

# ── Stage 3: Production API (Target: api) ──────────────────────────
FROM node:22-alpine AS api
WORKDIR /app

# Copy only the lean production bundle (API dist + prod deps)
COPY --from=builder /app/api-prod .

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/api || exit 1

CMD ["node", "dist/main.js"]
