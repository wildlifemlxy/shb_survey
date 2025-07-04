import React, { Component } from 'react';

class ObserverInfoSection extends Component {
  
  // Helper method to get current user's name from localStorage
  getCurrentUserName = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.name || '';
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return '';
    }
  };

  // Modified onAddObserverName to auto-populate with current user's name
  handleAddObserverName = () => {
    const userName = this.getCurrentUserName();
    if (this.props.onAddObserverName) {
      // Call the parent's method and pass the userName
      this.props.onAddObserverName(userName);
    }
  };

  // Method to populate first observer name if empty
  componentDidMount() {
    const { newSurvey, onObserverNameChange } = this.props;
    const observerNames = newSurvey['Observer name'] || [''];
    
    // If the first observer name is empty, auto-populate with current user's name
    if (observerNames.length === 1 && observerNames[0] === '') {
      const userName = this.getCurrentUserName();
      if (userName && onObserverNameChange) {
        onObserverNameChange(0, userName);
      }
    }
  }

  render() {
    const { newSurvey, onObserverNameChange, onAddObserverName, onRemoveObserverName, onInputChange, fieldErrors } = this.props;
    return (
      <div className="observer-info-section">
        {/* Observer name (multiple entry) */}
        <div className="form-group">
          <label>Observer name</label>
          {(newSurvey['Observer name'] || ['']).map((name, idx) => (
            <div key={idx} className="observer-name-row" style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <input
                type="text"
                value={name}
                onChange={e => onObserverNameChange(idx, e.target.value)}
                className="form-control"
                placeholder={`Observer name${(newSurvey['Observer name'] || []).length > 1 ? ` #${idx + 1}` : ''}`}
                style={{ flex: 1 }}
              />
              {(newSurvey['Observer name'] || []).length > 1 && (
                <button
                  type="button"
                  className="remove-btn observer-btn"
                  onClick={() => onRemoveObserverName(idx)}
                  aria-label="Remove observer"
                  style={{ minWidth: 32, minHeight: 32, fontSize: '1.2rem', marginLeft: 4, background: '#fff', color: '#d32f2f', border: '2px solid #d32f2f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, boxShadow: '0 2px 8px #f8d7da33', transition: 'background 0.18s, color 0.18s, border 0.18s' }}
                  onMouseOver={e => { e.currentTarget.style.background = '#ffeaea'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
                >
                  -
                </button>
              )}
              {idx === (newSurvey['Observer name'] || []).length - 1 && (
                <button
                  type="button"
                  className="add-btn observer-btn"
                  onClick={this.handleAddObserverName}
                  aria-label="Add observer"
                  style={{ minWidth: 32, minHeight: 32, fontSize: '1.2rem', marginLeft: 4, background: '#fff', color: '#388e3c', border: '2px solid #388e3c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, boxShadow: '0 2px 8px #e3fbe3', transition: 'background 0.18s, color 0.18s, border 0.18s' }}
                  onMouseOver={e => { e.currentTarget.style.background = '#e3fbe3'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
                >
                  +
                </button>
              )}
            </div>
          ))}
          {fieldErrors && fieldErrors['Observer name'] && (
            <div className="error-message">{fieldErrors['Observer name']}</div>
          )}
        </div>
        {/* Location */}
        <div className="form-group">
          <label>Location
            <input
              type="text"
              name="Location"
              value={newSurvey['Location'] || ''}
              onChange={onInputChange}
              className="form-control"
              placeholder="Enter location"
            />
          </label>
          {fieldErrors && fieldErrors['Location'] && (
            <div className="error-message">{fieldErrors['Location']}</div>
          )}
        </div>
        {/* Date */}
        <div className="form-group">
          <label>Date
            <input
              type="date"
              name="Date"
              value={newSurvey['Date'] || ''}
              onChange={onInputChange}
              className="form-control"
              placeholder="DD/MM/YYYY"
              autoComplete="off"
              style={{
                colorScheme: 'light',
                position: 'relative'
              }}
              onFocus={(e) => {
                e.target.showPicker && e.target.showPicker();
              }}
            />
          </label>
          {fieldErrors && fieldErrors['Date'] && (
            <div className="error-message">{fieldErrors['Date']}</div>
          )}
          <style jsx>{`
            input[type="date"]::-webkit-calendar-picker-indicator {
              opacity: 0;
              position: absolute;
              right: 0;
              width: 100%;
              height: 100%;
              cursor: pointer;
            }
            input[type="date"]::-webkit-inner-spin-button,
            input[type="date"]::-webkit-clear-button {
              display: none;
            }
          `}</style>
        </div>
        {/* Number of Observation */}
        <div className="form-group">
          <label>Number of Observation
            <input
              type="text"
              name="Number of Observation"
              value={newSurvey['Number of Observation'] || ''}
              onChange={onInputChange}
              className="form-control"
              placeholder="e.g. 1, 2, 3..."
            />
          </label>
          {fieldErrors && fieldErrors['Number of Observation'] && (
            <div className="error-message">{fieldErrors['Number of Observation']}</div>
          )}
        </div>
      </div>
    );
  }
}

export default ObserverInfoSection;
