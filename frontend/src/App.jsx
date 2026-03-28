import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/auth/useAuth';
import AppNavbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Equipment from './pages/Equipment';
import Dashboard from './pages/Dashboard';
import NutritionPlans from './pages/NutritionPlans';
import ChatWidget from './components/ChatWidget';
import WorkoutPlans from './pages/WorkoutPlans';


function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? '/dashboard' : '/login'} />;
}

function App() {
  const { user, tokens } = useAuth();

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
              <WorkoutPlans />
            </ProtectedRoute>
          }
        />
        <Route
          path='/nutrition-plans'
          element={
            <ProtectedRoute>
              <NutritionPlans />
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
      {user && <ChatWidget tokens={tokens} />}
    </BrowserRouter>
  );
}

export default App;
