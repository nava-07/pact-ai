import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { StoreProvider } from './store';
import { ErrorBoundary } from './components/ui';
import './index.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><StoreProvider><ErrorBoundary><App /></ErrorBoundary></StoreProvider></BrowserRouter></React.StrictMode>);
