# Coolify Deployment

Homelab StackDoc is deployed on [Coolify](https://coolify.io) v4, a self-hosted PaaS running on Proxmox LXC. This document covers the current production configuration and the migration path to pulling pre-built images from GHCR.

## Infrastructure Topology

```
Internet
  → Cloudflare Edge (SSL termination, CDN)
    → Cloudflare Tunnel (cloudflared on homelab)
      → External Traefik (gateway machine, TLS passthrough)
        → Coolify's Traefik (port 80, hostname-based routing)
          → nginx container (serves static files)
```

Cloudflare handles TLS. Coolify's domain is set to `http://` (not `https://`) to avoid Let's Encrypt conflicts.

## Current Configuration (Dockerfile Build)

Coolify builds the Docker image directly from the repository on every push to `master`.

### Application settings

| Setting | Value |
|---------|-------|
| Name | `homelab-stackdoc` |
| Build Pack | Dockerfile |
| Base Directory | `/` |
| Dockerfile Location | `/Dockerfile` |
| Ports Exposed | 80 |
| Domain | `http://stackdoc.kazuki.uk` |
| Force HTTPS | Off (Cloudflare handles this) |
| Gzip Compression | On |

### Git Source

| Setting | Value |
|---------|-------|
| Repository | `meetKazuki/infra-stackdoc` |
| Branch | `master` |
| Auto Deploy | On |

### Healthcheck

| Setting | Value |
|---------|-------|
| Type | HTTP |
| Method | GET |
| Scheme | `http` |
| Host | localhost |
| Port | 80 |
| Path | `/` |
| Return Code | 200 |
| Response Text | *(empty)* |
| Interval | 30s |
| Timeout | 5s |
| Retries | 3 |
| Start Period | 10s |

The Dockerfile also includes a `HEALTHCHECK` instruction so `docker ps` reports health status independently of Coolify.

## Migrating to GHCR (Pre-built Images)

Once GHCR publishing is working, Coolify can pull pre-built images instead of building on the server. This frees the LXC from CPU-intensive Docker builds and ensures the production image is identical to what CI validated.

### Prerequisites

Verify that at least one image has been successfully pushed to GHCR:

```
https://github.com/meetKazuki/infra-stackdoc/pkgs/container/infra-stackdoc
```

You should see tagged images (e.g., `0.2.0`, `0.2`, `latest`).

### Migration steps

**1. Update Coolify application settings**

Go to **Coolify → Application → General**:

| Setting | Old value | New value |
|---------|-----------|-----------|
| Build Pack | Dockerfile | Docker Image |
| Docker Image | *(empty)* | `ghcr.io/meetkazuki/infra-stackdoc` |
| Docker Image Tag | *(empty)* | `latest` |

**2. Verify Git Source**

Go to **Coolify → Application → Git Source**. Auto Deploy can remain on — Coolify will now watch for image updates rather than building from source.

**3. Deploy and verify**

Click **Redeploy**. After the container starts, confirm:

- `stackdoc.kazuki.uk` loads correctly
- Status shows **Running (healthy)**
- Security headers are present:

```bash
curl -sI https://stackdoc.kazuki.uk | grep -iE "x-content-type|x-frame|strict-transport|content-security|referrer-policy"
```

Expected output includes:

```
x-content-type-options: nosniff
x-frame-options: DENY
strict-transport-security: max-age=31536000; includeSubDomains
content-security-policy: default-src 'self'; ...
referrer-policy: strict-origin-when-cross-origin
```

### Pinned version vs `latest`

There are two strategies for the image tag:

**`latest` (recommended for solo dev):** Coolify pulls the newest image on each deploy. When a new release is published to GHCR, trigger a redeploy in Coolify (or configure polling) to pick it up.

**Pinned version (e.g., `0.2.0`):** You control exactly what's running. Update the tag manually in Coolify when you want to deploy a new release. Safer for teams, more manual work for a solo project.

### Rollback

If a GHCR image has issues:

- **Quick rollback:** Change the Docker Image Tag in Coolify to the previous working version (e.g., `0.1.0`) and redeploy.
- **Emergency fallback:** Switch Build Pack back to `Dockerfile` in Coolify. This rebuilds from source on the LXC. Slower, but doesn't depend on GHCR.

## Dockerfile

The Dockerfile is a multi-stage build:

**Stage 1 (build):** `node:20-alpine` with pnpm 8.6.1. Installs dependencies (cached by layer), copies source, runs the Vite production build.

**Stage 2 (serve):** `nginx:alpine` with `curl` added for health checks. Copies the built static files from Stage 1. Includes an inline nginx config with SPA routing, asset caching, gzip compression, and security headers.

### Security headers in nginx

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Blocks framing (clickjacking) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS on browser side |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection for older browsers |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `interest-cohort=()` | Opts out of FLoC/Topics tracking |
| `Content-Security-Policy` | See below | Restrictive CSP for static SPA |

### Content Security Policy

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self';
object-src 'none';
frame-ancestors 'none';
base-uri 'self';
form-action 'none';
```

`unsafe-inline` is required for styles because React and CodeMirror inject inline styles. `data:` and `blob:` are required for images because html2canvas uses them for PNG export.

If you add external fonts, analytics, CDN scripts, or any third-party resource, update the CSP accordingly. Check the browser console for CSP violation errors — they tell you exactly which directive needs adjusting.

## Troubleshooting

### Status shows "Running (unknown)"

The Coolify healthcheck is misconfigured. Verify:

- Scheme is `http` (not `https` — the container doesn't speak TLS)
- Response Text is empty (not `OK` — the root returns HTML, not literal text)
- Port is `80`

### Build fails on Coolify

If building from Dockerfile on the LXC, check available disk space and memory. The pnpm install + Vite build can consume significant resources. This is one reason to migrate to GHCR — offload builds to GitHub Actions.

### CSP blocks something

Check the browser developer console. CSP violations are logged with the exact directive and blocked resource. Update the `Content-Security-Policy` header in the Dockerfile's nginx config.

### Container starts but site doesn't load

Check nginx logs inside the container:

```bash
docker logs <container-name>
```

Common causes: port mismatch, missing `try_files` directive, or corrupted build output.
