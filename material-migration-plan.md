# Material 3 migration plan

## Status (read first in a new session)

- **Branch:** `hernan/material-3`, from `main`. One commit per step.
- **Done:** step 0 (spike), step 1 (setup), step 2 (theme; browser check
  not done: Chrome extension was not connected), step 3 (buttons), step 4 (toolbar, split), step 5 (find, inputs), step 6 (dialog, menus), step 7 (tree, drawer), step 8 (spinner, web gate), step 9 (cleanup), step 10 (docs).
- **Owner checks in browser at the end** of the migration, not per step.
- **Next:** owner browser check (light, dark, narrow width), then PR.
- **Spike:** local branch `spike/m3e` (not pushed). It has the jsdom probes
  (`packages/viewer/test/m3eSpike.test.tsx`) and a demo page with every
  component (`packages/viewer/src/m3eSpikeBundle.tsx`, shown at `/?spike` by
  `pnpm dev:web` on that branch). Use it as a reference for the m3e APIs.
- **m3e source** for API checks: `@m3e/web` in `packages/viewer/node_modules`
  (`dist/src/<component>/*.d.ts`), or the README of each component at
  github.com/matraic/m3e (`packages/web/src/<component>/README.md`).
- **Browser checks:** the owner allows Claude in Chrome for this migration.
  Run `pnpm dev:web` in the background and open the printed URL. Check each
  step in light and dark, and at narrow width.
- **Checks before each commit:** `pnpm typecheck`, `pnpm lint`, `pnpm test`,
  `pnpm build:web`. Do not run `pnpm format` on the whole repo: it is
  `prettier --write .` and rewrites the generated Tauri files under
  `apps/tauri/src-tauri/plugins/saf/permissions/`. Use
  `npx prettier --write <changed files>`.

## Goal

Change all UI components to Google Material Design 3 (M3). Keep no own
component or own styling where the library has a component for it.

## Library: m3e

- `@m3e/web` (pin 2.11.x): Material 3 Expressive web components, built on
  Lit, MIT license.
- `@m3e/react`: typed React components made with `@lit/react` (see
  decision 7).
- `@m3e/icons`: per-icon SVG imports (`@m3e/icons/outlined/<name>`). They work
  offline, need no icon font, and render in jsdom.
- Roboto Flex font, bundled locally. The Tauri CSP is
  `font-src 'self' data:` (`apps/tauri/src-tauri/tauri.conf.json`), so a font
  from a CDN does not load.

Why m3e, compared with `@material/web` (maintenance mode), mdui and AWC UI:

- It has a component for almost all our parts, including a **tree**
  (`role="tree"`, arrow keys), a **split pane**, a **drawer**, an **app bar**,
  a **toolbar** and a **tooltip**.
- It follows the newest guidelines (M3 Expressive), and it releases often
  (v2.11.3 on 5 Nov 2026).
- It makes the color scheme from one seed color with `<m3e-theme>`.
- `m3e-form-field` wraps a **native** `<input>`, so the text-field tests keep
  their native roles.

Main risk: almost all commits come from 1 author. Accepted. The MIT license
and the Lit base make a fork possible.

## Decisions

1. **Color variant:** `variant="monochrome"`. Monochrome ignores the seed
   hue, so keep the default `color`. `link`, `searchHit` and `searchCurrent`
   keep fixed colors (see step 2).
2. **Single-author risk:** accepted. Use m3e.
3. **Motion:** `motion="standard"`.
4. **Editor view switch:** a 3-option segmented button (preview / split /
   editor) replaces the cycle button. ⌘E keeps cycling the modes.
5. **Fonts:** Roboto Flex for all chrome text. The document text keeps the
   font schemes in `typography.ts`.
6. **Hidden sidebar:** the drawer keeps the sidebar mounted when it is closed.
   Tree expansion now survives hide and show. Record this in
   `what-it-handles.md`.
7. **`@m3e/react`:** use it (spike result). Use `htmlFor`, not `for`, on
   `M3eTooltip` and `M3eMenuTrigger`.
