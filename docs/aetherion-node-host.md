# Aetherion AI node: VPS implementation and evidence contract

**Status: implementation candidate, not a live server.** The VPS repository is the AIFT Cloud App Foundry **source**, not evidence that a VPS has been provisioned. This PR provides an opt-in Ollama Compose profile and a read-only, bounded inference probe; it does **not** install weights, register a GitHub runner, download a model, deploy to a server, open a port, or enable autonomous writes.

## Federation architecture

    AIFT-Runtime: verified Aetherion GGUF artifact
                        |
                        v
    VPS: private model storage -> Ollama loopback inference (127.0.0.1:11434)
                                                |
                                  local /v1/chat/completions
                                                |
                   AIFT-OS trusted-source, bounded AI plan (isolated runner)
                                                |
                               validated one-document proposal
                                                |
                GitHub-hosted publisher, scoped short-lived GitHub App token
                                                |
                              DRAFT PR + exact-head CI
                                                |
                              human merge/deploy approval

VPS owns real node infrastructure and runtime observations. AIFT-Runtime owns model/runtime contracts. AIFT-OS retains orchestration, source/issue authorization, and the draft-PR publication boundary. **The inference host must never receive publisher write credentials.** An inference service is not a general code-execution agent.

The existing VPS WebAI connector uses \`WEBAI_LOCAL_MODEL_URL=http://127.0.0.1:11434\` and \`WEBAI_LOCAL_MODEL_NAME=aetherion:latest\`. The AIFT-OS bounded documentation worker uses \`AIFT_MODEL_URL=http://127.0.0.1:11434/v1\` and \`AIFT_MODEL_NAME=aetherion:latest\`. These loopback URLs work only when the calling process shares the host network namespace with Ollama. Saving the URL in a GitHub variable does not make the phone or VPS remotely accessible.

## Host prerequisites

1. Verify a real Linux host and its CPU, RAM, storage, reliable power/network, SSH recovery, backup, and Docker Engine with Compose. A 2.1 GB GGUF is **not** a 2.1 GB maximum memory requirement; inference also needs context, runtime, and OS memory. Measure instead of guessing.
2. Confirm an approved OS patch and isolation plan. Do not silently install Docker, change SSH/firewall, rotate secrets, expose a route, or create privileged infrastructure.
3. Choose and independently verify a **digest-pinned** official Ollama image matching the host architecture. The Compose template refuses to start without a digest and an existing model import directory. No floating image tag is supplied.
4. Obtain model bytes from the authorized AIFT-Runtime source and verify them on the destination. Previously observed SHA-256 for Aetherion GGUF: \`626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d\`. Do not assume that a file in a phone's Termux installation also exists on a remote VPS.
5. Do **not** place a persistent GitHub Actions self-hosted runner from a **public** repository directly on your production model host. GitHub warns that untrusted workflow code can compromise a self-hosted runner. Prefer a controlled ephemeral VM, no Docker socket, no publisher credential, strict job admission and independent audit evidence.

## Operator-controlled Compose candidate

The repository supplies \`ops/aetherion/compose.yml\`, containing only the model runtime, with host port **127.0.0.1:11434**, resource bounds, a persistent Ollama volume, read-only model-import mount, disabled cloud support and restricted process privileges. Inside the container, Ollama binds \`0.0.0.0\` to communicate across the container bridge; the **host** publishes only loopback. Independently audit actual host sockets and firewall before deployment. The included Docker healthcheck detects the service answering, **not successful model generation**.

In a private, backed-up directory outside Git, prepare \`aetherion.gguf\` and a plaintext \`Modelfile\` containing \`FROM /aift-import/aetherion.gguf\`. Verify the file hash with \`sha256sum\` and ensure adequate disk space for a second imported copy.

On the **actual intended VPS host**, after operator approval and review:

\`\`\`sh
export AIFT_OLLAMA_IMAGE_DIGEST='sha256:<verified-image-digest>'
export AIFT_MODEL_IMPORT_DIR='/absolute/private/path'
export AIFT_OLLAMA_MEMORY_LIMIT='6g'   # change after measuring host capacity

docker compose -f ops/aetherion/compose.yml config

# Requires explicit deployment approval:
docker compose -f ops/aetherion/compose.yml up -d

# Once service and import folder are verified:
docker compose -f ops/aetherion/compose.yml exec ollama \
  ollama create aetherion -f /aift-import/Modelfile
\`\`\`

The supplied instructions neither execute these commands nor validate a live Docker deployment. If the image's read-only filesystem requires additional writable paths, adjust only after examining logs and reviewing the resulting security boundary; do not silently switch to privileged mode.

## Read-only evidence and automated tests

Run from a VPS checkout on **the node being checked**, including the current Android Ubuntu PRoot environment for comparison:

\`\`\`sh
python3 -B scripts/aift-aetherion-preflight.py
python3 -B scripts/aift-aetherion-preflight.py --probe-inference

python3 -B tests/test-aetherion-preflight.py -v
python3 -B tests/test-aetherion-compose.py -v
npm run qa:local
\`\`\`

The probe accepts only literal HTTP \`127.0.0.1:<port>/v1\`; it does not follow redirects, use DNS, read API keys, or contact model providers. Default model identifier is \`aetherion:latest\`. It reports the measured available memory and free root disk as **observations, not capacity certification**. Its JSON status is one of \`blocked\`, \`model_registration_observed\`, or \`local_inference_verified\`. A successful opt-in inference check requires a strict \`{old,new,summary}\` replacement that matches the actual AIFT-OS worker's safe single-span editing contract. A nonzero exit code means that requested proof was not obtained.

**Runner enrollment, production deployment and routing are always recorded as \`not_checked\`.** Nothing in this probe proves a server is always on. Do not present these local observations as a production node heartbeat or a public release.

## Follow-on engineering milestones

- **Provider inventory:** verified server profile, tenant/node identity, storage, capacity, network, backups, and enrollment without claiming placeholder status is live.
- **Model service:** pinned, isolated Ollama and verified weights; structured-output and sustained-memory/latency tests; restarts and actual service logs.
- **Safe job runner:** short-lived, narrowly scoped, preferably ephemeral Linux runner with no publishing secrets or Docker daemon access, controlled source and outbound traffic, cleanup and provenance.
- **Federation pipeline:** AIFT-OS labeled issue admission, exact SHA, deterministic bounded edits, artifact hash attestation, separate GitHub-hosted GitHub App publisher and draft PRs with review.
- **App Foundry UX:** real node health, model registration, inference evidence, queue length, CI and PR source links, blocked dependencies and operator actions.
- **Operating controls:** metrics, rate/concurrency limits, log redaction, restore-tested backups, incident handling, recovery and host-specific security review.

**Approval boundary:** keep \`AIFT_AUTODEV_AI_ENABLED=false\`. No auto-merge, public route, model installation, runner enrollment, credential changes or production deployment is authorized by this document.

See [VPS node enrollment](node-enrollment-standard.md), [open model runtime](local-open-model-runtime.md), [validation](validation.md) and [AGENTS.md](../AGENTS.md).
