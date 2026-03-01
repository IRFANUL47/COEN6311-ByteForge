import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const location = useLocation();

  return (
    <nav className='navbar'>
      <div className='navbar-left'>
        <Link to='/' className='navbar-brand'>
          CUFitness
        </Link>
        <div className='navbar-main-links'>
          <Link to='/' className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Home
          </Link>
          <Link to='/profile' className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}>
            Profile
          </Link>
          <Link to='/workouts' className={`nav-link ${location.pathname === '/workouts' ? 'active' : ''}`}>
            Workout Plans
          </Link>
        </div>
      </div>
      <div className='navbar-right'>
        <Link to='/register' className={`nav-link ${location.pathname === '/register' ? 'active' : ''}`}>
          Register
        </Link>
        <Link to='/login' className='nav-btn-login'>
          Login
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
