import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import LoginPopup from '../Auth/LoginPopup.jsx';
import { isLoggedIn, getCurrentUser } from '../../data/loginData.js';
import { PROJECTS, getAccessibleProjects } from '../../data/projects.js';
import strawHeadedBulbulPainting from '../../assets/Feng Yun Painting.jpg';
import '../../css/components/Home/Home.css';

// Matches Home.jsx's unauthenticated hero: day/date/time updates every second.
const getFormattedDateTime = () => {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[now.getDay()];
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const time = now.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return `${day}, ${dd}/${mm}/${yyyy} ${time}`;
};

// Full-page login screen shown at "/". Reuses the existing LoginPopup implementation,
// framed by the same hero branding + info section layout used on the project home page.
// On success, sends the user to the project selected in the login popup.
function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(getFormattedDateTime());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(getFormattedDateTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoggedIn()) {
    const accessibleProjects = getAccessibleProjects(getCurrentUser()?.project);
    return accessibleProjects.length === 1
      ? <Navigate to={accessibleProjects[0].path} state={{ viaAppNavigation: true }} replace />
      : <Navigate to="/" replace />;
  }

  const handleLoginSuccess = (userData) => {
    onLoginSuccess(userData);
    const accessibleProjects = getAccessibleProjects(userData.project);
    const selectedProject = PROJECTS.find(project => project.id === userData.selectedProject);
    if (selectedProject) {
      navigate(selectedProject.path, { state: { viaAppNavigation: true } });
    } else if (accessibleProjects.length === 1) {
      navigate(accessibleProjects[0].path, { state: { viaAppNavigation: true } });
    } else {
      navigate('/');
    }
  };

  return (
    <div className="home-container">
      <section className="hero-section">
        <div className="hero-background"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L3.09 8.26L4 21L12 17L20 21L20.91 8.26L12 2Z"/>
            </svg>
            Conservation in Action
          </div>
          <div className="hero-logo-enhanced">
            <img 
              src="/WWF%20Logo/WWF%20Logo%20Large.jpg"
              alt="WWF Logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <h1 className="hero-title">
            WWF SG Project Management Platform
          </h1>
          <div className="hero-datetime theme-datetime">
            {currentDateTime}
          </div>
          <p className="hero-subtitle">
            Empowering conservation through advanced data visualization and automated survey management.
            Log in to access your survey projects and help protect Singapore's biodiversity.
          </p>
          <div className="hero-cta">
            <button onClick={() => setIsPopupOpen(true)} className="btn btn-login" style={{
              background: 'linear-gradient(135deg, #00ECFA 0%, #00B8EA 100%)',
              color: '#fff',
              padding: '12px 32px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1.1rem',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
              border: 'none',
              cursor: 'pointer'
            }}>
              Login
            </button>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', justifyContent: 'center', fontSize: '0.98rem' }}>
            <Link to="/privacy-policy" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}>
              Privacy Policy
            </Link>
            <span style={{ color: '#64748b' }}>|</span>
            <Link to="/terms-of-service" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}>
              Terms of Service
            </Link>
          </div>
        </div>
      </section>

      {/* Info Section - lists the currently supported projects */}
      <section className="info-section">
        <div className="info-container" style={{ gridTemplateColumns: '1fr', maxWidth: '900px', textAlign: 'left' }}>
          <div className="info-content">
            {PROJECTS.map(project => (
              <div key={project.id} style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0 }}>{project.name}</h3>
                  </div>
                  <div>
                    <p style={{ margin: 0 }}>{project.description}</p>
                  </div>
                  <Link
                    to={project.path}
                    state={{ viaAppNavigation: true, publicPreview: true }}
                    style={{
                      display: 'inline-block',
                      marginTop: '1rem',
                      padding: '0.5rem 1.5rem',
                      borderRadius: '6px',
                      background: '#00B8EA',
                      color: 'white',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                  >
                    View {project.name}
                  </Link>
                </div>
                <img
                  src={strawHeadedBulbulPainting}
                  alt={project.name}
                  style={{ flex: '0 0 200px', width: '200px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <LoginPopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}

export default LoginPage;
