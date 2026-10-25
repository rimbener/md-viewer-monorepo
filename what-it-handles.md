# What It Handles

The markdown support in this viewer is hand-written:
`packages/markdown/src/parseBlocks.ts` turns a document into blocks,
`packages/markdown/src/parseInline.ts` turns the text inside them into spans,
and `packages/viewer/src/components/Markdown.tsx` renders the result as DOM.
No markdown dependency is involved. The web app and the desktop app show the
same viewer; the differences between them are in "Where it runs", below.

## Blocks

| Syntax                                 | Notes                                           |
| -------------------------------------- | ----------------------------------------------- |
| `# Heading` … `###### Heading`         | Closing `#`s are optional and trimmed           |
| `Heading` over `===` or `---`          | Setext headings, levels 1 and 2                 |
| Paragraphs                             | Soft line breaks collapse to a space            |
| Two trailing spaces, or a trailing `\` | Hard break — the newline is kept                |
| ` ```lang ` fenced code                | Runs to the end of the document if never closed |
| Four-space indented code               | Language is unset                               |
| `> quoted`                             | Nests, and supports lazy continuation lines     |
| `- item`, `* item`, `+ item`           | Nested lists at any depth                       |
| `1. item`, `3) item`                   | The starting number is preserved                |
| `---`, `***`, `___`                    | Thematic rules                                  |
| GFM tables                             | `:--`, `:-:` and `--:` set per-column alignment |
| `---` front matter                     | Stripped, not rendered                          |

Lists are classified as _tight_ or _loose_: a blank line between two items, or
between blocks inside one item, adds vertical spacing to the whole list. That
matches how the same document reads on GitHub.

## Inline

- `**bold**`, `*italic*`, `***both***`, `~~strikethrough~~`
- `` `code` ``, and ``` ``a ` b`` ``` when the content itself holds a backtick
- `[text](url "title")` links, plus `[text][ref]`, `[ref][]` and `[ref]` resolved
  against `[ref]: url` definitions — the definition lines are removed from the
  rendered output
- `![alt](path)` images
- `<https://example.com>` and `<me@example.com>` autolinks
- Bare `https://…` URLs, without swallowing the trailing sentence punctuation
- Backslash escapes, so `\*not emphasis\*` stays literal
- HTML entities: `&amp;`, `&lt;`, `&nbsp;`, `&#65;`, `&#x41;` and friends

Underscores inside words are left alone, so `some_long_name` survives intact
while `_emphasised_` still works.

## Syntax highlighting

A fence tagged with one of these languages is tokenised and tinted. A `mermaid`
fence is drawn, as described below. Every other fence renders as uniform
monospace.

| Fence                                   | Read as    |
| --------------------------------------- | ---------- |
| `html`, `htm`                           | HTML       |
| `css`                                   | CSS        |
| `js`, `jsx`, `mjs`, `cjs`, `javascript` | JavaScript |
| `ts`, `tsx`, `typescript`               | TypeScript |

- **HTML** — tag names, attribute names and values, comments, doctypes and
  `&entities;`. The body of `<script>` and `<style>` goes to the JavaScript and
  CSS readers, so an inline stylesheet is highlighted as the stylesheet it is.
- **CSS** — selectors, property names, values, at-rules, the `(min-width: 40em)`
  condition of an at-rule, `!important`, strings and comments. A block opened by
  `@media`, `@supports`, `@layer`, `@container`, `@scope`, `@document` or
  `@keyframes` holds rules; every other block holds declarations.
- **JavaScript and TypeScript** — keywords, including the TypeScript ones,
  literals, numbers, names being called, both comment forms, strings, regex
  literals, and template literals, whose `${…}` is tokenised as the code it is.
  A `/` is read as a regex only where a value cannot stand, and a regex never
  crosses a line, so a division is never mistaken for one.

Seven colours carry the tokens — comment, keyword, string, constant, tag,
attribute and name being called — and each has a light and a dark value.

Like the Gherkin reader, the highlighter is a _reader_: it rejects nothing, its
scans are all bounded, and the tokens always concatenate back into the source,
so a half-written or mis-tagged block still renders as itself.

