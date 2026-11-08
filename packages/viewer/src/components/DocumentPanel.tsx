import '@m3e/icons/outlined/checklist';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import { hasBareFeature, parseMarkdown } from '@md-viewer/markdown/parseBlocks';

import { DEFAULT_CHARACTERS } from '../column';
import { FindProvider, useShowText } from '../find';
import {
  loadCharacters,
  loadEditorFraction,
  loadEditorMode,
  loadFontScheme,
  loadFontSize,
  loadZoom,
  saveCharacters,
  saveEditorFraction,
  saveEditorMode,
  saveFontScheme,
  saveFontSize,
  saveZoom,
} from '../preferences';
import { useScrollMemory } from '../scrollMemory';
import { useScrollSync } from '../scrollSync';
import { useShortcut } from '../shortcuts';
import { nextEditorMode, type EditorMode } from '../editorMode';
import { DEFAULT_EDITOR_FRACTION } from '../split';
import { useTheme } from '../theme';
import { useDocumentSession } from '../useDocumentSession';
import { useFindSession } from '../useFindSession';
import type { FileNode } from '../types';
import { M3eToolbar } from '../m3e';
import { useStoredPreference } from '../useStoredPreference';
import {
  CODE_FONT,
  columnWidth,
  DEFAULT_SCHEME_ID,
  schemeById,
} from '../typography';
import { DEFAULT_FONT_SIZE, textScaleOf } from '../fontSize';
import { DEFAULT_ZOOM } from '../zoom';
import { ColumnControl } from './ColumnControl';
import { DocumentSearch } from './DocumentSearch';
import { Editor } from './Editor';
import { EditTools } from './EditTools';
import { EditorToggle } from './EditorToggle';
import { FontControl } from './FontControl';
import { HistoryNav } from './HistoryNav';
import { IconButton } from './IconButton';
import { Markdown } from './Markdown';
import { Spinner } from './Spinner';
import { EditorSplit } from './EditorSplit';
import { AppBarTitle } from './TopAppBar';
import { ReplaceBar } from './ReplaceBar';
import { oneLine } from './text';
import { FontSizeControl } from './FontSizeControl';
import { ZoomControl } from './ZoomControl';

/** Body line in `Markdown.tsx` (`body(21)`), before zoom and scheme scale. */
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
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  /** Shows a markdown file that a link in the document names. */
  onOpenFile: (path: string) => void;
}

