import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/index.css';

import LegacyApp from './app/legacy/LegacyApp.jsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LegacyApp />
  </StrictMode>
);
