# AIFT template packaging

AIFT templates are the starting point for app creation.

## Package goals

Every template should define:

- template id
- template name
- framework
- source folder
- install command
- build command
- output folder
- runtime type
- health route
- trust class
- eligible node class

## First templates

Current templates:

```text
static-site
vite-react
```

These are the safest first templates for phone-based nodes because they can produce static output and do not require databases.

## Template levels

### Level 1: static page

Public content, landing pages, documentation, menus, brochures, and simple sites.

### Level 2: frontend app

React or Vite apps that produce static output.

### Level 3: dynamic app

Apps that require a running server process.

### Level 4: background task

Approved jobs that run for a limited time and write results.

### Level 5: stateful service

Databases, uploads, and persistent storage. These should stay on verified always-on nodes first.

## Early phone-node rule

Phone nodes should start with Level 1 and Level 2 templates. Higher levels require stronger controls.

## Template record example

```yaml
template:
  id: vite-react
  name: Vite React App
  level: 2
  framework: vite
  path: templates/vite-react
  build:
    install: npm install
    command: npm run build
    output: dist
  runtime:
    type: static
    health: /
  trust_class: public-static
  allowed_node_classes:
    - verified-server
    - plugged-in-phone
    - experimental-phone
```

## Next package milestone

Create a registry that lists templates, levels, and allowed node classes. Then the dashboard can show which templates are safe for each node type.
