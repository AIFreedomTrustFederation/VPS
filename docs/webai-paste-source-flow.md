# WebAI paste source flow

Users should be able to paste a repository link directly into WebAI chat.

WebAI should then treat the link as a source for an AIFT VPS build.

## Desired flow

```text
User pastes repository link into WebAI chat
WebAI recognizes the source
WebAI saves it to the user's local source registry
WebAI reads real files from GitHub
WebAI creates an AIFT app profile
WebAI prepares the Termux build path
User approves build actions
AIFT VPS runs the build on an eligible node
WebAI reports logs and next steps
```

## Product rule

The paste box and chat box should behave the same way.

If a user pastes a repository link into WebAI, WebAI should not require the user to go to a separate form first.

## Source of truth rule

GitHub remains the source of truth for repository files.

AIFT VPS stores a local source registry record pointing to the repository, branch, and current build profile state.

## Terminal rule

Termux can be used as the local node terminal for proof runtime.

WebAI should prepare commands and approved actions for Termux. The long-term app should run the same flow through the bundled runtime.

## Safety boundary

WebAI should not silently publish, expose secrets, or perform irreversible actions without approval.

Build preparation can be automated. Release and public routing require approval.

## Next implementation step

Update the WebAI chat API so repository links in messages are saved as app sources and return the analyzer path for that source.
