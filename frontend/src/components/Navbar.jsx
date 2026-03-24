import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { useAuth } from '../context/auth/useAuth';

function AppNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Navbar className='cu-navbar' expand='lg' sticky='top'>
      <Container fluid className='px-3'>
        <Link to='/' className='cu-brand me-4'>
          CUFitness
        </Link>
        <Navbar.Toggle aria-controls='main-nav' />
        <Navbar.Collapse id='main-nav'>
          {user ? (
            <>
              <Nav className='me-auto'>
                <Link to='/dashboard' className={`cu-nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                  Home
                </Link>
                <Link to='/workouts' className={`cu-nav-link ${location.pathname === '/workouts' ? 'active' : ''}`}>
                  Workout Plans
                </Link>
                <Link
                  to='/nutrition-plans'
                  className={`cu-nav-link ${location.pathname === '/nutrition-plans' ? 'active' : ''}`}
                >
                  Nutrition Plans
                </Link>
                <Link to='/profile' className={`cu-nav-link ${location.pathname === '/profile' ? 'active' : ''}`}>
                  Profile
                </Link>
                <Link to='/equipment' className={`cu-nav-link ${location.pathname === '/equipment' ? 'active' : ''}`}>
                  Equipment
                </Link>
              </Nav>
              <Nav className='align-items-center gap-2'>
                <Button className='cu-btn-login' size='sm' onClick={handleLogout}>
                  Logout
                </Button>
              </Nav>
            </>
          ) : (
            <>
              <Nav className='me-auto' />
              <Nav className='align-items-center gap-2'>
                <Link to='/register' className={`cu-nav-link ${location.pathname === '/register' ? 'active' : ''}`}>
                  Register
                </Link>
                <Link to='/login'>
                  <Button className='cu-btn-login' size='sm'>
                    Login
                  </Button>
                </Link>
              </Nav>
            </>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;
