import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ViewProvider } from './context/ViewContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ViewProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </ViewProvider>
  </StrictMode>,
)
