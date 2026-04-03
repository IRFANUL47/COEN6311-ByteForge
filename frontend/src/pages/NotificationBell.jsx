import { useState, useEffect, useRef } from 'react'
import api from '../api/axios'

function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count/')
      setUnread(res.data.unread_count)
    } catch {
      // silent fail
    }
  }

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/')
      setNotifications(res.data)
    } catch {
      // silent fail
    }
  }

  const handleOpen = () => {
    if (!open) fetchNotifications()
    setOpen(!open)
  }

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read/`)
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
      setUnread((prev) => Math.max(0, prev - 1))
    } catch {
      // silent fail
    }
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all/')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnread(0)
    } catch {
      // silent fail
    }
  }

  const formatTime = (dt) => {
    if (!dt) return ''
    const date = new Date(dt)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
      >
        <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#555' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' />
          <path d='M13.73 21a2 2 0 0 1-3.46 0' />
        </svg>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#912338', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: '2rem', width: '320px', background: '#fff', borderRadius: '10px', border: '1.5px solid #e4dcdc', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 1000 }}>
          <div className='d-flex justify-content-between align-items-center px-3 py-2' style={{ borderBottom: '1px solid #f0eaea' }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1a1a1a' }}>Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: '#912338', cursor: 'pointer', fontWeight: 500 }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <p style={{ padding: '1rem', color: '#aaa', fontSize: '0.82rem', margin: 0, textAlign: 'center' }}>No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f9f5f5', background: n.is_read ? '#fff' : '#fdf5f5', cursor: n.is_read ? 'default' : 'pointer' }}
                >
                  <p style={{ fontSize: '0.82rem', color: '#333', marginBottom: '0.2rem', lineHeight: 1.4 }}>{n.message}</p>
                  <p style={{ fontSize: '0.72rem', color: '#aaa', marginBottom: 0 }}>{formatTime(n.created_at)}</p>
                  {!n.is_read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#912338', display: 'inline-block', float: 'right', marginTop: '-1rem' }} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
