# AI Freedom Trust VPS

**Repository description:** Open-source, phone-controlled Vercel-style VPS platform for building, rebuilding, deploying, previewing, monitoring, and rolling back AI Freedom Trust web apps from GitHub.

AI Freedom Trust VPS is the foundation for a sovereign, open-source, mobile-first app foundry. It is designed to work like a self-hosted Vercel/Codespaces-style system where a mobile device acts as the command center, GitHub acts as the source of truth, and a VPS performs the heavy build, deploy, rebuild, rollback, and hosting work.

The goal is simple:

> Create an app with AI, store every file in GitHub, build it on our VPS, deploy it to a domain, and manage everything from a phone.

---

## Mission

AI Freedom Trust VPS must become a private open-source development and deployment platform that can launch any web application created by AI Freedom Trust.

It should allow us to:

- Build from GitHub like Vercel.
- Rebuild after every code change.
- Deploy apps to custom domains and subdomains.
- Run preview deployments for branches and pull requests.
- Manage apps from a mobile browser or phone SSH app.
- Keep every project portable, reproducible, and open-source.
- Avoid vendor lock-in.
- Preserve rollback versions so broken deployments do not destroy live apps.

---

## Final Requirement Statement

**AI Freedom Trust VPS is a self-hosted, open-source, phone-controlled Vercel-style deployment platform that uses GitHub-hosted repositories, Docker-based builds, automated HTTPS, app previews, logs, health checks, backups, and rollback to launch any AI Freedom Trust web application from a mobile device.**

---

## System Philosophy

This platform should not be treated as a normal VPS.

It is the **AI Freedom Trust App Foundry**.

The system pattern is:

```text
Mobile Phone
   ↓
ChatGPT / AI-assisted app creation
   ↓
GitHub repository
   ↓
AI Freedom Trust VPS builder
   ↓
Docker container
   ↓
Reverse proxy + HTTPS
   ↓
Live web app
```

The mobile device does not need to compile the application. The phone gives the command. GitHub stores the code. The VPS performs the build.

---

## Best Available System Design

The recommended architecture is a layered self-hosted PaaS model.

### Layer 1: VPS Operating System

Recommended:

- Ubuntu 24.04 LTS
- Public IPv4 address
- SSH access
- Root or sudo user
- Automated provider snapshots
- At least 4 GB RAM for small apps
- 8 GB RAM or more for reliable builds
- 100 GB SSD or more for multiple apps and build cache

### Layer 2: Container Runtime

Required:

- Docker Engine
- Docker Compose
- BuildKit enabled
- Per-app containers
- Isolated networks
- Persistent volumes for databases and uploads

Docker is the standard runtime because every app can be packaged, rebuilt, moved, and restored consistently.

### Layer 3: Open-Source PaaS Controller

Recommended production base:

- **Coolify** as the primary self-hosted PaaS controller.
- **Dokploy** as a strong alternative or future supported adapter.
- **CapRover** as a simpler fallback option.

Why Coolify-first:

- Open-source PaaS model.
- Supports apps, databases, services, and Docker-compatible deployments.
- Supports Git-based push-to-deploy workflows.
- Supports GitHub, GitLab, Bitbucket, Gitea, and other Git providers.
- Supports custom domains and automatic SSL certificates.
- Supports pull request deployments.
- Supports backups, monitoring, webhooks, API automation, and browser terminal access.

Why Dokploy is also important:

- Open-source alternative to Heroku, Vercel, and Netlify.
- Built around Docker and Traefik.
- Supports applications, databases, Docker Compose, domains, backups, Git sources, environment variables, remote servers, build servers, and auto deploy.

The AI Freedom Trust platform should start by integrating with one strong controller and later wrap it with our own `aift` command and dashboard.

### Layer 4: Reverse Proxy and HTTPS

Recommended:

- Caddy for simple automatic HTTPS, or
- Traefik if using Dokploy as the base controller.

