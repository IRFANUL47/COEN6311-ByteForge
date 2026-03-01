import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';
import concordiaLogo from '../assets/concordia-logo.png';

function Register() {
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    role: 'Student',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Register attempted with:', formData);
  };

  return (
    <div className='auth-page'>
      <div className='auth-card'>
        <div className='auth-card-header'>
          <h2 className='auth-title'>Create an account</h2>
          <p className='auth-subtitle'>Join the Concordia fitness community</p>
        </div>

        <form onSubmit={handleSubmit} className='auth-form'>
          <div className='form-group'>
            <label className='form-label'>User ID</label>
            <input
              type='text'
              name='userId'
              className='form-input'
              placeholder='Enter your user ID'
              value={formData.userId}
              onChange={handleChange}
            />
          </div>

          <div className='form-group'>
            <label className='form-label'>Password</label>
            <input
              type='password'
              name='password'
              className='form-input'
              placeholder='Create a password'
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className='form-group'>
            <label className='form-label'>Role</label>
            <select name='role' className='form-input form-select' value={formData.role} onChange={handleChange}>
              <option value='Student'>Student</option>
              <option value='Coach'>Coach</option>
            </select>
          </div>

          <button type='submit' className='auth-btn'>
            Create Account
          </button>
        </form>

        <p className='auth-switch'>
          Already have an account? <Link to='/login'>Sign in</Link>
        </p>
      </div>
      <img src={concordiaLogo} alt='Concordia University' className='concordia-logo' />
    </div>
  );
}

export default Register;
