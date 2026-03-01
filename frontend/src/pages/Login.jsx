import { useState } from 'react'

function Login() {
	const [studentId, setStudentId] = useState('')
	const [password, setPassword] = useState('')

	const handleSubmit = (e) => {
		e.preventDefault()
		console.log('Login attempted with:', studentId)
		console.log('Password:', password)
	}

	return (
		<div>
			<h2>Login</h2>
			<form onSubmit={handleSubmit}>
				<input
					type="text"
					placeholder="Student ID"
					value={studentId}
					onChange={(e) => setStudentId(e.target.value)}
				/>
				<input
					type="password"
					placeholder="Password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				<button type="submit">Login</button>
			</form>
		</div>
	)
}

export default Login
