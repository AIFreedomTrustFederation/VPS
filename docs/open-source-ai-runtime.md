# Open-source AI runtime for AIFT VPS

AIFT VPS should use open-source AI components for core WebAI functions.

The goal is to avoid depending on closed AI APIs or third-party API rate limits for essential platform operations.

## Core rule

Core WebAI features should be able to run on AIFT VPS provider nodes using open-source models, open-source runtimes, and decentralized compute capacity.

## What this means

AIFT VPS should prefer:

- open-source models
- self-hosted inference
- local node inference where practical
- decentralized worker scheduling
- transparent model configuration
- real usage accounting based on available network capacity

AIFT VPS should avoid making core operation dependent on:

- closed API-only models
- vendor-specific rate limits
- hidden infrastructure
- non-portable inference services

## Practical reality

There may still be physical capacity limits.

The network can remove vendor API rate limits, but it cannot remove constraints such as:

- available CPU
- available RAM
- available GPU
- battery level
- network speed
- queue length
- model size
- storage space

So AIFT VPS should not advertise impossible infinite compute. It should advertise decentralized capacity that grows as provider nodes join.

## WebAI model layers

WebAI should support multiple model tiers:

```text
Local small model: fast local help, summaries, status review
Node-hosted model: larger model on laptop, desktop, server, or VPS node
Cluster model: distributed work across eligible provider nodes
Fallback connector: optional external model, disabled for core dependency
```

## First AI runtime targets

The first open-source AI runtime targets should be:

```text
small local assistant model
repo/document summarizer
status auditor
log explainer
template helper
message drafting helper
```

## Node eligibility

Not every device should run every model.

Suggested placement:

```text
phone-experimental: tiny models, summaries, local status help
phone-plugged-in: tiny or small models, light tasks
laptop-worker: small to medium models, builds, repo review
desktop-worker: medium models, heavier build/review tasks
server-node: larger models, always-on assistant services
verified-provider-node: production AI services
```

## Safety rule

WebAI should not treat AI output as automatically authorized action.

AI may recommend, draft, explain, summarize, and prepare. Actions that affect real repositories, releases, secrets, public routing, billing, or provider policy should require explicit operator approval.

## Live-data rule

WebAI must use real repository and node data.

If data is missing, WebAI should say it is missing and recommend the setup step rather than inventing records.

## Long-term goal

AIFT VPS should become a decentralized open-source AI cloud where WebAI itself helps route work across the provider network while staying transparent about which node and which model handled each task.
