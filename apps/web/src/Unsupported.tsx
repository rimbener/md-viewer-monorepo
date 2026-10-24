import { OpenUrlForm } from '@md-viewer/viewer/OpenUrlForm';
import { useTheme } from '@md-viewer/viewer/theme';

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
      <div
        style={{
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20 }}>Browser not compatible</h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: '21px' }}>
          MD Viewer reads a folder of markdown files through the File System
          Access API. Only Chromium browsers, such as Chrome and Edge, have it.
          Open this page in one of them to read a folder.
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: '19px',
            color: theme.mutedText,
          }}
        >
          You can still read one document by its URL:
        </p>
        <OpenUrlForm onOpen={onOpenUrl} />
      </div>
    </main>
  );
}
