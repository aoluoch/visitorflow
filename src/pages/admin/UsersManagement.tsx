import { useEffect, useState } from 'react'
import { Users, Search, Mail, Phone, Calendar, Shield, ChevronDown, ChevronUp, UserCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import type { UserProfile, GroupAdminAssignment } from '../../types'
import toast from 'react-hot-toast'

export default function UsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [userAssignments, setUserAssignments] = useState<Record<string, GroupAdminAssignment[]>>({})

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Users load error:', err)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function loadUserAssignments(userId: string) {
    if (userAssignments[userId]) return
    try {
      const { data, error } = await supabase
        .from('group_admin_assignments')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      setUserAssignments(prev => ({ ...prev, [userId]: data || [] }))
    } catch (err) {
      console.error('Assignments load error:', err)
    }
  }

  function toggleExpand(userId: string) {
    if (expandedUser === userId) {
      setExpandedUser(null)
    } else {
      setExpandedUser(userId)
      loadUserAssignments(userId)
    }
  }

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true
    const s = searchQuery.toLowerCase()
    return (
      u.full_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.phone?.toLowerCase().includes(s)
    )
  })

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
        <div className="flex items-center gap-3 mb-1">
          <Users size={22} className="text-gold-400" />
          <h2 className="text-lg font-bold">User Management</h2>
        </div>
        <p className="text-navy-300 text-sm">View and manage all platform users.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
        <span className="text-sm text-gray-500">{filteredUsers.length} users</span>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400">No users found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map(user => (
            <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(user.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-bold">
                    {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{user.full_name || 'No Name'}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Mail size={12} /> {user.email}</span>
                      {user.phone && <span className="flex items-center gap-1"><Phone size={12} /> {user.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    <Calendar size={12} className="inline mr-1" />
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </span>
                  {expandedUser === user.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {expandedUser === user.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Gender</p>
                      <p className="font-medium text-gray-800 capitalize">{user.gender || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Date of Birth</p>
                      <p className="font-medium text-gray-800">{user.date_of_birth ? format(new Date(user.date_of_birth), 'MMM d, yyyy') : 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Address</p>
                      <p className="font-medium text-gray-800">{user.address || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Emergency Contact</p>
                      <p className="font-medium text-gray-800">
                        {user.emergency_contact_name ? `${user.emergency_contact_name} (${user.emergency_contact_phone || 'N/A'})` : 'Not specified'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-gray-500 mb-1">Bio</p>
                      <p className="font-medium text-gray-800">{user.bio || 'No bio'}</p>
                    </div>
                  </div>

                  {userAssignments[user.id] && userAssignments[user.id].length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-semibold text-navy-800 mb-2 flex items-center gap-1">
                        <Shield size={14} className="text-gold-500" /> Group Admin Assignments
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {userAssignments[user.id].map(a => (
                          <span key={a.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gold-100 text-gold-700 rounded-lg text-xs font-medium">
                            {a.scope_type.replace('_', ' ')} · {a.role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