Every public app must receive HTTPS automatically.

Required routing pattern:

```text
app-name.aifreedomtrust.com       → deployed application
api.app-name.aifreedomtrust.com   → backend API
preview-id.preview.aifreedomtrust.com → branch or pull request preview
code.aifreedomtrust.com           → mobile code editor
vps.aifreedomtrust.com            → private control dashboard
status.aifreedomtrust.com         → uptime dashboard
```

### Layer 5: AI Freedom Trust Wrapper

The long-term unique value is the AIFT wrapper layer:

```text
aift deploy
aift rebuild
aift rollback
aift logs
aift apps
aift status
aift domains
aift env
aift backup
```

This wrapper should call the underlying PaaS, Docker, GitHub, and reverse proxy systems while giving AI Freedom Trust one simple command language.

---

## Required Capabilities

The finished platform must be able to:

- Connect to GitHub repositories.
- Clone AI Freedom Trust apps.
- Detect app frameworks automatically.
- Install dependencies.
- Build production artifacts.
- Build Docker images.
- Run Docker Compose apps.
- Deploy static sites.
- Deploy frontend apps.
- Deploy backend APIs.
- Deploy full-stack apps.
- Deploy databases and services.
- Assign domains and subdomains.
- Enable HTTPS automatically.
- Trigger rebuilds after GitHub updates.
- Run preview deployments for branches or pull requests.
- Store build logs.
- Store runtime logs.
- Run health checks.
- Preserve last known good deployments.
- Roll back failed deployments.
- Manage environment variables securely.
- Back up databases and volumes.
- Monitor uptime.
- Expose mobile-friendly dashboards.

---

## Supported App Types

Phase 1 support:

- Static HTML/CSS/JS
- Vite
- React
- Next.js
- Node.js
- Express
- Astro
- SvelteKit
- Vue
- Nuxt
- FastAPI
- Dockerfile-based apps
- Docker Compose apps

Phase 2 support:

- WordPress
- Laravel
- Django
- Rails
- Go
- Rust
- Bun
- Deno
- Supabase-style service stacks
- AI chatbot apps
- Customer portals
- Internal admin dashboards

---

## Framework Detection Standard

The builder should detect app type by checking for common files.

```text
package.json              → Node-based app
vite.config.*             → Vite app
next.config.*             → Next.js app
astro.config.*            → Astro app
svelte.config.*           → SvelteKit app
nuxt.config.*             → Nuxt app
requirements.txt          → Python app
pyproject.toml            → Python app
main.py + FastAPI import   → FastAPI app
Dockerfile                → Custom Docker app
docker-compose.yml        → Compose app
index.html                → Static app
```

Priority order:

```text
1. Use docker-compose.yml if present.
2. Use Dockerfile if present.
3. Use aift.app.yml if present.
4. Auto-detect framework.
5. Fall back to static hosting.
```

---

## Standard App Configuration

Every AI Freedom Trust app should include an `aift.app.yml` file.

Example Vite app:

```yaml
name: handyman-site
repo: https://github.com/AIFreedomTrustFederation/handyman-site
domain: handyman.aifreedomtrust.com
branch: main
framework: vite
build:
  install: npm ci
  command: npm run build
  output: dist
runtime:
  type: static
  port: 3000
  healthcheck: /
env:
  NODE_ENV: production
```

Example Next.js app:

```yaml
name: trust-dashboard
repo: https://github.com/AIFreedomTrustFederation/trust-dashboard
domain: dashboard.aifreedomtrust.com
branch: main
framework: nextjs
build:
  install: npm ci
  command: npm run build
  start: npm start
runtime:
  type: node
  port: 3000
  healthcheck: /
env:
  NODE_ENV: production
```

Example Docker Compose app:

```yaml
name: capital-city-provisions
repo: https://github.com/AIFreedomTrustFederation/capital-city-provisions
domain: capitalcityprovisions.com
branch: main
framework: docker-compose
compose:
  file: docker-compose.yml
runtime:
  healthcheck: /
```

