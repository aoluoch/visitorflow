import { useEffect, useState, useRef } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import type { Notification } from '../../types'
import toast from 'react-hot-toast'

export default function NotificationBell() {
  const { userProfile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadNotifications() {
      if (!userProfile) return
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', userProfile.id)
          .order('created_at', { ascending: false })
          .limit(10)
        if (error) throw error
        setNotifications(data || [])
        setUnreadCount(data?.filter(n => !n.is_read).length || 0)
      } catch (err) {
        console.error('Notifications load error:', err)
      }
    }
    loadNotifications()

    // Subscribe to new notifications
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userProfile?.id}` }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 10))
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => { subscription.unsubscribe() }
  }, [userProfile])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      toast.error('Failed to mark as read')
    }
  }

  const markAllAsRead = async () => {
    if (!userProfile) return
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('recipient_id', userProfile.id).eq('is_read', false)
      if (error) throw error
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      toast.error('Failed to mark all as read')
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-gray-600 hover:text-navy-700 hover:bg-gray-100 rounded-lg transition-colors">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-gold-600 hover:text-gold-700 font-medium">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No notifications</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!n.is_read ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                      {n.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
                      <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                    </div>
                    {!n.is_read && (
                      <button onClick={() => markAsRead(n.id)} className="text-emerald-500 hover:text-emerald-600 p-1"><Check size={14} /></button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <a href="/user/notifications" className="text-xs text-gold-600 hover:text-gold-700 font-medium text-center block">View all notifications</a>
          </div>
        </div>
      )}
    </div>
  )
}
