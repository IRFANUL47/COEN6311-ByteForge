import { useState, useEffect } from 'react'
import { Card, Button, Modal, Alert, Badge, Form } from 'react-bootstrap'
import api from '../api/axios'

const formatDT = (dt) => {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const cardStyle = { border: '1.5px solid #e4dcdc', borderRadius: '10px' }

function AdminSessions() {
  const [assignments, setAssignments] = useState([])
  const [pendingAdminBookings, setPendingAdminBookings] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showReassignModal, setShowReassignModal] = useState(false)
  const [reassigningAssignment, setReassigningAssignment] = useState(null)
  const [coaches, setCoaches] = useState([])
  const [selectedCoach, setSelectedCoach] = useState('')
  const [reassignLoading, setReassignLoading] = useState(false)

  useEffect(() => {
    fetchAssignments()
    fetchPendingAdminBookings()
  }, [])

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/assignments/')
      setAssignments(res.data)
    } catch {
      setError('Failed to load assignments.')
    }
  }

  const fetchPendingAdminBookings = async () => {
    try {
      const res = await api.get('/bookings/')
      setPendingAdminBookings(res.data.filter((b) => b.status === 'PENDING_ADMIN'))
    } catch {
      setError('Failed to load bookings.')
    }
  }

  const fetchCoaches = async () => {
    try {
      const res = await api.get('/coaches/')
      setCoaches(res.data)
    } catch {
      setError('Failed to load coaches.')
    }
  }

  const openReassign = (assignment) => {
    setReassigningAssignment(assignment)
    setSelectedCoach('')
    setShowReassignModal(true)
    fetchCoaches()
  }

  const handleReassign = async () => {
    if (!selectedCoach) return
    setReassignLoading(true)
    setError('')
    try {
      await api.put(`/assignments/${reassigningAssignment.id}/reassign/`, { coach: selectedCoach })
      setShowReassignModal(false)
      setSuccess('Student reassigned successfully.')
      fetchAssignments()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reassign.')
    } finally {
      setReassignLoading(false)
    }
  }

  const handleApproveRejection = async (bookingId) => {
    setError('')
    try {
      await api.patch(`/bookings/${bookingId}/admin-approve-rejection/`)
      setSuccess('Rejection approved. Student has been notified.')
      fetchPendingAdminBookings()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed.')
    }
  }

  const handleDenyRejection = async (bookingId) => {
    setError('')
    try {
      await api.patch(`/bookings/${bookingId}/admin-deny-rejection/`)
      setSuccess('Rejection denied. Booking remains approved.')
      fetchPendingAdminBookings()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed.')
    }
  }

  return (
    <div style={{ padding: '2rem 2.5rem', fontFamily: 'var(--cu-font-body)' }}>
      <h2 className='cu-auth-title mb-1' style={{ fontSize: '2rem' }}>Sessions</h2>
      <p className='cu-auth-subtitle mb-4'>Manage coach-student assignments and booking disputes</p>

      {error && <Alert variant='danger' className='py-2 mb-3' style={{ fontSize: '0.88rem' }}>{error}</Alert>}
      {success && <Alert variant='success' className='py-2 mb-3' style={{ fontSize: '0.88rem' }}>{success}</Alert>}

      {/* Pending Rejections */}
      <Card className='cu-auth-card p-4 mb-4' style={{ ...cardStyle, borderColor: pendingAdminBookings.length > 0 ? '#f5c2c7' : '#e4dcdc' }}>
        <Card.Body>
          <div className='d-flex align-items-center gap-2 mb-3'>
            <h5 className='cu-auth-title mb-0' style={{ fontSize: '1.1rem' }}>Pending Rejection Requests</h5>
            {pendingAdminBookings.length > 0 && (
              <Badge bg='danger' style={{ fontSize: '0.75rem' }}>{pendingAdminBookings.length}</Badge>
            )}
          </div>
          {pendingAdminBookings.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.88rem' }}>No pending rejection requests.</p>
          ) : (
            <div className='d-flex flex-column gap-3'>
              {pendingAdminBookings.map((b) => (
                <div key={b.id} style={{ padding: '0.75rem 1rem', background: '#fdf8f8', borderRadius: '8px', border: '1px solid #f5c2c7' }}>
                  <div className='d-flex justify-content-between align-items-start'>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: '0.2rem', fontSize: '0.9rem', color: '#1a1a1a' }}>
                        {b.student_name} → {b.coach_name}
                      </p>
                      <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '0.3rem' }}>{formatDT(b.slot_start)}</p>
                      <p style={{ fontSize: '0.82rem', color: '#912338', marginBottom: 0 }}>Rejection reason: {b.rejection_note}</p>
                    </div>
                    <div className='d-flex gap-2'>
                      <Button variant='outline-danger' size='sm' style={{ fontSize: '0.75rem' }} onClick={() => handleApproveRejection(b.id)}>Approve Rejection</Button>
                      <Button variant='outline-success' size='sm' style={{ fontSize: '0.75rem' }} onClick={() => handleDenyRejection(b.id)}>Deny Rejection</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Assignments */}
      <Card className='cu-auth-card p-4' style={cardStyle}>
        <Card.Body>
          <h5 className='cu-auth-title mb-3' style={{ fontSize: '1.1rem' }}>Coach-Student Assignments</h5>
          {assignments.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.88rem' }}>No assignments yet.</p>
          ) : (
            <div className='d-flex flex-column gap-2'>
              {assignments.map((a) => (
                <div key={a.id} style={{ padding: '0.75rem 1rem', background: '#fdf8f8', borderRadius: '8px', border: '1px solid #f0eaea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: '0.1rem', fontSize: '0.88rem', color: '#1a1a1a' }}>{a.student_name}</p>
                    <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: 0 }}>Coach: {a.coach_name} · Since {formatDT(a.assigned_at)}</p>
                  </div>
                  <Button variant='outline-secondary' size='sm' style={{ fontSize: '0.75rem' }} onClick={() => openReassign(a)}>Reassign</Button>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Reassign Modal */}
      <Modal show={showReassignModal} onHide={() => setShowReassignModal(false)} centered>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f0eaea' }}>
          <Modal.Title style={{ fontFamily: 'var(--cu-font-brand)', fontSize: '1.3rem' }}>Reassign Coach</Modal.Title>
        </Modal.Header>
        <Modal.Body className='p-4'>
          {reassigningAssignment && (
            <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: '1rem' }}>
              Reassigning <strong>{reassigningAssignment.student_name}</strong> from <strong>{reassigningAssignment.coach_name}</strong>
            </p>
          )}
          <Form.Group className='mb-4'>
            <Form.Label className='cu-form-label'>Select New Coach</Form.Label>
            <Form.Select className='cu-form-input' value={selectedCoach} onChange={(e) => setSelectedCoach(e.target.value)}>
              <option value=''>Choose a coach...</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Button className='cu-btn-submit w-100' disabled={!selectedCoach || reassignLoading} onClick={handleReassign}>
            {reassignLoading ? 'Reassigning...' : 'Reassign'}
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  )
}

export default AdminSessions
