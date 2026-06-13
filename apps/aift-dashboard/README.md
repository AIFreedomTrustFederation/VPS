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
AIFT_REGISTRY_PATH=/opt/aift/registry/apps.yml
AIFT_LOG_PATH=/opt/aift/logs
COOLIFY_URL=
COOLIFY_API_TOKEN=
```

## Security

The dashboard must not expose raw shell command execution. All actions must map to approved platform operations such as deploy, rebuild, logs, rollback, and status.
