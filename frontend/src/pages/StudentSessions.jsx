import { useState, useEffect } from 'react';
import { Card, Button, Modal, Alert, Badge } from 'react-bootstrap';
import api from '../api/axios';
import { useAuth } from '../context/auth/useAuth';

const statusColor = {
  PENDING: 'warning',
  APPROVED: 'success',
  PENDING_ADMIN: 'warning',
  REJECTED: 'danger',
  CANCELLED: 'secondary',
};

const statusLabel = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  PENDING_ADMIN: 'Awaiting Admin',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

const ACTIVE_STATUSES = ['PENDING', 'APPROVED', 'PENDING_ADMIN'];
const ARCHIVED_STATUSES = ['REJECTED', 'CANCELLED'];

const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const formatDT = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-US', {
    timeZone: userTZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatTimeOnly = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-US', {
    timeZone: userTZ,
    hour: 'numeric',
    minute: '2-digit',
  });
};

const cardStyle = { border: '1.5px solid #e4dcdc', borderRadius: '10px' };

function StudentSessions() {
  const { user } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [coaches, setCoaches] = useState([]);
  const [coachesLoading, setCoachesLoading] = useState(false);

  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showCoachModal, setShowCoachModal] = useState(false);
  const [selectingCoach, setSelectingCoach] = useState(false);

  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchAssignment();
    fetchBookings();
  }, []);

  const fetchAssignment = async () => {
    setAssignmentLoading(true);
    try {
      const res = await api.get('/assignments/my/');
      setAssignment(res.data);
      fetchSlots();
    } catch (err) {
      if (err.response?.status === 404) setAssignment(null);
      else setError('Failed to load assignment.');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const fetchCoaches = async () => {
    setCoachesLoading(true);
    try {
      const res = await api.get('/coaches/');
      setCoaches(res.data);
    } catch {
      setError('Failed to load coaches.');
    } finally {
      setCoachesLoading(false);
    }
  };

  const fetchSlots = async () => {
    try {
      const res = await api.get('/availability/');
      setSlots(res.data);
    } catch {
      setSlots([]);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/');
      setBookings(res.data);
    } catch {
      setBookings([]);
    }
  };

  const handleSelectCoach = async (coachId) => {
    setSelectingCoach(true);
    setError('');
    try {
      await api.post('/assignments/select/', { coach: coachId });
      setShowCoachModal(false);
      setSuccess('Coach selected successfully!');
      fetchAssignment();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to select coach.');
    } finally {
      setSelectingCoach(false);
    }
  };

  const handleBook = async (slotId) => {
    setBookingLoading(true);
    setError('');
    try {
      await api.post('/bookings/create/', { slot: slotId });
      setShowSlotsModal(false);
      setSuccess('Booking request sent!');
      fetchSlots();
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to create booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    setError('');
    try {
      await api.patch(`/bookings/${bookingId}/cancel/`);
      setSuccess('Booking cancelled.');
      fetchBookings();
      fetchSlots();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cancel booking.');
    }
  };

  const activeBookings = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const archivedBookings = bookings.filter((b) => ARCHIVED_STATUSES.includes(b.status));

  return (
    <div style={{ padding: '2rem 2.5rem', fontFamily: 'var(--cu-font-body)' }}>
      <h2 className='cu-auth-title mb-1' style={{ fontSize: '2rem' }}>
        Sessions
      </h2>
      <p className='cu-auth-subtitle mb-4'>Manage your coaching sessions</p>

      {error && (
        <Alert variant='danger' className='py-2 mb-3' style={{ fontSize: '0.88rem' }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant='success' className='py-2 mb-3' style={{ fontSize: '0.88rem' }}>
          {success}
        </Alert>
      )}

      {/* Coach Assignment */}
      <Card className='cu-auth-card p-4 mb-4' style={cardStyle}>
        <Card.Body>
          <h5 className='cu-auth-title mb-1' style={{ fontSize: '1.1rem' }}>
            My Coach
          </h5>
          {assignmentLoading ? (
            <p style={{ color: '#aaa', fontSize: '0.88rem' }}>Loading...</p>
          ) : assignment ? (
            <div className='d-flex align-items-center justify-content-between'>
              <div>
                <p style={{ fontWeight: 600, marginBottom: '0.2rem', color: '#1a1a1a' }}>{assignment.coach_name}</p>
                <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 0 }}>
                  Assigned since {formatDT(assignment.assigned_at)}
                </p>
              </div>
              <Button className='cu-btn-submit' size='sm' onClick={() => setShowSlotsModal(true)}>
                View Available Slots
              </Button>
            </div>
          ) : (
            <div className='d-flex align-items-center justify-content-between'>
              <p style={{ color: '#aaa', fontSize: '0.88rem', marginBottom: 0 }}>You haven't selected a coach yet.</p>
              <Button
                className='cu-btn-submit'
                size='sm'
                onClick={() => {
                  setShowCoachModal(true);
                  fetchCoaches();
                }}
              >
                Browse Coaches
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Active Bookings */}
      <Card className='cu-auth-card p-4 mb-3' style={cardStyle}>
        <Card.Body>
          <h5 className='cu-auth-title mb-3' style={{ fontSize: '1.1rem' }}>
            My Bookings
          </h5>
          {activeBookings.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.88rem' }}>No active bookings.</p>
          ) : (
            <div className='d-flex flex-column gap-3'>
              {activeBookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#fdf8f8',
                    borderRadius: '8px',
                    border: '1px solid #f0eaea',
                  }}
                >
                  <div className='d-flex justify-content-between align-items-start'>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: '0.2rem', fontSize: '0.9rem', color: '#1a1a1a' }}>
                        {formatDT(b.slot_start)} → {formatTimeOnly(b.slot_end)}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: 0 }}>Coach: {b.coach_name}</p>
                    </div>
                    <div className='d-flex align-items-center gap-2'>
                      <Badge bg={statusColor[b.status]}>{statusLabel[b.status]}</Badge>
                      {(b.status === 'PENDING' || b.status === 'APPROVED') && (
                        <Button
                          variant='outline-danger'
                          size='sm'
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => handleCancel(b.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Archived toggle */}
      {archivedBookings.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => setShowArchived((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '0.82rem',
              color: '#912338',
              cursor: 'pointer',
              padding: 0,
              fontWeight: 500,
            }}
          >
            {showArchived ? '▾' : '▸'} {showArchived ? 'Hide' : 'Show'} cancelled & rejected ({archivedBookings.length})
          </button>

          {showArchived && (
            <div className='d-flex flex-column gap-2 mt-2'>
              {archivedBookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #f0eaea',
                    opacity: 0.75,
                  }}
                >
                  <div className='d-flex justify-content-between align-items-start'>
                    <div>
                      <p style={{ fontWeight: 500, marginBottom: '0.2rem', fontSize: '0.88rem', color: '#555' }}>
                        {formatDT(b.slot_start)} → {formatTimeOnly(b.slot_end)}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#aaa', marginBottom: 0 }}>Coach: {b.coach_name}</p>
                      {b.status === 'REJECTED' && b.rejection_note && (
                        <p style={{ fontSize: '0.75rem', color: '#912338', marginTop: '0.25rem', marginBottom: 0 }}>
                          Reason: {b.rejection_note}
                        </p>
                      )}
                    </div>
                    <Badge bg={statusColor[b.status]}>{statusLabel[b.status]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Browse Coaches Modal */}
      <Modal show={showCoachModal} onHide={() => setShowCoachModal(false)} centered size='lg'>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f0eaea' }}>
          <Modal.Title style={{ fontFamily: 'var(--cu-font-brand)', fontSize: '1.3rem' }}>Browse Coaches</Modal.Title>
        </Modal.Header>
        <Modal.Body className='p-4'>
          {coachesLoading ? (
            <p style={{ color: '#aaa' }}>Loading coaches...</p>
          ) : coaches.length === 0 ? (
            <p style={{ color: '#aaa' }}>No coaches available.</p>
          ) : (
            <div className='d-flex flex-column gap-3'>
              {coaches.map((coach) => (
                <div
                  key={coach.id}
                  style={{ padding: '1rem', background: '#fdf8f8', borderRadius: '8px', border: '1px solid #e4dcdc' }}
                >
                  <div className='d-flex justify-content-between align-items-center'>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: '0.2rem', color: '#1a1a1a' }}>{coach.full_name}</p>
                      <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 0 }}>
                        {coach.has_availability
                          ? `${coach.available_slots} slot${coach.available_slots !== 1 ? 's' : ''} available`
                          : 'No slots available'}
                      </p>
                    </div>
                    <Button
                      className='cu-btn-submit'
                      size='sm'
                      disabled={selectingCoach}
                      onClick={() => handleSelectCoach(coach.id)}
                    >
                      Select
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Available Slots Modal */}
      <Modal show={showSlotsModal} onHide={() => setShowSlotsModal(false)} centered>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f0eaea' }}>
          <Modal.Title style={{ fontFamily: 'var(--cu-font-brand)', fontSize: '1.3rem' }}>Available Slots</Modal.Title>
        </Modal.Header>
        <Modal.Body className='p-4'>
          {slots.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.88rem' }}>No available slots right now.</p>
          ) : (
            <div className='d-flex flex-column gap-2'>
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#fdf8f8',
                    borderRadius: '8px',
                    border: '1px solid #f0eaea',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 500, marginBottom: '0.1rem', fontSize: '0.88rem', color: '#1a1a1a' }}>
                      {formatDT(slot.start_time)}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: 0 }}>
                      Until {formatTimeOnly(slot.end_time)}
                    </p>
                  </div>
                  <Button
                    className='cu-btn-submit'
                    size='sm'
                    disabled={bookingLoading}
                    onClick={() => handleBook(slot.id)}
                  >
                    Book
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default StudentSessions;
