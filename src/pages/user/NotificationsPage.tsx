import { useEffect, useState } from 'react'
import { Bell, Check, Trash2, ArrowRight, Clock, CheckCircle, XCircle, Users, BookOpen, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import type { Notification } from '../../types'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
  const { userProfile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    async function loadNotifications() {
      if (!userProfile) return
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', userProfile.id)
          .order('created_at', { ascending: false })
        if (error) throw error
        setNotifications(data || [])
      } catch (err) {
        console.error('Notifications load error:', err)
        toast.error('Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }
    loadNotifications()
  }, [userProfile])

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    } catch (err) {
      toast.error('Failed to mark as read')
    }
  }

  const markAllAsRead = async () => {
    if (!userProfile) return
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('recipient_id', userProfile.id).eq('is_read', false)
      if (error) throw error
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })))
      toast.success('All notifications marked as read')
    } catch (err) {
      toast.error('Failed to mark all as read')
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id)
      if (error) throw error
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      toast.error('Failed to delete notification')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'application_submitted': return <CheckCircle size={18} className="text-blue-500" />
      case 'application_approved': return <CheckCircle size={18} className="text-emerald-500" />
      case 'application_rejected': return <XCircle size={18} className="text-red-500" />
      case 'membership_started': return <Users size={18} className="text-purple-500" />
      case 'class_reminder': return <BookOpen size={18} className="text-amber-500" />
      default: return <Bell size={18} className="text-gray-500" />
    }
  }

  const filteredNotifications = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications
  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy-800">Notifications</h2>
          {unreadCount > 0 && <p className="text-sm text-gray-500">{unreadCount} unread</p>}
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500">
            <option value="all">All</option>
            <option value="unread">Unread</option>
          </select>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="px-3 py-2 text-sm font-medium text-gold-600 hover:text-gold-700 border border-gold-200 rounded-lg hover:bg-gold-50 transition-colors">
              Mark all read
            </button>
          )}
        </div>
      </div>
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Bell size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">No {filter === 'unread' ? 'unread ' : ''}notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map(n => (
            <div key={n.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${!n.is_read ? 'bg-blue-50/30 border-blue-100' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className={`font-medium text-sm ${!n.is_read ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</h4>
                      {n.message && <p className="text-sm text-gray-500 mt-1">{n.message}</p>}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1"><Clock size={12} />{format(new Date(n.created_at), 'MMM d')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-3">
                {!n.is_read && <button onClick={() => markAsRead(n.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Check size={14} /> Mark as read</button>}
                <button onClick={() => deleteNotification(n.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
