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
import { SidebarToggle } from './SidebarToggle';

type Hosts = {
  title: HTMLElement | null;
  actions: HTMLElement | null;
};

const HostsContext = createContext<Hosts>({ title: null, actions: null });

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
  const [actions, setActions] = useState<HTMLElement | null>(null);

  return (
    <>
      <M3eAppBar size="small" style={styles.bar}>
        <span slot="leading">
          <SidebarToggle
            isVisible={isSidebarVisible}
            onToggle={onToggleSidebar}
          />
        </span>
        <div slot="title" ref={setTitle} style={styles.title} />
        <span slot="trailing" style={styles.trailing}>
          <span ref={setActions} style={styles.trailing} />
          <ColorSchemeControl />
        </span>
      </M3eAppBar>
      <HostsContext.Provider value={{ title, actions }}>
        {children}
      </HostsContext.Provider>
    </>
  );
}

/** Puts the open document's name in the top app bar. */
export function AppBarTitle({ children }: { children: ReactNode }) {
  const host = useContext(HostsContext).title;
  return host === null ? null : createPortal(children, host);
}

/** Puts the open document's actions (Find) at the end of the top app bar. */
export function AppBarActions({ children }: { children: ReactNode }) {
  const host = useContext(HostsContext).actions;
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
  trailing: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
} satisfies Record<string, CSSProperties>;
