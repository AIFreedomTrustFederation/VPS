# AIFT VPS Node App screen flow

This document defines the first perfect user flow for the installable AIFT VPS Node App.

## Primary goal

A device should become an AIFT VPS Node through a simple app-controlled flow.

```text
Install app
Open app
Create identity
Prepare runtime
Start node
Write heartbeat
Show online
Open dashboard
```

## Screen 1: Welcome

Purpose:

- explain AIFT VPS
- explain that this device can become a provider node
- explain that the owner controls participation

Primary action:

```text
Join AIFT VPS Network
```

Secondary action:

```text
Learn More
```

## Screen 2: Node Identity

Purpose:

- create node display name
- create stable node id
- choose device class

Fields:

```text
Node display name
Node class
Region or local label
```

Examples:

```text
Sacramento Phone Node
Laptop Worker 001
Garage Mini PC Node
```

## Screen 3: Runtime Setup

Purpose:

- prepare bundled Linux-style runtime
- verify required runtime features
- show setup progress

Checks:

```text
runtime folder ready
Node.js ready
package manager ready
download support ready
local process support ready
log folder ready
```

## Screen 4: Provider Mode

Purpose:

- let the owner choose how this device participates

Options:

```text
Wi-Fi only
Charging only
Low-power mode
Developer mode
Allow static previews
Allow frontend builds
Allow approved background jobs
```

Default phone setting:

```text
Wi-Fi only
Charging preferred
Static previews only
Frontend builds optional
```

## Screen 5: Start Node

Purpose:

- start local AIFT VPS node service
- start local dashboard if enabled
- write first heartbeat

Status items:

```text
node identity
runtime status
local dashboard
heartbeat
logs
```

## Screen 6: Node Online

Purpose:

- show that the node is live
- show local dashboard link
- show heartbeat status
- show node card/export status

Primary actions:

```text
Open Dashboard
View Logs
Pause Node
Discover Nodes
```

## Screen 7: Discovery

Purpose:

- show known local node cards
- show heartbeat records
- prepare for future control-plane registry

Data shown:

```text
node id
display name
node class
status
last seen
health URL
```

## Screen 8: Logs

Purpose:

- show runtime logs
- show dashboard logs
- show heartbeat logs
- show job logs later

## Screen 9: Settings

Purpose:

- edit participation rules
- change node display name
- pause provider mode
- update runtime
- reset local node

## Perfect first-launch outcome

A perfect first launch ends with:

```text
Node identity created
Runtime ready
Dashboard reachable
Heartbeat written
Node online screen visible
Owner can pause the node
```

## What not to include in v0

Do not include first:

```text
payments
public marketplace
arbitrary workload execution
stateful databases
public routing
complex billing
```

The first app must make one device reliably become one AIFT VPS Node.