8. **Split-pane double-click reset:** m3e has none. Keep a small own
   `dblclick` handler on the pane that resets the split to the default.
9. **Right-click menu on recent folders:** delete it. "Remove from Recent
   Folders" moves into the normal recent-folders menu.
10. **Bundle size:** accepted. m3e adds +138 kB gzip to the web main entry
    (101.6 → 240.0 kB). `m3e-theme` stays at runtime.

## Parts with no m3e component

These parts stay our own code, but they read only M3 tokens
(`--md-sys-color-*`, `--md-sys-typescale-*`) or the fixed colors in
`theme.ts`: no own radii or shadows.

| Part                                                                                                              | Reason                                                                          |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Rendered markdown, Gherkin, Mermaid, syntax colors (`Markdown.tsx`, `Gherkin.tsx`, `mermaid.ts`, `typography.ts`) | M3 has no document or code-reading component                                    |
| `Editor` textarea                                                                                                 | A code editor, not a form field. `m3e-textarea-autosize` only sizes a textarea. |

## Rules for every step

- Each step is one commit. After each step, `pnpm typecheck`, `pnpm lint` and
  `pnpm test` pass, and the app works.
- **Tests change in the same commit** as the code they test. Replace
  `element.style` color and size assertions on controls with state
  assertions (`selected`, `checked`, `disabled`, `open`, `error`). Keep the
  existing accessible names and labels, so that role and name queries still
  work.
- **Docs change in the same commit** (CLAUDE.md rule): when a step changes
  the chrome, update its description in `what-it-handles.md`.
- **Icons change in the step of their component.** Map the text glyphs to
  `@m3e/icons`: ‹ › → `chevron_left`/`chevron_right`, ↶ ↷ → `undo`/`redo`,
  − + → `remove`/`add`, ↑ ↓ → `keyboard_arrow_up`/`keyboard_arrow_down`,
  × → `close`, ▾ ▸ → `expand_more`/`chevron_right`, ← → (sidebar) →
  `left_panel_close`/`left_panel_open`. The `EditorToggle` SVG goes in step 4.
- **Events bubble.** `change` and `input` bubble from the tree, the segmented
  buttons, the split pane and the drawer. Every handler on an m3e container
  acts only when `event.target === event.currentTarget`.
- **Controlled state.** React state is the source of truth. Where an m3e
  element changes its own state (segment `checked`, tree `selected`, drawer
  `start`), set it back from React, and cancel `beforeinput` where the element
  has one.
- **No color literals** outside `theme.ts`.
- **Persistence:** a state change made by m3e itself (scrim click, breakpoint)
  goes through the same `hasChosen*` and best-effort `save*` pattern as a
  user choice, or is not saved.

## Steps

### 0. Spike (no commit)

Make a throwaway branch. Render `M3eTheme`, `m3e-drawer-container`,
`m3e-dialog`, `m3e-menu`, `m3e-tooltip`, `m3e-icon-button`,
`m3e-form-field`, `m3e-tree`, `m3e-split-pane` and `m3e-segmented-button`,
then check:

1. **jsdom gaps.** Find what `test/setup.ts` needs:
   - `new CSSStyleSheet()` and `document.adoptedStyleSheets` (used by
     `m3e-theme`, `ThemeElement.ts:143`).
   - `matchMedia` (used by `m3e-theme` and the drawer breakpoint observer,
     `core/layout/BreakpointObserver.ts`).
   - **ARIA reflection:** m3e sets `this.role`, `this.ariaSelected` and
     `this.ariaExpanded` (`core/shared/mixins/Role.ts`,
     `TreeItemElement.ts`). If jsdom does not reflect these to attributes,
     the 129 `getByRole` queries fail. A polyfill maps the ARIAMixin
     properties to attributes.
   - `showPopover`/`hidePopover` (menu, tooltip) and `showModal`/`close`
     (dialog).
2. **Bundle size.** Measure `apps/web/dist` before the change, then with
   per-component imports. `@m3e/web/theme` pulls in
   `@material/material-color-utilities` at runtime. Record a budget.
