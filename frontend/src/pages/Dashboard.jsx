import { Card, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth/useAuth';

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
  const navigate = useNavigate();
  const bmi = user?.bmi || null;

  return (
    <div style={{ padding: '2rem 2.5rem', fontFamily: 'var(--cu-font-body)' }}>
      <h2 className='cu-auth-title mb-1' style={{ fontSize: '2rem' }}>
        Dashboard
      </h2>
      <p className='cu-auth-subtitle mb-4'>Welcome back, {user?.first_name}</p>

      <Row className='g-4'>
        {/* Fitness Stats + BMI + Dietary Restrictions*/}
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

        {/* Upcoming Sessions placeholder */}
        <Col md={6}>
          <Card className='cu-auth-card p-4' style={{ ...cardStyle, opacity: 0.5 }}>
            <Card.Body className='d-flex flex-column align-items-center justify-content-center text-center'>
              <h5 className='cu-auth-title mb-1' style={{ fontSize: '1.1rem' }}>
                Upcoming Sessions
              </h5>
              <p style={{ color: '#aaa', fontSize: '0.88rem', marginTop: '0.5rem', marginBottom: 0 }}>Coming soon</p>
            </Card.Body>
          </Card>
        </Col>

        {/* Workout Plan placeholder */}
        <Col md={6}>
          <Card className='cu-auth-card p-4' style={{ ...cardStyle, opacity: 0.5 }}>
            <Card.Body className='d-flex flex-column align-items-center justify-content-center text-center'>
              <h5 className='cu-auth-title mb-1' style={{ fontSize: '1.1rem' }}>
                Workout Plan
              </h5>
              <p style={{ color: '#aaa', fontSize: '0.88rem', marginTop: '0.5rem', marginBottom: 0 }}>Coming soon</p>
            </Card.Body>
          </Card>
        </Col>

        {/* Nutrition Plan placeholder */}
        <Col md={6}>
          <Card className='cu-auth-card p-4' style={{ ...cardStyle, opacity: 0.5 }}>
            <Card.Body className='d-flex flex-column align-items-center justify-content-center text-center'>
              <h5 className='cu-auth-title mb-1' style={{ fontSize: '1.1rem' }}>
                Nutrition Plan
              </h5>
              <p style={{ color: '#aaa', fontSize: '0.88rem', marginTop: '0.5rem', marginBottom: 0 }}>Coming soon</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
