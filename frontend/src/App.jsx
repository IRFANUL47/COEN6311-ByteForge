import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/auth/useAuth';
import AppNavbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Equipment from './pages/Equipment';
import Dashboard from './pages/Dashboard';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? '/dashboard' : '/login'} />;
}

function App() {
  return (
    <BrowserRouter>
      <AppNavbar />
      <Routes>
        <Route path='/' element={<HomeRedirect />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route
          path='/dashboard'
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path='/workouts'
          element={
            <ProtectedRoute>
              <div>Workouts</div>
            </ProtectedRoute>
          }
        />
        <Route
          path='/profile'
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path='/equipment'
          element={
            <ProtectedRoute>
              <Equipment />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
