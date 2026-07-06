import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/StudentList';
import Editor from './pages/Editor';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Activity from './pages/Activity';
import { AuthProvider, useAuth } from './context/AuthContext';
import GlobalProgress from './components/GlobalProgress';

const PrivateRoute = ({ children, requireAdmin = false }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (requireAdmin && user.role !== 'Admin') return <Navigate to="/" />;
  return children;
};

const Layout = ({ children }) => (
  <div className="app-wrapper">
    <Sidebar />
    <main className="main-content">
      {children}
    </main>
    <GlobalProgress />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/students" element={<PrivateRoute><Layout><StudentList /></Layout></PrivateRoute>} />
          <Route path="/form/:id" element={<PrivateRoute><Layout><Editor /></Layout></PrivateRoute>} />
          <Route path="/activity" element={<PrivateRoute><Layout><Activity /></Layout></PrivateRoute>} />
          
          {/* Admin Only Routes */}
          <Route path="/reports" element={<PrivateRoute requireAdmin={true}><Layout><Reports /></Layout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute requireAdmin={true}><Layout><Settings /></Layout></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
