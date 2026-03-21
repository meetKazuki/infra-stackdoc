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

    # ── Security headers ──────────────────────────────────────
    # These apply to all responses from this server block.

    # Prevent MIME-type sniffing — browsers must trust the
    # declared Content-Type.
    add_header X-Content-Type-Options "nosniff" always;

    # Block framing by other sites. Cloudflare may add its own
    # but this catches direct access.
    add_header X-Frame-Options "DENY" always;

    # Opt out of Google's FLoC / Topics tracking.
    add_header Permissions-Policy "interest-cohort=()" always;

    # Tell browsers to always use HTTPS. Cloudflare handles TLS,
    # but this protects the edge→browser hop.
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Prevent reflected XSS in older browsers that don't support
    # CSP. Modern browsers ignore this, but it's zero cost.
    add_header X-XSS-Protection "1; mode=block" always;

    # Referrer policy — send origin only on cross-origin requests.
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Content Security Policy — restrictive baseline for a static
    # SPA with no backend API, no iframes, no forms posting data.
    # Allows:
    #   - Scripts/styles from same origin (Vite bundles)
    #   - Inline styles (React + CodeMirror inject these)
    #   - Images from same origin and data: URIs (html2canvas)
    #   - Fonts from same origin
    #   - Connections to same origin only
    #   - blob: for canvas export (html2canvas)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'none';" always;

    # ── SPA routing ───────────────────────────────────────────
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── Static asset caching ──────────────────────────────────
    # Vite hashes filenames, so these are safe to cache forever.
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # ── Compression ───────────────────────────────────────────
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
