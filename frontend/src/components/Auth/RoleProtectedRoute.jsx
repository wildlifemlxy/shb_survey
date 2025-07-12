import React from 'react';
import { Navigate } from 'react-router-dom';

// Component to protect routes based on user roles
const RoleProtectedRoute = ({ children, allowedRoles = [], redirectTo = "*" }) => {
  // Get user data from localStorage
  const getUserRole = () => {
    try {
      const userDataString = localStorage.getItem('user');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        return userData.role;
      }
      
      // Fallback to direct role storage
      return localStorage.getItem('userRole');
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  };

  const userRole = getUserRole();
  
  // Check if user is authenticated
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check if user role is in allowed roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    console.log(`Access denied: User role '${userRole}' not in allowed roles:`, allowedRoles);
    // For NotFound redirect, we'll redirect to a non-existent path that triggers the 404 route
    return <Navigate to="/404" replace />;
  }

  return children;
};

export default RoleProtectedRoute;
