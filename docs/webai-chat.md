# WebAI Chat for AIFT VPS

WebAI Chat is the conversational operating assistant inside AIFT VPS.

It should help users build apps, connect repositories, understand node status, coordinate decentralized cloud compute, draft user messages, and keep the project aligned with live data and documented rules.

## Product role

WebAI Chat should live inside:

```text
AIFT VPS Dashboard
AIFT VPS Node App
```

It should feel like a ChatGPT-style workspace with:

- chat history sidebar
- current conversation area
- project context
- node context
- repo context
- action suggestions
- approval checkpoints

## Core uses

WebAI Chat should help with:

- creating an app from a real repository
- connecting an authorized GitHub repository
- explaining build settings
- checking real node status
- checking heartbeat records
- checking node cards
- reviewing logs
- drafting user messages
- drafting deployment notes
- explaining disclosure records
- summarizing README status
- suggesting next steps

## Live-data rule

WebAI Chat must not invent operational records.

It should answer from:

- this repository
- authorized connected repositories
- local registries
- local heartbeats
- local node cards
- local logs
- future control-plane records

If data does not exist yet, WebAI should say what is missing and offer the next setup step.

## Chat layout

```text
Sidebar
  New chat
  Chat history
  Project chats
  Node chats
  System/status chats

Main panel
  Current conversation
  Context chips
  Suggested actions
  Message composer

Right/context panel later
  Active project
  Active node
  Connected repo
  Build status
  Disclosure status
```

## Conversation types

```text
Project chat
Node chat
Repo chat
Build chat
Release chat
Disclosure chat
Support message chat
System status chat
```

## WebAI action boundaries

WebAI can draft, inspect, explain, summarize, and prepare.

Actions that affect real infrastructure, repositories, public release state, external accounts, secrets, billing, or routing should require explicit owner approval.

## First dashboard milestone

Create a `/webai` page with:

- sidebar shell
- empty chat history state
- current conversation empty state
- real-data notice
- list of allowed data sources
- message composer shell

No fake conversations should be shown.
