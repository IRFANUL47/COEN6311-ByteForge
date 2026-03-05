import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import concordiaLogo from '../assets/concordia-logo.png';
import api from '../api/axios';

const fieldNames = {
  first_name: 'First Name',
  last_name: 'Last Name',
  concordia_id: 'Concordia ID',
  email: 'Email',
  password: 'Password',
  role: 'Role',
};

function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    concordiaId: '',
    email: '',
    password: '',
    role: 'STUDENT',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register/', {
        first_name: formData.firstName,
        last_name: formData.lastName,
        concordia_id: formData.concordiaId,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        const firstError = data[firstKey];
        const message = Array.isArray(firstError) ? firstError[0] : firstError;
        const label = fieldNames[firstKey] || firstKey;
        setError(`${label}: ${message}`);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='cu-auth-page'>
      <Card className='cu-auth-card p-4' style={{ width: '100%', maxWidth: '460px' }}>
        <Card.Body>
          <div className='text-center mb-4'>
            <h2 className='cu-auth-title'>Create an account</h2>
            <p className='cu-auth-subtitle mb-0'>Join the Concordia fitness community</p>
          </div>

          {error && (
            <Alert variant='danger' className='py-2' style={{ fontSize: '0.88rem' }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant='success' className='py-2' style={{ fontSize: '0.88rem' }}>
              Account created! Redirecting to login...
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <div className='d-flex gap-3'>
              <Form.Group className='mb-3 flex-fill'>
                <Form.Label className='cu-form-label'>First Name</Form.Label>
                <Form.Control
                  type='text'
                  name='firstName'
                  className='cu-form-input'
                  placeholder='First name'
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </Form.Group>
              <Form.Group className='mb-3 flex-fill'>
                <Form.Label className='cu-form-label'>Last Name</Form.Label>
                <Form.Control
                  type='text'
                  name='lastName'
                  className='cu-form-input'
                  placeholder='Last name'
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </Form.Group>
            </div>

            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Concordia ID</Form.Label>
              <Form.Control
                type='text'
                name='concordiaId'
                className='cu-form-input'
                placeholder='Enter your Concordia ID'
                value={formData.concordiaId}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Email</Form.Label>
              <Form.Control
                type='email'
                name='email'
                className='cu-form-input'
                placeholder='Enter your email'
                value={formData.email}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Password</Form.Label>
              <Form.Control
                type='password'
                name='password'
                className='cu-form-input'
                placeholder='Create a password'
                value={formData.password}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className='mb-4'>
              <Form.Label className='cu-form-label'>Role</Form.Label>
              <Form.Select name='role' className='cu-form-input' value={formData.role} onChange={handleChange}>
                <option value='STUDENT'>Student</option>
                <option value='COACH'>Coach</option>
              </Form.Select>
            </Form.Group>

            <Button type='submit' className='cu-btn-submit w-100' disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </Form>

          <p className='text-center cu-auth-switch mt-3 mb-0' style={{ fontSize: '0.88rem', color: '#777' }}>
            Already have an account? <Link to='/login'>Sign in</Link>
          </p>
        </Card.Body>
      </Card>
      <img src={concordiaLogo} alt='Concordia University' className='concordia-logo' />
    </div>
  );
}

export default Register;
