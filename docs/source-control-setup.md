# Source Control Setup

This project should use a user-approved browser flow for repository access.

## Goal

Allow each tenant to connect a code source from phone or browser without pasting private tokens into chat or into committed files.

## Required runtime values

Use environment variables or platform secrets for these values:

- AIFT_GITHUB_APP_NAME
- AIFT_GITHUB_APP_INSTALL_URL
- AIFT_GITHUB_CALLBACK_URL
- AIFT_GITHUB_APP_ID
- AIFT_GITHUB_CLIENT_ID

Private values must stay in the runtime secret store or platform secret manager.

## Browser and mobile flow

1. User opens AIFT Cloud from browser or phone.
2. User chooses source control setup.
3. User is sent to the approved provider install screen.
4. User approves only the needed repositories.
5. Provider returns the user to the AIFT callback URL.
6. AIFT stores the installation reference in the tenant record.
7. App deployments use that installation reference instead of personal tokens.

## First tenant

Tenant: AI Freedom Trust

Primary repo: AIFreedomTrustFederation/VPS

Node: sacramento-node-001

## Security rules

- Never store personal access tokens in GitHub files.
- Never paste private keys into chat.
- Prefer app installation access over personal tokens.
- Store only installation IDs and safe metadata in tenant records.
- Store private keys only in the runtime secret store.
