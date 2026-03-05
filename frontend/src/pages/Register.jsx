import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Form, Button } from 'react-bootstrap'
import concordiaLogo from '../assets/concordia-logo.png'

function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    concordiaId: '',
    email: '',
    password: '',
    role: 'STUDENT',
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Register attempted with:', formData)
  }

  return (
    <div className='cu-auth-page'>
      <Card className='cu-auth-card p-4' style={{ width: '100%', maxWidth: '460px' }}>
        <Card.Body>
          <div className='text-center mb-4'>
            <h2 className='cu-auth-title'>Create an account</h2>
            <p className='cu-auth-subtitle mb-0'>Join the Concordia fitness community</p>
          </div>

          <Form onSubmit={handleSubmit}>
            <div className='d-flex gap-3'>
              <Form.Group className='mb-3 flex-fill'>
                <Form.Label className='cu-form-label'>First Name</Form.Label>
                <Form.Control type='text' name='firstName' className='cu-form-input' placeholder='First name' value={formData.firstName} onChange={handleChange} />
              </Form.Group>
              <Form.Group className='mb-3 flex-fill'>
                <Form.Label className='cu-form-label'>Last Name</Form.Label>
                <Form.Control type='text' name='lastName' className='cu-form-input' placeholder='Last name' value={formData.lastName} onChange={handleChange} />
              </Form.Group>
            </div>

            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Concordia ID</Form.Label>
              <Form.Control type='text' name='concordiaId' className='cu-form-input' placeholder='Enter your Concordia ID' value={formData.concordiaId} onChange={handleChange} />
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Email</Form.Label>
              <Form.Control type='email' name='email' className='cu-form-input' placeholder='Enter your email' value={formData.email} onChange={handleChange} />
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label className='cu-form-label'>Password</Form.Label>
              <Form.Control type='password' name='password' className='cu-form-input' placeholder='Create a password' value={formData.password} onChange={handleChange} />
            </Form.Group>

            <Form.Group className='mb-4'>
              <Form.Label className='cu-form-label'>Role</Form.Label>
              <Form.Select name='role' className='cu-form-input' value={formData.role} onChange={handleChange}>
                <option value='STUDENT'>Student</option>
                <option value='COACH'>Coach</option>
              </Form.Select>
            </Form.Group>

            <Button type='submit' className='cu-btn-submit w-100'>Create Account</Button>
          </Form>

          <p className='text-center cu-auth-switch mt-3 mb-0' style={{ fontSize: '0.88rem', color: '#777' }}>
            Already have an account? <Link to='/login'>Sign in</Link>
          </p>
        </Card.Body>
      </Card>
      <img src={concordiaLogo} alt='Concordia University' className='concordia-logo' />
    </div>
  )
}

export default Register