/** Reads the selected file and renders it as markdown. */
export function DocumentPanel({
  file,
  isSidebarVisible,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  onOpenFile,
}: DocumentPanelProps) {
  const theme = useTheme();
  /** The path read with unfenced features laid out; any other path is not. */
  const [gherkinPath, setGherkinPath] = useState<string | null>(null);
  // Zoom, font size and line length are properties of the reader rather than
  // of the document: they survive switching files, and are restored on the
  // next launch.
  const [scale, changeZoom] = useStoredPreference(
    loadZoom,
    saveZoom,
    DEFAULT_ZOOM,
  );
  const [fontSize, changeFontSize] = useStoredPreference(
    loadFontSize,
    saveFontSize,
    DEFAULT_FONT_SIZE,
  );
  const type = scale * textScaleOf(fontSize);
  const [characters, changeCharacters] = useStoredPreference(
    loadCharacters,
    saveCharacters,
    DEFAULT_CHARACTERS,
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [schemeId, changeScheme] = useStoredPreference(
    loadFontScheme,
    saveFontScheme,
    DEFAULT_SCHEME_ID,
  );
  // Reading is the common case, so the editor stays closed until asked for.
  const [editorMode, chooseEditorMode] = useStoredPreference<EditorMode>(
    loadEditorMode,
    saveEditorMode,
    'preview',
  );
  const [editorFraction, chooseEditorFraction] = useStoredPreference(
    loadEditorFraction,
    saveEditorFraction,
    DEFAULT_EDITOR_FRACTION,
  );

  const toggleEditor = useCallback(
    () => chooseEditorMode(nextEditorMode(editorMode)),
    [chooseEditorMode, editorMode],
  );

  const path = file?.path ?? null;
  const session = useDocumentSession(path);
  const {
    text,
    rendered,
    isTruncated,
    isLoading,
    error,
    isDirty,
    diskChanged,
    saveError,
    edit,
    replace: replaceText,
    undo,
    redo,
  } = session;

  // Find goes where the editor is: the source whenever it shows, else the preview.
  const findsInSource =
    editorMode !== 'preview' &&
    !isTruncated &&
    error === null &&
    !isLoading &&
    file !== null;
  const find = useFindSession({
    path,
    text,
    inSource: findsInSource,
    replace: replaceText,
  });
  const { focusReplace } = find;

  // Replace works on the source, so asking for it from the preview opens the split.
  const openReplace = useCallback(() => {
    if (editorMode === 'preview') {
      chooseEditorMode('split');
    }
    focusReplace();
  }, [editorMode, chooseEditorMode, focusReplace]);

  // A document too large to parse is shown as plain text, and editing it would
  // reparse nothing — so the source pane has nothing to offer there.
  const canEdit = file !== null && !isTruncated && error === null;
  const isEditing = editorMode !== 'preview' && canEdit;
  useShortcut('s', isEditing && session.canSave ? session.save : null);
  useShortcut('e', canEdit ? toggleEditor : null);
  useShortcut('g', canEdit ? openReplace : null);

  const isGherkin = path !== null && gherkinPath === path;

  const blocks = useMemo(
    () =>
      rendered === null || isTruncated
        ? []
        : parseMarkdown(rendered, { bareFeatures: isGherkin }),
    [rendered, isTruncated, isGherkin],
  );

  const canRenderGherkin = useMemo(
    () =>
      isGherkin
        ? blocks.some(block => block.kind === 'codeBlock' && block.bare)
        : rendered !== null && !isTruncated && hasBareFeature(rendered),
    [isGherkin, blocks, rendered, isTruncated],
  );

  // Prose is read most comfortably at a bounded line length, so the column is
  // capped and centred rather than filling however wide the window happens to
  // be. The cap tracks the text size and the chosen character count.
  const maxWidth = useMemo(
    () => columnWidth(schemeById(schemeId), type, characters),
    [schemeId, type, characters],
  );

  const mountKey = isLoading
    ? 'loading'
    : error !== null
      ? 'error'
      : editorMode !== 'preview' && !isTruncated
        ? editorMode
        : 'single';
  const scrollMemory = useScrollMemory(path, scrollRef, bodyHeight, mountKey);
  const { onContentSizeChange } = scrollMemory;
  const scrollSync = useScrollSync();
  const { attachPreview } = scrollSync;

  // The scroll view remounts per file and per layout, so the observers follow it.
  const attachScroll = useCallback(
    (element: HTMLDivElement | null) => {
      scrollRef.current = element;
      attachPreview(element);
    },
    [attachPreview],
  );
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

  const historyTool = (
    <HistoryNav
      canGoBack={canGoBack}
      canGoNext={canGoNext}
      onBack={onBack}
      onNext={onNext}
    />
  );

  const headerStyle: CSSProperties = {
    ...styles.header,
    borderBottomColor: theme.border,
  };

  if (file === null) {
    return (
      <main style={styles.container}>
        <header style={headerStyle}>
          <M3eToolbar>{historyTool}</M3eToolbar>
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

  const lineHeight = isTruncated
    ? PLAIN_LINE * type
    : bodyLineHeight(type, schemeById(schemeId).body.scale);
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
      onScroll={event => {
        scrollMemory.onScroll(event);
        scrollSync.onPreviewScroll();
      }}
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
            <PlainBody text={rendered ?? ''} scale={type} />
          </>
        ) : (
          <div style={{ ...styles.column, maxWidth }}>
            <Markdown
              blocks={blocks}
              basePath={basePath}
              scale={scale}
              textScale={textScaleOf(fontSize)}
              schemeId={schemeId}
              onOpenFile={onOpenFile}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <main style={styles.container}>
      <AppBarTitle>
        <h1 title={file.path} style={{ ...styles.fileName, ...oneLine }}>
          {file.name}
        </h1>
        <span
          style={{
            ...styles.filePath,
            ...oneLine,
            color: theme.error,
          }}
        >
          {!isDirty
            ? null
            : ` — edited, not saved${diskChanged ? ' — file changed on disk' : ''}${saveError === null ? '' : ` — ${saveError}`}`}
        </span>
      </AppBarTitle>
      <header style={headerStyle}>
        <M3eToolbar>
          {historyTool}
          {canRenderGherkin ? (
            <IconButton
              icon="checklist"
              label={isGherkin ? 'Render as markdown' : 'Render as gherkin'}
              tooltip="Lays out an unfenced Feature: as Gherkin"
              selected={isGherkin}
              onClick={() => setGherkinPath(isGherkin ? null : path)}
            />
          ) : null}
          <EditorToggle
            mode={editorMode}
            disabled={!canEdit}
            onChange={chooseEditorMode}
          />
          {isEditing ? <EditTools session={session} /> : null}
          <FontControl schemeId={schemeId} onChange={changeScheme} />
          <ColumnControl characters={characters} onChange={changeCharacters} />
          <FontSizeControl size={fontSize} onChange={changeFontSize} />
          <ZoomControl scale={scale} onChange={changeZoom} />
        </M3eToolbar>
        <div style={styles.findRow}>
          <DocumentSearch
            query={find.query}
            count={find.count}
            active={find.active}
            capped={find.capped}
            onQuery={find.setQuery}
            onActive={find.setActive}
          />
          <ReplaceBar
            focusKey={find.replaceFocusKey}
            onFocused={find.replaceFocused}
            value={find.replacement}
            // Replace changes the source, so it works only while the editor shows.
            disabled={!canEdit || !findsInSource}
            canReplace={find.count > 0}
            onValue={find.setReplacement}
            onReplaceOne={find.replaceOne}
            onReplaceAll={find.replaceAll}
          />
        </div>
      </header>

      <FindProvider {...find.previewFind} scrollRef={scrollRef}>
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
        ) : isEditing ? (
          <EditorSplit
            isSplit={editorMode === 'split'}
            fraction={editorFraction}
            onCommit={chooseEditorFraction}
            preview={document}
            editor={
              <Editor
                value={text ?? ''}
                scale={type}
                lastLineInset={LAST_LINE_INSET}
                onChange={edit}
                onUndo={undo}
                onRedo={redo}
                fieldRef={scrollSync.attachEditor}
                onScroll={scrollSync.onEditorScroll}
                marks={find.sourceMarks}
              />
            }
          />
        ) : (
          document
        )}
      </FindProvider>
    </main>
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
    height: '100%',
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
  findRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0 16px 8px',
    borderBottom: '1px solid',
  },
  fileName: {
    flexShrink: 1,
    margin: 0,
    font: 'inherit',
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
