import React, { Component } from 'react';

class ObserverInfoSection extends Component {
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
                  onClick={onAddObserverName}
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
              type="text"
              name="Date"
              value={newSurvey['Date'] || ''}
              onChange={onInputChange}
              className="form-control"
              placeholder="DD-MMM-YY"
              autoComplete="off"
            />
          </label>
          {fieldErrors && fieldErrors['Date'] && (
            <div className="error-message">{fieldErrors['Date']}</div>
          )}
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
