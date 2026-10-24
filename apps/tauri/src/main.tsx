import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@md-viewer/viewer/styles.css';
import { Viewer } from '@md-viewer/viewer/Viewer';

import { createTauriPlatform } from './tauriPlatform';

const platform = createTauriPlatform();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Viewer platform={platform} />
  </StrictMode>,
);
