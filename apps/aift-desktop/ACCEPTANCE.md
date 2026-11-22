# Desktop acceptance and evidence boundary

The desktop shell targets a local AIFT runtime (`http://127.0.0.1:3001` by default). The app displays an inert offline fallback when the initial runtime load fails and lets the user retry. `AIFT_DESKTOP_URL` accepts canonical `http:`/`https:` loopback URLs (`127.0.0.1`, `localhost`, `[::1]`) without embedded credentials or fragments. A non-loopback HTTPS runtime is allowed only if its origin matches `AIFT_DESKTOP_TRUSTED_HTTPS_ORIGIN` exactly. That setting opts in to a particular *origin*, not to any claim of hosted authentication or service readiness. Non-loopback HTTP and other URL schemes fail closed before window creation.

## Verification

- Dependency-free unit checks: `npm --prefix apps/aift-desktop test`
- Actual Linux Electron offline-to-reconnected smoke (requires Electron dependencies and a display): `xvfb-run -a npm --prefix apps/aift-desktop run smoke`
- Windows NSIS and portable packaging on a Windows host: `npm --prefix apps/aift-desktop run build:win`

The `aift-desktop-acceptance` GitHub Actions workflow provisions Electron, runs a sandboxed Linux Chromium window against a controlled loopback runtime, checks the offline screen and retry-to-connected journey, saves real screenshots, and separately builds unsigned Windows NSIS and portable artifacts. Windows packaging success alone **does not** prove an installed app launches; it is a separate acceptance requirement. CI screenshots and hashes are evidence, not deployed apps or native/bootloader OS evidence.

Do not label a release accepted until the exact commit's desktop acceptance jobs pass, a packaged Windows application is launched and exercised on an appropriate Windows test host, and any intended hosted authentication/API/recovery behavior has separate evidence. The smoke fixture is not a hosted production runtime.
