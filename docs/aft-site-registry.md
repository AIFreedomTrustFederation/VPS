# Native AFT Site Registry

The old Web3 domain hosting code remains useful as a reference, but the VPS app now starts its own native site registry foundation.

## Goal

Create browser-safe free website URLs inside the AIFT app before expanding into IPFS, Filecoin, wallet identity, or custom resolver layers.

## First working model

```text
Create site
  -> write registry record
  -> build a static artifact
  -> mark deployment healthy
  -> switch the route to the new deployment
  -> keep the prior deployment as fallback
```

## Local files

```text
~/.aift/registry/sites.json
~/.aift/sites/<slug>/<deployment-id>/index.html
```

Both paths can be overridden with environment variables:

```text
AIFT_SITE_REGISTRY_PATH
AIFT_SITE_ARTIFACT_PATH
AIFT_PUBLIC_BASE_URL
```

## Browser-safe URLs

```text
/s/<slug>
```

Later phases can add subdomains and decentralized names, but the browser-compatible gateway comes first.

## Handoff rule

Traffic must not switch to a new deployment until the deployment is healthy. Failed builds should leave the old active deployment in place.

## Next implementation steps

1. Add route handlers for creating sites, deploying sites, resolving slugs, and checking deployment status.
2. Wire the `/sites` page to display the registry.
3. Connect the WebAI builder to write into the native site registry.
4. Add optional IPFS/Filecoin mirror deployers after the local gateway is stable.
5. Add Caddy or Traefik route switching for subdomain support.