3. **Tree.** Keyboard, ARIA and selection compared with the current
   `FileTree`. Check the time to render a large folder (scan depth 3): the
   whole tree is rendered, not only the visible rows as with `flatten` now.
4. **Density.** With `density="-2"` and `size="extra-small"`, the tools row
   must stay on one row at 1280 px width.
5. **`@m3e/react`.** Check its types and events. If they are not good enough,
   use plain custom elements with our own JSX types.

Result: a go/no-go, the polyfill list, the size budget and decision 7. If no-go, fall back to mdui (keeps own tree and split divider).

### Step 0 results (branch `spike/m3e`, done)

- **Go.** All probes pass in jsdom with the polyfills below. The existing
  407 tests pass with the new test config.
- **jsdom polyfills needed** (`test/m3ePolyfills.ts` in the spike):
  `CSSStyleSheet.replaceSync`/`replace`, `adoptedStyleSheets` on `Document`
  and `ShadowRoot`, `ElementInternals.states`, `ElementInternals` form methods
  (`setFormValue`, `setValidity`, `checkValidity`, `reportValidity`, `form`,
  `willValidate`, `validity`, `validationMessage`), `matchMedia`,
  `CSS.supports`, `showPopover`/`hidePopover`/`togglePopover`,
  `HTMLDialogElement.showModal`/`close`.
- **ARIA reflection works** in jsdom 26. `getByRole` finds button
  (`aria-pressed` on toggles), tree, treeitem (`aria-selected`,
  `aria-expanded`), textbox in `m3e-form-field`, radio (segment), menuitem,
  menuitemradio and progressbar.
- **Only in shadow DOM:** the `dialog` role and the split-pane `separator`.
  Tests query these through `shadowRoot` or by their contents.
- **`@lit/react` in vitest:** vitest picks the `node` export, an SSR build
  (`NODE_MODE`) that never sets props or events. Fix: alias `@lit/react` to
  its `development/index.js` browser build in `packages/viewer/vitest.config.ts`,
  and inline `@m3e/react` and `@lit/react` in `server.deps`. The browser build
  is not affected.
- **Types:** good. `@m3e/icons` has no types: add
  `declare module '@m3e/icons/*'`.
- **Events:** `change` works for tree, segmented button and split pane
  (`min`/`max`/`step` respected). Dialog `cancel` and `closed` fire.
- **Tree:** a click on a folder selects it and toggles it. Block the
  selection (step 7).
- **Theme in jsdom:** `--md-sys-color-*` does not compute. Mermaid needs the
  fallback palette in tests (step 2).
- **Bundle:** +138 kB gzip (decision 10).
- **Browser check (owner):** density and the full toolbar look good.

### 1. Setup (done)

Result: `src/m3e.ts` (re-exports), `src/m3eIcons.d.ts`,
`components/ThemeRoot.tsx` (exported as `@md-viewer/viewer/ThemeRoot`, used
by the Viewer and by the web "not compatible" page; it holds only
`ColorSchemeProvider` until step 2), Roboto Flex loaded in `styles.css`,
`test/m3ePolyfills.ts` loaded by the viewer and web test setups, and
`packages/viewer/m3eTestConfig.ts` (the `@lit/react` alias and inline
settings) used by `packages/viewer/vitest.config.ts` and
`apps/web/vite.config.ts`.

Planned:

- `pnpm add @m3e/web @m3e/react @lit/react lit @m3e/icons` plus the Roboto
  Flex font package, in `packages/viewer`.
- New `src/m3e.ts`: re-export the m3e components we use, from one place.
- `@font-face` for Roboto Flex.
- `test/setup.ts`: import the polyfills from step 0 (move
  `test/m3ePolyfills.ts` from the spike).
- `packages/viewer/vitest.config.ts`: the `@lit/react` alias and
  `server.deps.inline` from step 0.
- `src/m3eIcons.d.ts`: `declare module '@m3e/icons/*'`.
- New `ThemeRoot` component in `@md-viewer/viewer`, exported in
  `package.json` `"exports"`. It holds `ColorSchemeProvider` and (from step 2)
  `M3eTheme`. Both apps use it: the Viewer, and the web "not compatible" page
  (`apps/web/src/App.tsx` renders `<Unsupported>` with no Viewer).

