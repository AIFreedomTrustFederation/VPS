# AIFT Node App

AIFT Node App is the planned cross-platform device application for the AI Freedom Trust decentralized provider network.

It will replace one-off scripts with a real app experience for phones, tablets, laptops, desktops, mini PCs, VPS servers, and bare-metal servers.

## Purpose

The node app lets a device join the AIFT network as a provider node.

It should support:

- Android phones and tablets
- laptops
- desktops
- local mini PCs
- always-on servers
- VPS nodes

## Responsibilities

The node app should handle:

- node enrollment
- node identity
- local status
- local logs
- heartbeat
- resource reporting
- capability reporting
- approved workload levels
- safe job execution
- result reporting
- pause and resume
- local dashboard link
- update flow

## Current proof mode

Current proof mode uses Termux scripts:

```text
scripts/aift-termux.sh
scripts/termux-phone-provider-node.sh
scripts/termux-join-provider-node-zip.sh
scripts/aift-node-card.sh
```

## Future package options

Candidate stacks:

```text
Tauri desktop app
Android app
React Native mobile app
Electron desktop app
Flutter mobile and desktop app
```

Recommended direction:

```text
Tauri for desktop nodes
Android app for mobile nodes
Shared web dashboard UI where possible
```

## Node classes

```text
phone-experimental
phone-plugged-in
laptop-worker
desktop-worker
mini-pc-node
server-node
verified-provider-node
```

## First production milestone

Create a minimal node app shell that can:

1. show node identity
2. show local URL
3. show health
4. export node card
5. import node card
6. report heartbeat to a control plane
7. display allowed workload levels
