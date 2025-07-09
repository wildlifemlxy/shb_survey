import React, { Component } from 'react';

const COLUMN_LABELS = {
  'Number of Birds': 'Number of Birds',
  "SHB individual ID": 'SHB individual ID',
  HeightOfTree: 'Height of tree',
  HeightOfBird: 'Height of bird',
  Time: 'Time',
  Activity: 'Activity',
  SeenHeard: 'Seen/Heard',
  ActivityDetails: 'Activity Details',
};

const REQUIRED_FIELDS = [
  'Number of Birds',
  'SHB individual ID',
  'Lat',
  'Long',
  'Time',
  'Activity',
  'SeenHeard',
];

class ObservationDetailsSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentObservationIndex: 0
    };
    // Workaround: keep a ref to the last focused datalist input
    this._datalistFocusTimeout = null;
  }

  // Workaround for Chrome/Edge bug: blur and refocus text input with datalist to prevent time picker
  handleDatalistTextFocus = (e) => {
    // Only run if not already in the workaround
    if (!e.target.__datalistWorkaround) {
      e.target.__datalistWorkaround = true;
      e.target.blur();
      // Use a short timeout to refocus
      this._datalistFocusTimeout = setTimeout(() => {
        e.target.focus();
        e.target.__datalistWorkaround = false;
      }, 0);
    }
  };

  handleNavigatePrevious = () => {
    const { currentObservationIndex } = this.state;
    this.setState({ 
      currentObservationIndex: Math.max(0, currentObservationIndex - 1) 
    });
  };

  handleNavigateNext = () => {
    const { newSurvey } = this.props;
    const { currentObservationIndex } = this.state;
    const observationDetails = this.getObservationDetails();
    this.setState({ 
      currentObservationIndex: Math.min(observationDetails.length - 1, currentObservationIndex + 1) 
    });
  };

  handleAddObservation = () => {
    const { onObservationDetailChange } = this.props;
    const observationDetails = this.getObservationDetails();
    const newDetails = [...observationDetails];
    newDetails.push({
      'Number of Birds': '',
      'SHB individual ID': '',
      HeightOfTree: '',
      HeightOfBird: '',
      Lat: '',
      Long: '',
      Time: '',
      Activity: '',
      SeenHeard: '',
      ActivityDetails: '',
    });
    onObservationDetailChange('replaceAll', 'Observation Details', newDetails);
    this.setState({ currentObservationIndex: newDetails.length - 1 });
  };

  handleRemoveObservation = () => {
    const { onObservationDetailChange } = this.props;
    const { currentObservationIndex } = this.state;
    const observationDetails = this.getObservationDetails();
    
    if (observationDetails.length > 1) {
      const newDetails = [...observationDetails];
      newDetails.splice(currentObservationIndex, 1);
      onObservationDetailChange('replaceAll', 'Observation Details', newDetails);
      
      // Adjust current index if necessary
      if (currentObservationIndex >= newDetails.length) {
        this.setState({ currentObservationIndex: newDetails.length - 1 });
      }
    }
  };

  handleFieldChange = (field, value) => {
    const { onObservationDetailChange } = this.props;
    const { currentObservationIndex } = this.state;
    
    if (field === 'Number of Birds') {
      value = value.replace(/[^\d]/g, '');
    } else if (field === 'SHB individual ID') {
      if (value.endsWith(',')) {
        value = value + ' SHB';
      } else if (value.endsWith(', ')) {
        value = value + 'SHB';
      }
    }
    
    onObservationDetailChange(currentObservationIndex, field, value);
  };

  handleTimeFieldFocus = (e) => {
    if (e.target.showPicker) {
      e.target.showPicker();
    }
  };

  handleTimeBlur = (e) => {
    // Ensure time picker is closed when clicking outside
    if (document.activeElement !== e.target) {
      e.target.blur();
    }
  };

  handleTimeChange = (e) => {
    // Extract the time value from the event
    const timeValue = e.target.value;
    // Pass it to the main field change handler
    this.handleFieldChange('Time', timeValue);
  };

  getObservationDetails = () => {
    const { newSurvey } = this.props;
    
    // Defensive: always use an array for observationDetails
    let observationDetails = [];
    if (Array.isArray(newSurvey['Observation Details'])) {
      observationDetails = newSurvey['Observation Details'];
    } else if (typeof newSurvey['Number of Observation'] === 'string' && parseInt(newSurvey['Number of Observation'], 10) > 0) {
      // If Number of Observation is set but no Observation Details, create empty rows
      const numRows = parseInt(newSurvey['Number of Observation'], 10);
      observationDetails = Array.from({ length: numRows }, () => ({}));
    }
    
    // Ensure we have at least one observation
    if (observationDetails.length === 0) {
      observationDetails = [{}];
    }
    
    return observationDetails;
  };

  getCurrentObservation = () => {
    const observationDetails = this.getObservationDetails();
    const { currentObservationIndex } = this.state;
    const currentIndex = Math.min(currentObservationIndex, observationDetails.length - 1);
    return observationDetails[currentIndex] || {};
  };

  // Helper to check if a field has an error for the current observation
  hasFieldError = (field) => {
    const { fieldErrors = {} } = this.props;
    const { currentObservationIndex } = this.state;
    return fieldErrors[currentObservationIndex] && 
           fieldErrors[currentObservationIndex][field] !== undefined;
  };

  // Helper to get error class if a field has an error
  getErrorClass = (field) => {
    return this.hasFieldError(field) ? 'has-error' : '';
  };

  renderErrorMessages = () => {
    const { fieldErrors = {} } = this.props;
    
    if (Object.keys(fieldErrors).length === 0) {
      return null;
    }

    return (
      <div className="observation-errors-container">
        <div className="observation-errors-title">
          Please fix the following errors:
        </div>
        {Object.entries(fieldErrors).map(([rowIdx, rowErrs]) => {
          const errorFields = Object.keys(rowErrs);
          const rowNum = parseInt(rowIdx, 10) + 1;
          
          // If all required fields are missing, show a single summary error
          const isAllEmpty = REQUIRED_FIELDS.every(f => errorFields.includes(f));
          
          if (isAllEmpty) {
            return (
              <div
                className="observation-error-message"
                key={`${rowIdx}-all-empty`}
                onClick={() => this.setState({ currentObservationIndex: parseInt(rowIdx, 10) })}
                style={{ cursor: 'pointer' }}
              >
                Observation {rowNum}: All required fields must be filled in
              </div>
            );
          }
          
          // Otherwise, show individual field errors
          return errorFields
            .filter(field => field !== 'BirdID') // Filter out BirdID as it's handled separately
            .map((field, i) => (
              <div
                className="observation-error-message"
                key={`${rowIdx}-${field}-${i}`}
                onClick={() => this.setState({ currentObservationIndex: parseInt(rowIdx, 10) })}
                style={{ cursor: 'pointer' }}
              >
                Observation {rowNum}: {COLUMN_LABELS[field] || field} is required
              </div>
            ));
        })}
      </div>
    );
  };

  componentWillUnmount() {
    // Clear any pending timeouts when component unmounts
    if (this._datalistFocusTimeout) {
      clearTimeout(this._datalistFocusTimeout);
    }
  }

  handleNavigateToNextError = () => {
    const { fieldErrors = {} } = this.props;
    const { currentObservationIndex } = this.state;
    
    // Get all observation indices with errors
    const errorIndices = Object.keys(fieldErrors).map(idx => parseInt(idx, 10));
    
    if (errorIndices.length === 0) return;
    
    // Find the next error index that's greater than current
    const nextErrorIndex = errorIndices.find(idx => idx > currentObservationIndex);
    
    // If found, navigate to it, otherwise go to the first error
    if (nextErrorIndex !== undefined) {
      this.setState({ currentObservationIndex: nextErrorIndex });
    } else if (errorIndices.length > 0) {
      this.setState({ currentObservationIndex: errorIndices[0] });
    }
  };

  hasAnyErrors = () => {
    const { fieldErrors = {} } = this.props;
    return Object.keys(fieldErrors).length > 0;
  };

  hasErrorsInCurrentObservation = () => {
    const { fieldErrors = {} } = this.props;
    const { currentObservationIndex } = this.state;
    return fieldErrors[currentObservationIndex] !== undefined;
  };

  render() {
    const { currentObservationIndex } = this.state;
    const { fieldErrors = {} } = this.props;
    const observationDetails = this.getObservationDetails();
    const currentIndex = Math.min(currentObservationIndex, observationDetails.length - 1);
    const currentObservation = this.getCurrentObservation();
    
    // Create an array of observation indices that have errors
    const observationsWithErrors = Object.keys(fieldErrors).map(idx => parseInt(idx, 10));
    const hasCurrentErrors = this.hasErrorsInCurrentObservation();

    return (
      <div className="modal-form-fields">
        {/* Navigation Row (arrows and counter only) */}
        <div className="observation-nav-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, margin: '0 0 10px 0' }}>
          <button
            type="button"
            className="observation-nav-prev"
            style={{ width: 28, height: 28, fontSize: '1.1rem' }}
            onClick={this.handleNavigatePrevious}
            disabled={currentIndex === 0}
          >
            ‹
          </button>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {currentIndex + 1} of {observationDetails.length}
            {hasCurrentErrors && (
              <span style={{ 
                color: 'white', 
                backgroundColor: '#dc3545', 
                borderRadius: '50%', 
                width: 18, 
                height: 18, 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>!</span>
            )}
          </span>
          <button
            type="button"
            className="observation-nav-next"
            style={{ width: 28, height: 28, fontSize: '1.1rem' }}
            onClick={this.handleNavigateNext}
            disabled={currentIndex >= observationDetails.length - 1}
          >
            ›
          </button>
        </div>
        {/* Add/Remove Buttons Row (centered, below nav, above card) */}
        <div className="observation-add-remove-row" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <button
            type="button"
            className="observation-add-btn"
            title="Add Observation"
            onClick={this.handleAddObservation}
          >
            +
          </button>
          <button
            type="button"
            className="observation-remove-btn"
            title="Remove Current"
            onClick={this.handleRemoveObservation}
            disabled={observationDetails.length <= 1}
          >
            −
          </button>
          {this.hasAnyErrors() && (
            <button
              type="button"
              className="observation-error-nav-btn"
              title="Go to Next Error"
              onClick={this.handleNavigateToNextError}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                borderRadius: '4px',
                border: 'none',
                padding: '6px 12px',
                marginLeft: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Fix Errors</span>
              <span style={{ fontSize: '0.8rem' }}>⚠️</span>
            </button>
          )}
        </div>
        {/* Single Card Row */}
        <div className="observation-cards-row" style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          <>
            <div className={`observation-card ${hasCurrentErrors ? 'has-error' : ''}`} style={hasCurrentErrors ? { borderLeft: '4px solid #dc3545' } : {}}>
              {/* Card Header */}
              <div className="observation-card-header">
                <h4 className="observation-card-title">
                  Observation {currentIndex + 1}
                  {hasCurrentErrors && (
                    <span style={{ 
                      color: '#dc3545', 
                      marginLeft: '8px',
                      fontSize: '0.9rem'
                    }}>
                      (Missing Required Fields)
                    </span>
                  )}
                </h4>
              </div>
              {/* Form Fields Grid */}
              <div className="observation-form-grid">
                {/* Row 1: Number of Birds, Bird ID */}
                <div className="observation-form-row">
                  <div className="observation-form-field">
                    <label className={`observation-form-label ${this.getErrorClass('Number of Birds')}`} htmlFor={`numBirds-${currentIndex}`}>
                      Number of Birds*
                    </label>
                    <input
                      id={`numBirds-${currentIndex}`}
                      type="text"
                      className={`observation-form-input ${this.getErrorClass('Number of Birds')}`}
                      value={currentObservation['Number of Birds'] ?? ''}
                      onChange={e => this.handleFieldChange('Number of Birds', e.target.value)}
                      placeholder="Enter number"
                      required
                    />
                  </div>
                  <div className="observation-form-field">
                    <label className={`observation-form-label ${this.getErrorClass('SHB individual ID')}`} htmlFor={`birdId-${currentIndex}`}>
                      Bird ID*
                    </label>
                    <input
                      id={`birdId-${currentIndex}`}
                      type="text"
                      className={`observation-form-input ${this.getErrorClass('SHB individual ID')}`}
                      value={currentObservation['SHB individual ID'] || ''}
                      onChange={e => this.handleFieldChange('SHB individual ID', e.target.value)}
                      placeholder="e.g., SHB1, SHB2, SHB3"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>
                {/* Row 2: Height of Tree, Height of Bird */}
                <div className="observation-form-row">
                  <div className="observation-form-field">
                    <label className="observation-form-label" htmlFor={`treeHeight-${currentIndex}`}>
                      Height of Tree
                    </label>
                    <input
                      id={`treeHeight-${currentIndex}`}
                      type="text"
                      className="observation-form-input"
                      value={currentObservation.HeightOfTree || ''}
                      onChange={e => this.handleFieldChange('HeightOfTree', e.target.value)}
                      placeholder="Enter height"
                    />
                  </div>
                  <div className="observation-form-field">
                    <label className="observation-form-label" htmlFor={`birdHeight-${currentIndex}`}>
                      Height of Bird
                    </label>
                    <input
                      id={`birdHeight-${currentIndex}`}
                      type="text"
                      className="observation-form-input"
                      value={currentObservation.HeightOfBird || ''}
                      onChange={e => this.handleFieldChange('HeightOfBird', e.target.value)}
                      placeholder="Enter height"
                    />
                  </div>
                </div>
                {/* Row 3: Latitude, Longitude */}
                <div className="observation-form-row">
                  <div className="observation-form-field">
                    <label className={`observation-form-label ${this.getErrorClass('Lat')}`} htmlFor={`latitude-${currentIndex}`}>
                      Latitude*
                    </label>
                    <input
                      id={`latitude-${currentIndex}`}
                      type="text"
                      className={`observation-form-input ${this.getErrorClass('Lat')}`}
                      value={currentObservation.Lat || ''}
                      onChange={e => this.handleFieldChange('Lat', e.target.value)}
                      placeholder="Enter latitude"
                      required
                    />
                  </div>
                  <div className="observation-form-field">
                    <label className={`observation-form-label ${this.getErrorClass('Long')}`} htmlFor={`longitude-${currentIndex}`}>
                      Longitude*
                    </label>
                    <input
                      id={`longitude-${currentIndex}`}
                      type="text"
                      className={`observation-form-input ${this.getErrorClass('Long')}`}
                      value={currentObservation.Long || ''}
                      onChange={e => this.handleFieldChange('Long', e.target.value)}
                      placeholder="Enter longitude"
                      required
                    />
                  </div>
                </div>
                {/* Row 4: Time, Activity */}
                <div className="observation-form-row">
                  <div className="observation-form-field">
                    <label className={`observation-form-label ${this.getErrorClass('Time')}`} htmlFor={`time-${currentIndex}`}>
                      Time*
                    </label>
                    <input
                      id={`time-${currentIndex}`}
                      type="time"
                      className={`observation-form-input time-input ${this.getErrorClass('Time')}`}
                      value={currentObservation.Time || ''}
                      onChange={this.handleTimeChange}
                      onFocus={this.handleTimeFieldFocus}
                      onBlur={this.handleTimeBlur}
                      required
                    />
                  </div>
                  <div className="observation-form-field">
                    <label className={`observation-form-label ${this.getErrorClass('Activity')}`} htmlFor={`activity-${currentIndex}`}>
                      Activity*
                    </label>
                    <input
                      id={`activity-${currentIndex}`}
                      type="text"
                      className={`observation-form-input ${this.getErrorClass('Activity')}`}
                      value={currentObservation.Activity || ''}
                      onChange={e => this.handleFieldChange('Activity', e.target.value)}
                      list={`activityOptions-${currentIndex}`}
                      autoComplete="off"
                      placeholder="Select or type activity"
                      required
                      onFocus={this.handleDatalistTextFocus}
                    />
                    <datalist id={`activityOptions-${currentIndex}`}>
                      <option value="Calling" />
                      <option value="Feeding" />
                      <option value="Perching" />
                      <option value="Preening" />
                      <option value="Others" />
                    </datalist>
                  </div>
                </div>
                {/* Row 5: Seen/Heard, (empty for alignment) */}
                <div className="observation-form-row">
                  <div className="observation-form-field">
                    <label className={`observation-form-label ${this.getErrorClass('SeenHeard')}`} htmlFor={`seenHeard-${currentIndex}`}>
                      Seen/Heard*
                    </label>
                    <input
                      id={`seenHeard-${currentIndex}`}
                      type="text"
                      className={`observation-form-input ${this.getErrorClass('SeenHeard')}`}
                      value={currentObservation.SeenHeard || ''}
                      onChange={e => this.handleFieldChange('SeenHeard', e.target.value)}
                      list={`seenHeardOptions-${currentIndex}`}
                      autoComplete="off"
                      placeholder="Select option"
                      required
                      onFocus={this.handleDatalistTextFocus}
                    />
                    <datalist id={`seenHeardOptions-${currentIndex}`}>
                      <option value="Seen" />
                      <option value="Heard" />
                      <option value="Not Found" />
                    </datalist>
                  </div>
                  {/* Empty div for alignment in the two-column layout - intentionally empty */}
                  <div 
                    className="observation-form-field"
                    role="presentation" 
                  />
                </div>
                {/* Row 6: Activity Details (full width) */}
                <div className="observation-form-row">
                  <div className="observation-form-field full-width">
                    <label className="observation-form-label" htmlFor={`activityDetails-${currentIndex}`}>
                      Activity Details
                    </label>
                    <input
                      id={`activityDetails-${currentIndex}`}
                      type="text"
                      className="observation-form-input"
                      value={currentObservation.ActivityDetails || ''}
                      onChange={e => this.handleFieldChange('ActivityDetails', e.target.value)}
                      autoComplete="off"
                      placeholder="Additional details about the activity"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        </div>
        {/* Error messages below the card */}
        {this.renderErrorMessages()}
      </div>
    );
  }
}

export default ObservationDetailsSection;