Each fence has a Copy button. It puts the fence text on the clipboard, as
written, and shows Copied for a moment. A code block has the button in its top
right corner. A Gherkin or Mermaid fence has it above the block, so the copy is
the source and not the layout or the diagram.

## Gherkin

A fenced block tagged `gherkin`, `feature` or `cucumber` is read as a feature
file and laid out instead of being printed as source. Gherkin is meant to read
as prose, so it is set in the body font. The code font is kept for the parts
that stand in for a value, and for the step keywords, which are fixed
vocabulary rather than prose.

| Syntax                                     | Rendered as                                       |
| ------------------------------------------ | ------------------------------------------------- |
| `Feature:`, `Business Need:`, `Ability:`   | A labelled heading                                |
| `Rule:`                                    | A subheading, with its scenarios grouped under it |
| `Scenario:`, `Example:`, `Background:`     | A card                                            |
| `Scenario Outline:`, `Scenario Template:`  | A card                                            |
| `Examples:`, `Scenarios:`                  | A labelled table with a header row                |
| `Given`, `When`, `Then`, `And`, `But`, `*` | A step, monospace keyword in a gutter             |
| `@tag`                                     | A chip above the section it decorates             |
| A `\|` table under a step                  | A data table, with no header row                  |
| `"""` doc strings                          | An indented monospace block                       |
| `# comment`                                | A muted line                                      |
| Anything else                              | Description text, kept as written                 |

Inside a step or a table cell, `<outline parameters>` and `"quoted strings"`
are picked out and coloured, because those are the two things a scenario varies
by. Tags stack: several tag lines above one scenario all belong to it.

Sections close by rank, so a `Scenario:` ends at the next `Scenario:` or `Rule:`
without needing a blank line, and an `Examples:` block belongs to the scenario
above it.

## Mermaid

A fenced block tagged `mermaid` is drawn as a diagram instead of being printed
as source. The drawing is Mermaid itself, running in the page, so every
diagram type that the bundled build can draw is drawn. Colours come from the app
theme. The type size follows the zoom and the body font.

The Mermaid package is part of the build. It is not loaded from a third-party
server. It loads on the first diagram, so a document without one does not pay
for it. A control on the diagram switches it to the fence text, and back. A
fence Mermaid cannot draw, a draw that takes longer than 8 seconds, and a fence
over 50,000 characters are shown as the monospace block.

## Raw HTML

HTML is not rendered, but its tags are dropped rather than displayed, so an
HTML-wrapped heading in a README reads as its own text instead of showing
`<h1 align="center">` literally. `<br>` becomes a line break, comments are
removed, and a paragraph left holding nothing but whitespace disappears.

## Images

An image gets its own block when it is the only thing in a paragraph. Its alt
text shows until it loads. It scales down to the panel width without ever
growing past its natural size. Relative paths resolve against the folder of the
document being viewed, or against its URL for a document opened by URL.
`/absolute` paths and `http(s):` URLs are used as-is. In the web app an image
in an open folder is read through the folder and shown from a `blob:` URL; the
desktop app shows it through Tauri's asset protocol.

## The session

The folder and file open at the last quit are reopened at the next launch, with
no dialog. The desktop app stores the folder path. The web app stores the
folder handle in IndexedDB. The browser can keep the read permission with it,
when the person chose "Allow on every visit". Otherwise the permission must be
given again, and the browser asks only after a click: choose the folder in the
recent folder menu to open it again.

The sidebar keeps a menu of the last 10 folders, above Change Folder. The
newest folder is first. A choice in the menu opens that folder again. The menu
shows the folder name. When two folders have the same name, it also shows the
parent folder. A file opened from outside is not added. A folder that can no
longer be opened stays in the menu until a newer folder takes its place.

The files opened in a folder are kept as a list for that folder alone. Back and
Next in the document header move through the list. Opening a file adds it and
drops the files that were ahead. The list keeps the last 100 opens. The 20
folders opened most recently each keep a list.

