import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { runMigrations } from './data/migrate';
import './App.css';

// Bring saved data up to the current shape before anything reads it.
runMigrations();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
