import { Link } from 'react-router-dom'

function Navbar() {
	return (
		<nav>
			<Link to="/">CUFitness</Link>
			<Link to="/login">Login</Link>
			<Link to="/register">Register</Link>
		</nav>
	)
}

export default Navbar