### 2. Theme (done)

Result: `theme.ts` maps keys to `var(--md-sys-color-*)` roles, keeps fixed
colors, and has a monochrome fallback per scheme. `floatShadow` is now a
full `box-shadow` value. `ThemeRoot` renders `M3eTheme` and gives
`ThemeHostContext` (host element + version bumped on `change`).
`useResolvedTheme()` gives Mermaid plain colors. `colorScheme.test.tsx`
asserts the `m3e-theme` `scheme`.

Planned:

- `ThemeRoot` renders `<M3eTheme variant="monochrome" motion="standard"
density={-2} scheme={…}>`. Map our scheme ids (`colorScheme.ts`):
  `system` → `auto`, `light` → `light`, `dark` → `dark`.
- `m3e-theme` writes `--md-sys-color-*` on its host only. It sets the body
  background only when it is a direct child of `<body>` (ours is under
  `#root`). Give the Viewer root and the `Unsupported` root
  `background: var(--md-sys-color-surface)`.
- **Do not delete theme keys in this step.** Point every key that is not a
  fixed color at an M3 role, so that the code that steps 3–8 change later
  still compiles:

  | Key                                   | M3 role                                          |
  | ------------------------------------- | ------------------------------------------------ |
  | `background`                          | `surface`                                        |
  | `sidebar`                             | `surface-container-low`                          |
  | `border`, `codeBorder`                | `outline-variant`                                |
  | `hairline`                            | `outline-variant`                                |
  | `text` / `mutedText`                  | `on-surface` / `on-surface-variant`              |
  | `selectedBackground` / `selectedText` | `secondary-container` / `on-secondary-container` |
  | `accent`                              | `primary`                                        |
  | `floatShadow`                         | M3 elevation level 2 shadow                      |
  | `backdrop`                            | `scrim` at 32%                                   |
  | `quoteBar`                            | `outline-variant`                                |
  | `code`                                | `surface-container-highest`                      |
  | `inlineCode`                          | `on-surface`                                     |
  | `tableHeader`                         | `surface-container`                              |

- Fixed light and dark colors stay in `theme.ts`:
  - `syntax*` and `gherkin*`, because M3 has no code colors.
  - `link`, `searchHit` and `searchCurrent`. The monochrome scheme has only
    grays: a gray hit is hard to see on a gray surface, and a gray link is
    marked only by its underline.
- New `error` key → `var(--md-sys-color-error)`. The "edited, not saved"
  status (`DocumentPanel.tsx`) and the dialog error use it, not
  `syntaxKeyword`.
- Keep `--md-focus` and `--md-pressed`, now set from `--md-sys-color-*`, so
  `.pressable` and `.field` keep their focus rings until step 9.
- Keep the `color-scheme` property and the `--md-*` variables that
  `ColorSchemeProvider` writes for native inputs and scrollbars.
- **Mermaid** needs real color values, not `var()` strings. New
  `resolvedPalette()`: reads `getComputedStyle` on the theme host after its
  `change` event, with a fixed fallback in `theme.ts` for jsdom. `mermaid.ts`
  uses it. Update `mermaid.test.ts`.

### 3. Buttons (done)

Result: shared `PairedIconButtons` (history, undo/redo) and `StepControl`
(zoom, width). Toggles cancel `beforeinput` and call React. `EditorToggle` is
a temporary `m3e-icon-button` with the old SVG until step 4. Font button shows
only the scheme name. Learned: m3e reflects `disabled` on its async update,
so tests `await settle()` before `toBeDisabled()`; `m3e-icon` `name` is a
property, not an attribute; segments have role `radio` + `aria-checked`.

Planned:

