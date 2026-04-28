import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Plus, X, Search, Edit2, Trash2, UserCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Department, Visitor, VisitorDepartment, ServiceRecord } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface DeptWithCount extends Department { member_count: number }
interface AssignmentWithRelations extends VisitorDepartment {
  visitors: Pick<Visitor, 'id' | 'name'>
  departments: Department
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DeptWithCount[]>([])
  const [assignments, setAssignments] = useState<AssignmentWithRelations[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'departments' | 'assignments' | 'service_records'>('departments')
  const [serviceRecords, setServiceRecords] = useState<(ServiceRecord & { visitor_departments: AssignmentWithRelations })[]>([])
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [deptForm, setDeptForm] = useState({ name: '', description: '', leader: '', is_public: true, status: 'active' })
  const [enrollForm, setEnrollForm] = useState({ visitor_id: '', department_id: '' })
  const [serviceForm, setServiceForm] = useState({ visitor_department_id: '', service_date: new Date().toISOString().split('T')[0], description: '', hours_served: '' })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: depts }, { data: assigns }, { data: records }] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('visitor_departments').select('*, visitors(id, name), departments(*)').eq('enrolled', true),
      supabase.from('service_records').select('*, visitor_departments(*, visitors(id, name), departments(*))').order('service_date', { ascending: false }),
    ])
    const deptsWithCount = (depts ?? []).map(d => ({
      ...d,
      member_count: (assigns ?? []).filter(a => a.department_id === d.id).length,
    }))
    setDepartments(deptsWithCount as DeptWithCount[])
    setAssignments((assigns ?? []) as AssignmentWithRelations[])
    setServiceRecords((records ?? []) as (ServiceRecord & { visitor_departments: AssignmentWithRelations })[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    supabase.from('visitors').select('id, name').order('name').then(({ data }) => setVisitors((data ?? []) as Visitor[]))
  }, [])

  async function handleSaveDept(e: React.FormEvent) {
    e.preventDefault()
    if (!deptForm.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const payload = { name: deptForm.name, description: deptForm.description || null, leader: deptForm.leader || null, is_public: deptForm.is_public, status: deptForm.status }
    const { error } = editingDept
      ? await supabase.from('departments').update(payload).eq('id', editingDept.id)
      : await supabase.from('departments').insert([payload])
    if (error) toast.error(error.message)
    else { toast.success(editingDept ? 'Updated!' : 'Department created!'); setShowDeptModal(false); setDeptForm({ name: '', description: '', leader: '', is_public: true, status: 'active' }); load() }
    setSaving(false)
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault()
    if (!enrollForm.visitor_id || !enrollForm.department_id) { toast.error('Select visitor and department'); return }
    setSaving(true)
    const { error } = await supabase.from('visitor_departments').upsert([{
      visitor_id: enrollForm.visitor_id,
      department_id: enrollForm.department_id,
      enrolled: true,
      enrollment_date: new Date().toISOString().split('T')[0],
    }], { onConflict: 'visitor_id,department_id' })
    if (error) toast.error(error.message)
    else { toast.success('Enrolled!'); setShowEnrollModal(false); setEnrollForm({ visitor_id: '', department_id: '' }); load() }
    setSaving(false)
  }

  async function handleAddServiceRecord(e: React.FormEvent) {
    e.preventDefault()
    if (!serviceForm.visitor_department_id) { toast.error('Select an assignment'); return }
    setSaving(true)
    const { error } = await supabase.from('service_records').insert([{
      visitor_department_id: serviceForm.visitor_department_id,
      service_date: serviceForm.service_date,
      description: serviceForm.description || null,
      hours_served: serviceForm.hours_served ? parseFloat(serviceForm.hours_served) : null,
    }])
    if (error) toast.error(error.message)
    else { toast.success('Service record added!'); setShowServiceModal(false); load() }
    setSaving(false)
  }

  async function handleDeleteDept(id: string) {
    const { error } = await supabase.from('departments').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); load() }
    setDeleteId(null)
  }

  const filtered = {
    departments: departments.filter(d => d.name.toLowerCase().includes(search.toLowerCase())),
    assignments: assignments.filter(a => a.visitors.name.toLowerCase().includes(search.toLowerCase())),
    service_records: serviceRecords,
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['departments', 'assignments', 'service_records'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-gold-500 text-navy-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'departments' ? `Departments (${departments.length})` : t === 'assignments' ? `Enrollments (${assignments.length})` : `Service Records (${serviceRecords.length})`}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
        </div>
        {tab === 'departments' && (
          <button onClick={() => { setEditingDept(null); setDeptForm({ name: '', description: '', leader: '', is_public: true, status: 'active' }); setShowDeptModal(true) }} className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
            <Plus size={16} /> New Department
          </button>
        )}
        {tab === 'assignments' && (
          <button onClick={() => setShowEnrollModal(true)} className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
            <UserCheck size={16} /> Enroll Visitor
          </button>
        )}
        {tab === 'service_records' && (
          <button onClick={() => setShowServiceModal(true)} className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
            <Plus size={16} /> Add Record
          </button>
        )}
      </div>

      {/* Departments Grid */}
      {tab === 'departments' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 flex justify-center py-12"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.departments.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-400">No departments found</div>
          ) : filtered.departments.map(d => (
            <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gold-100 flex items-center justify-center">
                  <Building2 size={20} className="text-gold-600" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingDept(d); setDeptForm({ name: d.name, description: d.description ?? '', leader: d.leader ?? '', is_public: (d as any).is_public ?? true, status: (d as any).status ?? 'active' }); setShowDeptModal(true) }} className="p-1.5 rounded-lg text-gray-400 hover:text-navy-700 hover:bg-navy-50"><Edit2 size={14} /></button>
                  <button onClick={() => setDeleteId(d.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="font-bold text-navy-800 mb-1">{d.name}</h3>
              {d.leader && <p className="text-xs text-gray-500 mb-1">Leader: {d.leader}</p>}
              {d.description && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{d.description}</p>}
              <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-1.5">
                <Building2 size={13} className="text-gray-400" />
                <span className="text-xs text-gray-500">{d.member_count} member{d.member_count !== 1 ? 's' : ''}</span>
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Department</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Enrolled</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-10"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                ) : filtered.assignments.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-400">No enrollments found</td></tr>
                ) : filtered.assignments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{a.visitors.name}</td>
                    <td className="px-4 py-3 text-gray-600">{a.departments.name}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{format(new Date(a.enrollment_date), 'MMM d, yyyy')}</td>
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

      {/* Service Records */}
      {tab === 'service_records' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Visitor</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Department</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Hours</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-10"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                ) : serviceRecords.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">No service records</td></tr>
                ) : serviceRecords.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.visitor_departments?.visitors?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.visitor_departments?.departments?.name}</td>
                    <td className="px-4 py-3 text-gray-500">{format(new Date(r.service_date), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{r.hours_served ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 hidden lg:table-cell truncate max-w-xs">{r.description ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-navy-800">{editingDept ? 'Edit' : 'New'} Department</h2>
              <button onClick={() => setShowDeptModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveDept} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
                <input required value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Leader</label>
                <input value={deptForm.leader} onChange={e => setDeptForm(f => ({ ...f, leader: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea rows={2} value={deptForm.description} onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select value={deptForm.status} onChange={e => setDeptForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-2">
                    <input type="checkbox" checked={deptForm.is_public} onChange={e => setDeptForm(f => ({ ...f, is_public: e.target.checked }))} className="w-4 h-4 text-gold-500 border-gray-300 rounded focus:ring-gold-500" />
                    Visible to users
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowDeptModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-navy-700 hover:bg-navy-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-navy-800">Enroll in Department</h2>
              <button onClick={() => setShowEnrollModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEnroll} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Visitor *</label>
                <select value={enrollForm.visitor_id} onChange={e => setEnrollForm(f => ({ ...f, visitor_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                  <option value="">Select visitor...</option>
                  {visitors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Department *</label>
                <select value={enrollForm.department_id} onChange={e => setEnrollForm(f => ({ ...f, department_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                  <option value="">Select department...</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEnrollModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-navy-700 hover:bg-navy-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Record Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-navy-800">Add Service Record</h2>
              <button onClick={() => setShowServiceModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddServiceRecord} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Visitor / Department Enrollment *</label>
                <select value={serviceForm.visitor_department_id} onChange={e => setServiceForm(f => ({ ...f, visitor_department_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                  <option value="">Select enrollment...</option>
                  {assignments.map(a => <option key={a.id} value={a.id}>{a.visitors.name} — {a.departments.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Service Date</label>
                  <input type="date" value={serviceForm.service_date} onChange={e => setServiceForm(f => ({ ...f, service_date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Hours Served</label>
                  <input type="number" step="0.5" min="0" value={serviceForm.hours_served} onChange={e => setServiceForm(f => ({ ...f, hours_served: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea rows={2} value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowServiceModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-navy-700 hover:bg-navy-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save'}
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
            <h3 className="font-bold text-gray-800 mb-2">Delete Department?</h3>
            <p className="text-gray-500 text-sm mb-5">All enrollments and service records for this department will be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDeleteDept(deleteId)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
