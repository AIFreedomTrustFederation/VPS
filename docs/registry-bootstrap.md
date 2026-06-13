# Registry Bootstrap

The AIFT dashboard reads live registry files from `/opt/aift/registry`.

Required registry files:

- apps.yml
- nodes.yml
- templates.yml
- builds.yml
- deployments.yml

Example files are stored in `registry-examples/` inside this repository.

On the first VPS node, copy the example registry files into `/opt/aift/registry` after cloning the repo. Do not overwrite production registry files after real apps are live.

Dashboard pages powered by these files:

- `/apps`
- `/nodes`
- `/templates`
- `/builds`
- `/deployments`
- `/disclosures/[app]`
- `/settings`

The first managed node should be registered as `sacramento-node-001` until the node naming standard is finalized.
