import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Users2, Plus, X, Search, Edit2, Trash2, UserCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { CellGroup, Visitor, VisitorCellGroup } from '../types'
import toast from 'react-hot-toast'

interface CellGroupWithCount extends CellGroup {
  member_count: number
}

export default function CellGroupsPage() {
  const [cellGroups, setCellGroups] = useState<CellGroupWithCount[]>([])
  const [assignments, setAssignments] = useState<(VisitorCellGroup & { visitors: Pick<Visitor, 'id' | 'name'> })[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'groups' | 'assignments'>('groups')
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<CellGroup | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', leader: '', location: '', meeting_day: '', meeting_time: '', description: '', is_public: true, status: 'active', capacity: '' })
  const [assignForm, setAssignForm] = useState({ visitor_id: '', cell_group_id: '' })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: groups }, { data: assigns }] = await Promise.all([
      supabase.from('cell_groups').select('*').order('name'),
      supabase.from('visitor_cell_groups').select('*, visitors(id, name), cell_groups(name)').eq('assigned', true),
    ])
    const groupsWithCount = (groups ?? []).map(g => ({
      ...g,
      member_count: (assigns ?? []).filter(a => a.cell_group_id === g.id).length,
    }))
    setCellGroups(groupsWithCount as CellGroupWithCount[])
    setAssignments((assigns ?? []) as (VisitorCellGroup & { visitors: Pick<Visitor, 'id' | 'name'> })[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    supabase.from('visitors').select('id, name').order('name').then(({ data }) => setVisitors((data ?? []) as Visitor[]))
  }, [])

  function openCreateGroup() {
    setEditingGroup(null)
    setGroupForm({ name: '', leader: '', location: '', meeting_day: '', meeting_time: '', description: '', is_public: true, status: 'active', capacity: '' })
    setShowGroupModal(true)
  }

  function openEditGroup(g: CellGroup) {
    setEditingGroup(g)
    setGroupForm({ name: g.name, leader: g.leader ?? '', location: g.location ?? '', meeting_day: g.meeting_day ?? '', meeting_time: g.meeting_time ?? '', description: (g as any).description ?? '', is_public: (g as any).is_public ?? true, status: (g as any).status ?? 'active', capacity: (g as any).capacity?.toString() ?? '' })
    setShowGroupModal(true)
  }

  async function handleSaveGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!groupForm.name.trim()) { toast.error('Group name is required'); return }
    setSaving(true)
    const payload = { name: groupForm.name, leader: groupForm.leader || null, location: groupForm.location || null, meeting_day: groupForm.meeting_day || null, meeting_time: groupForm.meeting_time || null, description: groupForm.description || null, is_public: groupForm.is_public, status: groupForm.status, capacity: groupForm.capacity ? parseInt(groupForm.capacity) : null }
    const { error } = editingGroup
      ? await supabase.from('cell_groups').update(payload).eq('id', editingGroup.id)
      : await supabase.from('cell_groups').insert([payload])
    if (error) toast.error(error.message)
    else { toast.success(editingGroup ? 'Updated!' : 'Cell group created!'); setShowGroupModal(false); setGroupForm({ name: '', leader: '', location: '', meeting_day: '', meeting_time: '', description: '', is_public: true, status: 'active', capacity: '' }); load() }
    setSaving(false)
  }

  async function handleDeleteGroup(id: string) {
    const { error } = await supabase.from('cell_groups').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); load() }
    setDeleteId(null)
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!assignForm.visitor_id || !assignForm.cell_group_id) { toast.error('Select visitor and cell group'); return }
    setSaving(true)
    const { error } = await supabase.from('visitor_cell_groups').upsert([{
      visitor_id: assignForm.visitor_id,
      cell_group_id: assignForm.cell_group_id,
      assigned: true,
      assigned_date: new Date().toISOString().split('T')[0],
    }], { onConflict: 'visitor_id' })
    if (error) toast.error(error.message)
    else { toast.success('Visitor assigned!'); setShowAssignModal(false); setAssignForm({ visitor_id: '', cell_group_id: '' }); load() }
    setSaving(false)
  }

  const filteredGroups = cellGroups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
  const filteredAssignments = assignments.filter(a => a.visitors.name.toLowerCase().includes(search.toLowerCase()))

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['groups', 'assignments'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-gold-500 text-navy-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'groups' ? `Cell Groups (${cellGroups.length})` : `Assignments (${assignments.length})`}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder={tab === 'groups' ? 'Search groups...' : 'Search by visitor...'} value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
        </div>
        {tab === 'groups' ? (
          <button onClick={openCreateGroup} className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> New Group
          </button>
        ) : (
          <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <UserCheck size={16} /> Assign Visitor
          </button>
        )}
      </div>

      {/* Groups Grid */}
      {tab === 'groups' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 flex justify-center py-12"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filteredGroups.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-400">No cell groups found</div>
          ) : filteredGroups.map(g => (
            <div key={g.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center">
                  <Users2 size={20} className="text-navy-700" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditGroup(g)} className="p-1.5 rounded-lg text-gray-400 hover:text-navy-700 hover:bg-navy-50 transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => setDeleteId(g.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="font-bold text-navy-800 mb-1">{g.name}</h3>
              {g.leader && <p className="text-xs text-gray-500 mb-2">Leader: {g.leader}</p>}
              <div className="flex flex-wrap gap-2 text-xs">
                {g.meeting_day && <span className="bg-gold-100 text-gold-700 px-2 py-0.5 rounded-full">{g.meeting_day}</span>}
                {g.meeting_time && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{g.meeting_time}</span>}
                {g.location && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{g.location}</span>}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1.5">
                <Users2 size={13} className="text-gray-400" />
                <span className="text-xs text-gray-500">{g.member_count} member{g.member_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assignments Table */}
      {tab === 'assignments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Visitor</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cell Group</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Assigned Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-10"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                ) : filteredAssignments.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-400">No assignments found</td></tr>
                ) : filteredAssignments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{a.visitors.name}</td>
                    <td className="px-4 py-3 text-gray-600">{(a as any).cell_groups?.name}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{a.assigned_date}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/visitors/${a.visitor_id}`} className="text-xs text-gold-600 hover:text-gold-700 font-medium">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-navy-800">{editingGroup ? 'Edit' : 'New'} Cell Group</h2>
              <button onClick={() => setShowGroupModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveGroup} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Group Name *</label>
                <input required value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea rows={2} value={groupForm.description} onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Leader</label>
                  <input value={groupForm.leader} onChange={e => setGroupForm(f => ({ ...f, leader: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
                  <input value={groupForm.location} onChange={e => setGroupForm(f => ({ ...f, location: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting Day</label>
                  <select value={groupForm.meeting_day} onChange={e => setGroupForm(f => ({ ...f, meeting_day: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                    <option value="">Select day</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting Time</label>
                  <input type="time" value={groupForm.meeting_time} onChange={e => setGroupForm(f => ({ ...f, meeting_time: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Capacity</label>
                  <input type="number" min="0" value={groupForm.capacity} onChange={e => setGroupForm(f => ({ ...f, capacity: e.target.value }))} placeholder="Unlimited" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select value={groupForm.status} onChange={e => setGroupForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="full">Full</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={groupForm.is_public} onChange={e => setGroupForm(f => ({ ...f, is_public: e.target.checked }))} className="w-4 h-4 text-gold-500 border-gray-300 rounded focus:ring-gold-500" />
                Visible to users on Explore page
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowGroupModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-navy-700 hover:bg-navy-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-navy-800">Assign to Cell Group</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAssign} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Visitor *</label>
                <select value={assignForm.visitor_id} onChange={e => setAssignForm(f => ({ ...f, visitor_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                  <option value="">Select visitor...</option>
                  {visitors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cell Group *</label>
                <select value={assignForm.cell_group_id} onChange={e => setAssignForm(f => ({ ...f, cell_group_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                  <option value="">Select group...</option>
                  {cellGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-navy-700 hover:bg-navy-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Assign'}
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
            <h3 className="font-bold text-gray-800 mb-2">Delete Cell Group?</h3>
            <p className="text-gray-500 text-sm mb-5">This will remove the group. Member assignments may be affected.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDeleteGroup(deleteId)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
