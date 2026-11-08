/**
 * Markdown viewer: a folder tree of `.md` files on the left, the selected
 * document on the right. The platform it runs on comes in as a prop.
 */

import '@m3e/icons/outlined/search';
import '@m3e/icons/outlined/toolbar';

import { useState, type CSSProperties } from 'react';

import { ThemeRoot } from './components/ThemeRoot';
import { DocumentPanel } from './components/DocumentPanel';
import { IconButton } from './components/IconButton';
import { NewFileDialog } from './components/NewFileDialog';
import { M3eDrawerContainer } from './m3e';
import { Sidebar } from './components/Sidebar';
import {
  SIDEBAR_WIDTH_PROPERTY,
  SidebarResizer,
} from './components/SidebarResizer';
import { TopAppBar } from './components/TopAppBar';
import { PlatformProvider, usePlatform, type Platform } from './platform';
import { useTheme } from './theme';
import { useDrawer } from './useDrawer';
import { useFolderSession } from './useFolderSession';
import { useToolVisibility } from './useToolVisibility';

function Session() {
  const theme = useTheme();
  const platform = usePlatform();
  const drawer = useDrawer();
  const session = useFolderSession(drawer.closeModal);
  const tools = useToolVisibility();
  const [newFileFolder, setNewFileFolder] = useState<string | null>(null);

  return (
    <div
      style={
        {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          // An app drawn under system bars sets these; elsewhere they are 0.
          padding:
            'var(--safe-area-top, 0px) var(--safe-area-right, 0px) var(--safe-area-bottom, 0px) var(--safe-area-left, 0px)',
          backgroundColor: theme.background,
          color: theme.text,
        } as CSSProperties
      }
    >
      <TopAppBar
        isSidebarVisible={drawer.isSidebarVisible}
        onToggleSidebar={drawer.toggleSidebar}
        actions={
          <>
            <IconButton
              icon="search"
              label="Find and replace"
              tooltip="Shows or hides the Find and Replace fields"
              selected={tools.isFindVisible}
              onClick={tools.toggleFind}
            />
            <IconButton
              icon="toolbar"
              label="Toolbar"
              tooltip="Shows or hides the tools above the document"
              selected={tools.isToolbarVisible}
              onClick={tools.toggleToolbar}
            />
          </>
        }
      >
        <M3eDrawerContainer
          {...drawer.containerProps}
          startMode="auto"
          startDivider
          style={
            {
              ...styles.drawer,
              [SIDEBAR_WIDTH_PROPERTY]: `${drawer.sidebarWidth}px`,
            } as CSSProperties
          }
        >
          <Sidebar
            slot="start"
            session={session}
            onAddFile={platform.createFile ? setNewFileFolder : null}
            resizer={
              <SidebarResizer
                width={drawer.sidebarWidth}
                drawerRef={drawer.drawerRef}
                onCommit={drawer.chooseSidebarWidth}
              />
            }
          />
          <DocumentPanel
            file={session.selectedFile}
            isSidebarVisible={drawer.isSidebarVisible}
            canGoBack={session.canGoBack}
            canGoNext={session.canGoNext}
            onBack={session.goBack}
            onNext={session.goNext}
            onOpenFile={session.openLinkedFile}
            isToolbarVisible={tools.isToolbarVisible}
            isFindVisible={tools.isFindVisible}
            onShowFind={tools.showFind}
          />
        </M3eDrawerContainer>
      </TopAppBar>
      {newFileFolder !== null ? (
        <NewFileDialog
          folderPath={newFileFolder}
          onCreate={name =>
            session
              .createFile(newFileFolder, name)
              .then(() => setNewFileFolder(null))
          }
          onCancel={() => setNewFileFolder(null)}
        />
      ) : null}
    </div>
  );
}

type ViewerProps = {
  platform: Platform;
};

export function Viewer({ platform }: ViewerProps) {
  return (
    <PlatformProvider value={platform}>
      <ThemeRoot>
        <Session />
      </ThemeRoot>
    </PlatformProvider>
  );
}

const styles = {
  drawer: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  } as CSSProperties,
};
