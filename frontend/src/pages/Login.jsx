import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';
import concordiaLogo from '../assets/concordia-logo.png';

function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login attempted with:', userId);
    console.log('Password:', password);
  };

  return (
    <div className='auth-page'>
      <div className='auth-card'>
        <div className='auth-card-header'>
          <h2 className='auth-title'>Welcome</h2>
          <p className='auth-subtitle'>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className='auth-form'>
          <div className='form-group'>
            <label className='form-label'>User ID</label>
            <input
              type='text'
              className='form-input'
              placeholder='Enter your user ID'
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>

          <div className='form-group'>
            <label className='form-label'>Password</label>
            <input
              type='password'
              className='form-input'
              placeholder='Enter your password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type='submit' className='auth-btn'>
            Sign In
          </button>
        </form>

        <p className='auth-switch'>
          Don't have an account? <Link to='/register'>Register</Link>
        </p>
      </div>
      <img src={concordiaLogo} alt='Concordia University' className='concordia-logo' />
    </div>
  );
}

export default Login;
