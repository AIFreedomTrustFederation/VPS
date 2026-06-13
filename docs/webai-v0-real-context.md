# WebAI v0 real context

WebAI v0 is the first real implementation step for WebAI inside AIFT VPS.

It does not invent projects, nodes, chats, builds, releases, or deployments. It reads real files and reports what exists.

## Goal

Create a real context layer that lets WebAI understand the current AIFT VPS state from local files and repository files.

## First API target

```text
/apps/aift-dashboard/app/api/webai/context/route.ts
```

The API should read:

- repository foundation docs
- README-V2 when available
- live data policy
- WebAI docs
- node app foundation files
- local heartbeat files
- local node cards
- local logs

## First UI target

```text
/apps/aift-dashboard/app/webai/page.tsx
```

The page should display:

- repo context status
- policy context status
- WebAI context status
- node context status
- heartbeat status
- node card status
- log status
- recommended next step

## Real-data rule

If a file or record does not exist, show missing status.

Do not create fake records to make the page look full.

## Context source groups

```text
repo_docs
webai_docs
node_foundation
runtime_docs
local_heartbeats
local_node_cards
local_logs
```

## Recommended next step logic

If repo docs are present but local heartbeat is missing:

```text
Run heartbeat or discovery on a real node.
```

If heartbeat exists but node card is missing:

```text
Export node card.
```

If WebAI docs are present but chat storage is missing:

```text
Add real WebAI conversation storage.
```

If node app docs exist but app shell is static:

```text
Connect the app shell to real runtime context.
```
