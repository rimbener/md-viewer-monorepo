# Deliberate Limits

Things the viewer does not do, and why. None of these are bugs; each one is a
scope decision that can be revisited.

## HTML is stripped, not rendered

Tags are discarded and their text is kept. The practical cost is that badge
images and other HTML-only content in READMEs simply vanish rather than
appearing. Rendering HTML would mean a second parser and a second renderer for
a subset of the web platform, which is a much larger project than the markdown
support itself.

## Syntax highlighting covers three languages

HTML, CSS and JavaScript/TypeScript are tinted; every other fence renders as
uniform monospace, apart from a `mermaid` fence, which is drawn. Each language
costs a hand-written tokeniser, so the list grows one language at a time rather
than by taking a dependency.

The highlighter is shallow on purpose. It marks lexical categories, not
meaning: a name is tinted as a call because a `(` follows it, not because it is
a function, and types, classes and variables are all plain text. JSX is read as
JavaScript, so `<View>` in a `tsx` fence gets no tag colour. A `${…}`
interpolation is found by counting braces, so a `}` inside a string inside an
interpolation closes it early.

Gherkin remains the one fence that is not highlighted but _laid out_, and it
earns that by not being code: a `gherkin` fence is a document about behaviour,
its grammar is a dozen keywords, and the payoff is a feature rather than tinted
source.

## Gherkin is read, not checked

The Gherkin reader never rejects anything. A line it does not recognise becomes
description text, so a misspelled keyword shows up as prose rather than as an
error. That is the right trade for a viewer, but it does mean the viewer is no
substitute for running Cucumber.

Only the English keywords are known, and only as Gherkin capitalises them. A
`# language: fr` header is shown as the comment it is and otherwise ignored,
and a lowercase `given` stays prose, because description lines that open with
an ordinary "and" or "given" are far more common than uncapitalised steps.

Gherkin is also only reached through a fenced block inside a markdown document.
A standalone `.feature` file is not shown at all, because the folder scan only
collects `.md` and `.mdc` files.

## Mermaid runs in the page

The Mermaid build is part of the app, and it draws into the page. A fence longer
than 50,000 characters, a diagram Mermaid rejects, or a draw that takes longer
than 8 seconds is shown as the monospace fence. Diagrams draw one at a time,
because Mermaid's config is global.

A click or a link inside a diagram does nothing. A `%%{init}` block in the
diagram cannot turn security off: `securityLevel`, `startOnLoad` and
`maxTextSize` stay as the viewer set them. Find does not mark text inside the
diagram. The source editor still holds the text.

## Images only render as blocks

An image renders as a picture when it is alone in its paragraph. An image mixed
into a sentence falls back to its alt text, because an inline image has to be
measured and baseline-aligned inside a run of text.

## Relative links are inert

A link to another `.md` file is styled as a link but does nothing when clicked.
Only links with a scheme — `https:`, `mailto:` and so on — are handed to the
system. Making relative links select the target file in the sidebar tree is the
obvious next step.

## Large files fall back to plain text

Documents over 500,000 characters are shown as monospace plain text with a
notice, rather than parsed. Parsing runs on the main thread, and past that size a
document is almost certainly not prose.

## Not a CommonMark implementation

The parser covers the constructs that appear in real documents, not the full
specification. Known gaps include HTML blocks as block-level constructs, link
titles (parsed only so they can be skipped), and the finer points of emphasis
delimiter matching in ambiguous cases such as `**a*b**`.

## A web folder is known by its name

A browser never tells the page where a folder is on disk, so the web app calls
a folder `/<folder name>`. A picked folder is compared with the folders the
page already knows. The same folder keeps its path. A different folder with
the same name gets `/<folder name> (2)`, `(3)` and so on, so it has its own
entry in the recent folder menu, its own file list and its own scroll
positions. The number shows in the menu in place of the parent folder.

The browser may forget the read permission between visits. The page can ask for
it again only after a click, so the last folder does not reopen by itself; the
recent folder menu opens it with one click.

## The web app needs Chromium for folders

Folders are read through the File System Access API, which only Chromium
browsers ship. Safari and Firefox get a "not compatible" page. A drag-and-drop
or `<input webkitdirectory>` fallback would give a read-only snapshot with no
reload and no memory between visits, so it is not offered. A document by URL
works in every browser.

