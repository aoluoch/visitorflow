import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Phone, MapPin, Plus, X, Search, CheckCircle, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Task, TaskStatus, TaskType, Visitor } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface TaskWithVisitor extends Task {
  visitors: Pick<Visitor, 'id' | 'name' | 'phone'>
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithVisitor[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TaskType | ''>('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'pending'>('pending')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    visitor_id: '',
    task_type: 'call' as TaskType,
    title: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [totalCounts, setTotalCounts] = useState({ pending: 0, completed: 0, cancelled: 0 })

  const loadCounts = useCallback(async () => {
    const [{ count: p }, { count: c }, { count: ca }] = await Promise.all([
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    ])
    setTotalCounts({ pending: p ?? 0, completed: c ?? 0, cancelled: ca ?? 0 })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('tasks')
      .select('*, visitors(id, name, phone)')
      .order('scheduled_date', { ascending: true })
    if (statusFilter) q = q.eq('status', statusFilter)
    if (typeFilter) q = q.eq('task_type', typeFilter)
    const { data, error } = await q
    if (error) toast.error(error.message)
    else {
      let filtered = (data ?? []) as TaskWithVisitor[]
      if (search) filtered = filtered.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.visitors?.name?.toLowerCase().includes(search.toLowerCase()))
      setTasks(filtered)
    }
    setLoading(false)
  }, [search, typeFilter, statusFilter])

  useEffect(() => { load(); loadCounts() }, [load, loadCounts])

  useEffect(() => {
    supabase.from('visitors').select('id, name, phone').order('name').then(({ data }) => setVisitors((data ?? []) as Visitor[]))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.visitor_id || !form.title.trim()) { toast.error('Visitor and title are required'); return }
    setSaving(true)
    const { error } = await supabase.from('tasks').insert([{
      visitor_id: form.visitor_id,
      task_type: form.task_type,
      title: form.title,
      description: form.description || null,
      scheduled_date: form.scheduled_date || null,
      scheduled_time: form.scheduled_time || null,
      notes: form.notes || null,
      status: 'pending',
    }])
    if (error) toast.error(error.message)
    else { toast.success('Task created!'); setShowModal(false); setForm({ visitor_id: '', task_type: 'call', title: '', description: '', scheduled_date: '', scheduled_time: '', notes: '' }); load(); loadCounts() }
    setSaving(false)
  }

  async function updateStatus(id: string, status: TaskStatus) {
    const update: Partial<Task> = { status }
    if (status === 'completed') update.completed_at = new Date().toISOString()
    const { error } = await supabase.from('tasks').update(update).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success(`Task marked as ${status}`); load(); loadCounts() }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(['pending', 'completed', 'cancelled'] as TaskStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`bg-white rounded-xl p-3 border transition-all text-left ${statusFilter === s ? 'border-gold-400 shadow-md' : 'border-gray-100 shadow-sm hover:border-gold-200'}`}
          >
            <p className="text-xl font-bold text-navy-800">{totalCounts[s]}</p>
            <p className="text-xs text-gray-500 capitalize">{s}</p>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TaskType | '')} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
          <option value="">All Types</option>
          <option value="call">Calls</option>
          <option value="visit">Visits</option>
        </select>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Tasks list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <ClipboardList size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No tasks found</p>
          </div>
        ) : tasks.map(t => (
          <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t.task_type === 'call' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                  {t.task_type === 'call' ? <Phone size={16} className="text-blue-600" /> : <MapPin size={16} className="text-amber-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-800 text-sm">{t.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.task_type === 'call' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{t.task_type}</span>
                  </div>
                  {t.visitors && (
                    <Link to={`/admin/visitors/${t.visitor_id}`} className="text-xs text-gold-600 hover:text-gold-700 font-medium">
                      {t.visitors.name}{t.visitors.phone ? ` · ${t.visitors.phone}` : ''}
                    </Link>
                  )}
                  {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
                  {(t.scheduled_date || t.scheduled_time) && (
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar size={11} className="text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {t.scheduled_date ? format(new Date(t.scheduled_date), 'MMM d, yyyy') : ''}{t.scheduled_time ? ` at ${t.scheduled_time}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {t.status === 'pending' && (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => updateStatus(t.id, 'completed')}
                    className="flex items-center gap-1 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    <CheckCircle size={13} /> Done
                  </button>
                  <button
                    onClick={() => updateStatus(t.id, 'cancelled')}
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-600 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl">
              <h2 className="text-lg font-bold text-navy-800">New Task</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Visitor *</label>
                <select value={form.visitor_id} onChange={e => setForm(f => ({ ...f, visitor_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                  <option value="">Select visitor...</option>
                  {visitors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Task Type</label>
                <div className="flex gap-3">
                  {(['call', 'visit'] as TaskType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, task_type: t }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all ${form.task_type === t ? 'bg-navy-700 text-white border-navy-700' : 'border-gray-200 text-gray-600 hover:border-navy-300'}`}
                    >
                      {t === 'call' ? <Phone size={14} /> : <MapPin size={14} />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" placeholder="e.g. Follow-up call" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                  <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Time</label>
                  <input type="time" value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-navy-700 hover:bg-navy-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
