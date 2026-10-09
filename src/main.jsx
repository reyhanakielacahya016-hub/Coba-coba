import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/700.css';
import '@fontsource/bricolage-grotesque/800.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import './styles/tokens.css';
import './styles/base.css';

import App from './App.jsx';
import { AppProvider } from './state/AppProvider.jsx';
import { ToastProvider } from './hooks/useToast.jsx';
import { ConfirmProvider } from './hooks/useConfirm.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <ToastProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ToastProvider>
    </AppProvider>
  </StrictMode>,
);
