import { useLocation } from 'react-router-dom'
import { MobileMenuButton } from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../Notifications/NotificationBell'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/admin': 'Admin Dashboard',
  '/user': 'My Dashboard',
  '/group-admin': 'Group Admin',
  '/visitors': 'Visitors',
  '/membership': 'Membership Class',
  '/cell-groups': 'Cell Groups',
  '/departments': 'Departments',
  '/tasks': 'Tasks & Follow-Up',
}

interface HeaderProps {
  onMobileMenuOpen: () => void
}

export default function Header({ onMobileMenuOpen }: HeaderProps) {
  const location = useLocation()
  const { adminProfile, userProfile } = useAuth()
  const pathBase = '/' + location.pathname.split('/').filter(Boolean).slice(0, 1).join('/')
  const title = PAGE_TITLES[pathBase] ?? 'VisitorFlow'
  const displayName = adminProfile?.full_name || userProfile?.full_name || 'User'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <MobileMenuButton onClick={onMobileMenuOpen} />
          <h1 className="text-lg font-bold text-navy-800">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center">
            <span className="text-gold-400 text-xs font-bold">{initial}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
