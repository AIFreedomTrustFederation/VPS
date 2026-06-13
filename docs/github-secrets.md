# GitHub Secrets for VPS Deployment

The deployment workflow uses these repository secrets.

## Required secrets

| Secret name | Purpose |
| --- | --- |
| `VPS_HOST` | VPS public IPv4 address or hostname. |
| `VPS_USER` | SSH username. Usually `root` for the first setup. |
| `VPS_PORT` | SSH port. Usually `22`. |
| `VPS_SSH_KEY` | Private SSH key that can log into the VPS. |

## Optional secrets

| Secret name | Purpose |
| --- | --- |
| `VPS_APP_PATH` | Repo path on the VPS. Default target is `/root/VPS`. |

## Naming standard

First node name:

`Sacramento Node 001`

Machine registry name:

`sacramento-node-001`

Dashboard domain:

`vps.aifreedomtrust.com`

## Important security rule

Never paste private keys, passwords, or VPS secrets into chat. Add them only inside GitHub repository secrets.

GitHub path:

`Repo -> Settings -> Secrets and variables -> Actions -> New repository secret`
