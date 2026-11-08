import '@m3e/icons/outlined/arrow_drop_down';

import { useState } from 'react';

import {
  M3eButton,
  M3eDivider,
  M3eIcon,
  M3eMenu,
  M3eMenuItem,
  M3eMenuItemRadio,
  M3eMenuTrigger,
} from '../m3e';
import { recentFolderLabel, type RecentFolder } from '../recentFolders';
import { oneLine } from './text';
import { Tooltip, useControlId } from './Tooltip';

type RecentFolderMenuProps = {
  folders: readonly RecentFolder[];
  currentPath: string | null;
  disabled: boolean;
  onSelect: (folder: RecentFolder) => void;
  onRemove: (folder: RecentFolder) => void;
};

/** The last folders opened, so one of them can be opened again. */
export function RecentFolderMenu({
  folders,
  currentPath,
  disabled,
  onSelect,
  onRemove,
}: RecentFolderMenuProps) {
  const buttonId = useControlId();
  const menuId = useControlId();
  const removeMenuId = useControlId();
  // A radio item checks itself on click; a new menu takes `checked` from React
  // again when the folder could not be opened.
  const [picks, setPicks] = useState(0);

  if (folders.length === 0) {
    return null;
  }

  const label =
    currentPath === null
      ? 'Recent folders'
      : recentFolderLabel(currentPath, folders);

  return (
    <div style={{ marginBottom: 8 }}>
      <M3eButton
        id={buttonId}
        variant="outlined"
        aria-label="Recent folders"
        disabled={disabled}
        style={{ width: '100%' }}
      >
        {/* m3e finds the menu only when `for` changes, so a new menu needs a new trigger. */}
        <M3eMenuTrigger key={picks} htmlFor={menuId}>
          <span style={oneLine}>{label}</span>
        </M3eMenuTrigger>
        <M3eIcon slot="trailing-icon" name="arrow_drop_down" />
      </M3eButton>
      <Tooltip controlId={buttonId} text="Shows the last folders you opened" />
      <M3eMenu key={picks} id={menuId}>
        {folders.map(folder => (
          <M3eMenuItemRadio
            key={folder.path}
            aria-label={folder.path}
            checked={folder.path === currentPath}
            onClick={() => {
              setPicks(count => count + 1);
              onSelect(folder);
            }}
          >
            {recentFolderLabel(folder.path, folders)}
          </M3eMenuItemRadio>
        ))}
        <M3eDivider />
        <M3eMenuItem>
          <M3eMenuTrigger htmlFor={removeMenuId}>
            Remove from Recent Folders
          </M3eMenuTrigger>
        </M3eMenuItem>
      </M3eMenu>
      <M3eMenu id={removeMenuId}>
        {folders.map(folder => (
          <M3eMenuItem
            key={folder.path}
            aria-label={`Remove ${folder.path}`}
            onClick={() => onRemove(folder)}
          >
            {recentFolderLabel(folder.path, folders)}
          </M3eMenuItem>
        ))}
      </M3eMenu>
    </div>
  );
}
