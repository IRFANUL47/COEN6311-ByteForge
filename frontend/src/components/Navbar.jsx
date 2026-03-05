import { Link, useLocation } from 'react-router-dom'
import { Navbar, Container, Nav, Button } from 'react-bootstrap'

function AppNavbar() {
  const location = useLocation()

  return (
    <Navbar className='cu-navbar' expand='md' sticky='top'>
      <Container fluid className='px-3'>
        <Link to='/' className='cu-brand me-4'>CUFitness</Link>
        <Navbar.Toggle aria-controls='main-nav' />
        <Navbar.Collapse id='main-nav'>
          <Nav className='me-auto'>
            <Link to='/' className={`cu-nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
            <Link to='/profile' className={`cu-nav-link ${location.pathname === '/profile' ? 'active' : ''}`}>Profile</Link>
            <Link to='/workouts' className={`cu-nav-link ${location.pathname === '/workouts' ? 'active' : ''}`}>Workout Plans</Link>
          </Nav>
          <Nav className='align-items-center gap-2'>
            <Link to='/register' className={`cu-nav-link ${location.pathname === '/register' ? 'active' : ''}`}>Register</Link>
            <Link to='/login'>
              <Button className='cu-btn-login' size='sm'>Login</Button>
            </Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

export default AppNavbar
