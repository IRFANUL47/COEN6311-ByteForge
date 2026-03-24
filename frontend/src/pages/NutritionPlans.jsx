import { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Alert, Row, Col, Badge } from 'react-bootstrap';
import api from '../api/axios';
import { useAuth } from '../context/auth/useAuth';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['breakfast', 'lunch', 'dinner'];

const emptySchedule = () =>
  DAYS.reduce((acc, day) => {
    acc[day.toLowerCase()] = { breakfast: '', lunch: '', dinner: '' };
    return acc;
  }, {});

const hasScheduleData = (plan) => {
  if (!plan?.plan) return false;
  return DAYS.some((day) => {
    const d = plan.plan[day.toLowerCase()];
    return d && (d.breakfast || d.lunch || d.dinner);
  });
};

function NutritionPlans() {
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
  const [planForm, setPlanForm] = useState({
    title: '',
    notes: '',
    calories_target: '',
    protein_g: '',
    carbs_g: '',
    fats_g: '',
    start_date: '',
    end_date: '',
    is_active: true,
  });
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState(emptySchedule());
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/nutrition-plans/');
      setPlans(res.data);
    } catch {
      setError('Failed to load nutrition plans.');
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
    setPlanForm({
      title: '',
      notes: '',
      calories_target: '',
      protein_g: '',
      carbs_g: '',
      fats_g: '',
      start_date: '',
      end_date: '',
      is_active: true,
    });
    setSchedule(emptySchedule());
    setShowSchedule(false);
    setCreateError('');
    setShowCreate(true);
  };

  const handleScheduleChange = (day, meal, value) => {
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], [meal]: value } }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    const hasAnySchedule = DAYS.some((day) => {
      const d = schedule[day.toLowerCase()];
      return d.breakfast || d.lunch || d.dinner;
    });

    try {
      await api.post('/nutrition-plans/create/', {
        ...planForm,
        student: foundStudent.id,
        calories_target: planForm.calories_target || null,
        protein_g: planForm.protein_g || null,
        carbs_g: planForm.carbs_g || null,
        fats_g: planForm.fats_g || null,
        start_date: planForm.start_date || null,
        end_date: planForm.end_date || null,
        plan: hasAnySchedule ? schedule : null,
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

  const handleDelete = async (id) => {
    try {
      await api.delete(`/nutrition-plans/${id}/delete/`);
      fetchPlans();
      if (showDetail) setShowDetail(false);
    } catch {
      setError('Failed to delete plan.');
    }
  };

  const openDetail = (plan) => {
    setSelectedPlan(plan);
    setShowDetail(true);
  };

  const cardStyle = {
    border: '1.5px solid #e4dcdc',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
  };
  const labelStyle = {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#888',
    fontWeight: 500,
  };

  return (
    <div style={{ padding: '2rem 2.5rem', fontFamily: 'var(--cu-font-body)' }}>
      <div className='d-flex align-items-center justify-content-between mb-1'>
        <h2 className='cu-auth-title mb-0' style={{ fontSize: '2rem' }}>
          Nutrition Plans
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
        {isCoach ? 'Plans you have assigned to students' : 'Your assigned nutrition plan'}
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
          {isCoach ? 'You have not assigned any plans yet.' : 'No nutrition plan assigned to you yet.'}
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
                    <Badge style={{ background: plan.is_active ? '#508212' : '#aaa', fontSize: '0.72rem' }}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#888', margin: '0 0 0.75rem' }}>
                    {isCoach
                      ? `Student: ${plan.student?.name} (${plan.student?.concordia_id})`
                      : `Coach: ${plan.coach?.name}`}
                  </p>
                  {plan.notes && (
                    <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.75rem' }}>
                      {plan.notes.length > 100 ? plan.notes.slice(0, 100) + '...' : plan.notes}
                    </p>
                  )}
                  <div className='d-flex gap-3' style={{ fontSize: '0.8rem', color: '#888' }}>
                    {plan.calories_target != null && <span>🔥 {plan.calories_target} kcal</span>}
                    {plan.protein_g != null && <span>🥓 {plan.protein_g}g protein</span>}
                    {plan.carbs_g != null && <span>🌾 {plan.carbs_g}g carbs</span>}
                    {plan.fats_g != null && <span>🧈 {plan.fats_g}g fats</span>}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Step 1 — Student Lookup Modal */}
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
                  <div className='d-flex flex-wrap gap-1'>
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
              <Button className='cu-btn-submit w-100 mt-3' onClick={proceedToCreate}>
                Continue to Plan
              </Button>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Step 2 — Create Plan Modal */}
      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered size='lg'>
        <Modal.Header closeButton style={{ borderBottom: '1px solid #f0eaea' }}>
          <Modal.Title style={{ fontFamily: 'var(--cu-font-brand)', fontSize: '1.3rem' }}>
            Assign Plan — {foundStudent?.first_name} {foundStudent?.last_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className='p-4'>
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
                placeholder='e.g. Bulk Plan'
                value={planForm.title}
                onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Notes</Form.Label>
              <Form.Control
                as='textarea'
                rows={3}
                className='cu-form-input'
                placeholder='Instructions for the student...'
                value={planForm.notes}
                onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
              />
            </Form.Group>
            <Row>
              <Col>
                <Form.Group className='mb-3'>
                  <Form.Label className='cu-form-label'>Calories (kcal)</Form.Label>
                  <Form.Control
                    type='number'
                    className='cu-form-input'
                    min={0}
                    value={planForm.calories_target}
                    onChange={(e) => setPlanForm({ ...planForm, calories_target: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className='mb-3'>
                  <Form.Label className='cu-form-label'>Protein (g)</Form.Label>
                  <Form.Control
                    type='number'
                    className='cu-form-input'
                    min={0}
                    value={planForm.protein_g}
                    onChange={(e) => setPlanForm({ ...planForm, protein_g: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className='mb-3'>
                  <Form.Label className='cu-form-label'>Carbs (g)</Form.Label>
                  <Form.Control
                    type='number'
                    className='cu-form-input'
                    min={0}
                    value={planForm.carbs_g}
                    onChange={(e) => setPlanForm({ ...planForm, carbs_g: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className='mb-3'>
                  <Form.Label className='cu-form-label'>Fats (g)</Form.Label>
                  <Form.Control
                    type='number'
                    className='cu-form-input'
                    min={0}
                    value={planForm.fats_g}
                    onChange={(e) => setPlanForm({ ...planForm, fats_g: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
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

            {/* Weekly Schedule Toggle */}
            <div
              style={{
                borderTop: '1px solid #f0eaea',
                marginTop: '0.5rem',
                paddingTop: '1rem',
                marginBottom: '1rem',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setShowSchedule(!showSchedule)}
            >
              <span style={{ fontSize: '0.88rem', color: '#912338', fontWeight: 500 }}>
                {showSchedule ? '▾' : '▸'} Weekly Meal Schedule (optional)
              </span>
            </div>

            {showSchedule && (
              <div style={{ marginBottom: '1rem' }}>
                {DAYS.map((day) => (
                  <div key={day} style={{ marginBottom: '1rem' }}>
                    <p style={{ ...labelStyle, marginBottom: '0.5rem' }}>{day}</p>
                    <Row className='g-2'>
                      {MEALS.map((meal) => (
                        <Col key={meal}>
                          <Form.Control
                            type='text'
                            className='cu-form-input'
                            placeholder={meal.charAt(0).toUpperCase() + meal.slice(1)}
                            style={{ fontSize: '0.82rem' }}
                            value={schedule[day.toLowerCase()][meal]}
                            onChange={(e) => handleScheduleChange(day.toLowerCase(), meal, e.target.value)}
                          />
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))}
              </div>
            )}

            <Button type='submit' className='cu-btn-submit w-100 mt-2' disabled={createLoading}>
              {createLoading ? 'Assigning...' : 'Assign Plan'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Detail Modal */}
      {selectedPlan && (
        <Modal show={showDetail} onHide={() => setShowDetail(false)} centered size='lg'>
          <Modal.Header closeButton style={{ borderBottom: '1px solid #f0eaea' }}>
            <Modal.Title style={{ fontFamily: 'var(--cu-font-brand)', fontSize: '1.3rem' }}>
              {selectedPlan.title || 'Untitled Plan'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className='p-4'>
            <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
              {isCoach
                ? `Student: ${selectedPlan.student?.name} (${selectedPlan.student?.concordia_id})`
                : `Coach: ${selectedPlan.coach?.name}`}
            </p>
            {selectedPlan.notes && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ ...labelStyle, marginBottom: '0.3rem' }}>Notes</p>
                <p style={{ fontSize: '0.9rem', color: '#333', marginBottom: 0 }}>{selectedPlan.notes}</p>
              </div>
            )}
            {(selectedPlan.calories_target != null ||
              selectedPlan.protein_g != null ||
              selectedPlan.carbs_g != null ||
              selectedPlan.fats_g != null) && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>Macros</p>
                <Row className='g-3'>
                  {selectedPlan.calories_target != null && (
                    <Col xs={6} md={3}>
                      <div
                        style={{ background: '#fdf8f8', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}
                      >
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#912338' }}>
                          {selectedPlan.calories_target}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#888' }}>kcal</div>
                      </div>
                    </Col>
                  )}
                  {selectedPlan.protein_g != null && (
                    <Col xs={6} md={3}>
                      <div
                        style={{ background: '#fdf8f8', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}
                      >
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#912338' }}>
                          {selectedPlan.protein_g}g
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#888' }}>Protein</div>
                      </div>
                    </Col>
                  )}
                  {selectedPlan.carbs_g != null && (
                    <Col xs={6} md={3}>
                      <div
                        style={{ background: '#fdf8f8', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}
                      >
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#912338' }}>
                          {selectedPlan.carbs_g}g
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#888' }}>Carbs</div>
                      </div>
                    </Col>
                  )}
                  {selectedPlan.fats_g != null && (
                    <Col xs={6} md={3}>
                      <div
                        style={{ background: '#fdf8f8', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}
                      >
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#912338' }}>
                          {selectedPlan.fats_g}g
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#888' }}>Fats</div>
                      </div>
                    </Col>
                  )}
                </Row>
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

            {/* Weekly Schedule */}
            {hasScheduleData(selectedPlan) && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>Weekly Meal Schedule</p>
                {DAYS.map((day) => {
                  const d = selectedPlan.plan?.[day.toLowerCase()];
                  if (!d || (!d.breakfast && !d.lunch && !d.dinner)) return null;
                  return (
                    <div
                      key={day}
                      style={{
                        marginBottom: '0.75rem',
                        padding: '0.75rem',
                        background: '#fdf8f8',
                        borderRadius: '8px',
                        border: '1px solid #f0eaea',
                      }}
                    >
                      <p style={{ ...labelStyle, marginBottom: '0.5rem' }}>{day}</p>
                      <div className='d-flex flex-column gap-1'>
                        {d.breakfast && (
                          <span style={{ fontSize: '0.85rem', color: '#333' }}>
                            <span style={{ color: '#888', fontSize: '0.78rem' }}>Breakfast: </span>
                            {d.breakfast}
                          </span>
                        )}
                        {d.lunch && (
                          <span style={{ fontSize: '0.85rem', color: '#333' }}>
                            <span style={{ color: '#888', fontSize: '0.78rem' }}>Lunch: </span>
                            {d.lunch}
                          </span>
                        )}
                        {d.dinner && (
                          <span style={{ fontSize: '0.85rem', color: '#333' }}>
                            <span style={{ color: '#888', fontSize: '0.78rem' }}>Dinner: </span>
                            {d.dinner}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                      await api.patch(`/nutrition-plans/${selectedPlan.id}/update/`, {
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
                <Button
                  variant='outline-danger'
                  size='sm'
                  style={{ fontSize: '0.82rem' }}
                  onClick={() => handleDelete(selectedPlan.id)}
                >
                  Delete Plan
                </Button>
              </div>
            )}
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
}

export default NutritionPlans;
