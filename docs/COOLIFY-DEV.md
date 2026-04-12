# Coolify Dev Environment Setup

This document covers setting up the `stackdoc-dev` environment on Coolify v4 with path-based routing, where a single domain (`stackdoc-dev.kazuki.uk`) serves both the frontend and API.

## Architecture

```
Internet
  → Cloudflare Edge (SSL termination)
    → Cloudflare Tunnel (cloudflared on homelab)
      → Coolify's Traefik (hostname + path routing)
        ├── /*       →  Web container  (nginx:alpine, port 80)
        └── /api/*   →  API container  (node:22-alpine, port 3000)

PostgreSQL (Coolify-managed, internal network only)
```

Both containers share the same Docker network that Coolify creates for the project. The API connects to PostgreSQL over this internal network — no ports exposed to the host.

## Prerequisites

Before touching Coolify, confirm both Docker targets build locally:

```bash
make build
docker build --target web -t stackdoc-web:dev .
docker build --target api -t stackdoc-api:dev .
```

## Step 1 — Cloudflare Tunnel

Add `stackdoc-dev.kazuki.uk` to your existing Cloudflare Tunnel.

1. Go to **Cloudflare Dashboard → Zero Trust → Networks → Tunnels**
2. Select your tunnel → **Configure → Public Hostnames → Add a hostname**

| Field | Value |
|-------|-------|
| Subdomain | `stackdoc-dev` |
| Domain | `kazuki.uk` |
| Service Type | HTTP |
| URL | `<coolify-host-ip>:80` |

This is the same pattern as your existing `stackdoc.kazuki.uk` tunnel entry. The hostname routes traffic to Coolify's Traefik, which handles the path-based routing internally.

## Step 2 — Coolify Project

1. Go to **Coolify → Projects → Add New Project**
2. Name it `stackdoc-dev`
3. Use the default environment or create one named `dev`

All three resources (database, web, API) live inside this project. Coolify puts them on a shared Docker network automatically.

## Step 3 — PostgreSQL Database

Inside the `stackdoc-dev` project:

1. **Add New Resource → Database → PostgreSQL**
2. Configure:

| Setting | Value |
|---------|-------|
| Name | `stackdoc-dev-db` |
| Image | `postgres:17-alpine` |
| Postgres User | `stackdoc` |
| Postgres Password | *(generate one, save it)* |
| Postgres DB | `stackdoc` |
| Public Port | *(leave empty — internal only)* |

3. Click **Start**
4. After it's running, go to the database resource page and copy the **Internal Connection URL**. It will look like:

```
postgresql://stackdoc:<password>@<container-id>:5432/stackdoc
```

You'll need this for the API's environment variables.

## Step 4 — Web Application

Inside the same project:

1. **Add New Resource → Application → Docker Based**
2. Connect your GitHub repository (`meetKazuki/infra-stackdoc`)

### General Settings

| Setting | Value |
|---------|-------|
| Name | `stackdoc-dev-web` |
| Branch | `develop` |
| Build Pack | Dockerfile |
| Base Directory | `/` |
| Dockerfile Location | `/Dockerfile` |
| Docker Build Target | `web` |
| Ports Exposed | `80` |

### Domain

| Setting | Value |
|---------|-------|
| FQDN / Domain | `http://stackdoc-dev.kazuki.uk` |
| Force HTTPS | Off *(Cloudflare handles TLS)* |

### Healthcheck

| Setting | Value |
|---------|-------|
| Type | HTTP |
| Method | GET |
| Port | 80 |
| Path | `/` |
| Return Code | 200 |
| Interval | 30s |
| Timeout | 5s |
| Retries | 3 |
| Start Period | 10s |

### Deploy Settings

| Setting | Value |
|---------|-------|
| Auto Deploy | On |

Click **Deploy** and confirm the web container starts healthy.

## Step 5 — API Application

Inside the same project:

1. **Add New Resource → Application → Docker Based**
2. Connect the same GitHub repository

### General Settings

| Setting | Value |
|---------|-------|
| Name | `stackdoc-dev-api` |
| Branch | `develop` |
| Build Pack | Dockerfile |
| Base Directory | `/` |
| Dockerfile Location | `/Dockerfile` |
| Docker Build Target | `api` |
| Ports Exposed | `3000` |

### Domain (path-based routing)

| Setting | Value |
|---------|-------|
| FQDN / Domain | `http://stackdoc-dev.kazuki.uk/api` |
| Force HTTPS | Off |

Setting the domain to `http://stackdoc-dev.kazuki.uk/api` tells Coolify to generate a Traefik router with:

```
Host(`stackdoc-dev.kazuki.uk`) && PathPrefix(`/api`)
```

Traefik calculates priority by rule length — the API's rule is longer than the web's `Host(...)` rule, so `/api/*` requests hit the API container first. Everything else falls through to the web container.

