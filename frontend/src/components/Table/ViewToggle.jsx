import React from 'react';
import '../../css/components/Table/ViewToggle.css';

const ViewToggle = ({ currentView, onToggle }) => {
  return (
    <div className="view-toggle">
      <button 
        className={`toggle-button ${currentView === 'table' ? 'active' : ''}`}
        onClick={() => onToggle('table')}
      >
        <span className="toggle-icon">📋</span>
        Table View
      </button>
      <button 
        className={`toggle-button ${currentView === 'pivot' ? 'active' : ''}`}
        onClick={() => onToggle('pivot')}
      >
        <span className="toggle-icon">📊</span>
        Pivot View
      </button>
    </div>
  );
};

export default ViewToggle;
