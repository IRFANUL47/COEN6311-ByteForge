import { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Alert, Row, Col, Badge } from 'react-bootstrap';
import api from '../api/axios';
import { useAuth } from '../context/auth/useAuth';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyExercise = () => ({ name: '', sets: '', reps: '', duration_secs: '', notes: '' });
const emptyDays = () =>
  DAYS.map((label, i) => ({ day_number: i + 1, label, notes: '', exercises: [], enabled: false }));

const formatExercise = (ex) => {
  const hasSets = ex.sets != null && ex.sets !== '';
  const hasReps = ex.reps != null && ex.reps !== '';
  const hasDuration = ex.duration_secs != null && ex.duration_secs !== '';
  let str = '';
  if (hasSets && hasReps) str = `${ex.sets} sets × ${ex.reps} reps`;
  else if (hasSets && hasDuration) str = `${ex.sets} sets × ${ex.duration_secs}s`;
  else if (hasReps && hasDuration) str = `${ex.reps} reps × ${ex.duration_secs}s`;
  else if (hasSets) str = `${ex.sets} sets`;
  else if (hasReps) str = `${ex.reps} reps`;
  else if (hasDuration) str = `${ex.duration_secs}s`;
  if (ex.notes) str += ` · ${ex.notes}`;
  return str;
};

const planToDays = (plan) =>
  DAYS.map((label, i) => {
    const existing = plan.days?.find((d) => d.label === label);
    if (existing) {
      return {
        day_number: i + 1,
        label,
        notes: existing.notes || '',
        exercises: existing.exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets ?? '',
          reps: ex.reps ?? '',
          duration_secs: ex.duration_secs ?? '',
          notes: ex.notes || '',
        })),
        enabled: true,
      };
    }
    return { day_number: i + 1, label, notes: '', exercises: [], enabled: false };
  });

const toggleDay = (index, daysSetter) => {
  daysSetter((prev) => prev.map((d, i) => (i === index ? { ...d, enabled: !d.enabled } : d)));
};

const addExercise = (dayIndex, daysSetter) => {
  daysSetter((prev) =>
    prev.map((d, i) => (i === dayIndex ? { ...d, exercises: [...d.exercises, emptyExercise()] } : d)),
  );
};

const removeExercise = (dayIndex, exIndex, daysSetter) => {
  daysSetter((prev) =>
    prev.map((d, i) => (i === dayIndex ? { ...d, exercises: d.exercises.filter((_, ei) => ei !== exIndex) } : d)),
  );
};

const updateExercise = (dayIndex, exIndex, field, value, daysSetter) => {
  daysSetter((prev) =>
    prev.map((d, i) =>
      i === dayIndex
        ? { ...d, exercises: d.exercises.map((ex, ei) => (ei === exIndex ? { ...ex, [field]: value } : ex)) }
        : d,
    ),
  );
};

const labelStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#888',
  fontWeight: 500,
};

