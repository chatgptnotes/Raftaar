import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import EmergencyLocation from './pages/EmergencyLocation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Driver from './pages/Driver';
import CreateDriver from './pages/CreateDriver';
import EditDriver from './pages/EditDriver';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EmergencyLocation />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/driver"
          element={
            <ProtectedRoute>
              <Driver />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/driver/create"
          element={
            <ProtectedRoute>
              <CreateDriver />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/driver/edit/:id"
          element={
            <ProtectedRoute>
              <EditDriver />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;