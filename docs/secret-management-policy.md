# Secret management policy

AIFT VPS should not require normal users to bring or paste API keys in order to use core WebAI, no-code app building, node participation, or decentralized compute features.

## Core rule

Core AIFT VPS and WebAI features should be open-source, decentralized, and not dependent on user-supplied third-party API keys.

## User key rule

Users should not be asked to provide API keys for core WebAI operation.

If a user connects an outside service later, that connector should use a secure authorization flow or platform-managed secret storage. The raw secret value should not be displayed in the UI after creation.

## Platform-managed secrets

If AIFT VPS must create a token, key, or secret for a user, it should be:

- generated automatically
- assigned to the correct user or node
- stored in a secure secrets store
- hidden from public pages
- hidden from logs
- hidden from deployment output
- never rendered back in full after creation
- revocable
- rotatable

## Display rule

Secrets should never be shown as plain text in normal app views.

Allowed display formats:

```text
created
connected
last used
expires soon
revoked
••••••••1234
```

Not allowed:

```text
full raw key
full token
full secret
private credential in logs
private credential in docs
private credential in public build output
```

## Open-source AI rule

WebAI should remain open-source and decentralized by default.

Core model operation should use:

- local open model choices
- node-hosted open model choices
- network-routed open model choices
- shared AIFT VPS compute capacity

Third-party closed AI APIs should not become the core dependency for WebAI.

## No rent-seeker dependency

AIFT VPS should avoid building essential functionality around external vendors that impose artificial rate limits, closed access, or paid bottlenecks for the core assistant experience.

The network should scale through decentralized provider capacity.

## Honest capacity rule

AIFT VPS can avoid vendor API rate limits, but it must still respect real compute limits:

- CPU
- RAM
- GPU
- battery
- bandwidth
- storage
- queue length
- node uptime

## Logging rule

Logs should not include secrets.

Any log writer should redact values that look like keys, tokens, passwords, private credentials, or connection strings.

## Repository rule

No real secret should ever be committed to the repository.

Only placeholder names are allowed, such as:

```text
AIFT_SECRET_NAME
AIFT_NODE_TOKEN
AIFT_REPO_CONNECTOR_TOKEN
```

## First implementation target

Add a secrets boundary before connected repositories, model routing, external connectors, production deployments, or user accounts are fully enabled.
