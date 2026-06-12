# VPS Security Baseline

This is the minimum security standard for the AI Freedom Trust VPS app foundry.

## Core Rule

The VPS controls deployment for multiple apps, so it must be treated as production infrastructure from the beginning.

## Required Protections

- SSH key login only.
- Disable password login after keys are confirmed.
- Use a non-root deploy user.
- Expose only ports 22, 80, and 443 unless a service explicitly requires more.
- Keep dashboards behind authentication.
- Never commit secrets to GitHub.
- Use per-app environment variables.
- Back up databases, volumes, app configs, and secrets.
- Keep OS packages and containers updated.

## Firewall

Baseline firewall setup:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

## Fail2ban

Install and enable:

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
```

## SSH Hardening

After confirming key-based login works, edit:

```bash
sudo nano /etc/ssh/sshd_config
```

Recommended settings:

```text
PasswordAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
```

Restart SSH:

```bash
sudo systemctl restart ssh
```

Keep an active SSH session open while testing a second login so you do not lock yourself out.

## Secrets

Never commit real `.env` files.

Allowed in GitHub:

```text
.env.example
```

Not allowed in GitHub:

```text
.env
.env.production
API keys
database passwords
JWT secrets
SMTP passwords
payment provider secrets
```

Production app secrets should live in the PaaS environment manager or:

```text
/opt/aift/apps/app-name/.env
```

## Backups

Back up:

- App registry
- Database volumes
- Uploaded files
- PaaS controller data
- Reverse proxy configuration
- App environment files

Recommended backup tool:

```text
restic
```

## Recovery Rule

A backup is not trusted until it has been restored successfully at least once.

## Dashboard Security

Private dashboards should use strong passwords and preferably two-factor authentication when available.

Private domains:

```text
vps.aifreedomtrust.com
code.aifreedomtrust.com
status.aifreedomtrust.com
```

Public apps should be isolated from private admin tools.

## Deployment Safety

A failed build must not replace the live app.

A failed health check must roll back or preserve the previous known-good release.

## Minimum Production Checklist

- [ ] SSH key login confirmed
- [ ] Password login disabled
- [ ] Firewall enabled
- [ ] Fail2ban enabled
- [ ] Docker installed
- [ ] Dashboard protected
- [ ] HTTPS working
- [ ] Secrets outside GitHub
- [ ] Backups configured
- [ ] Restore tested
