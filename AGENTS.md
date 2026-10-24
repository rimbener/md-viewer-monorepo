# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) or to other AI agents when working with code in this repository.

In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision. Always use ASD-STE100 (Simplified Technical English) for explanations, documentation, etc.

NEVER TRY TO CONTROL THE COMPUTER TO TEST THE APP.

## What this is

A markdown folder viewer: a tree of `.md` files on the left, the rendered
document on the right. A pnpm monorepo with one viewer and two thin apps — a
static web app and a Tauri desktop app. The markdown parser, the Gherkin reader
and the syntax highlighter are all hand-written — there is no markdown,
highlighting or styling dependency, and adding one is a real decision rather
than a detail.

## Commands

```sh
pnpm dev:web                     # Vite dev server for apps/web
pnpm dev:tauri                   # desktop app (needs Rust)
pnpm build:web                   # static site in apps/web/dist
pnpm build:tauri                 # desktop installers
pnpm install:macos               # build MD Viewer.app, copy to /Applications

pnpm test                        # vitest, every project
npx vitest run --project viewer  # one project: markdown, viewer, web, tauri
npx vitest run packages/viewer/test/editor.test.tsx   # one file
npx vitest run -t 'tells a regex literal'             # one test by name
pnpm typecheck                   # tsc in every package
pnpm lint                        # eslint
pnpm format                      # prettier
cargo check --manifest-path apps/tauri/src-tauri/Cargo.toml
```

## Layout

- `packages/markdown` — the three readers. Pure TypeScript, imported by
  subpath (`@md-viewer/markdown/parseBlocks`). No barrel.
- `packages/viewer` — the React viewer. `src/Viewer.tsx` owns the session: the
  chosen folder, the scanned tree, the selected file, sidebar visibility.
  `components/DocumentPanel.tsx` owns one document — reading it, zoom, font
  scheme, the editor pane. `components/Markdown.tsx` renders the parsed result.
- `apps/web` — `webPlatform.ts` (File System Access API, IndexedDB handles,
  `?src=` URLs) and the "not compatible" gate in `App.tsx`.
- `apps/tauri` — `tauriPlatform.ts` (fs, dialog and opener plugins) and
  `src-tauri` (Rust: holds a file opened from outside until the page asks).

## The platform boundary

The viewer never touches a file system API. Everything platform-specific goes
through the `Platform` interface in `packages/viewer/src/platform.ts`, given to
`<Viewer platform={…} />`. Paths inside the viewer are always absolute and
`/`-separated: the web app uses `/<folder name>/…`, the Tauri app turns
`C:\…` into `/C:/…` (`apps/tauri/src/paths.ts`). A document opened by URL uses
the URL as its path. New platform needs go into the interface, never into a
direct import in the viewer.

## The three readers

`packages/markdown/src` (blocks and inline), `gherkin.ts` and `highlight.ts`
are independent, dependency-free, and share one discipline that every change to
them must preserve:

- **Nothing is rejected.** Unrecognised input degrades into plain text rather
  than an error, so a half-written document still renders.
- **Every scan is bounded**, so no input can hang the page.
- **The output reconstructs the input.** Highlighter tokens concatenate back
  into the source exactly; the tests assert this against fuzzed input, as do
  the parser's.

A fenced block is dispatched in `Markdown.tsx`: a `gherkin`/`feature`/
`cucumber` fence is _laid out_ as a feature by `Gherkin.tsx`, a `mermaid` fence
is drawn by `Mermaid.tsx`, a fence whose language `languageOf()` recognises is
tinted token by token, and anything else stays uniform monospace.

## Styling

There is no style library. Components use inline style objects, and
`packages/viewer/src/styles.css` holds only resets, `:active` and focus states.
There are no inline color literals outside `src/theme.ts`: `useTheme()` returns
the light or dark palette, and every component reads its colors from that
object. CSS reads the palette through `--md-*` variables set in `Viewer.tsx`.
New rendering features add named palette entries rather than hardcoding a
color.

`src/typography.ts` is why sizes look the way they do: each font scheme carries
a `scale` measured from the macOS face's x-height and an `advance` (average
character width in ems) that turns a line length in characters into a column
width in pixels. Families are CSS stacks: the measured macOS face, then close
Windows and Linux faces. `Markdown.tsx` derives every size from
`zoom * scheme.<role>.scale` inside one memoized `createStyles`, handed down
through a context.

## Persistence and editing

`src/preferences.ts` wraps `src/storage.ts` (`localStorage`) and is
deliberately best-effort: a failed read falls back to the default, a failed
write is dropped, and stored values are validated on the way in
(`isZoomLevel`, `isSchemeId`, absolute-path checks). Components that restore a
preference guard against a race with the person using the app: a `hasChosen*`
ref means a stored value never overwrites a choice made while the read was in
flight. Copy that pattern for new preferences.

Editing is in-memory only. `DocumentPanel` keeps a `Map` of drafts keyed by
path in a ref, so switching files and back keeps the work, and quitting loses
it. The preview reparses 150 ms after the last keystroke, and documents over
500,000 characters fall back to plain text with the editor disabled.

## Conventions

`.agents/rules/global.mdc` applies here and is the authority; the parts that
come up most:

- **No comments by default.** Add one short line only when the _why_ is
  non-obvious — a hidden constraint or subtle invariant — never to describe
  what the code does. One invariant, one comment, next to the code that owns
  it.
- **Never `export default`.** ESLint enforces it; config files are the only
  exception.
- Functional React only, no Redux.
- Use `pnpm` for dependencies. Don't touch `package.json`, `Cargo.toml` or
  lockfiles unless the change is itself a dependency change.
- Commit messages are extremely concise, conventional, in the imperative
  (`feat(code): highlight html, css and js/ts fences`).

## Keep the scope documents current

`what-it-handles.md` and `deliberate-limits.md` are the specification of what
this viewer does and what it refuses to do, written as prose with reasons. A
change to what is parsed, rendered, highlighted or supported per platform
belongs in them in the same commit.

## Tests

Vitest, one project per package (`vitest.config.ts` at the root). Pure modules
get unit tests that assert against a compact text rendering of the tree rather
than deep object literals — see the `outline()` helpers in
`parseBlocks.test.ts` and `gherkin.test.ts`, and `marks()` in
`highlight.test.ts`. Readers also get an invariant test over fuzzed input. View
tests use Testing Library on jsdom with the in-memory platform in
`packages/viewer/test/fakePlatform.tsx`, and assert colors and sizes through
`element.style`.

REMEMBER: In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision. ALWAYS use ASD-STE100 (Simplified Technical English) for explanations, documentation, etc.
