import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@md-viewer/viewer/styles.css';
import { Viewer } from '@md-viewer/viewer/Viewer';

import { createAndroidPlatform } from './androidPlatform';
import { applySafeArea } from './safeArea';
import { createSaf } from './saf';
import { createTauriPlatform } from './tauriPlatform';

const isAndroid = /Android/i.test(navigator.userAgent);

if (isAndroid) {
  applySafeArea();
}

const platform = isAndroid
  ? createAndroidPlatform(createSaf())
  : createTauriPlatform();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Viewer platform={platform} />
  </StrictMode>,
);
