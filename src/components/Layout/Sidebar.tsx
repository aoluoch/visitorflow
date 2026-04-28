import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, BookOpen, Users2, Building2, ClipboardList,
  Settings, LogOut, ChevronLeft, ChevronRight, Menu, X,
  Search, FileText, Bell, UserCircle, Compass, Shield,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import NotificationBell from '../Notifications/NotificationBell'

// Admin navigation items
const ADMIN_NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/visitors', icon: Users, label: 'Visitors' },
  { to: '/admin/membership', icon: BookOpen, label: 'Membership' },
  { to: '/admin/cell-groups', icon: Users2, label: 'Cell Groups' },
  { to: '/admin/departments', icon: Building2, label: 'Departments' },
  { to: '/admin/tasks', icon: ClipboardList, label: 'Tasks' },
  { to: '/admin/users', icon: UserCircle, label: 'Users' },
  { to: '/admin/applications', icon: FileText, label: 'Applications' },
  { to: '/admin/group-admins', icon: Shield, label: 'Group Admins' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

// User navigation items
const USER_NAV = [
  { to: '/user', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/user/explore', icon: Compass, label: 'Explore' },
  { to: '/user/applications', icon: FileText, label: 'Applications' },
  { to: '/user/memberships', icon: Users, label: 'Memberships' },
  { to: '/user/notifications', icon: Bell, label: 'Notifications' },
  { to: '/user/profile', icon: UserCircle, label: 'Profile' },
]

// Group Admin navigation items
const GROUP_ADMIN_NAV = [
  { to: '/group-admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/group-admin/applications', icon: FileText, label: 'Applications' },
  { to: '/group-admin/members', icon: Users, label: 'Members' },
  { to: '/group-admin/notifications', icon: Bell, label: 'Notifications' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

function getNavItems(pathname: string, isAdmin: boolean, isGroupAdmin: boolean) {
  if (pathname.startsWith('/admin')) return ADMIN_NAV
  if (pathname.startsWith('/group-admin')) return GROUP_ADMIN_NAV
  if (pathname.startsWith('/user')) return USER_NAV
  // Default based on role
  if (isAdmin) return ADMIN_NAV
  if (isGroupAdmin) return GROUP_ADMIN_NAV
  return USER_NAV
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { signOut, adminProfile, userProfile, isAdmin, isGroupAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const NAV_ITEMS = getNavItems(location.pathname, isAdmin, isGroupAdmin)

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  const sidebarContent = (
    <div className={`flex flex-col h-full bg-navy-900 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-navy-700">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <img src="/gamlogo.png" alt="GAM Logo" className="w-10 h-10 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-gold-400 font-bold text-xs leading-tight truncate">Grace Arena</p>
              <p className="text-gold-500 font-bold text-xs leading-tight truncate">Ministries</p>
            </div>
          </div>
        )}
        {collapsed && (
          <img src="/gamlogo.png" alt="GAM Logo" className="w-8 h-8 object-contain mx-auto" />
        )}
        <button
          onClick={onToggle}
          className="hidden lg:flex items-center justify-center w-6 h-6 text-navy-300 hover:text-gold-400 transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 mx-2 mb-1 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-gold-500 text-navy-900'
                  : 'text-navy-200 hover:bg-navy-700 hover:text-white'
              }`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
            {collapsed && (
              <span className="absolute left-16 bg-navy-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-navy-700">
        {!collapsed && (adminProfile || userProfile) && (
          <div className="px-2 py-2 mb-2">
            <p className="text-white text-xs font-semibold truncate">
              {adminProfile?.full_name || userProfile?.full_name}
            </p>
            <span className="inline-block bg-gold-500 text-navy-900 text-xs px-1.5 py-0.5 rounded font-medium capitalize mt-0.5">
              {adminProfile ? adminProfile.role.replace('_', ' ') : isGroupAdmin ? 'Group Admin' : 'Member'}
            </span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm font-medium text-navy-300 hover:bg-red-900/30 hover:text-red-400 transition-all"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={onMobileClose} />
          <aside className="relative z-50 flex flex-col h-full">
            <div className="absolute top-3 right-3">
              <button onClick={onMobileClose} className="text-white hover:text-gold-400">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col h-full bg-navy-900 w-64">
              <div className="flex items-center gap-2 px-4 py-4 border-b border-navy-700">
                <img src="/gamlogo.png" alt="GAM Logo" className="w-10 h-10 object-contain" />
                <div>
                  <p className="text-gold-400 font-bold text-xs leading-tight">Grace Arena</p>
                  <p className="text-gold-500 font-bold text-xs leading-tight">Ministries</p>
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
                {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    onClick={onMobileClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 mx-2 mb-1 rounded-lg text-sm font-medium transition-all ${
                        isActive ? 'bg-gold-500 text-navy-900' : 'text-navy-200 hover:bg-navy-700 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="p-3 border-t border-navy-700">
                {(adminProfile || userProfile) && (
                  <div className="px-2 py-2 mb-2">
                    <p className="text-white text-xs font-semibold truncate">{adminProfile?.full_name || userProfile?.full_name}</p>
                    <span className="inline-block bg-gold-500 text-navy-900 text-xs px-1.5 py-0.5 rounded font-medium capitalize mt-0.5">
                      {adminProfile ? adminProfile.role.replace('_', ' ') : isGroupAdmin ? 'Group Admin' : 'Member'}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm font-medium text-navy-300 hover:bg-red-900/30 hover:text-red-400 transition-all"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-lg text-navy-700 hover:bg-navy-100 transition-colors"
    >
      <Menu size={22} />
    </button>
  )
}
