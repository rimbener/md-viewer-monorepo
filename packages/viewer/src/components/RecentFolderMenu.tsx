import { useEffect, useState } from 'react';

import { recentFolderLabel, type RecentFolder } from '../recentFolders';
import { useTheme } from '../theme';
import { oneLine } from './text';

type RecentFolderMenuProps = {
  folders: readonly RecentFolder[];
  currentPath: string | null;
  disabled: boolean;
  onSelect: (folder: RecentFolder) => void;
};

/** The last folders opened, so one of them can be opened again. */
export function RecentFolderMenu({
  folders,
  currentPath,
  disabled,
  onSelect,
}: RecentFolderMenuProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  if (folders.length === 0) {
    return null;
  }

  const label =
    currentPath === null
      ? 'Recent folders'
      : recentFolderLabel(currentPath, folders);

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        type="button"
        className="pressable"
        aria-label="Recent folders"
        title="Shows the last folders you opened"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen(open => !open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '6px 10px',
          border: `1px solid ${theme.border}`,
          borderRadius: 6,
          backgroundColor: theme.background,
          opacity: disabled ? 0.5 : 1,
          textAlign: 'left',
        }}
      >
        <span style={{ ...oneLine, flex: 1, fontSize: 13, color: theme.text }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: theme.mutedText }}>▾</span>
      </button>
      {isOpen ? (
        <div
          role="menu"
          style={{
            marginTop: 4,
            border: `1px solid ${theme.border}`,
            borderRadius: 6,
            overflow: 'hidden',
            backgroundColor: theme.background,
          }}
        >
          {folders.map(folder => {
            const isCurrent = folder.path === currentPath;
            return (
              <button
                key={folder.path}
                type="button"
                role="menuitem"
                className="pressable"
                aria-label={folder.path}
                disabled={disabled}
                onClick={() => {
                  setIsOpen(false);
                  onSelect(folder);
                }}
                style={{
                  ...oneLine,
                  display: 'block',
                  width: '100%',
                  padding: '6px 10px',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: 13,
                  backgroundColor: isCurrent
                    ? theme.selectedBackground
                    : 'transparent',
                  color: isCurrent ? theme.selectedText : theme.text,
                }}
              >
                {recentFolderLabel(folder.path, folders)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