The NestJS app must use `app.setGlobalPrefix('api')` so routes like `GET /api/configs/:slug` resolve correctly. Traefik passes the full path — no prefix stripping.

### Environment Variables

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `SERVER_PORT` | `3000` |
| `DATABASE_URL` | *(paste the internal connection URL from Step 3)* |
| `SERVER_CORS_ORIGIN` | `https://stackdoc-dev.kazuki.uk` |

`DATABASE_URL` uses Coolify's internal Docker network DNS. The container name is resolved automatically — no host IP needed.

### Healthcheck

| Setting | Value |
|---------|-------|
| Type | HTTP |
| Method | GET |
| Port | 3000 |
| Path | `/api` |
| Return Code | 200 |
| Interval | 30s |
| Timeout | 5s |
| Retries | 3 |
| Start Period | 15s |

**Note:** The healthcheck path depends on what the API serves at `GET /api`. Once we implement the configs module, you may want to add a dedicated `GET /api/health` endpoint that checks the database connection. For now, the root controller's hello-world response is sufficient.

### Deploy Settings

| Setting | Value |
|---------|-------|
| Auto Deploy | On |

Click **Deploy**.

## Step 6 — Verify

After both services are running:

```bash
# Frontend loads
curl -sI https://stackdoc-dev.kazuki.uk | head -5

# API responds
curl -s https://stackdoc-dev.kazuki.uk/api

# API paths don't leak to frontend
curl -sI https://stackdoc-dev.kazuki.uk/api/nonexistent
# Should return a NestJS 404, not nginx's index.html

# Frontend SPA routing works
curl -sI https://stackdoc-dev.kazuki.uk/s/some-slug
# Should return 200 with index.html (SPA fallback)
```

## Troubleshooting

### API returns 404 for all routes

The NestJS app is missing `app.setGlobalPrefix('api')`. Traefik routes `/api/configs` to the container, but NestJS doesn't have routes mounted under `/api`.

### API can't connect to PostgreSQL

Check that the `DATABASE_URL` uses the internal Docker hostname (the container name Coolify assigned to the database), not `localhost`. Run `docker network ls` on the Coolify host to confirm all three containers are on the same network.

### Web serves index.html for /api paths

Traefik isn't routing `/api` to the API container. Verify:

1. The API service domain in Coolify is `http://stackdoc-dev.kazuki.uk/api` (with the `/api` path)
2. The API container is running and healthy
3. Check Traefik's dashboard (if enabled) to see if both routers are registered

**Fallback — custom Traefik labels:** If Coolify's domain field doesn't generate the correct path rules, override the labels manually. In each application's settings, find **Custom Labels** and replace with:

API service labels:

```
traefik.enable=true
traefik.http.routers.stackdoc-dev-api.rule=Host(`stackdoc-dev.kazuki.uk`) && PathPrefix(`/api`)
traefik.http.routers.stackdoc-dev-api.entrypoints=http
traefik.http.routers.stackdoc-dev-api.priority=100
traefik.http.services.stackdoc-dev-api.loadbalancer.server.port=3000
```

Web service labels:

```
traefik.enable=true
traefik.http.routers.stackdoc-dev-web.rule=Host(`stackdoc-dev.kazuki.uk`)
traefik.http.routers.stackdoc-dev-web.entrypoints=http
traefik.http.routers.stackdoc-dev-web.priority=1
traefik.http.services.stackdoc-dev-web.loadbalancer.server.port=80
```

The explicit `priority` values guarantee the API's `/api` prefix is matched before the web's catch-all. After saving labels, redeploy both services.

### Cloudflare Tunnel not reaching Coolify

Ensure the tunnel's service URL points to port 80 on the Coolify host (where Traefik listens). Check `cloudflared` logs on the homelab for connection errors.

### Both services rebuild on every push

Both services watch the same branch and the Dockerfile shares a builder stage. Coolify will rebuild both on every push, which is correct for dev. If build times are a concern, migrate to GHCR pre-built images (see `COOLIFY-GHCR.md`).

## Production Deployment

When you're ready for production on `stackdoc.kazuki.uk`, create a second Coolify project (`stackdoc-prod`) with the same three-resource structure. The only differences:

| Setting | Dev | Prod |
|---------|-----|------|
| Domain | `stackdoc-dev.kazuki.uk` | `stackdoc.kazuki.uk` |
| Branch | `develop` | `master` |
| `NODE_ENV` | `production` | `production` |
| Database | `stackdoc-dev-db` | `stackdoc-prod-db` |
| Auto Deploy | On | On (or manual for tighter control) |

Keep the same Dockerfile, same Traefik path routing, same structure. The environments are fully isolated — separate databases, separate containers, separate deploy triggers.
