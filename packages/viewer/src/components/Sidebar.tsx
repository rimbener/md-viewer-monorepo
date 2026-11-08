import '@m3e/icons/outlined/note_add';
import '@m3e/icons/outlined/refresh';

import type { CSSProperties } from 'react';

import { M3eButton, M3eIcon, M3eIconButton } from '../m3e';
import { usePlatform } from '../platform';
import { useTheme } from '../theme';
import { typescale } from '../typescale';
import type { FolderSessionControls } from '../useFolderSession';
import { FileTree } from './FileTree';
import { OpenUrlForm } from './OpenUrlForm';
import { RecentFolderMenu } from './RecentFolderMenu';
import { Spinner } from './Spinner';
import { oneLine } from './text';
import { Tooltip, useControlId } from './Tooltip';

type SidebarSession = Pick<
  FolderSessionControls,
  | 'root'
  | 'folder'
  | 'selectedFile'
  | 'fileCount'
  | 'recentFolders'
  | 'isBusy'
  | 'error'
  | 'chooseFolder'
  | 'selectRecentFolder'
  | 'removeRecentFolder'
  | 'reloadFolder'
  | 'cancelScan'
  | 'selectFile'
  | 'selectDirectory'
>;

interface SidebarProps {
  /** The drawer slot it fills. */
  slot?: string;
  session: SidebarSession;
  /** Asks for a new markdown file in `folder`. Null where that is not offered. */
  onAddFile: ((folder: string) => void) | null;
}

export function Sidebar({ slot, session, onAddFile }: SidebarProps) {
  const {
    root,
    folder,
    selectedFile,
    fileCount,
    recentFolders,
    isBusy,
    error,
    chooseFolder,
    selectRecentFolder,
    removeRecentFolder,
    reloadFolder,
    cancelScan,
    selectFile,
    selectDirectory,
  } = session;
  const selectedPath = selectedFile?.path ?? null;
  const theme = useTheme();
  const platform = usePlatform();
  const reloadId = useControlId();
  const addId = useControlId();
  const cancelId = useControlId();
  const hairline = `1px solid ${theme.border}`;
  const canCreate = root !== null && folder !== null && onAddFile !== null;
  const newFileFolder =
    folder === null ? null : folderOfSelection(folder, selectedPath);

  return (
    <aside
      slot={slot}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 280,
        height: '100%',
        backgroundColor: theme.sidebar,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 10,
          borderBottom: hairline,
        }}
      >
        {platform.canOpenFolders ? (
          <div>
            <RecentFolderMenu
              folders={recentFolders}
              currentPath={folder}
              disabled={isBusy}
              onSelect={selectRecentFolder}
              onRemove={removeRecentFolder}
            />
            <div style={styles.actions}>
              <M3eButton
                variant="tonal"
                onClick={chooseFolder}
                disabled={isBusy}
                style={styles.grow}
              >
                {root ? 'Change Folder…' : 'Choose Folder…'}
              </M3eButton>
              {root && folder !== null ? (
                <>
                  <M3eIconButton
                    id={reloadId}
                    variant="tonal"
                    aria-label="Reload folder"
                    onClick={reloadFolder}
                    disabled={isBusy}
                  >
                    <M3eIcon name="refresh" />
                  </M3eIconButton>
                  <Tooltip
                    controlId={reloadId}
                    text="Reads the folder again so new markdown files are shown"
                  />
                </>
              ) : null}
            </div>
            {canCreate ? (
              <>
                <M3eButton
                  id={addId}
                  variant="outlined"
                  onClick={() => {
                    if (newFileFolder !== null) {
                      onAddFile?.(newFileFolder);
                    }
                  }}
                  disabled={isBusy}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  <M3eIcon slot="icon" name="note_add" />
                  Add new file
                </M3eButton>
                <Tooltip
                  controlId={addId}
                  text="Makes a new markdown file in the folder of the selected file"
                />
              </>
            ) : null}
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              ...typescale('body-small'),
              color: theme.mutedText,
            }}
          >
            This browser cannot open folders. Use Chrome or Edge to read a
            folder of markdown files.
          </p>
        )}
        {platform.openUrl ? <OpenUrlForm onOpen={platform.openUrl} /> : null}

        {root ? (
          <span
            title={root.path}
            style={{
              ...oneLine,
              ...typescale('label-small'),
              color: theme.mutedText,
            }}
          >
            {root.path}
          </span>
        ) : null}
        {error && root ? (
          <span style={{ ...typescale('label-small'), color: theme.error }}>
            {error}
          </span>
        ) : null}
      </div>

      {root ? (
        <FileTree
          // Remounting per folder resets the expansion state with it.
          key={root.path}
          root={root}
          selectedPath={selectedPath}
          onSelectFile={selectFile}
          onSelectDirectory={selectDirectory}
        />
      ) : (
        <div style={statusStyle}>
          {isBusy ? <Spinner /> : null}
          <span style={{ ...typescale('body-small'), color: theme.mutedText }}>
            {isBusy ? 'Scanning…' : (error ?? 'No folder selected yet.')}
          </span>
          {cancelScan ? (
            <>
              <M3eButton id={cancelId} variant="outlined" onClick={cancelScan}>
                Cancel
              </M3eButton>
              <Tooltip
                controlId={cancelId}
                text="Stops reading this folder and asks for another"
              />
            </>
          ) : null}
        </div>
      )}

      {root && !error ? (
        <div style={{ padding: '6px 10px', borderTop: hairline }}>
          <span style={{ ...typescale('label-small'), color: theme.mutedText }}>
            {fileCount} markdown {fileCount === 1 ? 'file' : 'files'}
          </span>
        </div>
      ) : null}
    </aside>
  );
}

/** The selected file's folder, or the open folder when none is selected in it. */
function folderOfSelection(
  rootPath: string,
  selectedPath: string | null,
): string {
  if (selectedPath === null || !selectedPath.startsWith(`${rootPath}/`)) {
    return rootPath;
  }
  return selectedPath.slice(0, selectedPath.lastIndexOf('/'));
}

const styles = {
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  grow: {
    flex: 1,
  },
} satisfies Record<string, CSSProperties>;

const statusStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: 16,
  textAlign: 'center',
};
