import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Search, Plus, X, CheckCircle, Clock, Award } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { MembershipClass, Visitor, MembershipCompletionStatus } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface MembershipWithVisitor extends MembershipClass {
  visitors: Pick<Visitor, 'id' | 'name' | 'phone'>
}

const STATUS_COLORS: Record<MembershipCompletionStatus, string> = {
  'Not Enrolled': 'bg-gray-100 text-gray-600',
  'Enrolled': 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  'Completed': 'bg-emerald-100 text-emerald-700',
}

const STATUS_ICONS: Record<MembershipCompletionStatus, React.ReactNode> = {
  'Not Enrolled': <X size={14} className="text-gray-400" />,
  'Enrolled': <BookOpen size={14} className="text-blue-500" />,
  'In Progress': <Clock size={14} className="text-yellow-500" />,
  'Completed': <Award size={14} className="text-emerald-500" />,
}

export default function MembershipClassPage() {
  const [records, setRecords] = useState<MembershipWithVisitor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MembershipCompletionStatus | ''>('')
  const [showModal, setShowModal] = useState(false)
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    visitor_id: '',
    enrolled: false,
    enrollment_date: new Date().toISOString().split('T')[0],
    attendance_count: 0,
    completion_status: 'Not Enrolled' as MembershipCompletionStatus,
    completion_date: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('membership_classes')
      .select('*, visitors(id, name, phone)')
      .order('created_at', { ascending: false })
    if (statusFilter) q = q.eq('completion_status', statusFilter)
    const { data, error } = await q
    if (error) toast.error(error.message)
    else {
      let filtered = (data ?? []) as MembershipWithVisitor[]
      if (search) filtered = filtered.filter(r => r.visitors.name.toLowerCase().includes(search.toLowerCase()))
      setRecords(filtered)
    }
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    supabase.from('visitors').select('id, name, phone').order('name').then(({ data }) => {
      setVisitors((data ?? []) as Visitor[])
    })
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm({ visitor_id: '', enrolled: false, enrollment_date: new Date().toISOString().split('T')[0], attendance_count: 0, completion_status: 'Not Enrolled', completion_date: '', notes: '' })
    setShowModal(true)
  }

  function openEdit(r: MembershipWithVisitor) {
    setEditingId(r.id)
    setForm({
      visitor_id: r.visitor_id,
      enrolled: r.enrolled,
      enrollment_date: r.enrollment_date ?? '',
      attendance_count: r.attendance_count,
      completion_status: r.completion_status,
      completion_date: r.completion_date ?? '',
      notes: r.notes ?? '',
    })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.visitor_id) { toast.error('Select a visitor'); return }
    setSaving(true)
    const payload = {
      visitor_id: form.visitor_id,
      enrolled: form.enrolled,
      enrollment_date: form.enrollment_date || null,
      attendance_count: form.attendance_count,
      completion_status: form.completion_status,
      completion_date: form.completion_date || null,
      notes: form.notes || null,
    }
    const { error } = editingId
      ? await supabase.from('membership_classes').update(payload).eq('id', editingId)
      : await supabase.from('membership_classes').insert([payload])
    if (error) toast.error(error.message)
    else { toast.success(editingId ? 'Updated!' : 'Record created!'); setShowModal(false); load() }
    setSaving(false)
  }

  const STATUSES: MembershipCompletionStatus[] = ['Not Enrolled', 'Enrolled', 'In Progress', 'Completed']

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`bg-white rounded-xl p-3 border transition-all text-left ${statusFilter === s ? 'border-gold-400 shadow-md' : 'border-gray-100 shadow-sm hover:border-gold-200'}`}
          >
            <div className="flex items-center gap-2 mb-1">{STATUS_ICONS[s]}</div>
            <p className="text-lg font-bold text-navy-800">{records.filter(r => r.completion_status === s).length}</p>
            <p className="text-xs text-gray-500">{s}</p>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by visitor name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Record
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Visitor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Enrolled</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Attendance</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Completed</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No membership records found</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/admin/visitors/${r.visitors.id}`} className="font-medium text-navy-700 hover:text-gold-600">{r.visitors.name}</Link>
                    {r.visitors.phone && <p className="text-xs text-gray-400">{r.visitors.phone}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {r.enrolled
                      ? <CheckCircle size={16} className="text-emerald-500" />
                      : <X size={16} className="text-gray-300" />
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.completion_status]}`}>{r.completion_status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{r.attendance_count}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                    {r.completion_date ? format(new Date(r.completion_date), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(r)} className="text-xs text-gold-600 hover:text-gold-700 font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl">
              <h2 className="text-lg font-bold text-navy-800">{editingId ? 'Edit' : 'Add'} Membership Record</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Visitor *</label>
                  <select
                    value={form.visitor_id}
                    onChange={e => setForm(f => ({ ...f, visitor_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
                  >
                    <option value="">Select visitor...</option>
                    {visitors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enrolled"
                  checked={form.enrolled}
                  onChange={e => setForm(f => ({ ...f, enrolled: e.target.checked }))}
                  className="w-4 h-4 accent-gold-500"
                />
                <label htmlFor="enrolled" className="text-sm font-medium text-gray-700">Enrolled in Membership Class</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Enrollment Date</label>
                  <input type="date" value={form.enrollment_date} onChange={e => setForm(f => ({ ...f, enrollment_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Attendance Count</label>
                  <input type="number" min={0} value={form.attendance_count} onChange={e => setForm(f => ({ ...f, attendance_count: parseInt(e.target.value) || 0 }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Completion Status</label>
                  <select value={form.completion_status} onChange={e => setForm(f => ({ ...f, completion_status: e.target.value as MembershipCompletionStatus }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Completion Date</label>
                  <input type="date" value={form.completion_date} onChange={e => setForm(f => ({ ...f, completion_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-navy-700 hover:bg-navy-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
