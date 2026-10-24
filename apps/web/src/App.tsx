import { useEffect, useMemo, useState } from 'react';

import { Viewer } from '@md-viewer/viewer/Viewer';

import { Unsupported } from './Unsupported';
import {
  canOpenFolders,
  createWebPlatform,
  openSource,
  sourceFromLocation,
} from './webPlatform';

export function App() {
  const platform = useMemo(createWebPlatform, []);
  const [hasSource, setHasSource] = useState(
    () => sourceFromLocation() !== null,
  );

  useEffect(() => {
    const update = () => setHasSource(sourceFromLocation() !== null);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  if (!canOpenFolders() && !hasSource) {
    return (
      <Unsupported
        onOpenUrl={url => {
          openSource(url);
          setHasSource(true);
        }}
      />
    );
  }
  return <Viewer platform={platform} />;
}
