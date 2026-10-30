# MD Viewer

A markdown folder viewer: a tree of `.md` files on the left, the rendered
document on the right. One viewer, two thin apps:

| Path                | What it is                                                    |
| ------------------- | ------------------------------------------------------------- |
| `packages/markdown` | Markdown, Gherkin and syntax readers. Pure TypeScript, no UI. |
| `packages/viewer`   | The React viewer. Talks to the platform through `Platform`.   |
| `apps/web`          | Static web app. Chromium for folders, any browser for a URL.  |
| `apps/tauri`        | Desktop app for macOS, Windows and Linux.                     |

[`what-it-handles.md`](what-it-handles.md) says what the viewer does.
[`deliberate-limits.md`](deliberate-limits.md) says what it does not do, and why.

## Commands

Needs Node 20+ and pnpm 10 (`corepack enable`). The desktop app also needs Rust
and the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

```sh
pnpm install
pnpm dev:web        # web app on http://localhost:5173
pnpm dev:tauri      # desktop app, with hot reload
pnpm build:web      # static site in apps/web/dist
pnpm build:tauri    # installers in apps/tauri/src-tauri/target/release/bundle
pnpm build:macos    # MD Viewer.app only
pnpm install:macos  # build, then copy MD Viewer.app to /Applications
pnpm test           # vitest, every package
pnpm typecheck
pnpm lint
```

## Open a document by URL

`https://<site>/?src=<url-encoded markdown URL>` opens one document. The server
must allow cross-origin reads, as `raw.githubusercontent.com` does.

## Deploy

`.github/workflows/pages.yml` tests and builds the web app on every push to
`main`, and deploys `apps/web/dist` to GitHub Pages.

Testing the zaps app
