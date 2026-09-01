import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../../data/loginData.js';

// Allow the project home page for authenticated users, including direct URL entry
// and browser refreshes. Public preview links remain available without login.
function HomeRouteGuard({ children, isAuthenticated = false }) {
  const location = useLocation();

  if (location.state?.publicPreview) {
    return React.cloneElement(children, { isPublicPreview: true });
  }

  if (!isAuthenticated && !isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default HomeRouteGuard;
