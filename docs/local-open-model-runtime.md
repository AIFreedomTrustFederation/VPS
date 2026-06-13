# Local open model runtime

AIFT VPS WebAI can use a local open model runtime on the current node.

This keeps WebAI open-source-first and avoids requiring user-provided API keys for core assistant behavior.

## Current connector

The current connector supports a local Ollama-style endpoint.

Default settings:

```text
WEBAI_LOCAL_MODEL_URL=http://127.0.0.1:11434
WEBAI_LOCAL_MODEL_NAME=llama3.2
WEBAI_LOCAL_MODEL_RUNTIME=ollama
```

## Dashboard model choice

In `/webai`, choose:

```text
Local open model
```

When selected, WebAI will try the local open runtime. If the runtime is not running yet, WebAI will say so and fall back to the local AIFT context responder.

## Node setup

On a capable node, install and run an open model runtime locally.

The runtime must be listening on the node itself, not on a third-party API.

Expected local endpoint:

```text
http://127.0.0.1:11434
```

Expected model name:

```text
llama3.2
```

These can be changed with environment variables before starting the dashboard.

## Start dashboard with custom local model

```bash
WEBAI_LOCAL_MODEL_URL=http://127.0.0.1:11434 \
WEBAI_LOCAL_MODEL_NAME=llama3.2 \
WEBAI_LOCAL_MODEL_RUNTIME=ollama \
npm run dev -- --port 3001
```

## Verify configuration

Open:

```text
/api/webai/local-runtime
```

## GitHub as source of truth

Model choices, connector behavior, and runtime policy must be defined in this repository.

Runtime selection should not be hidden in private app code.

## No user API key rule

The local open model path must not ask the user to paste a private API key.

If any token is needed later for node trust or control-plane registration, it should be generated and stored by the platform, hidden from public views, and never shown in logs.

## Next runtime targets

Future runtime adapters can be added for:

```text
llama.cpp server
OpenAI-compatible local endpoints
node-hosted model workers
network-routed model workers
```

Each new adapter should be added as code in the repo and exposed through the model registry.
