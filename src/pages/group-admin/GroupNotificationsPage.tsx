import { useEffect, useState } from 'react'
import { Bell, Send, Check, Trash2, Clock, Users, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import type { Notification, UserMembership } from '../../types'
import toast from 'react-hot-toast'

export default function GroupNotificationsPage() {
  const { user, userProfile, groupAssignments } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const [sending, setSending] = useState(false)
  const [announcement, setAnnouncement] = useState({
    title: '',
    message: '',
    scope_type: '',
    scope_id: '',
  })
  const [managedGroups, setManagedGroups] = useState<{ id: string; name: string; scope_type: string; scope_id: string }[]>([])

  useEffect(() => {
    loadNotifications()
    loadManagedGroups()
  }, [user])

  async function loadNotifications() {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setNotifications(data || [])
    } catch (err) {
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  async function loadManagedGroups() {
    const groups = await Promise.all(
      groupAssignments.map(async (ga) => {
        let name = ''
        if (ga.scope_type === 'department') {
          const { data } = await supabase.from('departments').select('name').eq('id', ga.scope_id).single()
          name = data?.name || 'Unknown'
        } else if (ga.scope_type === 'cell_group') {
          const { data } = await supabase.from('cell_groups').select('name').eq('id', ga.scope_id).single()
          name = data?.name || 'Unknown'
        } else if (ga.scope_type === 'membership_class') {
          const { data } = await supabase.from('membership_classes_public').select('name').eq('id', ga.scope_id).single()
          name = data?.name || 'Unknown'
        }
        return { id: ga.id, name, scope_type: ga.scope_type, scope_id: ga.scope_id }
      })
    )
    setManagedGroups(groups)
  }

  async function markAsRead(id: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
    if (!error) setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllAsRead() {
    if (!user) return
    const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('recipient_id', user.id).eq('is_read', false)
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('All marked as read')
    }
  }

  async function deleteNotification(id: string) {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (!error) setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function handleSendAnnouncement(e: React.FormEvent) {
    e.preventDefault()
    if (!announcement.title || !announcement.message || !announcement.scope_id) {
      toast.error('Please fill all fields and select a group')
      return
    }
    setSending(true)
    try {
      const selectedGroup = managedGroups.find(g => g.scope_id === announcement.scope_id)
      if (!selectedGroup) throw new Error('Group not found')

      // Get all active members of this group
      const { data: members, error: memError } = await supabase
        .from('user_memberships')
        .select('user_id')
        .eq('group_id', announcement.scope_id)
        .eq('membership_type', selectedGroup.scope_type)
        .eq('is_active', true)
      if (memError) throw memError

      if (!members || members.length === 0) {
        toast.error('No active members in this group')
        setSending(false)
        return
      }

      // Create notifications for all members
      const notifications = members.map(m => ({
        recipient_id: m.user_id,
        type: 'announcement' as const,
        title: announcement.title,
        message: announcement.message,
        data: { group_name: selectedGroup.name, scope_type: selectedGroup.scope_type },
        related_type: selectedGroup.scope_type,
        related_id: announcement.scope_id,
        actor_id: user?.id,
      }))

      const { error } = await supabase.from('notifications').insert(notifications)
      if (error) throw error

      toast.success(`Announcement sent to ${members.length} member(s)`)
      setShowAnnouncement(false)
      setAnnouncement({ title: '', message: '', scope_type: '', scope_id: '' })
    } catch (err: any) {
      toast.error(err.message || 'Failed to send announcement')
    } finally {
      setSending(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'application_received': return <Bell size={18} className="text-blue-500" />
      case 'application_approved': return <Check size={18} className="text-emerald-500" />
      case 'announcement': return <Send size={18} className="text-purple-500" />
      default: return <Bell size={18} className="text-gray-500" />
    }
  }

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <button onClick={markAllAsRead} className="px-3 py-2 text-sm font-medium text-gold-600 border border-gold-200 rounded-lg hover:bg-gold-50">
              Mark all read
            </button>
          )}
          <button
            onClick={() => setShowAnnouncement(true)}
            className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Send size={16} /> Send Announcement
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Bell size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">No {filter === 'unread' ? 'unread ' : ''}notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => (
            <div key={n.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${!n.is_read ? 'bg-blue-50/30 border-blue-100' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className={`font-medium text-sm ${!n.is_read ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</h4>
                      {n.message && <p className="text-sm text-gray-500 mt-1">{n.message}</p>}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                      <Clock size={12} />{format(new Date(n.created_at), 'MMM d')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-3">
                {!n.is_read && (
                  <button onClick={() => markAsRead(n.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg">
                    <Check size={14} /> Mark as read
                  </button>
                )}
                <button onClick={() => deleteNotification(n.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send Announcement Modal */}
      {showAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-navy-800">Send Announcement</h2>
              <button onClick={() => setShowAnnouncement(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSendAnnouncement} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Group *</label>
                <select
                  required
                  value={announcement.scope_id}
                  onChange={e => setAnnouncement(a => ({ ...a, scope_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
                >
                  <option value="">Select a group...</option>
                  {managedGroups.map(g => (
                    <option key={g.scope_id} value={g.scope_id}>{g.name} ({g.scope_type.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
                <input
                  required
                  value={announcement.title}
                  onChange={e => setAnnouncement(a => ({ ...a, title: e.target.value }))}
                  placeholder="Announcement title"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Message *</label>
                <textarea
                  required
                  value={announcement.message}
                  onChange={e => setAnnouncement(a => ({ ...a, message: e.target.value }))}
                  placeholder="Write your announcement..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <Users size={14} className="inline mr-1" />
                This announcement will be sent to all active members of the selected group.
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAnnouncement(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={sending} className="flex-1 bg-navy-700 hover:bg-navy-600 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={15} /> Send</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
