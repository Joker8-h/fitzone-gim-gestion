import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { DataProvider } from './state/DataProvider';
import './styles/fitzone.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* D4: el provider envuelve a App porque App consume el contexto */}
    <DataProvider>
      <App />
    </DataProvider>
  </React.StrictMode>
);
