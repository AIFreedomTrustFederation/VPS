# GitHub Secrets for VPS Deployment

The deployment workflow uses these repository secrets.

## Required secrets

| Secret name | Purpose |
| --- | --- |
| `VPS_HOST` | VPS public IPv4 address or hostname. |
| `VPS_USER` | SSH username. Usually `root` for the first setup. |
| `VPS_PORT` | SSH port. Usually `22`. |
| `VPS_SSH_KEY` | Private SSH key that can log into the VPS. |
| `VPS_APP_PATH` | Absolute path to the existing VPS git checkout on the server. On the current host this is `/root/AIFT/VPS`. There is no default; an empty value or a path that is not a git repository refuses the deploy. |
| `VPS_KNOWN_HOSTS` | SSH host key line(s) for `VPS_HOST`, in OpenSSH `known_hosts` format. The host string must match `VPS_HOST`. |

## How to get `VPS_KNOWN_HOSTS`

From a trusted network, pin the host key and store the printed line(s) as the secret:

```sh
ssh-keyscan -t ed25519 <VPS_HOST>
```

Or, on the server itself, format the host key the same way:

```sh
echo "<VPS_HOST> $(cat /etc/ssh/ssh_host_ed25519_key.pub)"
```

Do not rely on unauthenticated `ssh-keyscan` from CI. If SSH secrets are unset, automatic deploys still skip. If SSH secrets are set and `VPS_KNOWN_HOSTS` or `VPS_APP_PATH` is missing, the deploy fails closed.

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
