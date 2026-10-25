import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { parseMarkdown } from '@md-viewer/markdown/parseBlocks';

import { DEFAULT_CHARACTERS } from '../column';
import { FindProvider, useShowText } from '../find';
import { usePlatform } from '../platform';
import {
  loadCharacters,
  loadEditorVisible,
  loadFontScheme,
  loadZoom,
  saveCharacters,
  saveEditorVisible,
  saveFontScheme,
  saveZoom,
} from '../preferences';
import { useScrollMemory } from '../scrollMemory';
import { useTheme } from '../theme';
import type { FileNode } from '../types';
import { isHttpUrl } from '../url';
import {
  CODE_FONT,
  columnWidth,
  DEFAULT_SCHEME_ID,
  schemeById,
} from '../typography';
import { DEFAULT_ZOOM } from '../zoom';
import { ColorSchemeControl } from './ColorSchemeControl';
import { ColumnControl } from './ColumnControl';
import { DocumentSearch } from './DocumentSearch';
import { Editor } from './Editor';
import { EditorToggle } from './EditorToggle';
import { FontControl } from './FontControl';
import { HistoryNav } from './HistoryNav';
import { Markdown } from './Markdown';
import { SaveButton } from './SaveButton';
import { SidebarToggle } from './SidebarToggle';
import { Spinner } from './Spinner';
import { oneLine } from './text';
import { ZoomControl } from './ZoomControl';

/**
 * Past this size the document is almost certainly not prose, and parsing it
 * would block the page for longer than anyone wants.
 */
const MAX_RENDERED_CHARACTERS = 500_000;

/**
 * How long the typing must stop before the preview is rebuilt. Long enough
 * that a run of keystrokes parses once, short enough to still read as live.
 */
const REPARSE_DELAY_MS = 150;

/** Body line in `Markdown.tsx` (`size(21)`), before zoom and scheme scale. */
const BODY_LINE = 21;

/** Plain-text fallback line, before zoom. */
const PLAIN_LINE = 18;

/**
 * Padding under the last line. The end space subtracts it, so it is not
 * counted twice.
 */
const CONTENT_PADDING_BOTTOM = 48;

/** Full scroll leaves the last line this far below the top of the view. */
const LAST_LINE_INSET = 300;

function bodyLineHeight(scale: number, bodyScale: number): number {
  return Math.round(BODY_LINE * scale * bodyScale * 2) / 2;
}

/** Calls `onHeight` with the element's height now and on every resize. */
function observeHeight(
  element: HTMLElement | null,
  onHeight: (height: number) => void,
): () => void {
  if (element === null || typeof ResizeObserver === 'undefined') {
    return () => {};
  }
  const observer = new ResizeObserver(() => onHeight(element.offsetHeight));
  observer.observe(element);
  onHeight(element.offsetHeight);
  return () => observer.disconnect();
}

interface DocumentPanelProps {
  file: FileNode | null;
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
}

