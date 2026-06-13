# AIFT Node Agent

The AIFT Node Agent is the first skeleton for decentralized compute nodes in AI Freedom Trust Cloud App Foundry.

## Purpose

The agent runs on a compute node and reports:

- Node name
- Online status
- Hostname
- CPU core count
- Memory usage
- Load average
- Docker availability
- Heartbeat timestamp

## Current v0.1 Behavior

If `AIFT_CONTROL_PLANE_URL` and `AIFT_NODE_TOKEN` are configured, the agent sends heartbeats to:

```text
/api/nodes/heartbeat
```

If they are not configured, it prints heartbeat payloads locally.

## Environment

```text
AIFT_NODE_NAME=sacramento-node-001
AIFT_CONTROL_PLANE_URL=https://vps.aifreedomtrust.com
AIFT_NODE_TOKEN=change-this-node-token
AIFT_HEARTBEAT_INTERVAL_MS=30000
```

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Security Rule

The node agent must only accept approved jobs from the control plane. It must not expose arbitrary shell execution to the public internet.
