import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import '@fontsource/space-grotesk/latin.css';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { initializeFirebaseAppCheck } from './lib/firebase/firebase';

function scheduleAppCheckBootstrap(): void {
  if (typeof window === 'undefined') return;
  const run = () => {
    initializeFirebaseAppCheck();
  };
  const idleCallback = (
    window as Window & { requestIdleCallback?: (callback: IdleRequestCallback) => number }
  ).requestIdleCallback;
  if (typeof idleCallback === 'function') {
    idleCallback(() => run());
    return;
  }
  globalThis.setTimeout(run, 0);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

scheduleAppCheckBootstrap();
