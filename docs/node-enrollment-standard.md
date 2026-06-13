# AIFT Node Enrollment Standard

AIFT should not rely on every user inventing their own VPS secret names or setup process.

Each node must be enrolled through the same standard flow.

## Standard names

For every enrolled node, AIFT uses these connection fields:

- `VPS_HOST`
- `VPS_USER`
- `VPS_PORT`
- `VPS_SSH_KEY`

For multi-tenant or multi-node setups, these become scoped records inside the AIFT runtime store instead of being hand-managed names.

## Standard node flow

1. User opens AIFT from browser or phone.
2. User chooses Enroll Node.
3. AIFT gives the user a bootstrap command or QR code.
4. User runs the command on their server.
5. Server detects public host, local SSH user, and SSH port.
6. Server creates a deploy identity for automation.
7. Server writes a local node profile.
8. Server prints or submits a safe enrollment summary.
9. AIFT stores the node profile for that tenant.
10. Future deploys use that profile automatically.

## First tenant defaults

Tenant name: AI Freedom Trust

Tenant id: ai-freedom-trust

First node display name: Sacramento Node 001

First node machine name: sacramento-node-001

Default app path: /root/VPS

Default dashboard domain: vps.aifreedomtrust.com

## Security rule

The private deploy identity must be created on the node and stored only in a platform secret manager or runtime secret store. It must never be committed into GitHub.

## Phase Zero bridge

Until the AIFT provider console can write GitHub repository secrets directly through a user-approved app installation, the bootstrap script can output exact secret commands or exact values for the user to paste into GitHub Secrets.

## Phase One target

AIFT will use a GitHub App installation and a node enrollment API so the user approves access in the browser once, then AIFT can store only safe installation references and node profile metadata.
