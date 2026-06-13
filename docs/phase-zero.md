# Phase Zero

Phase Zero is the first working foundation for AI Freedom Trust Cloud App Foundry.

Goal: one managed VPS node running the AIFT dashboard with registry files, health checks, Docker Compose, and GitHub deployment.

First node:

- Display name: Sacramento Node 001
- Machine name: sacramento-node-001
- Dashboard domain: vps.aifreedomtrust.com

Required GitHub secrets:

- VPS_HOST
- VPS_USER
- VPS_PORT
- VPS_SSH_KEY

Phase Zero is complete when:

- The dashboard build workflow passes.
- The deploy workflow reaches the VPS.
- The dashboard container starts.
- The health page loads.
- The health API returns status.
- The nodes page shows the first node.
- The apps page shows the dashboard app.
- The templates page shows starter templates.
- The deployments page shows the dashboard deployment.
- The disclosure page shows where the dashboard is hosted.

Phase One starts after this foundation is live.
