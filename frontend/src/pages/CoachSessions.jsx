import { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import api from '../api/axios';

const DEFAULT_DURATION_MINS = 30;

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

function CoachSessions() {
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAddSlot, setShowAddSlot] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [slotError, setSlotError] = useState('');
  const [slotLoading, setSlotLoading] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingBooking, setRejectingBooking] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchSlots();
    fetchBookings();
  }, []);

  const fetchSlots = async () => {
    try {
      const res = await api.get('/availability/');
      setSlots(res.data);
    } catch {
      setError('Failed to load availability slots.');
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/');
      setBookings(res.data);
    } catch {
      setError('Failed to load bookings.');
    }
  };

  const handleStartTimeChange = (value) => {
    setSlotStartTime(value);
    if (value && slotDate) {
      const start = new Date(`${slotDate}T${value}`);
      const maxEnd = new Date(start.getTime() + DEFAULT_DURATION_MINS * 60 * 1000);
      const hh = String(maxEnd.getHours()).padStart(2, '0');
      const mm = String(maxEnd.getMinutes()).padStart(2, '0');
      setSlotEndTime(`${hh}:${mm}`);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setSlotError('');

    if (!slotDate || !slotStartTime || !slotEndTime) {
      setSlotError('Please fill in date, start time, and end time.');
      return;
    }

    const startDT = new Date(`${slotDate}T${slotStartTime}`);
    const endDT = new Date(`${slotDate}T${slotEndTime}`);

    if (endDT <= startDT) {
      setSlotError('End time must be after start time.');
      return;
    }

    setSlotLoading(true);
    try {
      await api.post('/availability/create/', {
        start_time: startDT.toISOString(),
        end_time: endDT.toISOString(),
      });
      setShowAddSlot(false);
      setSlotDate('');
      setSlotStartTime('');
      setSlotEndTime('');
      setSuccess('Slot added.');
      fetchSlots();
    } catch (err) {
      const data = err.response?.data;
      if (
        data?.__all__?.[0]?.toLowerCase().includes('already exists') ||
        data?.detail?.toLowerCase().includes('already exists') ||
        err.response?.status === 400
      ) {
        setSlotError('You already have a slot starting at that time. Please choose a different start time.');
      } else {
        setSlotError(data?.detail || JSON.stringify(data) || 'Failed to add slot.');
      }
    } finally {
      setSlotLoading(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    setError('');
    try {
      await api.delete(`/availability/${id}/delete/`);
      setSuccess('Slot deleted.');
      fetchSlots();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete slot.');
    }
  };

  const handleApprove = async (bookingId) => {
    setError('');
    try {
      await api.patch(`/bookings/${bookingId}/approve/`);
      setSuccess('Booking approved.');
      fetchBookings();
      fetchSlots();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to approve booking.');
    }
  };

  const handleRequestRejection = async () => {
    if (!rejectionNote.trim()) return;
    setRejectLoading(true);
    setError('');
    try {
      await api.patch(`/bookings/${rejectingBooking}/request-rejection/`, { rejection_note: rejectionNote });
      setShowRejectModal(false);
      setRejectionNote('');
      setRejectingBooking(null);
      setSuccess('Rejection request sent to admin.');
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to request rejection.');
    } finally {
      setRejectLoading(false);
    }
  };

  const activeBookings = bookings.filter((b) => !['CANCELLED', 'REJECTED'].includes(b.status));
  const archivedBookings = bookings.filter((b) => ['CANCELLED', 'REJECTED'].includes(b.status));
  const [showArchived, setShowArchived] = useState(false);

  const filteredActive = activeBookings.filter((b) => statusFilter === 'ALL' || b.status === statusFilter);

  return (
    <div style={{ padding: '2rem 2.5rem', fontFamily: 'var(--cu-font-body)' }}>
      <h2 className='cu-auth-title mb-1' style={{ fontSize: '2rem' }}>
        Sessions
      </h2>
      <p className='cu-auth-subtitle mb-4'>Manage your availability and student bookings</p>

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

      {/* Availability */}
      <Card className='cu-auth-card p-4 mb-4' style={cardStyle}>
        <Card.Body>
          <div className='d-flex justify-content-between align-items-center mb-3'>
            <h5 className='cu-auth-title mb-0' style={{ fontSize: '1.1rem' }}>
              My Availability
            </h5>
            <Button
              className='cu-btn-submit'
              size='sm'
              onClick={() => {
                setShowAddSlot(true);
                setSlotError('');
              }}
            >
              + Add Slot
            </Button>
          </div>
          {slots.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.88rem' }}>No slots added yet.</p>
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
                  <div className='d-flex align-items-center gap-2'>
                    <Badge bg={slot.is_booked ? 'warning' : 'success'}>{slot.is_booked ? 'Booked' : 'Available'}</Badge>
                    {!slot.is_booked && (
                      <Button
                        variant='outline-danger'
                        size='sm'
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => handleDeleteSlot(slot.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Bookings */}
      <Card className='cu-auth-card p-4' style={cardStyle}>
        <Card.Body>
          <div className='d-flex justify-content-between align-items-center mb-3'>
            <h5 className='cu-auth-title mb-0' style={{ fontSize: '1.1rem' }}>
              Booking Requests
            </h5>
            <div className='d-flex gap-2'>
              {['ALL', 'PENDING', 'APPROVED', 'PENDING_ADMIN'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    border: '1.5px solid',
                    borderColor: statusFilter === s ? '#912338' : '#e4dcdc',
                    background: statusFilter === s ? '#912338' : '#fff',
                    color: statusFilter === s ? '#fff' : '#888',
                    borderRadius: '20px',
                    padding: '0.2rem 0.7rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: statusFilter === s ? 600 : 400,
                  }}
                >
                  {s === 'ALL'
                    ? 'All'
                    : s === 'PENDING_ADMIN'
                      ? 'Admin Review'
                      : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          {filteredActive.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '0.88rem' }}>No bookings found.</p>
          ) : (
            <div className='d-flex flex-column gap-3'>
              {filteredActive.map((b) => (
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
                        {b.student_name}
                      </p>
                      <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '0.2rem' }}>
                        {formatDT(b.slot_start)} → {formatTimeOnly(b.slot_end)}
                      </p>
                      {b.rejection_note && (
                        <p style={{ fontSize: '0.78rem', color: '#912338', marginBottom: 0 }}>
                          Rejection reason: {b.rejection_note}
                        </p>
                      )}
                    </div>
                    <div className='d-flex align-items-center gap-2'>
                      <Badge bg={statusColor[b.status]}>{statusLabel[b.status]}</Badge>
                      {b.status === 'PENDING' && (
                        <>
                          <Button
                            className='cu-btn-submit'
                            size='sm'
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => handleApprove(b.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant='outline-danger'
                            size='sm'
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => {
                              setRejectingBooking(b.id);
                              setRejectionNote('');
                              setShowRejectModal(true);
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Archived bookings toggle */}
      {archivedBookings.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
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
                        {b.student_name}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#aaa', marginBottom: 0 }}>
                        {formatDT(b.slot_start)} → {formatTimeOnly(b.slot_end)}
                      </p>
                      {b.rejection_note && (
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

      {/* Add Slot Modal */}
      <Modal show={showAddSlot} onHide={() => setShowAddSlot(false)} centered>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f0eaea' }}>
          <Modal.Title style={{ fontFamily: 'var(--cu-font-brand)', fontSize: '1.3rem' }}>
            Add Availability Slot
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className='p-4'>
          {slotError && (
            <Alert variant='danger' className='py-2' style={{ fontSize: '0.88rem' }}>
              {slotError}
            </Alert>
          )}
          <Form onSubmit={handleAddSlot}>
            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Date</Form.Label>
              <Form.Control
                type='date'
                className='cu-form-input'
                value={slotDate}
                onChange={(e) => {
                  setSlotDate(e.target.value);
                  setSlotStartTime('');
                  setSlotEndTime('');
                }}
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Start Time</Form.Label>
              <Form.Control
                type='time'
                className='cu-form-input'
                value={slotStartTime}
                disabled={!slotDate}
                onChange={(e) => handleStartTimeChange(e.target.value)}
              />
            </Form.Group>
            <Form.Group className='mb-1'>
              <Form.Label className='cu-form-label'>End Time</Form.Label>
              <Form.Control
                type='time'
                className='cu-form-input'
                value={slotEndTime}
                disabled={!slotStartTime}
                onChange={(e) => setSlotEndTime(e.target.value)}
              />
            </Form.Group>
            <br />
            <Button type='submit' className='cu-btn-submit w-100' disabled={slotLoading}>
              {slotLoading ? 'Adding...' : 'Add Slot'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f0eaea' }}>
          <Modal.Title style={{ fontFamily: 'var(--cu-font-brand)', fontSize: '1.3rem' }}>
            Request Rejection
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className='p-4'>
          <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: '1rem' }}>
            Provide a reason for rejection. An admin will review your request before the student is notified.
          </p>
          <Form.Group className='mb-4'>
            <Form.Label className='cu-form-label'>Rejection Reason</Form.Label>
            <Form.Control
              as='textarea'
              rows={3}
              className='cu-form-input'
              placeholder='e.g. Schedule conflict, student no-show...'
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
            />
          </Form.Group>
          <Button
            className='cu-btn-submit w-100'
            disabled={rejectLoading || !rejectionNote.trim()}
            onClick={handleRequestRejection}
          >
            {rejectLoading ? 'Submitting...' : 'Submit for Admin Review'}
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default CoachSessions;
