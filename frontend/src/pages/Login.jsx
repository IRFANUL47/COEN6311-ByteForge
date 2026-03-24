import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import concordiaLogo from '../assets/concordia-logo.png';
import api from '../api/axios';
import { useAuth } from '../context/auth/useAuth';

function Login() {
  const [concordiaId, setConcordiaId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, updateDietaryRestrictions } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login/', { concordia_id: concordiaId, password });
      login(response.data.user, response.data.tokens);

      if (response.data.user.role === 'STUDENT') {
        try {
          const restrictionsRes = await api.get('/dietary-restrictions/');
          updateDietaryRestrictions(restrictionsRes.data.map((r) => r.dietary_restriction));
        } catch {
          updateDietaryRestrictions([]);
        }
      } else {
        updateDietaryRestrictions([]);
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='cu-auth-page'>
      <Card className='cu-auth-card p-4' style={{ width: '100%', maxWidth: '420px' }}>
        <Card.Body>
          <div className='text-center mb-4'>
            <h2 className='cu-auth-title'>Welcome</h2>
            <p className='cu-auth-subtitle mb-0'>Sign in to your account</p>
          </div>

          {error && (
            <Alert variant='danger' className='py-2' style={{ fontSize: '0.88rem' }}>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Concordia ID</Form.Label>
              <Form.Control
                type='text'
                className='cu-form-input'
                placeholder='Enter your Concordia ID'
                value={concordiaId}
                onChange={(e) => setConcordiaId(e.target.value)}
              />
            </Form.Group>

            <Form.Group className='mb-4'>
              <Form.Label className='cu-form-label'>Password</Form.Label>
              <Form.Control
                type='password'
                className='cu-form-input'
                placeholder='Enter your password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Group>

            <Button type='submit' className='cu-btn-submit w-100' disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form>

          <p className='text-center cu-auth-switch mt-3 mb-0' style={{ fontSize: '0.88rem', color: '#777' }}>
            Don't have an account? <Link to='/register'>Register</Link>
          </p>
        </Card.Body>
      </Card>
      <img src={concordiaLogo} alt='Concordia University' className='concordia-logo' />
    </div>
  );
}

export default Login;
