# Browser VS Code Run Guide

You can run the dashboard checks from VS Code in the browser.

## Open in browser VS Code

Use GitHub Codespaces or github.dev.

For github.dev:

1. Open the repo on GitHub.
2. Press the `.` key.
3. VS Code opens in the browser.

## Run tasks

Open the command palette:

`Ctrl Shift P`

Then choose:

`Tasks: Run Task`

Available AIFT tasks:

- AIFT install dashboard dependencies
- AIFT build dashboard
- AIFT run dashboard dev

## Recommended order

1. AIFT install dashboard dependencies
2. AIFT build dashboard
3. AIFT run dashboard dev

If the build fails, copy the terminal error and send it back for patching.
