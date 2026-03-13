import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import api from '../api/axios';
import { useAuth } from '../context/auth/useAuth';

const CATEGORIES = [
  { key: 'CARDIO', label: 'Cardio Equipment' },
  { key: 'HEAVY', label: 'Power Lifting' },
  { key: 'CABLES', label: 'Cable Towers' },
  { key: 'MACHINES', label: 'Resistance Machines' },
  { key: 'RAW', label: 'Raw Equipment' },
];

function Equipment() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [equipment, setEquipment] = useState([]);
  const [error, setError] = useState('');
  const [openCategories, setOpenCategories] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [modalCategory, setModalCategory] = useState('');
  const [modalForm, setModalForm] = useState({ name: '', quantity: 0 });
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', quantity: 0, category: '' });
  const [editError, setEditError] = useState('');

  const fetchEquipment = async () => {
    try {
      const res = await api.get('/equipment/');
      setEquipment(res.data);
    } catch {
      setError('Failed to load equipment.');
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const getByCategory = (cat) => equipment.filter((e) => e.category === cat);

  const toggleCategory = (key) => {
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openModal = (category) => {
    setModalCategory(category);
    setModalForm({ name: '', quantity: 0 });
    setModalError('');
    setShowModal(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);
    try {
      await api.post('/equipment/create/', { ...modalForm, category: modalCategory });
      setShowModal(false);
      fetchEquipment();
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to create equipment.');
    } finally {
      setModalLoading(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, quantity: item.quantity, category: item.category });
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError('');
  };

  const handleSave = async (id) => {
    setEditError('');
    try {
      await api.put(`/equipment/${id}/update/`, editForm);
      setEditingId(null);
      fetchEquipment();
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update equipment.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/equipment/${id}/delete/`);
      fetchEquipment();
    } catch {
      setError('Failed to delete equipment.');
    }
  };

  return (
    <div style={{ padding: '2rem 2.5rem', fontFamily: 'var(--cu-font-body)' }}>
      <h2 className='cu-auth-title mb-1' style={{ fontSize: '2rem' }}>
        Gym Equipment
      </h2>
      <p className='cu-auth-subtitle mb-4'>Equipment available at the Concordia gym</p>

      {error && (
        <Alert variant='danger' className='py-2' style={{ fontSize: '0.88rem' }}>
          {error}
        </Alert>
      )}

      {CATEGORIES.map((cat) => {
        const items = getByCategory(cat.key);
        const isOpen = openCategories[cat.key];
        return (
          <Card key={cat.key} className='cu-auth-card mb-4' style={{ border: '1.5px solid #dcdde4' }}>
            <Card.Body className='p-0'>
              <div
                className='d-flex align-items-center justify-content-between px-4 py-3'
                style={{ borderBottom: isOpen ? '1px solid #f0eaea' : 'none', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleCategory(cat.key)}
              >
                <h5
                  style={{
                    margin: 0,
                    fontFamily: 'var(--cu-font-brand)',
                    fontSize: '1.2rem',
                    color: '#1a1a1a',
                    letterSpacing: '0.5px',
                  }}
                >
                  {isOpen ? '▾' : '▸'} {cat.label}
                </h5>
                {isAdmin && isOpen && (
                  <Button
                    size='sm'
                    className='cu-btn-submit'
                    style={{ padding: '0.3rem 0.9rem', fontSize: '0.82rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(cat.key);
                    }}
                  >
                    + Add Equipment
                  </Button>
                )}
              </div>

              {isOpen && (
                <>
                  {items.length === 0 ? (
                    <p style={{ padding: '1.25rem 1.5rem', color: '#aaa', fontSize: '0.88rem', margin: 0 }}>
                      No equipment in this category.
                    </p>
                  ) : (
                    <Table hover className='mb-0' style={{ fontSize: '0.9rem', tableLayout: 'fixed', width: '100%' }}>
                      <thead style={{ background: '#faf8f8' }}>
                        <tr>
                          <th
                            style={{
                              padding: '0.75rem 1.5rem',
                              fontWeight: 500,
                              color: '#555',
                              fontSize: '0.78rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.4px',
                              border: 'none',
                              width: '6%',
                            }}
                          >
                            Equipment
                          </th>
                          <th
                            style={{
                              padding: '0.75rem 1rem',
                              fontWeight: 500,
                              color: '#555',
                              fontSize: '0.78rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.4px',
                              border: 'none',
                              width: '2%',
                            }}
                          >
                            Quantity
                          </th>
                          {isAdmin && <th style={{ padding: '0.75rem 1rem', border: 'none', width: '23%' }}></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id}>
                            {editingId === item.id ? (
                              <>
                                <td
                                  style={{ padding: '0.6rem 1.5rem', border: 'none', borderTop: '1px solid #f5f0f0' }}
                                >
                                  <Form.Control
                                    type='text'
                                    className='cu-form-input'
                                    style={{ fontSize: '0.88rem', padding: '0.3rem 0.6rem' }}
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                  />
                                  {editError && (
                                    <div style={{ color: '#912338', fontSize: '0.78rem', marginTop: 4 }}>
                                      {editError}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '0.6rem 1rem', border: 'none', borderTop: '1px solid #f5f0f0' }}>
                                  <Form.Control
                                    type='number'
                                    className='cu-form-input'
                                    style={{ fontSize: '0.88rem', padding: '0.3rem 0.6rem', width: 80 }}
                                    min={0}
                                    value={editForm.quantity}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })
                                    }
                                  />
                                </td>
                                <td style={{ padding: '0.6rem 1rem', border: 'none', borderTop: '1px solid #f5f0f0' }}>
                                  <div className='d-flex gap-2'>
                                    <Button
                                      size='sm'
                                      className='cu-btn-submit'
                                      style={{ fontSize: '0.78rem', padding: '0.25rem 0.7rem' }}
                                      onClick={() => handleSave(item.id)}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size='sm'
                                      variant='outline-secondary'
                                      style={{ fontSize: '0.78rem', padding: '0.25rem 0.7rem' }}
                                      onClick={cancelEdit}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td
                                  style={{
                                    padding: '0.85rem 1.5rem',
                                    verticalAlign: 'middle',
                                    fontWeight: 500,
                                    color: '#1a1a1a',
                                    border: 'none',
                                    borderTop: '1px solid #f5f0f0',
                                  }}
                                >
                                  {item.name}
                                </td>
                                <td
                                  style={{
                                    padding: '0.85rem 1rem',
                                    verticalAlign: 'middle',
                                    border: 'none',
                                    borderTop: '1px solid #f5f0f0',
                                  }}
                                >
                                  {item.quantity}
                                </td>
                                {isAdmin && (
                                  <td
                                    style={{
                                      padding: '0.85rem 1.5rem',
                                      verticalAlign: 'middle',
                                      border: 'none',
                                      borderTop: '1px solid #f5f0f0',
                                    }}
                                  >
                                    <div className='d-flex gap-2'>
                                      <Button
                                        size='sm'
                                        variant='outline-secondary'
                                        style={{ fontSize: '0.78rem', padding: '0.25rem 0.7rem' }}
                                        onClick={() => startEdit(item)}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        size='sm'
                                        variant='outline-danger'
                                        style={{ fontSize: '0.78rem', padding: '0.25rem 0.7rem' }}
                                        onClick={() => handleDelete(item.id)}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </td>
                                )}
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        );
      })}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f0eaea' }}>
          <Modal.Title style={{ fontFamily: 'var(--cu-font-brand)', fontSize: '1.3rem', color: '#1a1a1a' }}>
            Add Equipment — {CATEGORIES.find((c) => c.key === modalCategory)?.label}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className='p-4'>
          {modalError && (
            <Alert variant='danger' className='py-2' style={{ fontSize: '0.88rem' }}>
              {modalError}
            </Alert>
          )}
          <Form onSubmit={handleModalSubmit}>
            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Equipment Name</Form.Label>
              <Form.Control
                type='text'
                className='cu-form-input'
                placeholder='e.g. Treadmill'
                value={modalForm.name}
                onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
              />
            </Form.Group>
            <Form.Group className='mb-4'>
              <Form.Label className='cu-form-label'>Quantity</Form.Label>
              <Form.Control
                type='number'
                className='cu-form-input'
                min={0}
                value={modalForm.quantity}
                onChange={(e) => setModalForm({ ...modalForm, quantity: parseInt(e.target.value) || 0 })}
              />
            </Form.Group>
            <Button type='submit' className='cu-btn-submit w-100' disabled={modalLoading}>
              {modalLoading ? 'Adding...' : 'Add Equipment'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default Equipment;
