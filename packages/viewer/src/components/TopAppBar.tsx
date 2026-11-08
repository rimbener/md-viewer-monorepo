import '@m3e/icons/outlined/menu';

import {
  createContext,
  useContext,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { M3eAppBar } from '../m3e';
import { ColorSchemeControl } from './ColorSchemeControl';
import { IconButton } from './IconButton';

const TitleHostContext = createContext<HTMLElement | null>(null);

type TopAppBarProps = {
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
  children: ReactNode;
};

/** The top app bar over the whole window, then the content under it. */
export function TopAppBar({
  isSidebarVisible,
  onToggleSidebar,
  children,
}: TopAppBarProps) {
  const [title, setTitle] = useState<HTMLElement | null>(null);

  return (
    <>
      <M3eAppBar size="small" style={styles.bar}>
        <span slot="leading">
          <IconButton
            icon="menu"
            label={isSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
            tooltip="Shows or hides the list of markdown files (⌘B, Ctrl+B)"
            expanded={isSidebarVisible}
            onClick={onToggleSidebar}
          />
        </span>
        <div slot="title" ref={setTitle} style={styles.title} />
        <span slot="trailing">
          <ColorSchemeControl />
        </span>
      </M3eAppBar>
      <TitleHostContext.Provider value={title}>
        {children}
      </TitleHostContext.Provider>
    </>
  );
}

/** Puts the open document's name in the top app bar. */
export function AppBarTitle({ children }: { children: ReactNode }) {
  const host = useContext(TitleHostContext);
  return host === null ? null : createPortal(children, host);
}

const styles = {
  bar: {
    flexShrink: 0,
  },
  title: {
    display: 'flex',
    minWidth: 0,
    gap: 4,
  },
} satisfies Record<string, CSSProperties>;
