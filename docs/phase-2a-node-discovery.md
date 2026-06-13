# Phase 2A: Node Discovery

Phase 2A moves AIFT VPS from independent local devices toward a decentralized node network.

## Goal

Each node should be able to:

- write a local heartbeat record
- export a small node card
- import another node card
- list known node cards
- prepare the dashboard to show discovered nodes

## Current commands

From a local repo checkout:

```bash
bash aift heartbeat
bash aift node-card export
bash aift node-card list
bash aift node-card import path/to/card
```

Node 002 example:

```bash
NODE_NAME=termux-node-002 NODE_DISPLAY="Termux Node 002" APP_PORT=3001 bash aift heartbeat
NODE_NAME=termux-node-002 NODE_DISPLAY="Termux Node 002" APP_PORT=3001 bash aift node-card export
```

## Files created locally

Heartbeat file:

```text
~/.aift-<node-name>/heartbeats/<node-name>.json
```

Node cards:

```text
~/.aift-<node-name>/node-cards/
```

## Next step

The dashboard page `/discovered-nodes` exists as the first visual surface. The next iteration should read heartbeat files and node cards into the dashboard.