/** Reads the selected file and renders it as markdown. */
export function DocumentPanel({
  file,
  isSidebarVisible,
  onToggleSidebar,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
}: DocumentPanelProps) {
  const theme = useTheme();
  const platform = usePlatform();
  const [source, setSource] = useState<string | null>(null);
  /** Edits made in this session, or null while the file is as it is on disk. */
  const [draft, setDraft] = useState<string | null>(null);
  /**
   * The edits the preview is built from. It trails `draft` by the debounce, so
   * a burst of keystrokes reparses the document once instead of every time.
   */
  const [settledDraft, setSettledDraft] = useState<string | null>(null);
  const reparse = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reread = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Unsaved edits for every file touched this session, so a glance at
   * another document does not throw the work away.
   */
  const drafts = useRef(new Map<string, string>());
  const sourceRef = useRef<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diskChanged, setDiskChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Zoom and line length are properties of the reader rather than of the
  // document: they survive switching files, and are restored on the next launch.
  const [scale, setScale] = useState(DEFAULT_ZOOM);
  const [characters, setCharacters] = useState(DEFAULT_CHARACTERS);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [capped, setCapped] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [schemeId, setSchemeId] = useState(DEFAULT_SCHEME_ID);
  // Reading is the common case, so the editor stays closed until asked for.
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const hasChosenZoom = useRef(false);
  const hasChosenCharacters = useRef(false);
  const hasChosenScheme = useRef(false);
  const hasChosenEditor = useRef(false);

  useEffect(() => {
    let cancelled = false;

    loadZoom().then(stored => {
      // Someone who zoomed while the read was in flight outranks the store.
      if (!cancelled && stored !== null && !hasChosenZoom.current) {
        setScale(stored);
      }
    });

    loadCharacters().then(stored => {
      if (!cancelled && stored !== null && !hasChosenCharacters.current) {
        setCharacters(stored);
      }
    });

    loadFontScheme().then(stored => {
      if (!cancelled && stored !== null && !hasChosenScheme.current) {
        setSchemeId(stored);
      }
    });

    loadEditorVisible().then(stored => {
      if (!cancelled && stored !== null && !hasChosenEditor.current) {
        setIsEditorVisible(stored);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const changeZoom = useCallback((next: number) => {
    hasChosenZoom.current = true;
    setScale(next);
    saveZoom(next);
  }, []);

  const changeCharacters = useCallback((next: number) => {
    hasChosenCharacters.current = true;
    setCharacters(next);
    saveCharacters(next);
  }, []);

  const changeQuery = useCallback((next: string) => {
    setQuery(next);
    setActive(0);
  }, []);

  const handleCount = useCallback((count: number, isCapped: boolean) => {
    setMatchCount(prev => (prev === count ? prev : count));
    setCapped(prev => (prev === isCapped ? prev : isCapped));
    setActive(prev => {
      const next = count === 0 ? 0 : Math.min(prev, count - 1);
      return next === prev ? prev : next;
    });
  }, []);

  const changeScheme = useCallback((next: string) => {
    hasChosenScheme.current = true;
    setSchemeId(next);
    saveFontScheme(next);
  }, []);

  // The write stays out of the state updater, which React may call twice.
  const toggleEditor = useCallback(() => {
    hasChosenEditor.current = true;
    const next = !isEditorVisible;
    setIsEditorVisible(next);
    saveEditorVisible(next);
  }, [isEditorVisible]);

  const path = file?.path ?? null;
  const pathRef = useRef(path);
  pathRef.current = path;
  sourceRef.current = source;
  draftRef.current = draft;

  useEffect(() => {
    // A pending reparse belongs to the file being left, not to the new one.
    if (reparse.current !== null) {
      clearTimeout(reparse.current);
      reparse.current = null;
    }
    if (reread.current !== null) {
      clearTimeout(reread.current);
      reread.current = null;
    }

    setQuery('');
    setActive(0);
    setMatchCount(0);
    setCapped(false);
    setSaveError(null);

    if (path === null) {
      setSource(null);
      setDraft(null);
      setSettledDraft(null);
      setError(null);
      setDiskChanged(false);
      return;
    }

    // Whatever was typed into this file earlier is what it should open on.
    const stored = drafts.current.get(path) ?? null;
    setDraft(stored);
    setSettledDraft(stored);
    draftRef.current = stored;
    setDiskChanged(false);

    let cancelled = false;
    let ticket = 0;

    const issue = (isReload: boolean) => {
      const t = ++ticket;
      if (!isReload) {
        setIsLoading(true);
        setError(null);
      }
      platform
        .readFile(path)
        .then(contents => {
          if (cancelled || t !== ticket) {
            return;
          }
          if (isReload && contents === sourceRef.current) {
            return;
          }
          setSource(contents);
          if (isReload && draftRef.current !== null) {
            setDiskChanged(true);
          }
        })
        .catch((cause: unknown) => {
          if (cancelled || t !== ticket || isReload) {
            return;
          }
          setSource(null);
          setError(
            cause instanceof Error ? cause.message : 'Could not read the file.',
          );
        })
        .finally(() => {
          if (!cancelled && t === ticket && !isReload) {
            setIsLoading(false);
          }
        });
    };

    issue(false);

    const stop = platform.watchFile(path, () => {
      if (reread.current !== null) {
        clearTimeout(reread.current);
      }
      reread.current = setTimeout(() => {
        reread.current = null;
        issue(true);
      }, REPARSE_DELAY_MS);
    });

    return () => {
      cancelled = true;
      stop();
      if (reread.current !== null) {
        clearTimeout(reread.current);
        reread.current = null;
      }
    };
  }, [path, platform]);

  const edit = useCallback(
    (next: string) => {
      if (path === null) {
        return;
      }
      drafts.current.set(path, next);
      setDraft(next);
      setSaveError(null);
      if (reparse.current !== null) {
        clearTimeout(reparse.current);
      }
      reparse.current = setTimeout(() => {
        reparse.current = null;
        setSettledDraft(next);
      }, REPARSE_DELAY_MS);
    },
    [path],
  );

  const save = useCallback(() => {
    const write = platform.writeFile;
    const contents = draftRef.current;
    if (path === null || write === undefined || contents === null) {
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    write(path, contents)
      .then(() => {
        // Typing during the write leaves a newer draft, which stays unsaved.
        if (drafts.current.get(path) === contents) {
          drafts.current.delete(path);
        }
        if (pathRef.current !== path) {
          return;
        }
        // Set before the watcher rereads, so the own write is not a change.
        sourceRef.current = contents;
        setSource(contents);
        if (draftRef.current === contents) {
          if (reparse.current !== null) {
            clearTimeout(reparse.current);
            reparse.current = null;
          }
          setDraft(null);
          setSettledDraft(null);
          setDiskChanged(false);
        }
      })
      .catch((cause: unknown) => {
        if (pathRef.current === path) {
          setSaveError(
            cause instanceof Error ? cause.message : 'Could not save the file.',
          );
        }
      })
      .finally(() => setIsSaving(false));
  }, [path, platform]);

  useEffect(
    () => () => {
      if (reparse.current !== null) {
        clearTimeout(reparse.current);
      }
      if (reread.current !== null) {
        clearTimeout(reread.current);
      }
    },
    [],
  );

  /** What the editor holds: the edits if there are any, else what is on disk. */
  const text = draft ?? source;
  /** What the reader sees, which lags the editor by the debounce. */
  const rendered = settledDraft ?? source;

  const isTruncated =
    rendered !== null && rendered.length > MAX_RENDERED_CHARACTERS;

  const blocks = useMemo(
    () =>
      rendered === null || rendered.length > MAX_RENDERED_CHARACTERS
        ? []
        : parseMarkdown(rendered),
    [rendered],
  );

  // Prose is read most comfortably at a bounded line length, so the column is
  // capped and centred rather than filling however wide the window happens to
  // be. The cap tracks zoom and the chosen character count.
  const maxWidth = useMemo(
    () => columnWidth(schemeById(schemeId), scale, characters),
    [schemeId, scale, characters],
  );

  const mountKey = isLoading
    ? 'loading'
    : error !== null
      ? 'error'
      : isEditorVisible && !isTruncated
        ? 'split'
        : 'single';
  const scrollMemory = useScrollMemory(path, scrollRef, bodyHeight, mountKey);
  const { onContentSizeChange } = scrollMemory;

  // The scroll view remounts per file and per layout, so the observers follow it.
  const attachScroll = useCallback((element: HTMLDivElement | null) => {
    scrollRef.current = element;
  }, []);
  useEffect(
    () =>
      observeHeight(scrollRef.current, next =>
        setBodyHeight(current => (current === next ? current : next)),
      ),
    [path, mountKey],
  );
  useEffect(
    () => observeHeight(contentRef.current, onContentSizeChange),
    [path, mountKey, onContentSizeChange],
  );

  const basePath = useMemo(
    () => (path === null ? '' : path.slice(0, path.lastIndexOf('/'))),
    [path],
  );

  const sidebarTool = (
    <Tool title="Sidebar">
      <SidebarToggle isVisible={isSidebarVisible} onToggle={onToggleSidebar} />
    </Tool>
  );
  const historyTool = (
    <Tool title="History">
      <HistoryNav
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        onBack={onBack}
        onNext={onNext}
      />
    </Tool>
  );

  if (file === null) {
    return (
      <main style={styles.container}>
        <header style={{ ...styles.header, borderBottomColor: theme.border }}>
          <TitleRow />
          <div style={styles.tools}>
            {sidebarTool}
            {historyTool}
          </div>
        </header>
        <div style={{ ...styles.body, ...styles.centered }}>
          <span style={{ ...styles.message, color: theme.mutedText }}>
            {isSidebarVisible
              ? 'Select a markdown file from the sidebar.'
              : 'Show the sidebar to select a markdown file.'}
          </span>
        </div>
      </main>
    );
  }

  // A document too large to parse is shown as plain text, and editing it would
  // reparse nothing — so the source pane has nothing to offer there.
  const canEdit = !isTruncated && error === null;
  const canSave =
    draft !== null &&
    !isSaving &&
    platform.writeFile !== undefined &&
    !isHttpUrl(file.path);
  const lineHeight = isTruncated
    ? PLAIN_LINE * scale
    : bodyLineHeight(scale, schemeById(schemeId).body.scale);
  const endSpace = Math.max(
    0,
    bodyHeight - lineHeight - CONTENT_PADDING_BOTTOM - LAST_LINE_INSET,
  );

  const document = (
    // Keying on the path starts each document at the top; the memory then restores it.
    <div
      key={file.path}
      ref={attachScroll}
      data-testid="document-scroll"
      style={styles.scroll}
      onScroll={scrollMemory.onScroll}
    >
      <div
        ref={contentRef}
        style={{
          ...styles.content,
          paddingBottom: CONTENT_PADDING_BOTTOM + endSpace,
        }}
      >
        {isTruncated ? (
          <>
            <p style={{ ...styles.message, color: theme.mutedText }}>
              This file is too large to render; showing it as plain text.
            </p>
            <PlainBody text={rendered ?? ''} scale={scale} />
          </>
        ) : (
          <div style={{ ...styles.column, maxWidth }}>
            <Markdown
              blocks={blocks}
              basePath={basePath}
              scale={scale}
              schemeId={schemeId}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <main style={styles.container}>
      <header style={{ ...styles.header, borderBottomColor: theme.border }}>
        <TitleRow>
          <h1
            title={file.path}
            style={{ ...styles.fileName, ...oneLine, color: theme.text }}
          >
            {file.name}
          </h1>
          <span
            style={{
              ...styles.filePath,
              ...oneLine,
              color: theme.syntaxKeyword,
            }}
          >
            {draft === null
              ? null
              : ` — edited, not saved${diskChanged ? ' — file changed on disk' : ''}${saveError === null ? '' : ` — ${saveError}`}`}
          </span>
        </TitleRow>
        <div style={styles.tools}>
          {sidebarTool}
          {historyTool}
          <Tool title="Editor">
            <div style={styles.toolRow}>
              <EditorToggle
                isVisible={isEditorVisible}
                disabled={!canEdit}
                onToggle={toggleEditor}
              />
              {isEditorVisible && canEdit ? (
                <SaveButton disabled={!canSave} onSave={save} />
              ) : null}
            </div>
          </Tool>
          <div style={{ flex: 1 }} />
          <Tool title="Font">
            <FontControl schemeId={schemeId} onChange={changeScheme} />
          </Tool>
          <Tool title="Width">
            <ColumnControl
              characters={characters}
              onChange={changeCharacters}
            />
          </Tool>
          <Tool title="Zoom">
            <ZoomControl scale={scale} onChange={changeZoom} />
          </Tool>
          <Tool title="Find">
            <DocumentSearch
              query={query}
              count={matchCount}
              active={active}
              capped={capped}
              onQuery={changeQuery}
              onActive={setActive}
            />
          </Tool>
        </div>
      </header>

      <FindProvider
        query={query}
        active={active}
        scrollRef={scrollRef}
        onCount={handleCount}
      >
        {isLoading ? (
          <div style={{ ...styles.body, ...styles.centered }}>
            <Spinner />
          </div>
        ) : error !== null ? (
          <div style={{ ...styles.body, ...styles.centered }}>
            <span style={{ ...styles.message, color: theme.mutedText }}>
              {error}
            </span>
          </div>
        ) : isEditorVisible && canEdit ? (
          <div style={styles.split}>
            <Editor value={text ?? ''} scale={scale} onChange={edit} />
            <div style={{ width: 1, backgroundColor: theme.border }} />
            <div style={styles.preview}>{document}</div>
          </div>
        ) : (
          document
        )}
      </FindProvider>
    </main>
  );
}

type TitleRowProps = {
  children?: ReactNode;
};

function TitleRow({ children }: TitleRowProps) {
  return (
    <div style={styles.titleRow}>
      <div style={styles.fileInfo}>{children}</div>
      <ColorSchemeControl />
    </div>
  );
}

type ToolProps = {
  title: string;
  children: ReactNode;
};

/** A short name above one header control. */
function Tool({ title, children }: ToolProps) {
  const theme = useTheme();

  return (
    <div style={styles.tool}>
      <span style={{ ...styles.toolTitle, color: theme.mutedText }}>
        {title}
      </span>
      {children}
    </div>
  );
}

type PlainBodyProps = {
  text: string;
  scale: number;
};

/** The plain-text fallback, marked by the same find pass as the preview. */
function PlainBody({ text, scale }: PlainBodyProps) {
  const theme = useTheme();
  const show = useShowText();

  return (
    <pre
      style={{
        ...styles.plainText,
        color: theme.text,
        fontSize: 12.5 * scale,
        lineHeight: `${PLAIN_LINE * scale}px`,
      }}
    >
      {show(text)}
    </pre>
  );
}

const styles = {
  container: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 13,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '18px 24px 12px',
    borderBottom: '1px solid',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  fileInfo: {
    flex: 1,
    display: 'flex',
    minWidth: 0,
    gap: 4,
  },
  tools: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 12,
  },
  tool: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  toolRow: {
    display: 'flex',
    gap: 6,
  },
  toolTitle: {
    fontSize: 10,
  },
  fileName: {
    flexShrink: 1,
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
  },
  filePath: {
    flexShrink: 0,
    marginTop: 4,
    fontSize: 11,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
  },
  // Source on the left, rendered document on the right, an even split.
  split: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
  },
  preview: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    padding: '20px 24px',
  },
  column: {
    width: '100%',
    margin: '0 auto',
  },
  // The plain-text fallback keeps the full width: monospace is wider per
  // character, so the prose column would wrap it far too early.
  plainText: {
    margin: 0,
    fontFamily: CODE_FONT,
    whiteSpace: 'pre-wrap',
  },
} satisfies Record<string, CSSProperties>;
