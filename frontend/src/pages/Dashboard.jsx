import { useState, useEffect } from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth/useAuth';
import api from '../api/axios';

const getBmiColor = (bmi) => {
  if (bmi < 18.5) return '#e5a712';
  if (bmi < 25) return '#508212';
  if (bmi < 30) return '#e5a712';
  return '#912338';
};

const getBmiLabel = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

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

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const cardStyle = { border: '1.5px solid #e4dcdc', borderRadius: '10px', height: '100%' };
const labelStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#888',
  fontWeight: 500,
};
const valueStyle = { fontSize: '1.1rem', fontWeight: 600, color: '#1a1a1a' };

function Dashboard() {
  const { user, dietaryRestrictions } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isCoach = user?.role === 'COACH';
  const navigate = useNavigate();
  const bmi = user?.bmi || null;

  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [upcomingSession, setUpcomingSession] = useState(null);
  const [coachStats, setCoachStats] = useState({ pending: 0, todaySessions: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isStudent) fetchStudentData();
    else if (isCoach) fetchCoachData();
    else setLoading(false);
  }, []);

  const fetchStudentData = async () => {
    try {
      const [workoutRes, nutritionRes, bookingsRes] = await Promise.allSettled([
        api.get('/workout-plans/'),
        api.get('/nutrition-plans/'),
        api.get('/bookings/'),
      ]);

      if (workoutRes.status === 'fulfilled') {
        const active = workoutRes.value.data
          .filter((p) => p.is_active)
          .sort((a, b) => new Date(a.end_date || '9999') - new Date(b.end_date || '9999'));
        setWorkoutPlan(active[0] || null);
      }

      if (nutritionRes.status === 'fulfilled') {
        const active = nutritionRes.value.data
          .filter((p) => p.is_active)
          .sort((a, b) => new Date(a.end_date || '9999') - new Date(b.end_date || '9999'));
        setNutritionPlan(active[0] || null);
      }

      if (bookingsRes.status === 'fulfilled') {
        const now = new Date();
        const upcoming = bookingsRes.value.data
          .filter((b) => b.status === 'APPROVED' && new Date(b.slot_start) > now)
          .sort((a, b) => new Date(a.slot_start) - new Date(b.slot_start));
        setUpcomingSession(upcoming[0] || null);
      }
    } catch {
      // silent fail — dashboard is non-critical
    } finally {
      setLoading(false);
    }
  };

  const fetchCoachData = async () => {
    try {
      const [bookingsRes] = await Promise.allSettled([api.get('/bookings/')]);

      if (bookingsRes.status === 'fulfilled') {
        const bookings = bookingsRes.value.data;
        const pending = bookings.filter((b) => b.status === 'PENDING').length;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 86400000);
        const todaySessions = bookings
          .filter(
            (b) => b.status === 'APPROVED' && new Date(b.slot_start) >= todayStart && new Date(b.slot_start) < todayEnd,
          )
          .sort((a, b) => new Date(a.slot_start) - new Date(b.slot_start));

        setCoachStats({ pending, todaySessions });
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem 2.5rem', fontFamily: 'var(--cu-font-body)' }}>
      <h2 className='cu-auth-title mb-1' style={{ fontSize: '2rem' }}>
        Dashboard
      </h2>
      <p className='cu-auth-subtitle mb-4'>Welcome back, {user?.first_name}</p>

      <Row className='g-4'>
        {/* ── Fitness Stats (unchanged) ── */}
        <Col md={6}>
          <Card className='cu-auth-card p-4' style={cardStyle}>
            <Card.Body>
              <div className='d-flex justify-content-between align-items-start mb-3'>
                <div>
                  <h5 className='cu-auth-title mb-0' style={{ fontSize: '1.1rem' }}>
                    Fitness Stats
                  </h5>
                  <span
                    style={{ fontSize: '0.78rem', color: '#912338', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => navigate('/profile')}
                  >
                    Edit in Profile
                  </span>
                </div>
                {bmi && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: getBmiColor(bmi), lineHeight: 1 }}>
                      {bmi}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: getBmiColor(bmi), fontWeight: 600 }}>
                      {getBmiLabel(bmi)}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#bbb' }}>BMI</div>
                  </div>
                )}
              </div>
              <Row className='g-3'>
                <Col xs={6}>
                  <div style={labelStyle}>Age</div>
                  <div style={valueStyle}>{user?.age ? `${user.age} yrs` : '—'}</div>
                </Col>
                <Col xs={6}>
                  <div style={labelStyle}>Gender</div>
                  <div style={valueStyle}>
                    {user?.gender ? user.gender.charAt(0) + user.gender.slice(1).toLowerCase() : '—'}
                  </div>
                </Col>
                <Col xs={6}>
                  <div style={labelStyle}>Height</div>
                  <div style={valueStyle}>{user?.height ? `${user.height} cm` : '—'}</div>
                </Col>
                <Col xs={6}>
                  <div style={labelStyle}>Weight</div>
                  <div style={valueStyle}>{user?.weight ? `${user.weight} kg` : '—'}</div>
                </Col>
              </Row>
              {isStudent && dietaryRestrictions.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={labelStyle}>Dietary Restrictions</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                    {dietaryRestrictions.map((r) => (
                      <span
                        key={r.key}
                        style={{
                          fontSize: '0.78rem',
                          background: '#f5eeee',
                          color: '#912338',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '20px',
                          fontWeight: 500,
                        }}
                      >
                        {r.display_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!bmi && (
                <p style={{ color: '#bbb', fontSize: '0.8rem', marginTop: '1rem', marginBottom: 0 }}>
                  Add height and weight in Profile to see your BMI
                </p>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* ── Upcoming Session ── */}
        <Col md={6}>
          <Card
            className='cu-auth-card p-4'
            style={{ ...cardStyle, cursor: 'pointer' }}
            onClick={() => navigate('/sessions')}
          >
            <Card.Body className='d-flex flex-column'>
              <h5 className='cu-auth-title mb-3' style={{ fontSize: '1.1rem' }}>
                Upcoming Session
              </h5>
              {loading ? (
                <p style={{ color: '#aaa', fontSize: '0.88rem' }}>Loading...</p>
              ) : isCoach ? (
                coachStats.todaySessions.length === 0 ? (
                  <p style={{ color: '#aaa', fontSize: '0.88rem', marginBottom: 0 }}>No sessions today.</p>
                ) : (
                  <div className='d-flex flex-column gap-2'>
                    {coachStats.todaySessions.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          padding: '0.6rem 0.85rem',
                          background: '#fdf8f8',
                          borderRadius: '8px',
                          border: '1px solid #f0eaea',
                        }}
                      >
                        <p style={{ fontWeight: 600, marginBottom: '0.1rem', fontSize: '0.88rem', color: '#1a1a1a' }}>
                          {s.student_name}
                        </p>
                        <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: 0 }}>{formatDT(s.slot_start)}</p>
                      </div>
                    ))}
                  </div>
                )
              ) : upcomingSession ? (
                <div>
                  <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.25rem' }}>
                    with <strong style={{ color: '#1a1a1a' }}>{upcomingSession.coach_name}</strong>
                  </p>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: '#912338', marginBottom: '0.25rem' }}>
                    {formatDT(upcomingSession.slot_start)}
                  </p>
                  <Badge bg='success' style={{ fontSize: '0.72rem' }}>
                    Approved
                  </Badge>
                </div>
              ) : (
                <p style={{ color: '#aaa', fontSize: '0.88rem', marginBottom: 0 }}>No upcoming sessions.</p>
              )}
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#912338',
                  marginTop: 'auto',
                  paddingTop: '0.75rem',
                  marginBottom: 0,
                }}
              >
                View all sessions →
              </p>
            </Card.Body>
          </Card>
        </Col>

        {/* ── Workout Plan ── */}
        {!isCoach && (
          <Col md={6}>
            <Card
              className='cu-auth-card p-4'
              style={{ ...cardStyle, cursor: 'pointer' }}
              onClick={() => navigate('/workouts')}
            >
              <Card.Body className='d-flex flex-column'>
                <h5 className='cu-auth-title mb-3' style={{ fontSize: '1.1rem' }}>
                  Active Workout Plan
                </h5>
                {loading ? (
                  <p style={{ color: '#aaa', fontSize: '0.88rem' }}>Loading...</p>
                ) : workoutPlan ? (
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>
                      {workoutPlan.title || 'Untitled Plan'}
                    </p>
                    {workoutPlan.goal && (
                      <p style={{ fontSize: '0.82rem', color: '#555', marginBottom: '0.5rem' }}>
                        {workoutPlan.goal.length > 80 ? workoutPlan.goal.slice(0, 80) + '...' : workoutPlan.goal}
                      </p>
                    )}
                    <div className='d-flex gap-3' style={{ fontSize: '0.78rem', color: '#888' }}>
                      <span>by {workoutPlan.coach?.name}</span>
                      {workoutPlan.end_date && <span>until {formatDate(workoutPlan.end_date)}</span>}
                      <span>
                        {workoutPlan.days?.length || 0} day{workoutPlan.days?.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#aaa', fontSize: '0.88rem', marginBottom: 0 }}>No active workout plan.</p>
                )}
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#912338',
                    marginTop: 'auto',
                    paddingTop: '0.75rem',
                    marginBottom: 0,
                  }}
                >
                  View all plans →
                </p>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* ── Nutrition Plan ── */}
        {!isCoach && (
          <Col md={6}>
            <Card
              className='cu-auth-card p-4'
              style={{ ...cardStyle, cursor: 'pointer' }}
              onClick={() => navigate('/nutrition-plans')}
            >
              <Card.Body className='d-flex flex-column'>
                <h5 className='cu-auth-title mb-3' style={{ fontSize: '1.1rem' }}>
                  Active Nutrition Plan
                </h5>
                {loading ? (
                  <p style={{ color: '#aaa', fontSize: '0.88rem' }}>Loading...</p>
                ) : nutritionPlan ? (
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>
                      {nutritionPlan.title || 'Untitled Plan'}
                    </p>
                    {nutritionPlan.notes && (
                      <p style={{ fontSize: '0.82rem', color: '#555', marginBottom: '0.5rem' }}>
                        {nutritionPlan.notes.length > 80
                          ? nutritionPlan.notes.slice(0, 80) + '...'
                          : nutritionPlan.notes}
                      </p>
                    )}
                    <div className='d-flex flex-wrap gap-2' style={{ fontSize: '0.78rem', color: '#888' }}>
                      {nutritionPlan.end_date && <span>📅 until {formatDate(nutritionPlan.end_date)}</span>}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#aaa', fontSize: '0.88rem', marginBottom: 0 }}>No active nutrition plan.</p>
                )}
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#912338',
                    marginTop: 'auto',
                    paddingTop: '0.75rem',
                    marginBottom: 0,
                  }}
                >
                  View all plans →
                </p>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* ── Coach: pending requests summary ── */}
        {isCoach && (
          <Col md={6}>
            <Card
              className='cu-auth-card p-4'
              style={{ ...cardStyle, cursor: 'pointer' }}
              onClick={() => navigate('/sessions')}
            >
              <Card.Body className='d-flex flex-column justify-content-center'>
                <h5 className='cu-auth-title mb-3' style={{ fontSize: '1.1rem' }}>
                  Pending Requests
                </h5>
                {loading ? (
                  <p style={{ color: '#aaa', fontSize: '0.88rem' }}>Loading...</p>
                ) : coachStats.pending === 0 ? (
                  <p style={{ color: '#aaa', fontSize: '0.88rem', marginBottom: 0 }}>No pending booking requests.</p>
                ) : (
                  <div>
                    <p
                      style={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: '#912338',
                        marginBottom: '0.25rem',
                        lineHeight: 1,
                      }}
                    >
                      {coachStats.pending}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 0 }}>
                      booking request{coachStats.pending !== 1 ? 's' : ''} waiting for your approval
                    </p>
                  </div>
                )}
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#912338',
                    marginTop: 'auto',
                    paddingTop: '0.75rem',
                    marginBottom: 0,
                  }}
                >
                  View all sessions →
                </p>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}

export default Dashboard;