---

## App Repository Standard

Every deployable app should follow this structure:

```text
app-name/
├── README.md
├── aift.app.yml
├── .env.example
├── Dockerfile              # optional but preferred for custom apps
├── docker-compose.yml      # optional for multi-service apps
├── package.json            # for Node-based apps
├── public/
├── src/
└── docs/
```

Required rules:

- Never commit real secrets.
- Always include `.env.example`.
- Always document build and start commands.
- Always expose a health check route when possible.
- Always define the production domain.
- Prefer deterministic install commands such as `npm ci`.
- Prefer Docker for production parity.

---

## VPS Directory Standard

The production VPS should use this structure:

```text
/opt/aift/
├── apps/
│   ├── app-name/
│   │   ├── repo/
│   │   ├── releases/
│   │   ├── current/
│   │   ├── shared/
│   │   └── .env
├── builder/
│   ├── templates/
│   ├── detect-framework.sh
│   ├── build-app.sh
│   ├── deploy-app.sh
│   ├── rebuild-app.sh
│   └── rollback-app.sh
├── registry/
│   └── apps.yml
├── proxy/
│   └── Caddyfile
├── logs/
├── backups/
├── secrets/
└── scripts/
```

---

## App Registry Standard

The VPS should maintain an app registry.

Example:

```yaml
apps:
  handyman-site:
    repo: https://github.com/AIFreedomTrustFederation/handyman-site
    branch: main
    domain: handyman.aifreedomtrust.com
    framework: vite
    status: running
    port: 3101
    last_successful_release: 2026-06-12-1435

  capital-city-provisions:
    repo: https://github.com/AIFreedomTrustFederation/capital-city-provisions
    branch: main
    domain: capitalcityprovisions.com
    framework: nextjs
    status: running
    port: 3102
    last_successful_release: 2026-06-12-1510
```

The dashboard should read from this registry and display:

- App name
- Domain
- GitHub repo
- Branch
- Framework
- Status
- Last build
- Last commit
- Runtime logs
- Build logs
- Restart button
- Rebuild button
- Rollback button
- Open live app button

---

## Build and Rebuild Flow

The Vercel-style build process must work like this:

```text
1. Receive deploy request.
2. Clone or pull GitHub repo.
3. Read aift.app.yml if present.
4. Detect framework if config is missing.
5. Install dependencies.
6. Run build command.
7. Create production artifact or Docker image.
8. Start new container.
9. Run health check.
10. Route domain to new container.
11. Mark release successful.
12. Preserve previous release for rollback.
```

If the build fails:

```text
- Keep the existing live app running.
- Store the failed build logs.
- Mark deployment failed.
- Do not replace the current release.
```

If deployment starts but health check fails:

```text
- Stop the broken container.
- Restore the previous container.
- Mark the release unhealthy.
- Keep the last known good version live.
```

---

## Preview Deployment Standard

Production:

```text
main branch → app-domain.com
```

Development:

```text
dev branch → dev.app-domain.com
```

Pull request or feature branch:

```text
feature-name.preview.app-domain.com
```

Example:

```text
main                    → capitalcityprovisions.com
dev                     → dev.capitalcityprovisions.com
mobile-menu-fix          → mobile-menu-fix.preview.capitalcityprovisions.com
luxury-mobile-redesign   → luxury-mobile-redesign.preview.capitalcityprovisions.com
```

Preview deployments allow testing from a phone before production changes go live.

---

## Mobile-First Workflow

The system must require no desktop computer.

Required mobile tools:

- GitHub mobile app
- Mobile browser
- ChatGPT
- Termius, JuiceSSH, or another SSH client
- Browser-based code editor such as code-server or OpenVSCode Server
- Optional mobile editor such as Acode, Spck Editor, or Working Copy

Ideal workflow:

