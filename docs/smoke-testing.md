# Local smoke testing

Run commands from the repository root after installing its dependencies.

```sh
npm run smoke:setup
npm run smoke
```

Setup creates a fresh JavaScript host project inside `.tmp/smoke/project-*`,
initializes Sketch Kit, and creates `smoke` plus a child `smoke_1`.
Select either from the sketch menu: they render a module imported from the host's
`src/message.js`, exercising code outside the generated sketch workspace.

The host has its own package.json and node_modules/sketch-kit development link
to this checkout. No global installation or extra downloads are needed. CLI
changes apply on the next command; restart the dev server after server-side
changes. Runtime/template changes under lib/ require a fresh setup because init
copies those files into each workspace.

## Commands

```sh
npm run smoke -- create experiment
npm run smoke -- create smoke spring
npm run smoke -- create spring slower
npm run smoke -- build
npm run smoke -- path
```

`npm run smoke` reuses the current host, creating one automatically if needed.
`npm run smoke:setup` always creates and selects a new host; older experiments
are retained. The current selection lives in `.tmp/smoke/current.json`.
The generated host also provides its own `npm run dev`, `npm run sketch-kit -- …`
and `npm run build` commands if you cd into it.

All host files and build output are ignored by Git. Stop running dev servers
before manually deleting old host folders. This is a development smoke test:
the link and parent node_modules can hide packaging or dependency-declaration
problems. Before publishing, separately test an npm pack tarball installed into
a project outside this repository.

For automated branching regression checks, run `npm run test:registry`.

## Purge generated projects

Stop your smoke dev servers, then run `npm run smoke:purge` from the repository
root (or `npm run smoke -- purge`). This deletes every generated project-* folder
under .tmp/smoke/ and clears current.json, including any unpromoted experiments.
The next smoke run creates a fresh host. Other temporary directories are untouched.
Local checkout links are removed without deleting their targets. Redirected roots
and linked project folders are rejected before deletion begins.

Run `npm run test:smoke` to check purge behaviour in isolated fixtures.
