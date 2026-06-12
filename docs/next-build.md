# Next Build Sequence

This document defines the immediate build order after the first foundation commit.

## 1. Run Baseline Setup on a VPS

Clone this repository onto the VPS, make the scripts executable, and run:

```bash
sudo bash scripts/setup-vps.sh
```

## 2. Install the PaaS Controller

Install the selected open-source PaaS controller from its current official installer instructions. The first recommended controller is Coolify.

## 3. Connect GitHub

Connect the AI Freedom Trust GitHub account or installation.

## 4. Create the First Test App

Create this repository:

```text
AIFreedomTrustFederation/aift-launch-test
```

Copy the contents of this folder into the new test app repository:

```text
templates/vite-react/
```

## 5. Deploy Test App

Deploy it to:

```text
test.aifreedomtrust.com
```

## 6. Confirm Vercel-Like Rebuild

Make a visible text change from phone, commit to GitHub, and confirm the VPS rebuilds the app.

## 7. Wire the AIFT CLI

After the PaaS controller is selected and working, wire these commands:

```bash
aift deploy app-name
aift rebuild app-name
aift rollback app-name
aift logs app-name
aift apps
aift status
```

## 8. Build the Mobile Dashboard

Only after deploy and rebuild work reliably, build the mobile dashboard at:

```text
vps.aifreedomtrust.com
```
