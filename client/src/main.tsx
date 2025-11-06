import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './lib/debug'

// Check authentication before rendering the app
if (localStorage.getItem('isAuthenticated') !== 'true' && window.location.pathname === '/') {
  window.location.href = '/auth';
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}