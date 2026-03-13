import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import api from '../api/axios';
import { useAuth } from '../context/auth/useAuth';
import concordiaLogo from '../assets/concordia-logo.png';

function Profile() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);
    try {
      const response = await api.put('/profile/update/', profileData);
      login({ ...user, ...response.data }, JSON.parse(localStorage.getItem('tokens')));
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordLoading(true);
    try {
      await api.put('/profile/update/password/', passwordData);
      setPasswordSuccess('Password updated. Please log in again.');
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setPasswordError(Array.isArray(detail) ? detail[0] : detail || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await api.delete('/profile/delete/', { data: { password: deletePassword } });
      logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'Failed to delete account.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className='cu-auth-page' style={{ alignItems: 'flex-start', paddingTop: '2.5rem' }}>
      <div style={{ width: '100%', maxWidth: '680px' }}>
        {/* Profile Info */}
        <Card className='cu-auth-card p-4 mb-4'>
          <Card.Body>
            <h5 className='cu-auth-title mb-1' style={{ fontSize: '1.3rem' }}>
              Personal Information
            </h5>
            <p className='cu-auth-subtitle mb-3'>Update your name and email</p>

            {profileError && (
              <Alert variant='danger' className='py-2' style={{ fontSize: '0.88rem' }}>
                {profileError}
              </Alert>
            )}
            {profileSuccess && (
              <Alert variant='success' className='py-2' style={{ fontSize: '0.88rem' }}>
                {profileSuccess}
              </Alert>
            )}

            <Form onSubmit={handleProfileSubmit}>
              <Row>
                <Col>
                  <Form.Group className='mb-3'>
                    <Form.Label className='cu-form-label'>First Name</Form.Label>
                    <Form.Control
                      type='text'
                      name='first_name'
                      className='cu-form-input'
                      value={profileData.first_name}
                      onChange={handleProfileChange}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className='mb-3'>
                    <Form.Label className='cu-form-label'>Last Name</Form.Label>
                    <Form.Control
                      type='text'
                      name='last_name'
                      className='cu-form-input'
                      value={profileData.last_name}
                      onChange={handleProfileChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className='mb-4'>
                <Form.Label className='cu-form-label'>Email</Form.Label>
                <Form.Control
                  type='email'
                  name='email'
                  className='cu-form-input'
                  value={profileData.email}
                  onChange={handleProfileChange}
                />
              </Form.Group>
              <Button type='submit' className='cu-btn-submit' disabled={profileLoading}>
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </Form>
          </Card.Body>
        </Card>

        {/* Update Password */}
        <Card className='cu-auth-card p-4 mb-4'>
          <Card.Body>
            <h5 className='cu-auth-title mb-1' style={{ fontSize: '1.3rem' }}>
              Change Password
            </h5>
            <p className='cu-auth-subtitle mb-3'>Enter your current password to set a new one</p>

            {passwordError && (
              <Alert variant='danger' className='py-2' style={{ fontSize: '0.88rem' }}>
                {passwordError}
              </Alert>
            )}
            {passwordSuccess && (
              <Alert variant='success' className='py-2' style={{ fontSize: '0.88rem' }}>
                {passwordSuccess}
              </Alert>
            )}

            <Form onSubmit={handlePasswordSubmit}>
              <Form.Group className='mb-3'>
                <Form.Label className='cu-form-label'>Current Password</Form.Label>
                <Form.Control
                  type='password'
                  name='current_password'
                  className='cu-form-input'
                  placeholder='Enter current password'
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                />
              </Form.Group>
              <Form.Group className='mb-4'>
                <Form.Label className='cu-form-label'>New Password</Form.Label>
                <Form.Control
                  type='password'
                  name='new_password'
                  className='cu-form-input'
                  placeholder='Enter new password'
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                />
              </Form.Group>
              <Button type='submit' className='cu-btn-submit' disabled={passwordLoading}>
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </Form>
          </Card.Body>
        </Card>

        {/* Delete Account */}
        <Card className='cu-auth-card p-4 mb-4' style={{ borderColor: '#f5c2c7' }}>
          <Card.Body>
            <h5 className='cu-auth-title mb-1' style={{ fontSize: '1.3rem', color: '#912338' }}>
              Delete Account
            </h5>
            <p className='cu-auth-subtitle mb-3'>This action is permanent and cannot be undone</p>

            {deleteError && (
              <Alert variant='danger' className='py-2' style={{ fontSize: '0.88rem' }}>
                {deleteError}
              </Alert>
            )}

            <Form onSubmit={handleDelete}>
              <Form.Group className='mb-4'>
                <Form.Label className='cu-form-label'>Confirm Password</Form.Label>
                <Form.Control
                  type='password'
                  className='cu-form-input'
                  placeholder='Enter your password to confirm'
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </Form.Group>
              <Button type='submit' variant='danger' disabled={deleteLoading}>
                {deleteLoading ? 'Deleting...' : 'Delete Account'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

export default Profile;