function DayBuilder({ daysArr, daysSetter }) {
  return (
    <div style={{ borderTop: '1px solid #f0eaea', marginTop: '0.5rem', paddingTop: '1rem' }}>
      <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>Weekly Schedule</p>
      {daysArr.map((day, dayIndex) => (
        <div
          key={day.day_number}
          style={{ marginBottom: '0.5rem', border: '1px solid #f0eaea', borderRadius: '8px', overflow: 'hidden' }}
        >
          <div
            className='d-flex align-items-center justify-content-between px-3 py-2'
            style={{ background: day.enabled ? '#fdf5f5' : '#fafafa', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => toggleDay(dayIndex, daysSetter)}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: 500, color: day.enabled ? '#912338' : '#888' }}>
              {day.enabled ? '▾' : '▸'} {day.label}
            </span>
            {day.enabled && (
              <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                {day.exercises.length} exercise{day.exercises.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {day.enabled && (
            <div style={{ padding: '0.75rem 1rem' }}>
              {day.exercises.map((ex, exIndex) => (
                <div
                  key={exIndex}
                  style={{ marginBottom: '0.75rem', padding: '0.75rem', background: '#fdf8f8', borderRadius: '6px' }}
                >
                  <div className='d-flex justify-content-between align-items-center mb-2'>
                    <span style={{ fontSize: '0.78rem', color: '#aaa' }}>Exercise {exIndex + 1}</span>
                    <button
                      type='button'
                      onClick={() => removeExercise(dayIndex, exIndex, daysSetter)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#912338',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <Row className='g-2'>
                    <Col xs={12}>
                      <Form.Control
                        type='text'
                        className='cu-form-input'
                        placeholder='Exercise name'
                        style={{ fontSize: '0.82rem' }}
                        value={ex.name}
                        onChange={(e) => updateExercise(dayIndex, exIndex, 'name', e.target.value, daysSetter)}
                      />
                    </Col>
                    <Col xs={4}>
                      <Form.Control
                        type='number'
                        className='cu-form-input'
                        placeholder='Sets'
                        style={{ fontSize: '0.82rem' }}
                        min={1}
                        value={ex.sets}
                        onChange={(e) => updateExercise(dayIndex, exIndex, 'sets', e.target.value, daysSetter)}
                      />
                    </Col>
                    <Col xs={4}>
                      <Form.Control
                        type='number'
                        className='cu-form-input'
                        placeholder='Reps'
                        style={{ fontSize: '0.82rem' }}
                        min={1}
                        value={ex.reps}
                        onChange={(e) => updateExercise(dayIndex, exIndex, 'reps', e.target.value, daysSetter)}
                      />
                    </Col>
                    <Col xs={4}>
                      <Form.Control
                        type='number'
                        className='cu-form-input'
                        placeholder='Seconds'
                        style={{ fontSize: '0.82rem' }}
                        min={1}
                        value={ex.duration_secs}
                        onChange={(e) => updateExercise(dayIndex, exIndex, 'duration_secs', e.target.value, daysSetter)}
                      />
                    </Col>
                    <Col xs={12}>
                      <Form.Control
                        type='text'
                        className='cu-form-input'
                        placeholder='Notes (optional)'
                        style={{ fontSize: '0.82rem' }}
                        value={ex.notes}
                        onChange={(e) => updateExercise(dayIndex, exIndex, 'notes', e.target.value, daysSetter)}
                      />
                    </Col>
                  </Row>
                </div>
              ))}
              <button
                type='button'
                onClick={() => addExercise(dayIndex, daysSetter)}
                style={{
                  background: 'none',
                  border: '1px dashed #e4dcdc',
                  borderRadius: '6px',
                  width: '100%',
                  padding: '0.4rem',
                  fontSize: '0.8rem',
                  color: '#912338',
                  cursor: 'pointer',
                }}
              >
                + Add Exercise
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function WorkoutPlans() {
  const { user } = useAuth();
  const isCoach = user?.role === 'COACH';

  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showLookup, setShowLookup] = useState(false);
  const [concordiaInput, setConcordiaInput] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [foundStudent, setFoundStudent] = useState(null);
  const [studentRestrictions, setStudentRestrictions] = useState([]);

  const [showCreate, setShowCreate] = useState(false);
  const [planForm, setPlanForm] = useState({ title: '', goal: '', start_date: '', end_date: '', is_active: true });
  const [days, setDays] = useState(emptyDays());
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', goal: '', start_date: '', end_date: '', is_active: true });
  const [editDays, setEditDays] = useState(emptyDays());
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workout-plans/');
      setPlans(res.data);
    } catch {
      setError('Failed to load workout plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupError('');
    setLookupLoading(true);
    try {
      const [studentRes, restrictionsRes] = await Promise.all([
        api.get(`/profile/${concordiaInput}/`),
        api.get(`/dietary-restrictions/${concordiaInput}/`),
      ]);
      setFoundStudent(studentRes.data);
      setStudentRestrictions(restrictionsRes.data.map((r) => r.dietary_restriction));
    } catch (err) {
      setLookupError(err.response?.data?.detail || 'Student not found.');
      setFoundStudent(null);
      setStudentRestrictions([]);
    } finally {
      setLookupLoading(false);
    }
  };

  const proceedToCreate = () => {
    setShowLookup(false);
    setPlanForm({ title: '', goal: '', start_date: '', end_date: '', is_active: true });
    setDays(emptyDays());
    setCreateError('');
    setShowCreate(true);
  };

  const buildEnabledDays = (daysArr) =>
    daysArr
      .filter((d) => d.enabled)
      .map((d) => ({
        day_number: d.day_number,
        label: d.label,
        notes: d.notes,
        exercises: d.exercises
          .filter((ex) => ex.name.trim())
          .map((ex) => ({
            name: ex.name,
            sets: ex.sets ? parseInt(ex.sets) : null,
            reps: ex.reps ? parseInt(ex.reps) : null,
            duration_secs: ex.duration_secs ? parseInt(ex.duration_secs) : null,
            notes: ex.notes,
          })),
      }))
      .filter((d) => d.exercises.length > 0);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      await api.post('/workout-plans/create/', {
        ...planForm,
        student: foundStudent.id,
        start_date: planForm.start_date || null,
        end_date: planForm.end_date || null,
        days: buildEnabledDays(days),
      });
      setShowCreate(false);
      setFoundStudent(null);
      setStudentRestrictions([]);
      setConcordiaInput('');
      fetchPlans();
    } catch (err) {
      setCreateError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to create plan.');
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = () => {
    setEditForm({
      title: selectedPlan.title || '',
      goal: selectedPlan.goal || '',
      start_date: selectedPlan.start_date || '',
      end_date: selectedPlan.end_date || '',
      is_active: selectedPlan.is_active,
    });
    setEditDays(planToDays(selectedPlan));
    setEditError('');
    setEditMode(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);
    try {
      const res = await api.put(`/workout-plans/${selectedPlan.id}/update/`, {
        ...editForm,
        student: selectedPlan.student.id,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        days: buildEnabledDays(editDays),
      });
      setSelectedPlan(res.data);
      setEditMode(false);
      fetchPlans();
    } catch (err) {
      setEditError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to update plan.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/workout-plans/${id}/delete/`);
      fetchPlans();
      if (showDetail) setShowDetail(false);
    } catch {
      setError('Failed to delete plan.');
    }
  };

  const openDetail = async (plan) => {
    try {
      const res = await api.get(`/workout-plans/${plan.id}/`);
      setSelectedPlan(res.data);
      setEditMode(false);
      setShowDetail(true);
    } catch {
      setError('Failed to load plan details.');
    }
  };

  const cardStyle = {
    border: '1.5px solid #e4dcdc',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
  };

  return (
    <div style={{ padding: '2rem 2.5rem', fontFamily: 'var(--cu-font-body)' }}>
      <div className='d-flex align-items-center justify-content-between mb-1'>
        <h2 className='cu-auth-title mb-0' style={{ fontSize: '2rem' }}>
          Workout Plans
        </h2>
        {isCoach && (
          <Button
            className='cu-btn-submit'
            onClick={() => {
              setShowLookup(true);
              setConcordiaInput('');
              setLookupError('');
              setFoundStudent(null);
              setStudentRestrictions([]);
            }}
          >
            + Assign Plan
          </Button>
        )}
      </div>
      <p className='cu-auth-subtitle mb-4'>
        {isCoach ? 'Plans you have assigned to students' : 'Your assigned workout plan'}
      </p>

      {error && (
        <Alert variant='danger' className='py-2' style={{ fontSize: '0.88rem' }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <p style={{ color: '#aaa' }}>Loading...</p>
      ) : plans.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
          {isCoach ? 'You have not assigned any plans yet.' : 'No workout plan assigned to you yet.'}
        </p>
      ) : (
        <Row className='g-4'>
          {plans.map((plan) => (
            <Col md={6} key={plan.id}>
              <Card className='cu-auth-card p-4' style={cardStyle} onClick={() => openDetail(plan)}>
                <Card.Body>
                  <div className='d-flex justify-content-between align-items-start mb-2'>
                    <h5 style={{ margin: 0, fontFamily: 'var(--cu-font-brand)', fontSize: '1.1rem', color: '#1a1a1a' }}>
                      {plan.title || 'Untitled Plan'}
                    </h5>
                    <Badge bg={plan.is_active ? 'success' : 'danger'}>{plan.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#888', margin: '0 0 0.5rem' }}>
                    {isCoach
                      ? `Student: ${plan.student?.name} (${plan.student?.concordia_id})`
                      : `Coach: ${plan.coach?.name}`}
                  </p>
                  {plan.goal && (
                    <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.5rem' }}>
                      {plan.goal.length > 80 ? plan.goal.slice(0, 80) + '...' : plan.goal}
                    </p>
                  )}
                  <p style={{ fontSize: '0.78rem', color: '#aaa', marginBottom: 0 }}>
                    {plan.days?.length || 0} day{plan.days?.length !== 1 ? 's' : ''}
                  </p>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Step 1 — Student Lookup */}
      <Modal show={showLookup} onHide={() => setShowLookup(false)} centered>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f0eaea' }}>
          <Modal.Title style={{ fontFamily: 'var(--cu-font-brand)', fontSize: '1.3rem' }}>Find Student</Modal.Title>
        </Modal.Header>
        <Modal.Body className='p-4'>
          {lookupError && (
            <Alert variant='danger' className='py-2' style={{ fontSize: '0.88rem' }}>
              {lookupError}
            </Alert>
          )}
          <Form onSubmit={handleLookup}>
            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Student Concordia ID</Form.Label>
              <Form.Control
                type='text'
                className='cu-form-input'
                placeholder='e.g. 40123456'
                value={concordiaInput}
                onChange={(e) => setConcordiaInput(e.target.value)}
              />
            </Form.Group>
            <Button type='submit' className='cu-btn-submit w-100' disabled={lookupLoading}>
              {lookupLoading ? 'Searching...' : 'Find Student'}
            </Button>
          </Form>
          {foundStudent && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: '#fdf8f8',
                borderRadius: '8px',
                border: '1px solid #e4dcdc',
              }}
            >
              <p style={{ fontWeight: 600, marginBottom: '0.3rem', color: '#1a1a1a' }}>
                {foundStudent.first_name} {foundStudent.last_name}
              </p>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: '#888',
                  marginBottom: studentRestrictions.length > 0 ? '0.75rem' : 0,
                }}
              >
                ID: {foundStudent.concordia_id}
              </p>
              {studentRestrictions.length > 0 && (
                <>
                  <p style={{ fontSize: '0.78rem', color: '#555', marginBottom: '0.4rem', fontWeight: 500 }}>
                    Dietary Restrictions:
                  </p>
                  <div className='d-flex flex-wrap gap-1 mb-2'>
                    {studentRestrictions.map((r) => (
                      <span
                        key={r.key}
                        style={{
                          fontSize: '0.75rem',
                          background: '#f5eeee',
                          color: '#912338',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '20px',
                        }}
                      >
                        {r.display_name}
                      </span>
                    ))}
                  </div>
                </>
              )}
              <Button className='cu-btn-submit w-100 mt-2' onClick={proceedToCreate}>
                Continue to Plan
              </Button>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Step 2 — Create Plan */}
      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered size='lg'>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f0eaea' }}>
          <Modal.Title style={{ fontFamily: 'var(--cu-font-brand)', fontSize: '1.3rem' }}>
            Assign Workout — {foundStudent?.first_name} {foundStudent?.last_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className='p-4' style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {createError && (
            <Alert variant='danger' className='py-2' style={{ fontSize: '0.88rem' }}>
              {createError}
            </Alert>
          )}
          <Form onSubmit={handleCreateSubmit}>
            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Title</Form.Label>
              <Form.Control
                type='text'
                className='cu-form-input'
                placeholder='e.g. Strength Program'
                value={planForm.title}
                onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Goal</Form.Label>
              <Form.Control
                as='textarea'
                rows={2}
                className='cu-form-input'
                placeholder='e.g. Build muscle, lose weight...'
                value={planForm.goal}
                onChange={(e) => setPlanForm({ ...planForm, goal: e.target.value })}
              />
            </Form.Group>
            <Row>
              <Col>
                <Form.Group className='mb-3'>
                  <Form.Label className='cu-form-label'>Start Date</Form.Label>
                  <Form.Control
                    type='date'
                    className='cu-form-input'
                    value={planForm.start_date}
                    onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className='mb-3'>
                  <Form.Label className='cu-form-label'>End Date</Form.Label>
                  <Form.Control
                    type='date'
                    className='cu-form-input'
                    value={planForm.end_date}
                    onChange={(e) => setPlanForm({ ...planForm, end_date: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col className='d-flex align-items-center' style={{ paddingTop: '1.8rem' }}>
                <Form.Check
                  type='checkbox'
                  label='Active'
                  checked={planForm.is_active}
                  onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                  style={{ fontSize: '0.9rem' }}
                />
              </Col>
            </Row>
            <DayBuilder daysArr={days} daysSetter={setDays} />
            <Button type='submit' className='cu-btn-submit w-100 mt-3' disabled={createLoading}>
              {createLoading ? 'Assigning...' : 'Assign Plan'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Detail Modal */}
      {selectedPlan && (
        <Modal
          show={showDetail}
          onHide={() => {
            setShowDetail(false);
            setEditMode(false);
          }}
          centered
          size='lg'
        >
          <Modal.Header closeButton style={{ borderBottom: '1px solid #f0eaea' }}>
            <Modal.Title style={{ fontFamily: 'var(--cu-font-brand)', fontSize: '1.3rem' }}>
              {editMode ? 'Edit Plan' : selectedPlan.title || 'Untitled Plan'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className='p-4' style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {!editMode ? (
              <>
                <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
                  {isCoach
                    ? `Student: ${selectedPlan.student?.name} (${selectedPlan.student?.concordia_id})`
                    : `Coach: ${selectedPlan.coach?.name}`}
                </p>
                {selectedPlan.goal && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ ...labelStyle, marginBottom: '0.3rem' }}>Goal</p>
                    <p style={{ fontSize: '0.9rem', color: '#333', marginBottom: 0 }}>{selectedPlan.goal}</p>
                  </div>
                )}
                {(selectedPlan.start_date || selectedPlan.end_date) && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ ...labelStyle, marginBottom: '0.3rem' }}>Duration</p>
                    <div className='d-flex gap-4'>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#aaa' }}>From</div>
                        <div style={{ fontSize: '0.9rem', color: '#333' }}>{formatDate(selectedPlan.start_date)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#aaa' }}>To</div>
                        <div style={{ fontSize: '0.9rem', color: '#333' }}>{formatDate(selectedPlan.end_date)}</div>
                      </div>
                    </div>
                  </div>
                )}
                {selectedPlan.days?.filter((d) => d.exercises?.length > 0).length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>Weekly Schedule</p>
                    {selectedPlan.days
                      .filter((d) => d.exercises?.length > 0)
                      .map((day) => (
                        <div
                          key={day.id}
                          style={{
                            marginBottom: '0.75rem',
                            border: '1px solid #f0eaea',
                            borderRadius: '8px',
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ background: '#fdf5f5', padding: '0.5rem 1rem' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#912338' }}>
                              Day {day.day_number} — {day.label}
                            </span>
                          </div>
                          <div style={{ padding: '0.5rem 1rem' }}>
                            {day.exercises.map((ex) => (
                              <div
                                key={ex.id}
                                style={{
                                  padding: '0.5rem 0',
                                  borderBottom: '1px solid #f9f5f5',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#1a1a1a' }}>
                                  {ex.name}
                                </span>
                                <span style={{ fontSize: '0.78rem', color: '#888' }}>{formatExercise(ex)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                {isCoach && (
                  <div className='d-flex justify-content-between align-items-center'>
                    <Form.Check
                      type='switch'
                      label={selectedPlan.is_active ? 'Active' : 'Inactive'}
                      checked={selectedPlan.is_active}
                      onChange={async () => {
                        try {
                          await api.patch(`/workout-plans/${selectedPlan.id}/update/`, {
                            is_active: !selectedPlan.is_active,
                          });
                          setSelectedPlan({ ...selectedPlan, is_active: !selectedPlan.is_active });
                          fetchPlans();
                        } catch {
                          setError('Failed to update plan status.');
                        }
                      }}
                      style={{ fontSize: '0.9rem' }}
                    />
                    <div className='d-flex gap-2'>
                      <Button variant='outline-secondary' size='sm' style={{ fontSize: '0.82rem' }} onClick={openEdit}>
                        Edit Plan
                      </Button>
                      <Button
                        variant='outline-danger'
                        size='sm'
                        style={{ fontSize: '0.82rem' }}
                        onClick={() => handleDelete(selectedPlan.id)}
                      >
                        Delete Plan
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {editError && (
                  <Alert variant='danger' className='py-2' style={{ fontSize: '0.88rem' }}>
                    {editError}
                  </Alert>
                )}
                <Form onSubmit={handleEditSubmit}>
                  <Form.Group className='mb-3'>
                    <Form.Label className='cu-form-label'>Title</Form.Label>
                    <Form.Control
                      type='text'
                      className='cu-form-input'
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
                  </Form.Group>
                  <Form.Group className='mb-3'>
                    <Form.Label className='cu-form-label'>Goal</Form.Label>
                    <Form.Control
                      as='textarea'
                      rows={2}
                      className='cu-form-input'
                      value={editForm.goal}
                      onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}
                    />
                  </Form.Group>
                  <Row>
                    <Col>
                      <Form.Group className='mb-3'>
                        <Form.Label className='cu-form-label'>Start Date</Form.Label>
                        <Form.Control
                          type='date'
                          className='cu-form-input'
                          value={editForm.start_date}
                          onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                        />
                      </Form.Group>
                    </Col>
                    <Col>
                      <Form.Group className='mb-3'>
                        <Form.Label className='cu-form-label'>End Date</Form.Label>
                        <Form.Control
                          type='date'
                          className='cu-form-input'
                          value={editForm.end_date}
                          onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                        />
                      </Form.Group>
                    </Col>
                    <Col className='d-flex align-items-center' style={{ paddingTop: '1.8rem' }}>
                      <Form.Check
                        type='checkbox'
                        label='Active'
                        checked={editForm.is_active}
                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                        style={{ fontSize: '0.9rem' }}
                      />
                    </Col>
                  </Row>
                  <DayBuilder daysArr={editDays} daysSetter={setEditDays} />
                  <div className='d-flex gap-2 mt-3'>
                    <Button type='submit' className='cu-btn-submit' disabled={editLoading}>
                      {editLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant='outline-secondary' onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
}

export default WorkoutPlans;