| Now                            | m3e                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SidebarToggle`                | Controlled `m3e-icon-button toggle` (`selected` = sidebar visible), calls `toggleSidebar`. Not `m3e-drawer-toggle`: that one is not a button and writes the drawer state directly. |
| `GherkinToggle`                | `m3e-icon-button toggle` (`selected` replaces `isActive`)                                                                                                                          |
| `SaveButton`                   | `m3e-icon-button variant="tonal"` (`save`)                                                                                                                                         |
| `FontControl`                  | `m3e-button variant="outlined"` with the scheme name                                                                                                                               |
| `UndoRedo`, `HistoryNav`       | `m3e-button-group` of 2 `m3e-icon-button`s                                                                                                                                         |
| `ZoomControl`, `ColumnControl` | `m3e-button-group`: − icon button, **Reset `m3e-button`** with the value as its label ("Reset zoom", "Reset line length", disabled at the default), + icon button                  |
| `ColorSchemeControl`           | Controlled `m3e-segmented-button` + `m3e-button-segment`                                                                                                                           |

- Use `size="extra-small"` on the tools-row controls.
- Delete `ToolButton.tsx`. Keep `Segmented.tsx`: `DocumentSearch` uses it
  until step 5.

### 4. Toolbar, editor modes, split pane (done)

Result: `Tooltip.tsx` (`useControlId()` makes ids that m3e can find with
`querySelector`; `Tooltip` wraps `M3eTooltip htmlFor`). `EditorToggle` is a
segmented button with icon segments named Preview / Split / Editor (test ids
kept). `EditorSplit.tsx` replaces `SplitDivider`: the pane stays mounted in
source mode with no end slot, `disabled`, and handle width 0. Double click
reset checks `composedPath()` for `#drag-handle`. Learned: `htmlFor` on
`m3e-tooltip` is a property, not an attribute; read `.checked` (not
`aria-checked`) in tests right after a click; jsdom needs
`hasPointerCapture` (added to the polyfills).

Planned:

- **Toolbar:** `DocumentPanel` title row → `m3e-app-bar` (file info).
  `ColorSchemeControl` goes in the `trailing` slot, also in the empty "no
  file" header. The tools row → `m3e-toolbar`.
- **Tooltips:** `M3eTooltip htmlFor="…"` replaces the `title` attributes. Delete
  the `Tool` labels (History, Font, Width, Zoom, Find) in the same commit.
- **EditorToggle** → controlled `m3e-segmented-button`: preview / split /
  editor.
  - Disabled when `!canEdit`.
  - ⌘E keeps cycling with `nextEditorMode`.
  - Keep the accessible names and the `editor-mode-*` test ids, or update
    `editor.test.tsx`, `documentSearch.test.tsx`, `replace.test.tsx` and
    `splitDivider.test.tsx` in the same commit.
- **SplitDivider** → `m3e-split-pane` (`start` = editor, `end` = preview).
  - Render it in **both** editing modes, so the editor textarea is not
    remounted and keeps caret, selection and scroll. In source mode:
    `value=100`, `disabled`, end pane hidden.
  - `min=20 max=80 step=5`. Convert our 0–1 fraction ×100 at the boundary.
  - Save on `change` (end of a drag or key press), not on `input`.
  - Keep `isEditorFraction` and `clampEditorFraction` in `split.ts` for
    storage validation. Delete `SplitDivider.tsx`.
  - Double-click reset: a small own `dblclick` handler on the pane resets
    the split to the default (decision 8). Keep the test in
    `splitDivider.test.tsx`.
  - Check `scrollSync` and `observeHeight`: the panes are now in shadow-DOM
    slots. Re-run `documentEndSpace.test.tsx` and `scrollSync.test.tsx`, and
    check in a real browser that both panes fill their height.

### 5. Find and inputs (done)

Result: as planned. The disabled Replace field explains itself in a tooltip on
its form field (a disabled input gets no hover). Learned: the m3e submit
button calls `form.requestSubmit()` one `setTimeout` after the click; the
polyfill now finds `ElementInternals.form` through the host.

Planned:

