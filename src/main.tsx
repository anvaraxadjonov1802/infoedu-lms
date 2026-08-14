import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Apply the persisted theme before React paints the first frame.
// This prevents a light flash when a user has dark mode enabled.
const storedTheme = localStorage.getItem('infoedu_theme');
const initialTheme = storedTheme === 'dark' ? 'dark' : 'light';
document.documentElement.classList.toggle('dark', initialTheme === 'dark');
document.documentElement.dataset.theme = initialTheme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
