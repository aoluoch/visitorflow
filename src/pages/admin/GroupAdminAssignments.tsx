import { useEffect, useState } from 'react'
import { Shield, UserPlus, Trash2, X, Search, Building2, Users2, BookOpen, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import type { GroupAdminAssignment, UserProfile } from '../../types'
import toast from 'react-hot-toast'

interface AssignmentWithDetails extends GroupAdminAssignment {
  user?: { full_name: string; email: string }
  group_name?: string
}

export default function GroupAdminAssignments() {
  const { adminProfile } = useAuth()
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [cellGroups, setCellGroups] = useState<{ id: string; name: string }[]>([])
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [form, setForm] = useState({
    user_id: '',
    scope_type: 'department' as 'department' | 'cell_group' | 'membership_class',
    scope_id: '',
    role: 'admin',
    can_approve: true,
    can_manage_members: true,
    can_send_notifications: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAssignments()
    loadFormData()
  }, [])

  async function loadAssignments() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('group_admin_assignments')
        .select('*, user:user_profiles(full_name, email)')
        .order('created_at', { ascending: false })
      if (error) throw error

      // Resolve group names
      const enriched = await Promise.all(
        (data || []).map(async (a: any) => {
          let group_name = ''
          if (a.scope_type === 'department') {
            const { data: d } = await supabase.from('departments').select('name').eq('id', a.scope_id).single()
            group_name = d?.name || 'Unknown'
          } else if (a.scope_type === 'cell_group') {
            const { data: d } = await supabase.from('cell_groups').select('name').eq('id', a.scope_id).single()
            group_name = d?.name || 'Unknown'
          } else if (a.scope_type === 'membership_class') {
            const { data: d } = await supabase.from('membership_classes_public').select('name').eq('id', a.scope_id).single()
            group_name = d?.name || 'Unknown'
          }
          return { ...a, group_name }
        })
      )
      setAssignments(enriched)
    } catch (err) {
      console.error('Load error:', err)
      toast.error('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  async function loadFormData() {
    const [{ data: u }, { data: d }, { data: c }, { data: m }] = await Promise.all([
      supabase.from('user_profiles').select('id, full_name, email').order('full_name'),
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('cell_groups').select('id, name').order('name'),
      supabase.from('membership_classes_public').select('id, name').order('name'),
    ])
    setUsers((u || []) as UserProfile[])
    setDepartments(d || [])
    setCellGroups(c || [])
    setClasses(m || [])
  }

  const scopeOptions = form.scope_type === 'department' ? departments
    : form.scope_type === 'cell_group' ? cellGroups
    : classes

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.user_id || !form.scope_id) {
      toast.error('Please select a user and a group')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('group_admin_assignments').insert({
        user_id: form.user_id,
        scope_type: form.scope_type,
        scope_id: form.scope_id,
        role: form.role,
        can_approve: form.can_approve,
        can_manage_members: form.can_manage_members,
        can_send_notifications: form.can_send_notifications,
        assigned_by: adminProfile?.id,
      })
      if (error) throw error
      toast.success('Group admin assigned successfully!')
      setShowModal(false)
      setForm({ user_id: '', scope_type: 'department', scope_id: '', role: 'admin', can_approve: true, can_manage_members: true, can_send_notifications: true })
      loadAssignments()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create assignment')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('group_admin_assignments').delete().eq('id', id)
      if (error) throw error
      toast.success('Assignment removed')
      setAssignments(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      toast.error('Failed to remove assignment')
    }
    setDeleteId(null)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'department': return Building2
      case 'cell_group': return Users2
      case 'membership_class': return BookOpen
      default: return Users
    }
  }

  const filteredAssignments = assignments.filter(a => {
    if (!searchQuery) return true
    const s = searchQuery.toLowerCase()
    return a.user?.full_name?.toLowerCase().includes(s) || a.group_name?.toLowerCase().includes(s)
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
          <Shield size={22} className="text-gold-400" />
          <h2 className="text-lg font-bold">Group Admin Assignments</h2>
        </div>
        <p className="text-navy-300 text-sm">Assign users as administrators of departments, cell groups, and classes.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus size={16} /> Assign Group Admin
        </button>
      </div>

      {filteredAssignments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Shield size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 mb-2">No group admin assignments</p>
          <button onClick={() => setShowModal(true)} className="text-sm text-gold-600 hover:text-gold-700">
            Assign the first group admin →
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredAssignments.map(a => {
            const Icon = getTypeIcon(a.scope_type)
            return (
              <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center">
                      <Icon size={20} className="text-navy-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{a.user?.full_name || 'Unknown User'}</h3>
                      <p className="text-sm text-gray-500">{a.user?.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gold-100 text-gold-700 font-medium capitalize">
                          {a.scope_type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">{a.group_name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{a.role}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                      <div className="flex gap-1 flex-wrap justify-end">
                        {a.can_approve && <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">approve</span>}
                        {a.can_manage_members && <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">members</span>}
                        {a.can_send_notifications && <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">notify</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Since {format(new Date(a.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(a.id) }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-navy-800">Assign Group Admin</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">User *</label>
                <select
                  required
                  value={form.user_id}
                  onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
                >
                  <option value="">Select a user...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Scope Type *</label>
                <select
                  value={form.scope_type}
                  onChange={e => setForm(f => ({ ...f, scope_type: e.target.value as any, scope_id: '' }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
                >
                  <option value="department">Department</option>
                  <option value="cell_group">Cell Group</option>
                  <option value="membership_class">Membership Class</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {form.scope_type === 'department' ? 'Department' : form.scope_type === 'cell_group' ? 'Cell Group' : 'Class'} *
                </label>
                <select
                  required
                  value={form.scope_id}
                  onChange={e => setForm(f => ({ ...f, scope_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
                >
                  <option value="">Select...</option>
                  {scopeOptions.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
                >
                  <option value="admin">Admin</option>
                  <option value="leader">Leader</option>
                  <option value="coordinator">Coordinator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Capabilities</label>
                <div className="space-y-2">
                  {[
                    { key: 'can_approve', label: 'Can approve/reject applications' },
                    { key: 'can_manage_members', label: 'Can manage members' },
                    { key: 'can_send_notifications', label: 'Can send notifications' },
                  ].map(cap => (
                    <label key={cap.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(form as any)[cap.key]}
                        onChange={e => setForm(f => ({ ...f, [cap.key]: e.target.checked }))}
                        className="w-4 h-4 text-gold-500 border-gray-300 rounded focus:ring-gold-500"
                      />
                      {cap.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-navy-700 hover:bg-navy-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserPlus size={15} /> Assign</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">Remove Assignment?</h3>
            <p className="text-gray-500 text-sm mb-5">This user will lose group admin access to this group.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
