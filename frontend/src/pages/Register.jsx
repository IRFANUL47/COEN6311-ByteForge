import { useState } from 'react'

function Register() {
	const [formData, setFormData] = useState({
		studentId: '',
		password: '',
		role: 'Student',
	})

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value })
	}

	const handleSubmit = (e) => {
		e.preventDefault()
		console.log('Register attempted with:', formData)
	}

	return (
		<div>
			<h2>Register</h2>
			<form onSubmit={handleSubmit}>
				<input
					type="text"
					name="studentId"
					placeholder="Student ID"
					value={formData.studentId}
					onChange={handleChange}
				/>
				<input
					type="password"
					name="password"
					placeholder="Password"
					value={formData.password}
					onChange={handleChange}
				/>
				<select name="role" value={formData.role} onChange={handleChange}>
					<option value="Student">Student</option>
					<option value="Coach">Coach</option>
				</select>
				<button type="submit">Register</button>
			</form>
		</div>
	)
}

export default Register
