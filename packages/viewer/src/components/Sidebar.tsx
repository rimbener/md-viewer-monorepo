import type { CSSProperties } from 'react';

import { usePlatform } from '../platform';
import type { RecentFolder } from '../recentFolders';
import { useTheme, type Theme } from '../theme';
import type { DirectoryNode, FileNode } from '../types';
import { FileTree } from './FileTree';
import { OpenUrlForm } from './OpenUrlForm';
import { RecentFolderMenu } from './RecentFolderMenu';
import { Spinner } from './Spinner';
import { oneLine } from './text';

interface SidebarProps {
  root: DirectoryNode | null;
  currentFolderPath: string | null;
  recentFolders: readonly RecentFolder[];
  selectedPath: string | null;
  isScanning: boolean;
  error: string | null;
  fileCount: number;
  onChooseFolder: () => void;
  onSelectRecentFolder: (folder: RecentFolder) => void;
  onRemoveRecentFolder: (folder: RecentFolder) => void;
  onReloadFolder: () => void;
  onSelectFile: (file: FileNode) => void;
  onSelectDirectory: (directory: DirectoryNode) => void;
}

export function Sidebar({
  root,
  currentFolderPath,
  recentFolders,
  selectedPath,
  isScanning,
  error,
  fileCount,
  onChooseFolder,
  onSelectRecentFolder,
  onRemoveRecentFolder,
  onReloadFolder,
  onSelectFile,
  onSelectDirectory,
}: SidebarProps) {
  const theme = useTheme();
  const platform = usePlatform();
  const hairline = `1px solid ${theme.border}`;

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 280,
        flexShrink: 0,
        backgroundColor: theme.sidebar,
        borderRight: hairline,
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
              currentPath={currentFolderPath}
              disabled={isScanning}
              onSelect={onSelectRecentFolder}
              onRemove={onRemoveRecentFolder}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="pressable"
                onClick={onChooseFolder}
                disabled={isScanning}
                style={actionStyle(theme, isScanning)}
              >
                {root ? 'Change Folder…' : 'Choose Folder…'}
              </button>
              {root && currentFolderPath !== null ? (
                <button
                  type="button"
                  className="pressable"
                  aria-label="Reload folder"
                  title="Reads the folder again so new markdown files are shown"
                  onClick={onReloadFolder}
                  disabled={isScanning}
                  style={actionStyle(theme, isScanning)}
                >
                  Reload
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: theme.mutedText }}>
            This browser cannot open folders. Use Chrome or Edge to read a
            folder of markdown files.
          </p>
        )}
        {platform.openUrl ? <OpenUrlForm onOpen={platform.openUrl} /> : null}

        {root ? (
          <span
            title={root.path}
            style={{ ...oneLine, fontSize: 11, color: theme.mutedText }}
          >
            {root.path}
          </span>
        ) : null}
        {error && root ? (
          <span style={{ fontSize: 11, color: theme.mutedText }}>{error}</span>
        ) : null}
      </div>

      {root ? (
        <FileTree
          // Remounting per folder resets the expansion state with it.
          key={root.path}
          root={root}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          onSelectDirectory={onSelectDirectory}
        />
      ) : (
        <div style={statusStyle}>
          {isScanning ? <Spinner /> : null}
          <span style={{ fontSize: 12, color: theme.mutedText }}>
            {isScanning ? 'Scanning…' : (error ?? 'No folder selected yet.')}
          </span>
        </div>
      )}

      {root && !error ? (
        <div style={{ padding: '6px 10px', borderTop: hairline }}>
          <span style={{ fontSize: 11, color: theme.mutedText }}>
            {fileCount} markdown {fileCount === 1 ? 'file' : 'files'}
          </span>
        </div>
      ) : null}
    </aside>
  );
}

function actionStyle(theme: Theme, isScanning: boolean): CSSProperties {
  return {
    flex: 1,
    padding: '6px 10px',
    border: `1px solid ${theme.border}`,
    borderRadius: 6,
    backgroundColor: theme.background,
    color: theme.accent,
    fontSize: 13,
    fontWeight: 600,
    opacity: isScanning ? 0.5 : 1,
  };
}

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