```text
1. Describe app or change in ChatGPT.
2. Generate or update files.
3. Commit files to GitHub.
4. Open VPS dashboard from phone.
5. Select repo or app.
6. Tap Deploy or Rebuild.
7. Watch build logs.
8. Open live app.
9. Roll back if needed.
```

Phone command example:

```bash
aift deploy handyman-site
```

Rebuild example:

```bash
aift rebuild capital-city-provisions
```

Logs example:

```bash
aift logs handyman-site
```

Rollback example:

```bash
aift rollback handyman-site
```

---

## Dashboard Requirement

The AI Freedom Trust VPS dashboard should eventually run at:

```text
https://vps.aifreedomtrust.com
```

Dashboard features:

- Deploy new app
- Import GitHub repo
- Rebuild app
- Restart app
- Stop app
- Rollback app
- Open live app
- Open GitHub repo
- View build logs
- View runtime logs
- Manage environment variables
- Manage domains
- View server resources
- View uptime status
- Run backups
- View release history
- Manage preview deployments

The dashboard should be designed for mobile first.

---

## Recommended Domain Layout

Private platform domains:

```text
vps.aifreedomtrust.com        → AIFT dashboard
code.aifreedomtrust.com       → browser code editor
status.aifreedomtrust.com     → uptime monitoring
logs.aifreedomtrust.com       → optional log viewer
preview.aifreedomtrust.com    → preview deployment root
```

Public app domains:

```text
handyman.aifreedomtrust.com
capitalcityprovisions.com
trust.aifreedomtrust.com
api.aifreedomtrust.com
```

DNS should support wildcard routing where possible:

```text
*.apps.aifreedomtrust.com      → VPS IP
*.preview.aifreedomtrust.com   → VPS IP
```

---

## Security Requirements

Minimum security standard:

- SSH key login only.
- Disable password SSH login.
- Disable direct root login when deploy user is ready.
- Use a non-root deploy user.
- Enable UFW firewall.
- Allow only SSH, HTTP, and HTTPS unless another port is required.
- Install Fail2ban.
- Use HTTPS for every dashboard and app.
- Protect dashboards with authentication.
- Store secrets outside GitHub.
- Use GitHub Secrets where needed.
- Use per-app `.env` files on the VPS.
- Never expose database ports publicly.
- Use automated backups.
- Rotate credentials after compromise.
- Keep OS and containers updated.

Suggested firewall baseline:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Secrets Standard

Secrets must not be committed to GitHub.

Each app may include:

```text
.env.example
```

But production secrets must live in:

```text
/opt/aift/apps/app-name/.env
```

or in the chosen PaaS environment variable manager.

Common secrets:

```text
DATABASE_URL
OPENAI_API_KEY
JWT_SECRET
SESSION_SECRET
SMTP_HOST
SMTP_USER
SMTP_PASS
STRIPE_SECRET_KEY
WEBHOOK_SECRET
```

---

## Logs Standard

Every app should have build and runtime logs.

```text
/opt/aift/logs/app-name/build.log
/opt/aift/logs/app-name/deploy.log
/opt/aift/logs/app-name/runtime.log
/opt/aift/logs/app-name/error.log
```

Commands:

```bash
aift logs app-name
aift logs app-name --build
aift logs app-name --runtime
aift logs app-name --tail
```

---

## Backup Standard

Required backup targets:

- App registry
- App environment files
- Docker Compose files
- Databases
- Upload volumes
- Reverse proxy configuration
- PaaS controller data

Recommended backup stack:

- Restic
- S3-compatible object storage
- Daily automated backups
- Weekly restore test

Backup command:

```bash
aift backup
```

Restore command:

```bash
aift restore app-name --release latest-good
```

---

## Monitoring Standard

The platform should monitor:

- VPS CPU
- RAM
- Disk usage
- Docker container health
- App HTTP response
- SSL certificate status
- Database availability
- Backup success
- Failed deploys

Recommended tool:

- Uptime Kuma for external-style uptime checks
- Built-in PaaS monitoring for deploy and container status