Zoom, the font scheme, the line length and the color scheme are properties of
the reader: they survive switching files and come back on the next launch.
Each file keeps its scroll position. A file opens where it was left, after a
switch, a reload or the next launch. When the content is not yet tall enough,
the view moves down as the content grows. A scroll by the person stops that.
The 10 files scrolled most recently keep a position. A file at the top keeps
none. The color scheme control sits on the right of the file name row, level
with the top of the name. The choices are System, Light and Dark. System
follows the system appearance. Light and Dark stay fixed.

The scan walks hidden directories — `.claude`, `.github` and `.cursor` are where
a lot of specs live. It walks three directory levels from the folder it starts
at. Clicking a folder in the tree walks that folder again, so a file deeper than
three levels, or added since the last walk of that folder, appears then. Reload
walks the open root again without asking for it. The tree is not watched.

The open file is. The desktop app watches it through the file system. The web
app checks its size and change time each second. When it changes, it is read
again, so a save in another editor shows up without switching away. A session
edit is left alone: the header says the file changed, and the buffer stays.

The editor has a Save button to the right of the editor button. It writes the
buffer to the file and clears `edited, not saved`. The desktop app writes
through the file system. The web app asks the browser for write access on the
first save.

Undo and Redo sit to the right of Save. Command-Z or Control-Z undoes;
Shift-Command-Z, Shift-Control-Z or Control-Y redoes. Each file keeps its own
history while the app runs.

The editor and the preview scroll together. When you scroll one, the other
goes to the same fraction of its length.

Blank space follows the last line. Its height is the view height, minus one
line, the padding under the text, and 300 px. Full scroll leaves that line
300 px below the top of the view. The source editor leaves the same space under
its last line.

## Find

The file name sits on its own row above the tools. Each tool has a small title: History, Editor, Font, Width, Zoom, and Find. Find is the last control on that tools row.

The sidebar toggle is not on that row. It is a round button at the vertical
middle of the header, centred on the sidebar's right edge. It shows `←` to
hide the sidebar. While the sidebar is hidden, it moves to the window's left
edge and shows `→`, and the header moves right to make space for it.
The field marks hits in the open document. Letter case does not matter.
Command-F, or Control-F off the Mac, focuses the field instead of the browser's
own find.
Previous and Next move through the hits, and the view scrolls to the current
hit. Return in the field does the same as Next and keeps the focus. Up and Down in the field do
the same as Previous and Next. A different file clears the field. The field
is not kept after you quit.

## Where it runs

### Web app

The web app is a static page. It has no server: a folder is read in the
browser, and its files do not leave the computer.

It reads folders through the File System Access API. Only Chromium browsers,
such as Chrome and Edge, have it. In any other browser the page says that the
browser is not compatible. That page still has a field for the URL of one
markdown document.

A document can be opened by URL in every browser. The page puts the URL in the
address bar as `?src=<url>`, so the link opens the same document for someone
else. The sidebar then shows that document alone, under the name of its
folder. Its relative images resolve against its URL. The server of the document
must allow cross-origin reads; `raw.githubusercontent.com` does. Opening a
folder removes the `src` from the address bar.

A folder has no disk path in a browser, so its path is `/<folder name>`. A
second folder with the same name gets `/<folder name> (2)`.

### Desktop app

The desktop app is the same viewer in a Tauri window, on macOS, Windows and
Linux. It reads any folder the person picks; it is not sandboxed. It is
registered for `.md`, `.markdown` and `.mdc`. A file opened from Finder, or
passed as the first argument on Windows and Linux, is shown alone, under the
name of its parent folder. A file opened while the app runs gets a new window,
titled with the file name. The other files in the folder stay unread. The app
does not store that file as the last folder. A different app stays the default
when a person has already chosen one.

## Performance

Parsing the React Native `README.md` (6.5 KB) takes about 1 ms. Highlighting
the React Native `Markdown.tsx` (17 KB of TSX) takes about 0.9 ms. Both are
fuzzed against randomized input — markdown markers for the parser, punctuation
for the highlighter — to confirm they always terminate.
