import { M3eCard } from '@md-viewer/viewer/m3e';
import { OpenUrlForm } from '@md-viewer/viewer/OpenUrlForm';
import { useTheme } from '@md-viewer/viewer/theme';
import { typescale } from '@md-viewer/viewer/typescale';

type UnsupportedProps = {
  onOpenUrl: (url: string) => void;
};

/** Shown where the browser cannot open a folder: anything but Chromium. */
export function Unsupported({ onOpenUrl }: UnsupportedProps) {
  const theme = useTheme();

  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        padding: 16,
        backgroundColor: theme.background,
        color: theme.text,
      }}
    >
      <M3eCard variant="outlined" style={{ maxWidth: 480 }}>
        <h1 slot="header" style={{ margin: 0, ...typescale('title-large') }}>
          Browser not compatible
        </h1>
        <div
          slot="content"
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <p style={{ margin: 0, ...typescale('body-medium') }}>
            MD Viewer reads a folder of markdown files through the File System
            Access API. Only Chromium browsers, such as Chrome and Edge, have
            it. Open this page in one of them to read a folder.
          </p>
          <p
            style={{
              margin: 0,
              ...typescale('body-small'),
              color: theme.mutedText,
            }}
          >
            You can still read one document by its URL:
          </p>
          <OpenUrlForm onOpen={onOpenUrl} />
        </div>
      </M3eCard>
    </main>
  );
}
