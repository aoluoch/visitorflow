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
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPassword'

// User Portal Pages
import UserDashboard from './pages/user/UserDashboard'
import ExplorePage from './pages/user/ExplorePage'
import ApplicationsPage from './pages/user/ApplicationsPage'
import UserMembershipsPage from './pages/user/UserMembershipsPage'
import NotificationsPage from './pages/user/NotificationsPage'
import UserProfilePage from './pages/user/UserProfilePage'

// Admin Management Pages
import UsersManagement from './pages/admin/UsersManagement'
import AllApplications from './pages/admin/AllApplications'
import GroupAdminAssignments from './pages/admin/GroupAdminAssignments'

// Group Admin Portal Pages
import GroupAdminDashboard from './pages/group-admin/GroupAdminDashboard'
import GroupApplicationsPage from './pages/group-admin/GroupApplicationsPage'
import GroupMembersPage from './pages/group-admin/GroupMembersPage'
import GroupNotificationsPage from './pages/group-admin/GroupNotificationsPage'

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

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin } = useAuth()
  if (loading) return null
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function UserRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()
  if (loading) return null
  // Any authenticated user can access the user portal; auth is enforced by the outer ProtectedRoute
  return <>{children}</>
}

function GroupAdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin, isGroupAdmin } = useAuth()
  if (loading) return null
  if (!isAdmin && !isGroupAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function RoleRouter() {
  const { user, loading, isAdmin, isGroupAdmin, isUser } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  if (isGroupAdmin) return <Navigate to="/group-admin" replace />
  if (isUser) return <Navigate to="/user" replace />
  // Fallback - create profile if missing
  return <Navigate to="/user/profile" replace />
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
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />

      {/* Role-aware landing */}
      <Route path="/" element={<RoleRouter />} />

      {/* Admin portal */}
      <Route path="/admin" element={<ProtectedRoute><AdminRoute><AppLayout /></AdminRoute></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="visitors" element={<VisitorsPage />} />
        <Route path="visitors/:id" element={<VisitorProfilePage />} />
        <Route path="membership" element={<MembershipClassPage />} />
        <Route path="cell-groups" element={<CellGroupsPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="users" element={<UsersManagement />} />
        <Route path="applications" element={<AllApplications />} />
        <Route path="applications/:id" element={<AllApplications />} />
        <Route path="group-admins" element={<GroupAdminAssignments />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* User Portal */}
      <Route path="/user" element={<ProtectedRoute><UserRoute><AppLayout /></UserRoute></ProtectedRoute>}>
        <Route index element={<UserDashboard />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationsPage />} />
        <Route path="memberships" element={<UserMembershipsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<UserProfilePage />} />
      </Route>

      {/* Group Admin Portal */}
      <Route path="/group-admin" element={<ProtectedRoute><GroupAdminRoute><AppLayout /></GroupAdminRoute></ProtectedRoute>}>
        <Route index element={<GroupAdminDashboard />} />
        <Route path="applications" element={<GroupApplicationsPage />} />
        <Route path="applications/:id" element={<GroupApplicationsPage />} />
        <Route path="members" element={<GroupMembersPage />} />
        <Route path="notifications" element={<GroupNotificationsPage />} />
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
