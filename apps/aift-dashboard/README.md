# AI Freedom Trust Dashboard

A mobile-first browser control panel for the AI Freedom Trust VPS app foundry.

## Purpose

This app is the future UI at:

```text
https://vps.aifreedomtrust.com
```

It is designed to manage AI Freedom Trust apps from a phone.

## Current v0.1 Features

- Mobile-first luxury dashboard UI
- Reads `/opt/aift/registry/apps.yml`
- Shows app count and status
- Shows registered app cards
- Opens live app domains
- Opens GitHub repos
- Provides status API
- Provides apps API
- Reserves rebuild API safely

## Planned Features

- Coolify deployment adapter
- Deploy new app form
- Rebuild app button
- Rollback app button
- Log viewer
- Environment variable manager
- Domain manager
- Preview deployment manager

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Environment Variables

Copy `.env.example` to `.env` on the VPS or configure values in Coolify.

```text
AIFT_DASHBOARD_TOKEN=
AIFT_NODE_TOKEN=
AIFT_ENABLE_LOCAL_EXEC_ROUTES=
AIFT_REGISTRY_PATH=/opt/aift/registry/apps.yml
AIFT_LOG_PATH=/opt/aift/logs
COOLIFY_URL=
COOLIFY_API_TOKEN=
```

## Security

### API authentication

`proxy.ts` (the Next.js 16 replacement for `middleware.ts`) runs before every `/api` route. Every `POST`, `PUT`, `PATCH` and `DELETE` needs either:

- `Authorization: Bearer <AIFT_DASHBOARD_TOKEN>` (scripts and automation), or
- the `aift_dashboard_session` cookie set by signing in at `/login` (the dashboard UI in a browser). The cookie is HttpOnly and `SameSite=Strict`. It stores an HMAC derived from the token, not the token itself, and lasts 12 hours. Requests carrying it must come from the same origin. Rotating `AIFT_DASHBOARD_TOKEN` signs every browser out.

Only `POST /api/nodes/heartbeat` (checks `AIFT_NODE_TOKEN` itself) and `POST`/`DELETE /api/session` (sign-in and sign-out) skip that check. `GET` requests stay public. If `AIFT_DASHBOARD_TOKEN` is unset, every mutating API call returns `503`. Use a long random value, e.g. `openssl rand -hex 32`.

### Routes that run code on the node

`/api/workspaces/prepare`, `/api/workspaces/install`, `/api/workspaces/run-build`, `/api/workspaces/start-preview`, `POST /api/local-actions` and `POST /api/app-sources` clone, install, build or run code. They also need the dashboard token, and they only run when `AIFT_ENABLE_LOCAL_EXEC_ROUTES=1`. When that variable is unset they are **off** in production builds (Docker) and on under `next dev` (e.g. Termux phone nodes). Set `AIFT_ENABLE_LOCAL_EXEC_ROUTES=0` to force them off. Clone, install, build and preview processes get a minimal environment (`PATH`, `HOME`, locale, temp and proxy settings, Termux variables). Dashboard, node and Coolify credentials are not passed to them.

### Network exposure

`compose.yml` publishes the container on `127.0.0.1:3000` only. Docker-published ports bypass `ufw`, so the previous `3000:3000` binding exposed the dashboard on every interface. Put a TLS-terminating reverse proxy (Caddy, nginx or Traefik) on the host in front of `127.0.0.1:3000`, and forward `Host` (or `X-Forwarded-Host`) and `X-Forwarded-Proto` so the session cookie gets the `Secure` flag and the same-origin check passes. This repository does not ship that proxy configuration.

### Shell execution

The dashboard must not expose raw shell command execution. All actions must map to approved platform operations such as deploy, rebuild, logs, rollback, and status.
