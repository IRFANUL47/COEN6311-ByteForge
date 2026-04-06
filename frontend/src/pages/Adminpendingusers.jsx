import { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal, Form, Alert, Row, Col } from 'react-bootstrap';
import api from '../api/axios';

const cardStyle = { border: '1.5px solid #e4dcdc', borderRadius: '10px' };

const roleColor = { STUDENT: 'primary', COACH: 'secondary' };

const formatDate = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function AdminPendingUsers() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Reject modal
  const [showReject, setShowReject] = useState(false);
  const [rejectingUser, setRejectingUser] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(null); // user id being approved

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/pending-users/');
      setUsers(res.data);
    } catch {
      setError('Failed to load pending users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;
    if (roleFilter !== 'ALL') result = result.filter((u) => u.role === roleFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.first_name?.toLowerCase().includes(q) ||
          u.last_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.concordia_id?.includes(q),
      );
    }
    setFiltered(result);
  }, [users, search, roleFilter]);

  const handleApprove = async (userId) => {
    setActionLoading(userId);
    setError('');
    try {
      await api.patch(`/admin/pending-users/${userId}/approve/`);
      setSuccess('User approved successfully.');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to approve user.');
    } finally {
      setActionLoading(null);
    }
  };

  const openReject = (user) => {
    setRejectingUser(user);
    setRejectReason('');
    setShowReject(true);
  };

  const handleReject = async () => {
    if (!rejectingUser) return;
    setRejectLoading(true);
    setError('');
    try {
      await api.patch(`/admin/pending-users/${rejectingUser.id}/reject/`, { reason: rejectReason });
      setSuccess(`${rejectingUser.first_name} ${rejectingUser.last_name}'s registration has been rejected.`);
      setUsers((prev) => prev.filter((u) => u.id !== rejectingUser.id));
      setShowReject(false);
      setRejectingUser(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reject user.');
    } finally {
      setRejectLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem 2.5rem', fontFamily: 'var(--cu-font-body)' }}>
      <h2 className='cu-auth-title mb-1' style={{ fontSize: '2rem' }}>
        Pending Approvals
      </h2>
      <p className='cu-auth-subtitle mb-4'>Review and approve or reject new user registrations</p>

      {error && (
        <Alert
          variant='danger'
          className='py-2 mb-3'
          style={{ fontSize: '0.88rem' }}
          dismissible
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          variant='success'
          className='py-2 mb-3'
          style={{ fontSize: '0.88rem' }}
          dismissible
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      {/* Filters */}
      <div className='d-flex gap-2 mb-4 align-items-center flex-wrap'>
        <Form.Control
          type='text'
          className='cu-form-input'
          placeholder='Search by name, email or Concordia ID...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320, fontSize: '0.88rem' }}
        />
        {['ALL', 'STUDENT', 'COACH'].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            style={{
              border: '1.5px solid',
              borderColor: roleFilter === r ? '#912338' : '#e4dcdc',
              background: roleFilter === r ? '#912338' : '#fff',
              color: roleFilter === r ? '#fff' : '#888',
              borderRadius: '20px',
              padding: '0.25rem 0.85rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: roleFilter === r ? 600 : 400,
            }}
          >
            {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase() + 's'}
          </button>
        ))}
        <span style={{ fontSize: '0.82rem', color: '#aaa', marginLeft: 'auto' }}>{filtered.length} pending</span>
      </div>

      {loading ? (
        <p style={{ color: '#aaa' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <Card className='cu-auth-card p-4' style={cardStyle}>
          <Card.Body className='text-center'>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: 0 }}>
              {users.length === 0 ? 'No pending registrations. All caught up! ✓' : 'No results match your search.'}
            </p>
          </Card.Body>
        </Card>
      ) : (
        <Row className='g-3'>
          {filtered.map((u) => (
            <Col md={6} key={u.id}>
              <Card className='cu-auth-card p-4' style={cardStyle}>
                <Card.Body>
                  <div className='d-flex justify-content-between align-items-start mb-2'>
                    <div>
                      <h5
                        style={{ margin: 0, fontFamily: 'var(--cu-font-brand)', fontSize: '1.05rem', color: '#1a1a1a' }}
                      >
                        {u.first_name} {u.last_name}
                      </h5>
                      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: 0 }}>{u.email}</p>
                    </div>
                    <Badge bg={roleColor[u.role] || 'secondary'} style={{ fontSize: '0.72rem' }}>
                      {u.role}
                    </Badge>
                  </div>

                  <div className='d-flex gap-3 mb-3' style={{ fontSize: '0.8rem', color: '#888' }}>
                    <span>
                      ID: <strong style={{ color: '#555' }}>{u.concordia_id}</strong>
                    </span>
                    <span>
                      Registered: <strong style={{ color: '#555' }}>{formatDate(u.date_joined)}</strong>
                    </span>
                  </div>

                  <div className='d-flex gap-2'>
                    <Button
                      className='cu-btn-submit'
                      size='sm'
                      disabled={actionLoading === u.id}
                      onClick={() => handleApprove(u.id)}
                      style={{ fontSize: '0.82rem' }}
                    >
                      {actionLoading === u.id ? 'Approving...' : '✓ Approve'}
                    </Button>
                    <Button
                      variant='outline-danger'
                      size='sm'
                      onClick={() => openReject(u)}
                      style={{ fontSize: '0.82rem' }}
                    >
                      ✕ Reject
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Reject Modal */}
      <Modal show={showReject} onHide={() => setShowReject(false)} centered>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f0eaea' }}>
          <Modal.Title style={{ fontFamily: 'var(--cu-font-brand)', fontSize: '1.3rem' }}>
            Reject Registration
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className='p-4'>
          {rejectingUser && (
            <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: '1rem' }}>
              Rejecting{' '}
              <strong>
                {rejectingUser.first_name} {rejectingUser.last_name}
              </strong>{' '}
              ({rejectingUser.email}). They will be notified by email.
            </p>
          )}
          <Form.Group className='mb-4'>
            <Form.Label className='cu-form-label'>Reason (optional)</Form.Label>
            <Form.Control
              as='textarea'
              rows={3}
              className='cu-form-input'
              placeholder='e.g. Incomplete information, duplicate account...'
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </Form.Group>
          <div className='d-flex gap-2'>
            <Button variant='danger' onClick={handleReject} disabled={rejectLoading} style={{ fontSize: '0.88rem' }}>
              {rejectLoading ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
            <Button variant='outline-secondary' onClick={() => setShowReject(false)} style={{ fontSize: '0.88rem' }}>
              Cancel
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default AdminPendingUsers;
