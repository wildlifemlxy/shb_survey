import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../../data/loginData.js';

// Only allow /StrawheadedBulbul when reached via in-app navigation while logged in.
// Direct URL entry, bookmarks, or a hard refresh carry no location.state and get bounced out.
// Exception: links tagged with `publicPreview` always work, showing a read-only public view.
function HomeRouteGuard({ children }) {
  const location = useLocation();

  if (location.state?.publicPreview) {
    return React.cloneElement(children, { isPublicPreview: true });
  }

  if (!isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  // Hard (full-page) navigations lose location.state, so also accept a one-time sessionStorage flag
  const hasSessionFlag = sessionStorage.getItem('viaAppNavigation') === 'true';
  if (hasSessionFlag) {
    sessionStorage.removeItem('viaAppNavigation');
  }

  if (!location.state?.viaAppNavigation && !hasSessionFlag) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default HomeRouteGuard;
