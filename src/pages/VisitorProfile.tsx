import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, MessageSquare,
  Radio, Edit2, Save, X, CheckCircle, Users2, Building2, BookOpen
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Visitor, VisitorStage, HowHeard, MembershipClass, VisitorCellGroup, VisitorDepartment } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const STAGES: VisitorStage[] = ['New Visitor', 'Returning Visitor', 'Member', 'Cell Member', 'Department Member']
const HOW_HEARD: HowHeard[] = ['Friend', 'Social Media', 'Flyer', 'Radio', 'Walk-in', 'Online', 'Other']

const STAGE_COLORS: Record<string, string> = {
  'New Visitor': 'bg-blue-100 text-blue-700',
  'Returning Visitor': 'bg-purple-100 text-purple-700',
  'Member': 'bg-emerald-100 text-emerald-700',
  'Cell Member': 'bg-yellow-100 text-yellow-700',
  'Department Member': 'bg-orange-100 text-orange-700',
}

export default function VisitorProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [visitor, setVisitor] = useState<Visitor | null>(null)
  const [membership, setMembership] = useState<MembershipClass | null>(null)
  const [cellGroup, setCellGroup] = useState<VisitorCellGroup | null>(null)
  const [departments, setDepartments] = useState<VisitorDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Visitor>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    async function load() {
      const [
        { data: v },
        { data: m },
        { data: cg },
        { data: depts },
      ] = await Promise.all([
        supabase.from('visitors').select('*').eq('id', id).single(),
        supabase.from('membership_classes').select('*').eq('visitor_id', id).single(),
        supabase.from('visitor_cell_groups').select('*, cell_groups(*)').eq('visitor_id', id).single(),
        supabase.from('visitor_departments').select('*, departments(*)').eq('visitor_id', id),
      ])
      setVisitor(v as Visitor)
      setForm(v as Visitor)
      setMembership(m as MembershipClass)
      setCellGroup(cg as VisitorCellGroup)
      setDepartments((depts ?? []) as VisitorDepartment[])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave() {
    if (!id || !form.name?.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const { error } = await supabase.from('visitors').update(form).eq('id', id)
    if (error) { toast.error(error.message) }
    else {
      toast.success('Profile updated')
      setVisitor(f => ({ ...f!, ...form }))
      setEditing(false)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!visitor) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Visitor not found</p>
        <Link to="/visitors" className="text-gold-600 hover:text-gold-700 text-sm mt-2 inline-block">← Back to visitors</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-navy-700 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header card */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gold-500 flex items-center justify-center text-navy-900 text-2xl font-bold flex-shrink-0">
              {visitor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{visitor.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STAGE_COLORS[visitor.current_stage] ?? 'bg-gray-100 text-gray-700'}`}>
                  {visitor.current_stage}
                </span>
                <span className="text-xs text-navy-300 flex items-center gap-1">
                  <Calendar size={12} /> First visited: {format(new Date(visitor.visit_date), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => editing ? setEditing(false) : setEditing(true)}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm transition-colors flex-shrink-0"
          >
            {editing ? <><X size={15} /> Cancel</> : <><Edit2 size={15} /> Edit</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Profile details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-navy-800 mb-4 flex items-center gap-2">
              <Phone size={16} className="text-gold-500" /> Contact Information
            </h3>
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                  <input
                    value={form.name ?? ''}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                  <input
                    value={form.phone ?? ''}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Visit Date</label>
                  <input
                    type="date"
                    value={form.visit_date ?? ''}
                    onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
                  <input
                    value={form.address ?? ''}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Current Stage</label>
                  <select
                    value={form.current_stage ?? 'New Visitor'}
                    onChange={e => setForm(f => ({ ...f, current_stage: e.target.value as VisitorStage }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">How Heard</label>
                  <select
                    value={form.how_heard ?? ''}
                    onChange={e => setForm(f => ({ ...f, how_heard: e.target.value as HowHeard }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
                  >
                    <option value="">Select...</option>
                    {HOW_HEARD.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-navy-700 hover:bg-navy-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={15} /> Save</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {visitor.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{visitor.phone}</span>
                  </div>
                )}
                {visitor.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{visitor.email}</span>
                  </div>
                )}
                {visitor.address && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{visitor.address}</span>
                  </div>
                )}
                {visitor.how_heard && (
                  <div className="flex items-center gap-3 text-sm">
                    <Radio size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">Heard via: {visitor.how_heard}</span>
                  </div>
                )}
                {!visitor.phone && !visitor.email && !visitor.address && (
                  <p className="text-gray-400 text-sm">No contact details recorded</p>
                )}
              </div>
            )}
          </div>

          {/* Prayer Requests */}
          {(visitor.prayer_requests || editing) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-navy-800 mb-3 flex items-center gap-2">
                <MessageSquare size={16} className="text-gold-500" /> Prayer Requests
              </h3>
              {editing ? (
                <textarea
                  rows={4}
                  value={form.prayer_requests ?? ''}
                  onChange={e => setForm(f => ({ ...f, prayer_requests: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
                />
              ) : (
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{visitor.prayer_requests || '—'}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {(visitor.notes || editing) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-navy-800 mb-3">Notes</h3>
              {editing ? (
                <textarea
                  rows={3}
                  value={form.notes ?? ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
                />
              ) : (
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{visitor.notes || '—'}</p>
              )}
            </div>
          )}
        </div>

        {/* Right: Quick summary */}
        <div className="space-y-4">
          {/* Membership */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-navy-800 text-sm flex items-center gap-1.5">
                <BookOpen size={15} className="text-gold-500" /> Membership Class
              </h3>
              <Link to="/membership" className="text-xs text-gold-600 hover:text-gold-700">Manage →</Link>
            </div>
            {membership ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className={membership.enrolled ? 'text-emerald-500' : 'text-gray-300'} />
                  <span className="text-gray-600">{membership.enrolled ? 'Enrolled' : 'Not enrolled'}</span>
                </div>
                <p className="text-xs text-gray-500">Status: <span className="font-medium text-gray-700">{membership.completion_status}</span></p>
                <p className="text-xs text-gray-500">Attendance: <span className="font-medium text-gray-700">{membership.attendance_count}</span></p>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No membership record</p>
            )}
          </div>

          {/* Cell Group */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-navy-800 text-sm flex items-center gap-1.5">
                <Users2 size={15} className="text-gold-500" /> Cell Group
              </h3>
              <Link to="/cell-groups" className="text-xs text-gold-600 hover:text-gold-700">Manage →</Link>
            </div>
            {cellGroup?.cell_groups ? (
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span className="font-medium text-gray-700">{cellGroup.cell_groups.name}</span>
                </div>
                {cellGroup.cell_groups.meeting_day && (
                  <p className="text-xs text-gray-500">{cellGroup.cell_groups.meeting_day} · {cellGroup.cell_groups.meeting_time}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Not assigned to a cell group</p>
            )}
          </div>

          {/* Departments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-navy-800 text-sm flex items-center gap-1.5">
                <Building2 size={15} className="text-gold-500" /> Departments
              </h3>
              <Link to="/departments" className="text-xs text-gold-600 hover:text-gold-700">Manage →</Link>
            </div>
            {departments.length > 0 ? (
              <div className="space-y-1.5">
                {departments.map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{d.departments?.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Not enrolled in any department</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
