import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './AuthContext.jsx';

/**
 * ProtectedRoute component that restricts access to authenticated users only.
 * If user is not authenticated, redirects to the home page.
 */
class ProtectedRoute extends React.Component {
  static contextType = AuthContext;

  checkIfAuthenticated() {
    // First check context
    const { isAuthenticated } = this.context;
    if (isAuthenticated) return true;
    
    // Then check localStorage as a fallback
    try {
      // Check if user exists in localStorage
      const userDataString = localStorage.getItem('user');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        if (userData) return true;
      }
      
      // Also check the isAuthenticated flag directly
      if (localStorage.getItem('isAuthenticated') === 'true') {
        return true;
      }
    } catch (error) {
      console.error('Error checking authentication in ProtectedRoute:', error);
    }
    
    return false;
  }

  render() {
    const { loading } = this.context;
    const isAuthenticated = this.checkIfAuthenticated();
    
    // If auth is still loading, show a loading indicator
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            Loading...
          </div>
        </div>
      );
    }
    
    // If not authenticated, redirect to home page instead of login page
    if (!isAuthenticated) {
      return <Navigate to="/" replace />;
    }
    
    // If authenticated, render the child routes
    return <Outlet />;
  }
}

export default ProtectedRoute;
