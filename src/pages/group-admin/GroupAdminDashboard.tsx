import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, ClipboardList, Building2, Users2, BookOpen, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import type { GroupAdminStats, Application, GroupAdminAssignment } from '../../types'
import toast from 'react-hot-toast'

export default function GroupAdminDashboard() {
  const { user, groupAssignments } = useAuth()
  const [stats, setStats] = useState<GroupAdminStats>({
    total_groups: 0,
    pending_applications: 0,
    active_members: 0,
    total_managed_groups: 0,
  })
  const [recentApplications, setRecentApplications] = useState<Application[]>([])
  const [managedGroups, setManagedGroups] = useState<GroupAdminAssignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      if (!user) return
      try {
        // Load stats via RPC
        const { data: statsData, error: statsError } = await supabase.rpc('get_group_admin_stats', { p_admin_id: user.id })
        if (statsError) throw statsError
        if (statsData && statsData.length > 0) setStats(statsData[0])
        
        // Load managed groups with names
        const groupsWithNames = await Promise.all(
          groupAssignments.map(async (ga) => {
            let name = ''
            if (ga.scope_type === 'department') {
              const { data } = await supabase.from('departments').select('name').eq('id', ga.scope_id).single()
              name = data?.name || 'Unknown'
            } else if (ga.scope_type === 'cell_group') {
              const { data } = await supabase.from('cell_groups').select('name').eq('id', ga.scope_id).single()
              name = data?.name || 'Unknown'
            } else if (ga.scope_type === 'membership_class') {
              const { data } = await supabase.from('membership_classes_public').select('name').eq('id', ga.scope_id).single()
              name = data?.name || 'Unknown'
            }
            return { ...ga, group_name: name }
          })
        )
        setManagedGroups(groupsWithNames)

        // Load recent applications for managed groups
        const groupFilters = groupAssignments.map(ga => `(target_type.eq.${ga.scope_type}.and.target_id.eq.${ga.scope_id})`).join(',')
        const { data: applications, error: appError } = await supabase
          .from('applications')
          .select('*, applicant:user_profiles(full_name, email)')
          .or(groupFilters)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5)
        if (appError) throw appError
        setRecentApplications(applications || [])
      } catch (err) {
        console.error('Dashboard load error:', err)
        toast.error('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [user, groupAssignments])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'department': return Building2
      case 'cell_group': return Users2
      case 'membership_class': return BookOpen
      default: return Users
    }
  }

  const statCards = [
    { label: 'Pending Applications', value: stats.pending_applications, icon: ClipboardList, color: 'bg-amber-500', to: '/group-admin/applications' },
    { label: 'Active Members', value: stats.active_members, icon: Users, color: 'bg-emerald-500', to: '/group-admin/members' },
    { label: 'Managed Groups', value: groupAssignments.length, icon: Building2, color: 'bg-blue-500', to: '/group-admin/groups' },
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
      <div className="bg-gradient-to-r from-navy-800 to-navy-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Group Admin Dashboard</h2>
            <p className="text-navy-300 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 px-4 py-2 rounded-xl">
            <TrendingUp size={18} className="text-gold-400" />
            <span className="text-gold-300 text-sm font-medium">Managing {groupAssignments.length} groups</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, to }) => (
          <Link key={label} to={to} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-gold-200 transition-all group">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}><Icon size={20} className="text-white" /></div>
            <p className="text-2xl font-bold text-navy-800 group-hover:text-navy-700">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-navy-800">Pending Applications</h3>
            <Link to="/group-admin/applications" className="text-xs text-gold-600 hover:text-gold-700 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentApplications.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No pending applications</p>
            ) : (
              recentApplications.map(app => (
                <div key={app.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><Clock size={14} className="text-amber-600" /></div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{app.applicant?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{app.target_name}</p>
                    </div>
                  </div>
                  <span className="text-xs text-amber-600 font-medium">{format(new Date(app.created_at), 'MMM d')}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-navy-800">My Managed Groups</h3>
            <Link to="/group-admin/groups" className="text-xs text-gold-600 hover:text-gold-700 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {managedGroups.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No groups assigned</p>
            ) : (
              managedGroups.map(group => {
                const Icon = getTypeIcon(group.scope_type)
                return (
                  <div key={group.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center"><Icon size={14} className="text-navy-600" /></div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{group.group_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{group.scope_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-600 font-medium">{group.role}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
