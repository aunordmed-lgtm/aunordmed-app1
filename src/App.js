import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import { Login } from './pages/Login'
import { AppLayout } from './pages/AppLayout'
import './index.css'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="loading-full">
      <div className="spinner spinner-lg" />
      <span>Carregando...</span>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/comprovante" element={<ComprovantePage />} />
            <Route path="/*" element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            } />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Lazy import para comprovante público
function ComprovantePage() {
  const { Comprovante } = require('./pages/Comprovante')
  return <Comprovante />
}
