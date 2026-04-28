import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, XCircle, MessageSquare, Clock, User, Calendar,
  Search, FileText, Hourglass, Building2, Users2, BookOpen, ClipboardList
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import type { Application, ApplicationStatusHistory } from '../../types'
import toast from 'react-hot-toast'

export default function AllApplications() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [history, setHistory] = useState<ApplicationStatusHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadApplications()
  }, [id])

  async function loadApplications() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*, applicant:user_profiles(full_name, email, phone)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setApplications(data || [])
      if (id) {
        const app = data?.find(a => a.id === id)
        if (app) { setSelectedApp(app); loadHistory(app.id) }
      }
    } catch (err) {
      console.error('Applications load error:', err)
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  async function loadHistory(appId: string) {
    const { data } = await supabase
      .from('application_status_history')
      .select('*')
      .eq('application_id', appId)
      .order('created_at', { ascending: false })
    setHistory(data || [])
  }

  async function handleProcess(appId: string, status: 'approved' | 'rejected' | 'under_review') {
    setProcessingId(appId)
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
          admin_notes: adminNote || null
        })
        .eq('id', appId)
      if (error) throw error
      toast.success(`Application ${status.replace('_', ' ')}`)
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status, processed_by: user?.id || null, processed_at: new Date().toISOString(), admin_notes: adminNote || null } : a))
      if (selectedApp?.id === appId) {
        setSelectedApp(prev => prev ? { ...prev, status, processed_by: user?.id || null, processed_at: new Date().toISOString(), admin_notes: adminNote || null } : null)
        loadHistory(appId)
      }
      setAdminNote('')
    } catch (err) {
      toast.error('Failed to process application')
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Hourglass size={18} className="text-amber-500" />
      case 'under_review': return <Clock size={18} className="text-blue-500" />
      case 'approved': return <CheckCircle size={18} className="text-emerald-500" />
      case 'rejected': return <XCircle size={18} className="text-red-500" />
      case 'withdrawn': return <XCircle size={18} className="text-gray-500" />
      default: return <Clock size={18} className="text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'under_review': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200'
      case 'withdrawn': return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'department': return Building2
      case 'cell_group': return Users2
      case 'membership_class': return BookOpen
      case 'volunteer_opportunity': return ClipboardList
      default: return FileText
    }
  }

  const filteredApplications = applications.filter(app => {
    if (filter !== 'all' && app.status !== filter) return false
    if (typeFilter !== 'all' && app.target_type !== typeFilter) return false
    if (searchQuery) {
      const s = searchQuery.toLowerCase()
      return (
        app.applicant?.full_name?.toLowerCase().includes(s) ||
        app.target_name?.toLowerCase().includes(s) ||
        app.applicant?.email?.toLowerCase().includes(s)
      )
    }
    return true
  })

  const statusCounts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    under_review: applications.filter(a => a.status === 'under_review').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (selectedApp) {
    const TypeIcon = getTypeIcon(selectedApp.target_type)
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => { setSelectedApp(null); navigate('/admin/applications') }} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={18} /> Back to all applications
        </button>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center">
                  <TypeIcon size={20} className="text-navy-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedApp.target_name}</h2>
                  <p className="text-sm text-gray-500 capitalize">{selectedApp.target_type.replace('_', ' ')}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedApp.status)}`}>
                {selectedApp.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><User size={16} /> Applicant</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <p><span className="font-medium">Name:</span> {selectedApp.applicant?.full_name}</p>
              <p><span className="font-medium">Email:</span> {selectedApp.applicant?.email}</p>
              <p><span className="font-medium">Phone:</span> {selectedApp.applicant?.phone || 'N/A'}</p>
              <p><span className="font-medium">Applied:</span> {format(new Date(selectedApp.created_at), 'MMM d, yyyy h:mm a')}</p>
              {selectedApp.processed_at && <p><span className="font-medium">Processed:</span> {format(new Date(selectedApp.processed_at), 'MMM d, yyyy h:mm a')}</p>}
            </div>
          </div>

          {selectedApp.message && (
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><MessageSquare size={16} /> Message</h3>
              <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">{selectedApp.message}</p>
            </div>
          )}

          {selectedApp.admin_notes && (
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-2">Admin Notes</h3>
              <p className="text-gray-600 text-sm bg-blue-50 p-3 rounded-lg">{selectedApp.admin_notes}</p>
            </div>
          )}

          {history.length > 0 && (
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">Status History</h3>
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-gold-500 mt-2" />
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium capitalize">{h.from_status?.replace('_', ' ') || 'New'}</span>
                        {' → '}
                        <span className="font-medium capitalize">{h.to_status.replace('_', ' ')}</span>
                      </p>
                      {h.note && <p className="text-xs text-gray-500">{h.note}</p>}
                      <p className="text-xs text-gray-400">{format(new Date(h.created_at), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {['pending', 'under_review'].includes(selectedApp.status) && (
            <div className="p-6 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-3">Process Application (Admin Override)</h3>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add a note (optional)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 mb-3"
              />
              <div className="flex gap-2">
                {selectedApp.status === 'pending' && (
                  <button
                    onClick={() => handleProcess(selectedApp.id, 'under_review')}
                    disabled={!!processingId}
                    className="flex-1 py-2 px-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium disabled:opacity-50"
                  >
                    Under Review
                  </button>
                )}
                <button
                  onClick={() => handleProcess(selectedApp.id, 'approved')}
                  disabled={!!processingId}
                  className="flex-1 py-2 px-4 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleProcess(selectedApp.id, 'rejected')}
                  disabled={!!processingId}
                  className="flex-1 py-2 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-navy-800 to-navy-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <FileText size={22} className="text-gold-400" />
          <h2 className="text-lg font-bold">All Applications</h2>
        </div>
        <p className="text-navy-300 text-sm">Review and manage all platform applications.</p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`p-3 rounded-xl border text-left transition-all ${filter === status ? 'border-gold-400 bg-gold-50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'}`}
          >
            <p className="text-2xl font-bold text-navy-800">{count}</p>
            <p className="text-xs text-gray-500 capitalize">{status === 'all' ? 'Total' : status.replace('_', ' ')}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, target..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
        >
          <option value="all">All Types</option>
          <option value="department">Department</option>
          <option value="cell_group">Cell Group</option>
          <option value="membership_class">Membership Class</option>
          <option value="volunteer_opportunity">Volunteer</option>
        </select>
      </div>

      {filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400">No applications found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredApplications.map(app => {
            const TypeIcon = getTypeIcon(app.target_type)
            return (
              <div
                key={app.id}
                onClick={() => { setSelectedApp(app); navigate(`/admin/applications/${app.id}`); loadHistory(app.id) }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(app.status)}
                    <div>
                      <h3 className="font-semibold text-gray-800">{app.applicant?.full_name || 'Unknown'}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <TypeIcon size={14} />
                        {app.target_name}
                        <span className="text-gray-400">·</span>
                        <span className="capitalize">{app.target_type.replace('_', ' ')}</span>
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(app.status)}`}>
                    {app.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Applied {format(new Date(app.created_at), 'MMM d, yyyy')}</span>
                  <span className="text-gold-600 hover:text-gold-700">View details →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
