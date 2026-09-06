import React, { Component, ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cows from './pages/Cows';
import MilkEntry from './pages/MilkEntry';
import Members from './pages/Members';
import Distribution from './pages/Distribution';
import Reports from './pages/Reports';
import Materials from './pages/Materials';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';

import { CircularProgress, Box, Typography } from '@mui/material';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box p={4}>
          <Typography variant="h4" color="error">React Crashed!</Typography>
          <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-wrap', color: 'red' }}>
            {this.state.error?.toString()}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack}
          </Typography>
        </Box>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;
  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/cows" element={<ProtectedRoute><Cows /></ProtectedRoute>} />
          <Route path="/milk" element={<ProtectedRoute><MilkEntry /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
          <Route path="/distribution" element={<ProtectedRoute><Distribution /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/materials" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
