import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import '@fontsource/space-grotesk/latin.css';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { initializeFirebaseAppCheck } from './lib/firebase/firebase';

initializeFirebaseAppCheck();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
