import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { GroupProvider } from './context/GroupContext.tsx';
import { AppProvider } from './context/AppContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <GroupProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </GroupProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
