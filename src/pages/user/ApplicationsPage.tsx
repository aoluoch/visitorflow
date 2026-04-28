import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, CheckCircle, XCircle, Hourglass, ArrowLeft, MessageSquare, Calendar, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import type { Application, ApplicationStatusHistory } from '../../types'
import toast from 'react-hot-toast'

export default function ApplicationsPage() {
  const { userProfile } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [history, setHistory] = useState<ApplicationStatusHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    async function loadApplications() {
      if (!userProfile) return
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .eq('applicant_id', userProfile.id)
          .order('created_at', { ascending: false })
        if (error) throw error
        setApplications(data || [])
        if (id) {
          const app = data?.find(a => a.id === id)
          if (app) {
            setSelectedApp(app)
            loadHistory(app.id)
          }
        }
      } catch (err) {
        console.error('Applications load error:', err)
        toast.error('Failed to load applications')
      } finally {
        setLoading(false)
      }
    }
    loadApplications()
  }, [userProfile, id])

  async function loadHistory(appId: string) {
    try {
      const { data, error } = await supabase
        .from('application_status_history')
        .select('*')
        .eq('application_id', appId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setHistory(data || [])
    } catch (err) {
      console.error('History load error:', err)
    }
  }

  const handleWithdraw = async (appId: string) => {
    if (!confirm('Are you sure you want to withdraw this application?')) return
    try {
      const { error } = await supabase.from('applications').update({ status: 'withdrawn' }).eq('id', appId)
      if (error) throw error
      toast.success('Application withdrawn')
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'withdrawn' } : a))
      if (selectedApp?.id === appId) setSelectedApp(prev => prev ? { ...prev, status: 'withdrawn' } : null)
    } catch (err) {
      toast.error('Failed to withdraw application')
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

  const filteredApplications = applications.filter(app => filter === 'all' || app.status === filter)

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
        <button onClick={() => { setSelectedApp(null); navigate('/user/applications') }} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={18} /> Back to applications
        </button>
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
              <span className="flex items-center gap-1"><Calendar size={14} /> Submitted {format(new Date(selectedApp.created_at), 'MMM d, yyyy')}</span>
              {selectedApp.processed_at && <span className="flex items-center gap-1"><CheckCircle size={14} /> Processed {format(new Date(selectedApp.processed_at), 'MMM d, yyyy')}</span>}
            </div>
          </div>
          {selectedApp.message && (
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><MessageSquare size={16} /> Your Message</h3>
              <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">{selectedApp.message}</p>
            </div>
          )}
          {selectedApp.admin_notes && (
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><User size={16} /> Admin Response</h3>
              <p className="text-gray-600 text-sm bg-blue-50 p-3 rounded-lg">{selectedApp.admin_notes}</p>
            </div>
          )}
          {history.length > 0 && (
            <div className="p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Status History</h3>
              <div className="space-y-3">
                {history.map((h, i) => (
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
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <button onClick={() => handleWithdraw(selectedApp.id)} className="w-full py-2 px-4 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium">Withdraw Application</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-navy-800">My Applications</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400 mb-4">No applications found</p>
          <a href="/user/explore" className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors">Explore Opportunities</a>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredApplications.map(app => (
            <div key={app.id} onClick={() => { setSelectedApp(app); navigate(`/user/applications/${app.id}`); loadHistory(app.id) }} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(app.status)}
                  <div>
                    <h3 className="font-semibold text-gray-800">{app.target_name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{app.target_type.replace('_', ' ')}</p>
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
