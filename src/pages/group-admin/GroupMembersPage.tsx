import { useEffect, useState } from 'react'
import { Users, Search, Building2, Users2, BookOpen, Calendar, UserPlus, X, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import type { UserMembership, UserProfile } from '../../types'
import toast from 'react-hot-toast'

interface GroupInfo { scope_id: string; scope_type: string; name: string }

export default function GroupMembersPage() {
  const { user, groupAssignments } = useAuth()
  const [members, setMembers] = useState<UserMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [groupNames, setGroupNames] = useState<GroupInfo[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [addForm, setAddForm] = useState({ user_id: '', scope_id: '' })
  const [saving, setSaving] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)

  useEffect(() => {
    resolveGroupNames()
    loadMembers()
  }, [user, groupAssignments])

  async function resolveGroupNames() {
    const groups: GroupInfo[] = await Promise.all(
      groupAssignments.map(async (ga) => {
        let name = ''
        if (ga.scope_type === 'department') {
          const { data } = await supabase.from('departments').select('name').eq('id', ga.scope_id).single()
          name = data?.name || 'Unknown Department'
        } else if (ga.scope_type === 'cell_group') {
          const { data } = await supabase.from('cell_groups').select('name').eq('id', ga.scope_id).single()
          name = data?.name || 'Unknown Cell Group'
        } else if (ga.scope_type === 'membership_class') {
          const { data } = await supabase.from('membership_classes_public').select('name').eq('id', ga.scope_id).single()
          name = data?.name || 'Unknown Class'
        }
        return { scope_id: ga.scope_id, scope_type: ga.scope_type, name }
      })
    )
    setGroupNames(groups)
  }

  async function loadMembers() {
    if (!user || groupAssignments.length === 0) { setLoading(false); return }
    try {
      const groupFilters = groupAssignments.map(ga => `(membership_type.eq.${ga.scope_type}.and.group_id.eq.${ga.scope_id})`).join(',')
      const { data, error } = await supabase
        .from('user_memberships')
        .select('*, user:user_profiles(full_name, email, phone)')
        .or(groupFilters)
        .eq('is_active', true)
        .order('joined_at', { ascending: false })
      if (error) throw error
      setMembers(data || [])
    } catch (err) {
      console.error('Members load error:', err)
      toast.error('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  async function loadAllUsers() {
    if (allUsers.length > 0) return
    const { data } = await supabase.from('user_profiles').select('id, full_name, email').order('full_name')
    setAllUsers((data || []) as UserProfile[])
  }

  function openAddModal() {
    loadAllUsers()
    setAddForm({ user_id: '', scope_id: groupAssignments[0]?.scope_id || '' })
    setShowAddModal(true)
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.user_id || !addForm.scope_id) { toast.error('Select user and group'); return }
    setSaving(true)
    const group = groupNames.find(g => g.scope_id === addForm.scope_id)
    if (!group) { toast.error('Group not found'); setSaving(false); return }
    try {
      const { error } = await supabase.from('user_memberships').insert({
        user_id: addForm.user_id,
        membership_type: group.scope_type,
        group_id: group.scope_id,
        group_name: group.name,
        role_in_group: 'member',
        is_active: true,
      })
      if (error) throw error
      toast.success('Member added!')
      setShowAddModal(false)
      loadMembers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add member')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveMember(membershipId: string) {
    try {
      const { error } = await supabase.from('user_memberships').update({ is_active: false, left_at: new Date().toISOString() }).eq('id', membershipId)
      if (error) throw error
      toast.success('Member removed')
      setMembers(prev => prev.filter(m => m.id !== membershipId))
    } catch (err) {
      toast.error('Failed to remove member')
    }
    setRemoveId(null)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'department': return Building2
      case 'cell_group': return Users2
      case 'membership_class': return BookOpen
      default: return Users
    }
  }

  const getGroupName = (scopeId: string) => groupNames.find(g => g.scope_id === scopeId)?.name || scopeId.slice(0, 8)

  const filteredMembers = members.filter(m => {
    if (selectedGroup !== 'all' && m.group_id !== selectedGroup) return false
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      return m.user?.full_name?.toLowerCase().includes(search) || m.group_name.toLowerCase().includes(search)
    }
    return true
  })

  const groupedMembers = filteredMembers.reduce((acc, m) => {
    if (!acc[m.group_id]) acc[m.group_id] = { group_name: m.group_name, type: m.membership_type, members: [] }
    acc[m.group_id].members.push(m)
    return acc
  }, {} as Record<string, { group_name: string; type: string; members: UserMembership[] }>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-navy-800">Members</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search members..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500" />
          </div>
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500">
            <option value="all">All Groups</option>
            {groupNames.map(g => (
              <option key={g.scope_id} value={g.scope_id}>{g.name}</option>
            ))}
          </select>
          <button onClick={openAddModal} className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <UserPlus size={16} /> Add Member
          </button>
        </div>
      </div>

      {Object.keys(groupedMembers).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 mb-2">No members found</p>
          <button onClick={openAddModal} className="text-sm text-gold-600 hover:text-gold-700">Add the first member →</button>
        </div>
      ) : (
        Object.entries(groupedMembers).map(([groupId, { group_name, type, members: groupMembers }]) => {
          const Icon = getTypeIcon(type)
          return (
            <div key={groupId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <Icon size={18} className="text-navy-600" />
                  <h3 className="font-semibold text-navy-800">{group_name}</h3>
                  <span className="ml-auto text-sm text-gray-500">{groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {groupMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 text-xs font-bold">{m.user?.full_name?.charAt(0) || '?'}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{m.user?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{m.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs text-gray-500">
                        <p className="flex items-center gap-1"><Calendar size={12} /> Since {format(new Date(m.joined_at), 'MMM d')}</p>
                        {m.role_in_group !== 'member' && <span className="inline-block mt-1 px-2 py-0.5 bg-gold-100 text-gold-700 rounded">{m.role_in_group}</span>}
                      </div>
                      <button onClick={() => setRemoveId(m.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-navy-800">Add Member</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddMember} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">User *</label>
                <select required value={addForm.user_id} onChange={e => setAddForm(f => ({ ...f, user_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                  <option value="">Select a user...</option>
                  {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Group *</label>
                <select required value={addForm.scope_id} onChange={e => setAddForm(f => ({ ...f, scope_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                  {groupNames.map(g => <option key={g.scope_id} value={g.scope_id}>{g.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-navy-700 hover:bg-navy-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserPlus size={15} /> Add</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove confirm */}
      {removeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">Remove Member?</h3>
            <p className="text-gray-500 text-sm mb-5">This member will be removed from the group.</p>
            <div className="flex gap-3">
              <button onClick={() => setRemoveId(null)} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleRemoveMember(removeId)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