- `DocumentSearch` keeps all its parts and labels:
  - Find field: `m3e-form-field` with a native `<input>` ("Find in
    document"). A `search` icon goes in `prefix`.
  - Match count (`aria-label="Match n of m"`) goes in `suffix-text`.
  - "Previous match", "Next match" and "Clear find" → `m3e-icon-button`s in
    `suffix`.
  - Replace field ("Replace with"): a second form field.
  - "Replace one" and "Replace all" → `m3e-button variant="text"`. Keep these
    labels.
- `OpenUrlForm` → `m3e-form-field` + `m3e-button variant="filled"`.
- Delete `Segmented.tsx`.

### 6. Dialog and menus (done)

Result: `NewFileDialog` is an `m3e-dialog`, rendered by the Viewer (state
`newFileFolder`; `Sidebar` gets `onAddFile(folder)`). It unmounts rather than
closes, so it reads the opener on its first render (before `autoFocus`) and
focuses it on unmount. `closed` maps to `onCancel`. Recent folders: radio
items, then a divider, then "Remove from Recent Folders" with a nested menu
(items named `Remove <path>`). The menu remounts after each pick (`key`),
because a radio item checks itself on click. `arrow_drop_down` replaces ▾
(`expand_more` is not in `@m3e/icons`). Polyfills: `window.scrollTo` (dialog
scroll lock).

Planned:

- `NewFileDialog` → `m3e-dialog`. Keep the current contract:
  - Escape and a backdrop click cancel: map `cancel`/`closed` to
    `onCancel`. Escape must not reach the global shortcuts.
  - The `<form>` stays in the default slot; submit goes through it.
  - `autoFocus` stays on the input.
  - Buttons: text "Cancel", filled **"OK"** (not renamed).
  - The error text goes in the form field's `error` slot and **keeps
    `role="alert"`**: the slot is not a live region.
  - Render the dialog outside the drawer, at Viewer level.
  - Focus returns to the "Add new file" button after close. Test it.
- `RecentFolderMenu`:
  - `m3e-menu-trigger` on an `m3e-button`, `m3e-menu`, and
    `m3e-menu-item-radio checked` for the current folder.
  - Delete the right-click menu. "Remove from Recent Folders" becomes an
    `m3e-menu-item` in the normal menu (decision 9). Update
    `recentFoldersView.test.tsx` and `what-it-handles.md`.
  - Delete the own open/close, outside-click and context-menu code.

### 7. Sidebar and tree (done)

7b result: `m3e-drawer-container` in the Viewer, `Sidebar` in `slot="start"`
(always mounted), dialog outside the drawer. `onClickCapture` marks a scrim
click (the click reaches the host's capture listener before the scrim's own
handler fires `change`), so only a scrim close is saved. `isDrawerModal()`
uses m3e's breakpoint (`max-width: 959.98px`): a file pick closes a modal
drawer, and a window-capture ⌘F listener closes it, waits for
`updateComplete`, then sends ⌘F again. jsdom: the m3e breakpoint observer is
made before a test can stub `matchMedia`, so the scrim test sets the private
`_startMode`.

7a result: `FileTree` is an `m3e-tree`. The tree's `change` is the one path
for mouse and keyboard: a file calls `onSelectFile`, a folder calls
`onSelectDirectory` and the selection goes back to the open file. Items carry
`data-path`. Learned: **@lit/react sets every prop again on each render**
(no dirty check), so a prop that m3e also changes (`open`) is reset by any
render: the start expansion is set once, imperatively, on mount. A tree item
listens for clicks on its row in the shadow root: tests click its label
(`clickTarget()` in `fakePlatform.tsx`). New `src/typescale.ts`.

- `Sidebar` → `m3e-drawer-container`. The sidebar goes in the `start` slot,
  the document in the content. Use `start-mode="auto"`, so narrow screens
  (Android) get an overlay drawer.
- **Drawer state goes both ways:**
  - `start` follows `isSidebarVisible`.
  - The drawer closes itself on a scrim click and when it crosses a
    breakpoint, then fires `change`. Read `start` back from `change`, only when
    `event.target === event.currentTarget`.
  - A scrim click is a user choice: set `hasChosenSidebar` and save it.
  - A breakpoint auto-close is not saved. If it is, Android saves "hidden" at
    every launch.
  - In `over` mode, close the drawer after a file is picked.
- `inert` on the content in `over`/`push` mode blocks ⌘F focus while the
  drawer is open. Close the drawer before focusing the find field.
- The safe-area padding on the Viewer root wraps the drawer container.
- **Sidebar contents:**
  - "Choose/Change Folder…", "Add new file" and "Cancel" (scan) →
    `m3e-button` (tonal or outlined). Tests find them by text.
  - "Reload" → `m3e-icon-button` (`refresh`) with a tooltip, or a text
    button.
  - Root path, error text and file-count footer → typescale tokens.
- **FileTree** → `m3e-tree` + nested `m3e-tree-item` (`open`, `selected`,
  `label` slot):
  - Set `aria-label` on each item as now (`"<name> folder"`). Otherwise a
    folder's name includes all its child labels.
  - Folders cannot be selected. `selected` is controlled from `selectedPath`.
  - Scroll the restored selection into view by querying `[selected]`, and
    open its ancestor items (`initialExpansion`).
  - Delete `flatten` and the own expand state where the tree does it.
- Update `sidebarToggle.test.tsx` and other tests that expect no tree items
  when the sidebar is hidden: the tree stays mounted (decision 6).

### 8. Spinner and web gate (done)

Result: `Spinner` is `m3e-loading-indicator`. `Unsupported` is an outlined
`m3e-card`. `@md-viewer/viewer` now exports `./m3e` and `./typescale` for the
web app (a `package.json` `exports` change, no dependency change).

- `Spinner` → `m3e-loading-indicator` or `m3e-circular-progress-indicator`.
  Delete `.spinner` and `@keyframes`.
- `apps/web/Unsupported.tsx` → `m3e-card` + typescale tokens, inside
  `ThemeRoot`.

### 9. Cleanup (done)

Result: deleted `selected*`, `hairline`, `floatShadow`, `backdrop` and their
fallback roles. The other keys stay: the rendered document, Gherkin, Mermaid
and the editor still read them, and each one points at an M3 role. The code
fence Copy / View Text button (missed in the plan) is now an `m3e-button`.
`styles.css` keeps the reset, Roboto Flex (now the body font) and
`.mermaid-diagram`. The editor textarea sets `outline: none` inline. Bundle:
240.4 kB gzip for the web main entry, 0.4 kB over the 240.0 kB budget.

- Delete the theme keys that no code uses any more (`background`, `sidebar`,
  `border`, `hairline`, `selected*`, `accent`, `floatShadow`, `backdrop`, …).
- `styles.css` keeps only the reset, `@font-face` and `.mermaid-diagram`.
  Delete `.pressable`, `.field`, `--md-focus`, `--md-pressed` and the
  `button` reset.
- Check the bundle against the step 0 budget.

### 10. Project docs (done)

Result: `CLAUDE.md` and `AGENTS.md` (still a copy) rewritten as planned, plus
the m3e traps learned in steps 3–7. New section in `deliberate-limits.md`.

The chrome changes in `what-it-handles.md` happen in each step. This step
updates the rules:

- `CLAUDE.md` **and** `AGENTS.md`: `AGENTS.md` is a copy, not a symlink.
  Update both, or make one a symlink to the other. Rewrite:
  - "What this is": the "no markdown, highlighting or styling dependency"
    text. The readers stay dependency-free; the chrome uses m3e.
  - "Styling": use an m3e component, never a hand-made control. Colors come
    from `--md-sys-*` tokens, or from the fixed colors in `theme.ts` (syntax,
    Gherkin, link, search, Mermaid fallback). No color literals elsewhere.
  - The text "CSS reads the palette through `--md-*` variables set in
    `Viewer.tsx`".
  - "Tests": control tests assert state, not `element.style`.
- `deliberate-limits.md`: add a section that explains why the chrome takes a
  dependency while the readers stay hand-written (`deliberate-limits.md:19`
  argues against dependencies).
- `.agents/rules/global.mdc` has no rule against UI dependencies. No change.

## Open decisions

None.
