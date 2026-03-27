import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import { SafetyProvider } from './contexts/SafetyContext'
import './styles.css'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <SafetyProvider>
        <App />
      </SafetyProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
)
