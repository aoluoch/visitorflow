import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, BookOpen, Users2, Building2, ClipboardList, TrendingUp, UserPlus, Clock, FileText, Shield, Hourglass, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import type { Visitor, Task, Application } from '../types'
import toast from 'react-hot-toast'

interface Stats {
  totalVisitors: number
  newThisMonth: number
  pendingTasks: number
  membershipEnrolled: number
  totalCellGroups: number
  totalDepartments: number
  totalUsers: number
  pendingApplications: number
  totalGroupAdmins: number
  activeMemberships: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalVisitors: 0,
    newThisMonth: 0,
    pendingTasks: 0,
    membershipEnrolled: 0,
    totalCellGroups: 0,
    totalDepartments: 0,
    totalUsers: 0,
    pendingApplications: 0,
    totalGroupAdmins: 0,
    activeMemberships: 0,
  })
  const [recentVisitors, setRecentVisitors] = useState<Visitor[]>([])
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [recentApplications, setRecentApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

        const [
          { count: total, error: e1 },
          { count: newMonth, error: e2 },
          { count: taskCount, error: e3 },
          { count: enrolled, error: e4 },
          { count: cellCount, error: e5 },
          { count: deptCount, error: e6 },
          { data: recent, error: e7 },
          { data: tasks, error: e8 },
          { count: userCount },
          { count: pendingApps },
          { count: groupAdmins },
          { count: activeMembers },
          { data: latestApps },
        ] = await Promise.all([
          supabase.from('visitors').select('id', { count: 'exact' }),
          supabase.from('visitors').select('id', { count: 'exact' }).gte('visit_date', monthStart),
          supabase.from('tasks').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('membership_classes').select('id', { count: 'exact' }).eq('enrolled', true),
          supabase.from('cell_groups').select('id', { count: 'exact' }),
          supabase.from('departments').select('id', { count: 'exact' }),
          supabase.from('visitors').select('*').order('created_at', { ascending: false }).limit(5),
          supabase.from('tasks').select('*, visitors(id, name, phone)').eq('status', 'pending').order('scheduled_date', { ascending: true }).limit(5),
          supabase.from('user_profiles').select('id', { count: 'exact' }),
          supabase.from('applications').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('group_admin_assignments').select('user_id', { count: 'exact' }),
          supabase.from('user_memberships').select('id', { count: 'exact' }).eq('is_active', true),
          supabase.from('applications').select('*, applicant:user_profiles(full_name, email)').order('created_at', { ascending: false }).limit(5),
        ])

        if (e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8) {
          const errors = { e1, e2, e3, e4, e5, e6, e7, e8 }
          console.error('Dashboard query errors:', errors)
          const firstError = e1 ?? e2 ?? e3 ?? e4 ?? e5 ?? e6 ?? e7 ?? e8
          if (firstError) toast.error('Failed to load dashboard: ' + firstError.message)
        }

        setStats({
          totalVisitors: total ?? 0,
          newThisMonth: newMonth ?? 0,
          pendingTasks: taskCount ?? 0,
          membershipEnrolled: enrolled ?? 0,
          totalCellGroups: cellCount ?? 0,
          totalDepartments: deptCount ?? 0,
          totalUsers: userCount ?? 0,
          pendingApplications: pendingApps ?? 0,
          totalGroupAdmins: groupAdmins ?? 0,
          activeMemberships: activeMembers ?? 0,
        })
        setRecentVisitors((recent ?? []) as Visitor[])
        setPendingTasks((tasks ?? []) as Task[])
        setRecentApplications((latestApps ?? []) as Application[])
      } catch (err) {
        toast.error('Unexpected error loading dashboard')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()

    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const statCards = [
    { label: 'Total Visitors', value: stats.totalVisitors, icon: Users, color: 'bg-blue-500', to: '/admin/visitors' },
    { label: 'New This Month', value: stats.newThisMonth, icon: UserPlus, color: 'bg-gold-500', to: '/admin/visitors' },
    { label: 'Pending Tasks', value: stats.pendingTasks, icon: ClipboardList, color: 'bg-red-500', to: '/admin/tasks' },
    { label: 'Platform Users', value: stats.totalUsers, icon: Users, color: 'bg-indigo-500', to: '/admin/users' },
    { label: 'Pending Apps', value: stats.pendingApplications, icon: Hourglass, color: 'bg-amber-500', to: '/admin/applications' },
    { label: 'Active Members', value: stats.activeMemberships, icon: CheckCircle, color: 'bg-emerald-500', to: '/admin/users' },
    { label: 'Cell Groups', value: stats.totalCellGroups, icon: Users2, color: 'bg-teal-500', to: '/admin/cell-groups' },
    { label: 'Departments', value: stats.totalDepartments, icon: Building2, color: 'bg-orange-500', to: '/admin/departments' },
    { label: 'Group Admins', value: stats.totalGroupAdmins, icon: Shield, color: 'bg-purple-500', to: '/admin/group-admins' },
  ]

  const stageBadge = (stage: string) => {
    const map: Record<string, string> = {
      'New Visitor': 'bg-blue-100 text-blue-700',
      'Returning Visitor': 'bg-purple-100 text-purple-700',
      'Member': 'bg-emerald-100 text-emerald-700',
      'Cell Member': 'bg-gold-100 text-gold-700',
      'Department Member': 'bg-orange-100 text-orange-700',
    }
    return map[stage] ?? 'bg-gray-100 text-gray-700'
  }

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
            <h2 className="text-xl font-bold">Welcome to VisitorFlow</h2>
            <p className="text-navy-300 text-sm mt-1">Grace Arena Ministries — {format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 px-4 py-2 rounded-xl">
            <TrendingUp size={18} className="text-gold-400" />
            <span className="text-gold-300 text-sm font-medium">{stats.newThisMonth} this month</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
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

      {/* Three columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Visitors */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-navy-800">Recent Visitors</h3>
            <Link to="/admin/visitors" className="text-xs text-gold-600 hover:text-gold-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentVisitors.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No visitors yet</p>
            ) : (
              recentVisitors.map(v => (
                <Link
                  key={v.id}
                  to={`/admin/visitors/${v.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 text-xs font-bold">
                      {v.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{v.name}</p>
                      <p className="text-xs text-gray-400">{format(new Date(v.visit_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageBadge(v.current_stage)}`}>
                    {v.current_stage}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-navy-800">Pending Follow-Ups</h3>
            <Link to="/admin/tasks" className="text-xs text-gold-600 hover:text-gold-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingTasks.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No pending tasks</p>
            ) : (
              pendingTasks.map(t => (
                <div key={t.id} className="flex items-start gap-3 px-5 py-3">
                  <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${t.task_type === 'call' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                    <Clock size={14} className={t.task_type === 'call' ? 'text-blue-600' : 'text-amber-600'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                    <p className="text-xs text-gray-400">
                      {t.visitors?.name} {t.scheduled_date ? `· ${format(new Date(t.scheduled_date), 'MMM d')}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${t.task_type === 'call' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {t.task_type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-navy-800">Recent Applications</h3>
            <Link to="/admin/applications" className="text-xs text-gold-600 hover:text-gold-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentApplications.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No applications yet</p>
            ) : (
              recentApplications.map(app => (
                <Link
                  key={app.id}
                  to={`/admin/applications/${app.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${app.status === 'pending' ? 'bg-amber-100' : app.status === 'approved' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      {app.status === 'pending' ? <Hourglass size={14} className="text-amber-600" /> : app.status === 'approved' ? <CheckCircle size={14} className="text-emerald-600" /> : <Clock size={14} className="text-gray-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{app.applicant?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{app.target_name}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${app.status === 'pending' ? 'bg-amber-100 text-amber-700' : app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                    {app.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
