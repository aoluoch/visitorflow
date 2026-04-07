import { useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { MobileMenuButton } from './Sidebar'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/visitors': 'Visitors',
  '/membership': 'Membership Class',
  '/cell-groups': 'Cell Groups',
  '/departments': 'Departments',
  '/tasks': 'Tasks & Follow-Up',
  '/admin': 'Admin & Settings',
}

interface HeaderProps {
  onMobileMenuOpen: () => void
}

export default function Header({ onMobileMenuOpen }: HeaderProps) {
  const location = useLocation()
  const pathBase = '/' + location.pathname.split('/')[1]
  const title = PAGE_TITLES[pathBase] ?? 'VisitorFlow'

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <MobileMenuButton onClick={onMobileMenuOpen} />
          <h1 className="text-lg font-bold text-navy-800">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors relative">
            <Bell size={20} />
          </button>
          <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center">
            <span className="text-gold-400 text-xs font-bold">A</span>
          </div>
        </div>
      </div>
    </header>
  )
}