---

## Implementation Roadmap

### Phase 0: Repository Foundation

- [x] Define project mission.
- [x] Define Vercel-style requirements.
- [x] Define mobile-first workflow.
- [x] Define app standards.
- [ ] Add setup scripts.
- [ ] Add docs folder.
- [ ] Add starter templates.

### Phase 1: VPS Bootstrap

- [ ] Provision Ubuntu 24.04 VPS.
- [ ] Point domain DNS to VPS.
- [ ] Install Docker Engine.
- [ ] Install Docker Compose.
- [ ] Enable firewall.
- [ ] Enable Fail2ban.
- [ ] Create deploy user.
- [ ] Configure SSH key-only login.
- [ ] Install Coolify or chosen PaaS controller.
- [ ] Configure HTTPS.

### Phase 2: GitHub Deployment

- [ ] Connect GitHub account or deploy keys.
- [ ] Import this VPS repo.
- [ ] Import first test app.
- [ ] Configure production domain.
- [ ] Configure build command.
- [ ] Configure environment variables.
- [ ] Deploy first app.
- [ ] Confirm HTTPS.
- [ ] Confirm rebuild from GitHub push.

### Phase 3: App Standardization

- [ ] Create `aift.app.yml` schema.
- [ ] Create app templates.
- [ ] Create static site template.
- [ ] Create Vite template.
- [ ] Create Next.js template.
- [ ] Create Node API template.
- [ ] Create FastAPI template.
- [ ] Create Docker Compose template.

### Phase 4: AIFT CLI Wrapper

- [ ] Create `aift` CLI.
- [ ] Add `aift deploy`.
- [ ] Add `aift rebuild`.
- [ ] Add `aift rollback`.
- [ ] Add `aift logs`.
- [ ] Add `aift apps`.
- [ ] Add `aift status`.
- [ ] Add `aift domains`.
- [ ] Add `aift backup`.

### Phase 5: Mobile Dashboard

- [ ] Build dashboard UI.
- [ ] List deployed apps.
- [ ] Add deploy button.
- [ ] Add rebuild button.
- [ ] Add rollback button.
- [ ] Add log viewer.
- [ ] Add environment manager.
- [ ] Add domain manager.
- [ ] Add uptime panel.
- [ ] Add server resource panel.

### Phase 6: Preview Deployments

- [ ] Add branch deployment support.
- [ ] Add pull request preview support.
- [ ] Add wildcard preview DNS.
- [ ] Add preview cleanup.
- [ ] Add preview approval flow.

### Phase 7: Production Hardening

- [ ] Automated backups.
- [ ] Restore testing.
- [ ] Resource limits per app.
- [ ] Deployment audit logs.
- [ ] Secret rotation process.
- [ ] Dashboard 2FA.
- [ ] Disaster recovery guide.

---

## First Production Target

The first real milestone is:

> From a phone, deploy a GitHub-hosted AI Freedom Trust app to a live HTTPS domain, then make a change, rebuild it, and confirm the app updates without touching a laptop.

Definition of done:

- App source lives in GitHub.
- VPS builds the app.
- App runs in Docker.
- App has HTTPS.
- App rebuilds after a GitHub update.
- Logs are visible from phone.
- Rollback is available.

---

## Recommended Repository Description

Use this for the GitHub repo description:

```text
Open-source, phone-controlled Vercel-style VPS platform for building, rebuilding, deploying, previewing, monitoring, and rolling back AI Freedom Trust web apps from GitHub.
```

---

## Project Identity

**AI Freedom Trust VPS** is not just infrastructure.

It is the sovereign software factory for AI Freedom Trust.

It gives us:

- A private open-source cloud.
- A phone-powered development workflow.
- A self-hosted Vercel alternative.
- A reusable deployment standard.
- A GitHub-centered file system.
- A Docker-powered build engine.
- A launchpad for every AI Freedom Trust app.

This is the app foundry.
