import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAccessibleProjects } from '../../data/projects.js';
import '../../css/components/ProjectSwitcher/ProjectSwitcher.css';

function ProjectSwitcher({ isAuthenticated, currentUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const projects = getAccessibleProjects(currentUser?.project);
  const activeProject = projects.find(project => location.pathname.startsWith(project.path));

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated || projects.length <= 1 || location.pathname === '/') {
    return null;
  }

  const selectProject = (project) => {
    setIsOpen(false);
    const user = currentUser ? { ...currentUser, selectedProject: project.id } : null;
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
    navigate(project.path, { state: { viaAppNavigation: true } });
    window.dispatchEvent(new CustomEvent('projectChanged', { detail: project }));
  };

  return (
    <div className="project-switcher">
      <button
        type="button"
        className="project-switcher-trigger"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(open => !open)}
      >
        <span className="project-switcher-mark" aria-hidden="true">P</span>
        <span className="project-switcher-label">{activeProject?.name || 'Projects'}</span>
        <span className="project-switcher-chevron" aria-hidden="true">&#9662;</span>
      </button>

      {isOpen && (
        <div className="project-switcher-popover" role="dialog" aria-label="Choose a project">
          <div className="project-switcher-popover-header">
            <div>
              <p className="project-switcher-kicker">Workspace</p>
              <h2>Choose a project</h2>
            </div>
            <button
              type="button"
              className="project-switcher-close"
              aria-label="Close project chooser"
              onClick={() => setIsOpen(false)}
            >
              x
            </button>
          </div>
          <div className="project-switcher-options">
            {projects.map(project => (
              <button
                key={project.id}
                type="button"
                className={`project-switcher-option ${activeProject?.id === project.id ? 'active' : ''}`}
                onClick={() => selectProject(project)}
              >
                <span className="project-switcher-option-image">
                  {project.image && <img src={project.image} alt="" />}
                </span>
                <span>{project.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectSwitcher;