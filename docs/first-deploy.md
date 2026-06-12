# First Deploy Guide

This guide proves the AI Freedom Trust VPS concept: build and deploy one GitHub-hosted app from a phone to a live HTTPS domain.

## Goal

Deploy one test app from GitHub, rebuild it after a change, and confirm rollback/log visibility.

## Requirements

- Ubuntu 24.04 or 22.04 VPS
- Domain pointed to the VPS IP
- GitHub account access
- Mobile browser
- Mobile SSH app such as Termius or JuiceSSH
- This repo cloned or accessible on the VPS

## Step 1: Run the VPS Baseline Installer

SSH into the VPS:

```bash
ssh root@YOUR_VPS_IP
```

Clone the VPS repo:

```bash
git clone https://github.com/AIFreedomTrustFederation/VPS.git /root/VPS
cd /root/VPS
```

Run the installer:

```bash
chmod +x scripts/*.sh
sudo bash scripts/setup-vps.sh
```

## Step 2: Install the PaaS Controller

Recommended first controller: Coolify.

Run the current official installer on the VPS:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

When the installer finishes, open the URL shown in the terminal from your phone browser.

## Step 3: Connect GitHub

Inside the PaaS dashboard:

1. Create the first admin account.
2. Connect GitHub.
3. Authorize access to AI Freedom Trust repositories.
4. Confirm the VPS can clone private repos if needed.

## Step 4: Create a Test App Repo

Create a repo such as:

```text
AIFreedomTrustFederation/aift-launch-test
```

Use the `templates/vite-react` app from this repo as the starter.

## Step 5: Deploy the Test App

In the PaaS dashboard:

1. New project.
2. New application.
3. Select GitHub repository.
4. Choose branch `main`.
5. Set build command:

```bash
npm ci && npm run build
```

6. Set publish/output directory:

```text
dist
```

7. Assign domain:

```text
test.aifreedomtrust.com
```

8. Deploy.

## Step 6: Verify HTTPS

Open the domain from your phone:

```text
https://test.aifreedomtrust.com
```

The page should load with the AI Freedom Trust launch message.

## Step 7: Test Rebuild

Change text in the GitHub repo from your phone.

Commit to `main`.

Confirm the VPS rebuilds the app automatically or trigger rebuild manually from the dashboard.

## Step 8: Confirm Logs

Check:

- Build logs
- Runtime logs
- Deployment status
- Health check status

## Step 9: Confirm Rollback

Make a bad change intentionally in a test branch or test app.

Confirm the platform does not destroy the last known good deployment.

## Definition of Done

The first milestone is complete when:

- App source lives in GitHub.
- VPS builds the app.
- App runs publicly over HTTPS.
- A phone-only code change triggers rebuild.
- Logs are viewable from the phone.
- Last good deployment can be preserved or restored.

## Next Step

After this works, build the `aift` CLI wrapper and mobile dashboard.
