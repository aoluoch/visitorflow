import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, Building2, Users2, BookOpen, ClipboardList, Bell, 
  Clock, CheckCircle, Hourglass, XCircle, TrendingUp 
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import type { 
  UserDashboardStats, Application, UserMembership, Notification 
} from '../../types'
import toast from 'react-hot-toast'

export default function UserDashboard() {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState<UserDashboardStats>({
    pending_applications: 0,
    approved_memberships: 0,
    active_memberships: 0,
    completed_memberships: 0,
    unread_notifications: 0,
  })
  const [recentApplications, setRecentApplications] = useState<Application[]>([])
  const [activeMemberships, setActiveMemberships] = useState<UserMembership[]>([])
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      if (!userProfile) return
      
      try {
        // Fetch stats
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_user_dashboard_stats', { p_user_id: userProfile.id })
        
        if (statsError) throw statsError
        if (statsData && statsData.length > 0) {
          setStats(statsData[0])
        }

        // Fetch recent applications
        const { data: applications, error: appError } = await supabase
          .from('applications')
          .select('*')
          .eq('applicant_id', userProfile.id)
          .order('created_at', { ascending: false })
          .limit(5)
        
        if (appError) throw appError
        setRecentApplications(applications || [])

        // Fetch active memberships
        const { data: memberships, error: memError } = await supabase
          .from('user_memberships')
          .select('*')
          .eq('user_id', userProfile.id)
          .eq('is_active', true)
          .order('joined_at', { ascending: false })
          .limit(5)
        
        if (memError) throw memError
        setActiveMemberships(memberships || [])

        // Fetch recent notifications
        const { data: notifications, error: notifError } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', userProfile.id)
          .order('created_at', { ascending: false })
          .limit(5)
        
        if (notifError) throw notifError
        setRecentNotifications(notifications || [])
      } catch (err) {
        console.error('Dashboard load error:', err)
        toast.error('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [userProfile])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Hourglass size={16} className="text-amber-500" />
      case 'under_review': return <Clock size={16} className="text-blue-500" />
      case 'approved': return <CheckCircle size={16} className="text-emerald-500" />
      case 'rejected': return <XCircle size={16} className="text-red-500" />
      case 'active': return <CheckCircle size={16} className="text-emerald-500" />
      default: return <Clock size={16} className="text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700'
      case 'under_review': return 'bg-blue-100 text-blue-700'
      case 'approved': return 'bg-emerald-100 text-emerald-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      case 'active': return 'bg-emerald-100 text-emerald-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'department': return Building2
      case 'cell_group': return Users2
      case 'membership_class': return BookOpen
      case 'volunteer_opportunity': return ClipboardList
      default: return Users
    }
  }

  const statCards = [
    { 
      label: 'Pending Applications', 
      value: stats.pending_applications, 
      icon: Hourglass, 
      color: 'bg-amber-500',
      to: '/user/applications'
    },
    { 
      label: 'Active Memberships', 
      value: stats.active_memberships, 
      icon: CheckCircle, 
      color: 'bg-emerald-500',
      to: '/user/memberships'
    },
    { 
      label: 'Notifications', 
      value: stats.unread_notifications, 
      icon: Bell, 
      color: 'bg-blue-500',
      to: '/user/notifications'
    },
    { 
      label: 'Explore', 
      value: 'New', 
      icon: TrendingUp, 
      color: 'bg-purple-500',
      to: '/user/explore'
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Welcome, {userProfile?.full_name || 'User'}!</h2>
            <p className="text-navy-300 text-sm mt-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 px-4 py-2 rounded-xl">
            <TrendingUp size={18} className="text-gold-400" />
            <span className="text-gold-300 text-sm font-medium">
              {stats.active_memberships} active memberships
            </span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, to }) => (
          <Link
            key={label}
            to={to}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-gold-200 transition-all group"
          >
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={20} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-navy-800 group-hover:text-navy-700">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
          </Link>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-navy-800">Recent Applications</h3>
            <Link to="/user/applications" className="text-xs text-gold-600 hover:text-gold-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentApplications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm mb-2">No applications yet</p>
                <Link to="/user/explore" className="text-sm text-gold-600 hover:text-gold-700">
                  Explore opportunities →
                </Link>
              </div>
            ) : (
              recentApplications.map(app => (
                <Link
                  key={app.id}
                  to={`/user/applications/${app.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(app.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-800">{app.target_name}</p>
                      <p className="text-xs text-gray-400 capitalize">{app.target_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(app.status)}`}>
                    {app.status.replace('_', ' ')}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Active Memberships */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-navy-800">Active Memberships</h3>
            <Link to="/user/memberships" className="text-xs text-gold-600 hover:text-gold-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {activeMemberships.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm mb-2">No active memberships</p>
                <Link to="/user/explore" className="text-sm text-gold-600 hover:text-gold-700">
                  Join a group →
                </Link>
              </div>
            ) : (
              activeMemberships.map(membership => {
                const Icon = getTypeIcon(membership.membership_type)
                return (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center">
                        <Icon size={14} className="text-navy-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{membership.group_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{membership.membership_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-600 font-medium">
                      Since {format(new Date(membership.joined_at), 'MMM d')}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Notifications Preview */}
      {recentNotifications.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-navy-800">Recent Notifications</h3>
            <Link to="/user/notifications" className="text-xs text-gold-600 hover:text-gold-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentNotifications.map(notif => (
              <div
                key={notif.id}
                className={`flex items-start gap-3 px-5 py-3 ${!notif.is_read ? 'bg-blue-50/50' : ''}`}
              >
                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!notif.is_read ? 'bg-blue-500' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                  <p className="text-xs text-gray-500 truncate">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(notif.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