## A document by URL needs a permissive server

The browser enforces CORS, so a document can be opened by URL only when its
server allows cross-origin reads. `raw.githubusercontent.com` does; a GitHub
page URL (`github.com/…/blob/…`) does not, and it is HTML anyway. A document by
URL is not watched.

## A file from outside stays one file

A file opened from Finder, or by URL, is shown alone. The sidebar does not list
the files beside it. The next launch reopens the last folder, not that file. A
file opened while the app is running gets a new window: on macOS a new window
of the same app, on Windows and Linux a second app. The window that is open
keeps its file.

## The desktop app can read any file

The desktop app is not sandboxed, and its file scope allows reads and writes
everywhere, because the person picks the folder at run time. It writes only
when the person clicks Save. A store
build for the Mac App Store would need the sandbox and security-scoped
bookmarks back.

## Back and Next are navigation, not undo

The buttons move through files you opened in the current folder. They do not
undo typing. Opening a file after you went back drops the files that were
ahead, as a browser does. The list stops at 100 files. Only the 20 folders
opened most recently keep a list, so the store stays bounded.

## Edits are written only on Save

The source editor changes what the viewer renders, not the file, until the
person clicks Save. Save shows only while the editor is open, to the right of
the editor button, and is enabled only while the buffer has unsaved edits. A
document's buffer is kept for as long as the app is running, so switching to
another file and back does not lose it, but quitting does. Command-S, or
Control-S off the Mac, does what Save does, and only while Save is enabled;
it never opens the browser's own save. There is no prompt on the way out. The header says
`edited, not saved` whenever a buffer has diverged from disk, and stops when
the text matches the file again.

If the file changes on disk under that buffer, the header adds `file changed
on disk` and the typed text is kept. Disk does not overwrite a session edit.
Save then writes the buffer over the new file: the person was told, and the
choice is theirs.

The web app opens a folder for reading only. The first Save asks the browser
for write access to that file; when it is refused, the header says so and the
buffer stays. A document opened by URL cannot be saved.

## Undo keeps 100 steps per file

Undo and Redo show beside Save while the editor is open. Command-Z or
Control-Z undoes, Shift-Command-Z, Shift-Control-Z or Control-Y redoes, and
the Edit menu's Undo goes to the same history. The text field's own history
is not used: it does not know about switched files and saves.

Each step is a full copy of the text, so a file keeps at most 100 steps and
the oldest go first. Edits less than one second apart are one step, so Undo
takes back a burst of typing, not one character. Each file has its own
history for as long as the app runs; quitting loses it. Undo can go back past
a save. A change on disk does not clear the history, so Undo can go back to
text from before that change.

## The preview trails the typing by a moment

The editor takes every keystroke, but the preview waits 150 ms after the last
one and then rebuilds from the whole source. A burst of typing therefore parses
once instead of once per character, and the document still follows closely
enough to read as live. There is no incremental parse: the debounce makes the
work less frequent, not smaller, so a document of a few hundred thousand
characters still types roughly. Past 500,000 characters the editor is disabled
outright, because that document is already falling back to plain text.

## The two panes scroll by fraction

The source editor and the preview scroll together: when one pane is halfway
down, the other is halfway down too. The parser does not record which source
line each block comes from, so the panes cannot be matched line by line. For
prose the two stay close. An image, a diagram or a long table takes more space
in the preview than in the source, so the panes drift near it.

## The tree is walked three levels at a time

A full recursive walk of a large project is expensive and can hang the UI.
Each scan reads three directory levels. A deeper folder is read when you click
it in the tree, and Reload walks the root again. The tree is not watched:
files added or removed while the app is open do not appear by themselves. A
watcher would keep the tree live, but it would also let the list jump while
someone was reading it. The open file is watched on its own, and that does not
rebuild the list.

## Find marks one text run at a time

A hit has to sit inside one run of text: a word, a code token, a step. The
search does not join a bold word to the plain word beside it, so a match
cannot start in one run and end in the next. It marks at most 500 hits, then
stops. The source editor is not marked. The preview beside the editor is.

## No export

The viewer does not write the document out as a PDF, as HTML, or as any other
file. It only shows the document.
