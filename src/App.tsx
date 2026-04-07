import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import AppLayout from './components/Layout/AppLayout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import VisitorsPage from './pages/Visitors'
import VisitorProfilePage from './pages/VisitorProfile'
import MembershipClassPage from './pages/MembershipClass'
import CellGroupsPage from './pages/CellGroups'
import DepartmentsPage from './pages/Departments'
import TasksPage from './pages/Tasks'
import AdminSettingsPage from './pages/AdminSettings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gold-400 font-medium">Loading...</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="visitors" element={<VisitorsPage />} />
        <Route path="visitors/:id" element={<VisitorProfilePage />} />
        <Route path="membership" element={<MembershipClassPage />} />
        <Route path="cell-groups" element={<CellGroupsPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="admin" element={<AdminSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1B2A4A',
              color: '#fff',
              border: '1px solid #C9A227',
            },
            success: { iconTheme: { primary: '#C9A227', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
