import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Users2, BookOpen, ClipboardList, Calendar, CheckCircle, MapPin, Clock, User, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import type { UserMembership } from '../../types'
import toast from 'react-hot-toast'

interface GroupDetails {
  name?: string
  leader?: string
  description?: string
  location?: string
  meeting_day?: string
  meeting_time?: string
  capacity?: number
  status?: string
}

export default function UserMembershipsPage() {
  const { userProfile } = useAuth()
  const [memberships, setMemberships] = useState<UserMembership[]>([])
  const [groupDetails, setGroupDetails] = useState<Record<string, GroupDetails>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'past'>('active')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function loadMemberships() {
      if (!userProfile) return
      try {
        const { data, error } = await supabase
          .from('user_memberships')
          .select('*')
          .eq('user_id', userProfile.id)
          .order('joined_at', { ascending: false })
        if (error) throw error
        const mems = data || []
        setMemberships(mems)

        // Fetch group details for each membership
        const details: Record<string, GroupDetails> = {}
        await Promise.all(mems.map(async (m) => {
          if (m.membership_type === 'department') {
            const { data: d } = await supabase.from('departments').select('name, leader, description, status').eq('id', m.group_id).single()
            if (d) details[m.group_id] = d
          } else if (m.membership_type === 'cell_group') {
            const { data: d } = await supabase.from('cell_groups').select('name, leader, description, location, meeting_day, meeting_time, capacity, status').eq('id', m.group_id).single()
            if (d) details[m.group_id] = d
          } else if (m.membership_type === 'membership_class') {
            const { data: d } = await supabase.from('membership_classes_public').select('name, description, location, schedule, capacity, status').eq('id', m.group_id).single()
            if (d) details[m.group_id] = { ...d, meeting_day: (d as any).schedule }
          }
        }))
        setGroupDetails(details)
      } catch (err) {
        console.error('Memberships load error:', err)
        toast.error('Failed to load memberships')
      } finally {
        setLoading(false)
      }
    }
    loadMemberships()
  }, [userProfile])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'department': return Building2
      case 'cell_group': return Users2
      case 'membership_class': return BookOpen
      case 'volunteer_opportunity': return ClipboardList
      default: return CheckCircle
    }
  }

  const filteredMemberships = memberships.filter(m => {
    if (filter === 'active') return m.is_active
    if (filter === 'past') return !m.is_active
    return true
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-navy-800">My Groups & Memberships</h2>
        <div className="flex gap-2">
          {(['all', 'active', 'past'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-gold-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {filteredMemberships.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Users2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 mb-4">No {filter} memberships found</p>
          <Link to="/user/explore" className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors">Explore Opportunities</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMemberships.map(m => {
            const Icon = getTypeIcon(m.membership_type)
            const details = groupDetails[m.group_id]
            const expanded = expandedId === m.id
            return (
              <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedId(expanded ? null : m.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-navy-100 rounded-xl flex items-center justify-center">
                      <Icon size={24} className="text-navy-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{m.group_name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{m.membership_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${m.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                      {m.is_active ? 'Active' : 'Ended'}
                    </span>
                    {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>

                {expanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={15} className="text-gray-400 flex-shrink-0" />
                        <span>Joined {format(new Date(m.joined_at), 'MMMM d, yyyy')}</span>
                      </div>
                      {m.role_in_group !== 'member' && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="px-2 py-0.5 bg-gold-100 text-gold-700 rounded text-xs font-medium">{m.role_in_group}</span>
                        </div>
                      )}
                      {details?.leader && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User size={15} className="text-gray-400 flex-shrink-0" />
                          <span>Leader: <strong>{details.leader}</strong></span>
                        </div>
                      )}
                      {details?.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin size={15} className="text-gray-400 flex-shrink-0" />
                          <span>{details.location}</span>
                        </div>
                      )}
                      {details?.meeting_day && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock size={15} className="text-gray-400 flex-shrink-0" />
                          <span>{details.meeting_day}{details.meeting_time ? ` at ${details.meeting_time}` : ''}</span>
                        </div>
                      )}
                    </div>
                    {details?.description && (
                      <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{details.description}</p>
                    )}
                    {m.left_at && !m.is_active && (
                      <p className="mt-3 text-xs text-gray-400">Left on {format(new Date(m.left_at), 'MMMM d, yyyy')}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
