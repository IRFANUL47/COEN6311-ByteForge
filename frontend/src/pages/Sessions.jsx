import { useAuth } from '../context/auth/useAuth'
import StudentSessions from './StudentSessions'
import CoachSessions from './CoachSessions'
import AdminSessions from './AdminSessions'

function Sessions() {
  const { user } = useAuth()

  if (user?.role === 'STUDENT') return <StudentSessions />
  if (user?.role === 'COACH') return <CoachSessions />
  if (user?.role === 'ADMIN') return <AdminSessions />

  return null
}

export default Sessions
