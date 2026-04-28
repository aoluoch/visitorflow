import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Clock, User, Calendar, Search, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import type { Application, ApplicationStatusHistory } from '../../types'
import toast from 'react-hot-toast'

export default function GroupApplicationsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, groupAssignments } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [history, setHistory] = useState<ApplicationStatusHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'under_review' | 'approved' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadApplications() {
      if (!user || groupAssignments.length === 0) return
      try {
        // Build filter for managed groups
        const groupFilters = groupAssignments.map(ga => `(target_type.eq.${ga.scope_type}.and.target_id.eq.${ga.scope_id})`).join(',')
        const { data, error } = await supabase
          .from('applications')
          .select('*, applicant:user_profiles(full_name, email, phone)')
          .or(groupFilters)
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
    loadApplications()
  }, [user, groupAssignments, id])

  async function loadHistory(appId: string) {
    try {
      const { data, error } = await supabase.from('application_status_history').select('*').eq('application_id', appId).order('created_at', { ascending: false })
      if (error) throw error
      setHistory(data || [])
    } catch (err) { console.error('History load error:', err) }
  }

  const handleProcess = async (appId: string, status: 'approved' | 'rejected' | 'under_review') => {
    setProcessingId(appId)
    try {
      const { error } = await supabase.from('applications').update({ status, processed_by: user?.id, processed_at: new Date().toISOString(), admin_notes: adminNote || null }).eq('id', appId)
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
      case 'pending': return <Clock size={18} className="text-amber-500" />
      case 'under_review': return <Clock size={18} className="text-blue-500" />
      case 'approved': return <CheckCircle size={18} className="text-emerald-500" />
      case 'rejected': return <XCircle size={18} className="text-red-500" />
      default: return <Clock size={18} className="text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'under_review': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const filteredApplications = applications.filter(app => {
    if (filter !== 'all' && app.status !== filter) return false
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      return app.applicant?.full_name?.toLowerCase().includes(search) || app.target_name.toLowerCase().includes(search)
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (selectedApp) {
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => { setSelectedApp(null); navigate('/group-admin/applications') }} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft size={18} /> Back</button>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(selectedApp.status)}
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedApp.target_name}</h2>
                  <p className="text-sm text-gray-500 capitalize">{selectedApp.target_type.replace('_', ' ')}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedApp.status)}`}>{selectedApp.status.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><User size={14} /> {selectedApp.applicant?.full_name}</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> {format(new Date(selectedApp.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><User size={16} /> Applicant Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <p><span className="font-medium">Name:</span> {selectedApp.applicant?.full_name}</p>
              <p><span className="font-medium">Email:</span> {selectedApp.applicant?.email}</p>
              <p><span className="font-medium">Phone:</span> {selectedApp.applicant?.phone || 'Not provided'}</p>
            </div>
          </div>
          {selectedApp.message && (
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><MessageSquare size={16} /> Applicant Message</h3>
              <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">{selectedApp.message}</p>
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
                      <p className="text-sm"><span className="font-medium capitalize">{h.from_status?.replace('_', ' ') || 'New'}</span> → <span className="font-medium capitalize">{h.to_status.replace('_', ' ')}</span></p>
                      {h.note && <p className="text-xs text-gray-500">{h.note}</p>}
                      <p className="text-xs text-gray-400">{format(new Date(h.created_at), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedApp.status === 'pending' && (
            <div className="p-6 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-3">Process Application</h3>
              <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Add a note (optional)..." rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 mb-3" />
              <div className="flex gap-2">
                <button onClick={() => handleProcess(selectedApp.id, 'under_review')} disabled={processingId === selectedApp.id} className="flex-1 py-2 px-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium disabled:opacity-50">Mark Under Review</button>
                <button onClick={() => handleProcess(selectedApp.id, 'approved')} disabled={processingId === selectedApp.id} className="flex-1 py-2 px-4 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50">Approve</button>
                <button onClick={() => handleProcess(selectedApp.id, 'rejected')} disabled={processingId === selectedApp.id} className="flex-1 py-2 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium disabled:opacity-50">Reject</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-navy-800">Applications</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      {filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100"><p className="text-gray-400">No applications found</p></div>
      ) : (
        <div className="grid gap-4">
          {filteredApplications.map(app => (
            <div key={app.id} onClick={() => { setSelectedApp(app); navigate(`/group-admin/applications/${app.id}`); loadHistory(app.id) }} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(app.status)}
                  <div>
                    <h3 className="font-semibold text-gray-800">{app.applicant?.full_name}</h3>
                    <p className="text-sm text-gray-500">{app.target_name}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(app.status)}`}>{app.status.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Applied {format(new Date(app.created_at), 'MMM d, yyyy')}</span>
                <span className="text-gold-600 hover:text-gold-700">View details →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
