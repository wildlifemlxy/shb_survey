import React, { Component } from 'react';
import './ObservationDetailsSection.css';
import '../../css/components/Location/Location.css'; // Import the new CSS file for location styling
import '../../css/components/Form/FormControls.css'; // Import common form controls CSS

const COLUMN_LABELS = {
  'Number of Birds': 'Number of Birds',
  "SHB individual ID": 'SHB individual ID',
  HeightOfTree: 'Height of tree',
  HeightOfBird: 'Height of bird',
  Lat: 'Latitude',
  Long: 'Longitude',
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
      currentObservationIndex: 0,
      activityPlaceholder: "Select or type activity",
      seenHeardPlaceholder: "Select option",
      showActivityDropdown: false,
      showSeenHeardDropdown: false,
      showTimeDropdown: false,
      selectedHour: "",
      selectedMinute: "",
      showAllActivityOptions: false, // Flag to show all options when clicking
      showAllSeenHeardOptions: false, // Flag to show all options when clicking
      activityOptions: ["Calling", "Feeding", "Perching", "Preening"],
      seenHeardOptions: ["Seen", "Heard", "Not Found"],
      hourOptions: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
      minuteOptions: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
    };
  }
  
  // Set refs for dropdown containers
  setActivityDropdownRef = (node) => {
    this.activityDropdownRef = node;
  }
  
  setSeenHeardDropdownRef = (node) => {
    this.seenHeardDropdownRef = node;
  }
  
  setTimeDropdownRef = (node) => {
    this.timeDropdownRef = node;
  }

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
    // Show custom dropdown for time selection
    this.toggleTimeDropdown();
  };

  handleTimeBlur = (e) => {
    // Keep this for compatibility but we'll handle dropdown closing via click outside
  };

  handleTimeChange = (e) => {
    // Handle manual input changes
    const timeValue = e.target.value;
    this.handleFieldChange('Time', timeValue);
  };

  // Toggle time dropdown visibility
  toggleTimeDropdown = () => {
    this.setState(prevState => ({
      showTimeDropdown: !prevState.showTimeDropdown,
      showActivityDropdown: false, // Close other dropdowns
      showSeenHeardDropdown: false
    }));
  }

  // Handle hour selection
  handleHourSelect = (hour) => {
    const currentObservation = this.getCurrentObservation();
    const currentTime = currentObservation.Time || "";
    const currentMinute = currentTime.includes(':') ? currentTime.split(':')[1] : "00";
    const timeValue = `${hour}:${currentMinute}`;
    
    this.setState({ 
      selectedHour: hour,
      selectedMinute: currentMinute,
      showTimeDropdown: false 
    });
    
    this.handleFieldChange('Time', timeValue);
  }

  // Handle minute selection
  handleMinuteSelect = (minute) => {
    const currentObservation = this.getCurrentObservation();
    const currentTime = currentObservation.Time || "";
    const currentHour = currentTime.includes(':') ? currentTime.split(':')[0] : "00";
    const timeValue = `${currentHour}:${minute}`;
    
    this.setState({ 
      selectedMinute: minute,
      selectedHour: currentHour,
      showTimeDropdown: false 
    });
    
    this.handleFieldChange('Time', timeValue);
  }

  handleActivityChange = (e) => {
    const value = e.target.value;
    // Show dropdown when user types and enable filtering
    this.setState({ 
      showActivityDropdown: true,
      showAllActivityOptions: false // Enable filtering when typing
    });
    this.handleFieldChange('Activity', value);
  };

  handleSeenHeardChange = (e) => {
    const value = e.target.value;
    // Show dropdown when user types and enable filtering
    this.setState({ 
      showSeenHeardDropdown: true,
      showAllSeenHeardOptions: false // Enable filtering when typing
    });
    this.handleFieldChange('SeenHeard', value);
  };

  // Toggle activity dropdown visibility
  toggleActivityDropdown = () => {
    this.setState(prevState => ({
      showActivityDropdown: !prevState.showActivityDropdown,
      showSeenHeardDropdown: false, // Close other dropdowns
      showTimeDropdown: false,
      showAllActivityOptions: true // Show all options when clicking
    }));
  }

  // Toggle seen/heard dropdown visibility
  toggleSeenHeardDropdown = () => {
    this.setState(prevState => ({
      showSeenHeardDropdown: !prevState.showSeenHeardDropdown,
      showActivityDropdown: false, // Close other dropdowns
      showTimeDropdown: false,
      showAllSeenHeardOptions: true // Show all options when clicking
    }));
  }

  // Handle activity selection from dropdown
  handleActivitySelect = (activity) => {
    // Update placeholder if Others is selected and set appropriate value
    const newPlaceholder = activity === "Others" ? "Others" : "Select or type activity";
    
    // Create a synthetic event to pass to the parent's change handler
    const syntheticEvent = {
      target: {
        name: 'Activity',
        value: activity === "Others" ? "" : activity
      }
    };
    
    this.handleFieldChange('Activity', activity === "Others" ? "" : activity);
    
    // Update state with new placeholder and hide dropdown
    this.setState({ 
      showActivityDropdown: false,
      activityPlaceholder: newPlaceholder
    });
  }

  // Handle seen/heard selection from dropdown
  handleSeenHeardSelect = (option) => {
    this.handleFieldChange('SeenHeard', option);
    
    // Hide the dropdown after selection
    this.setState({ showSeenHeardDropdown: false });
  }

  // Handle clicks outside the dropdowns
  handleClickOutside = (e) => {
    if (this.activityDropdownRef && !this.activityDropdownRef.contains(e.target)) {
      this.setState({ showActivityDropdown: false });
    }
    if (this.seenHeardDropdownRef && !this.seenHeardDropdownRef.contains(e.target)) {
      this.setState({ showSeenHeardDropdown: false });
    }
    if (this.timeDropdownRef && !this.timeDropdownRef.contains(e.target)) {
      this.setState({ showTimeDropdown: false });
    }
  }

  // Filter activity options based on input value
  getFilteredActivityOptions = () => {
    const currentObservation = this.getCurrentObservation();
    const inputValue = (currentObservation.Activity || '').toLowerCase().trim();
    
    // If showAllActivityOptions is true (clicked), show all options regardless of input
    if (this.state.showAllActivityOptions) {
      return this.state.activityOptions;
    }
    
    if (!inputValue) {
      return this.state.activityOptions; // Show all options if input is empty
    }
    
    const filtered = this.state.activityOptions.filter(activity => 
      activity.toLowerCase().includes(inputValue)
    );
    
    // If no matches found, return all options instead of empty array
    return filtered.length > 0 ? filtered : this.state.activityOptions;
  }

  // Filter seen/heard options based on input value
  getFilteredSeenHeardOptions = () => {
    const currentObservation = this.getCurrentObservation();
    const inputValue = (currentObservation.SeenHeard || '').toLowerCase().trim();
    
    // If showAllSeenHeardOptions is true (clicked), show all options regardless of input
    if (this.state.showAllSeenHeardOptions) {
      return this.state.seenHeardOptions;
    }
    
    if (!inputValue) {
      return this.state.seenHeardOptions; // Show all options if input is empty
    }
    
    const filtered = this.state.seenHeardOptions.filter(option => 
      option.toLowerCase().includes(inputValue)
    );
    
    // If no matches found, return all options instead of empty array
    return filtered.length > 0 ? filtered : this.state.seenHeardOptions;
  }

  // Highlight matching text in activity names
  highlightActivityMatch = (activityName) => {
    const currentObservation = this.getCurrentObservation();
    const inputValue = (currentObservation.Activity || '').trim();
    
    // Don't highlight if we're showing all options (clicked mode)
    if (!inputValue || this.state.showAllActivityOptions) {
      return activityName;
    }
    
    const regex = new RegExp(`(${inputValue})`, 'gi');
    const parts = activityName.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === inputValue.toLowerCase()) {
        return <span key={index} className="location-highlight">{part}</span>;
      }
      return part;
    });
  }

  // Highlight matching text in seen/heard options
  highlightSeenHeardMatch = (optionName) => {
    const currentObservation = this.getCurrentObservation();
    const inputValue = (currentObservation.SeenHeard || '').trim();
    
    // Don't highlight if we're showing all options (clicked mode)
    if (!inputValue || this.state.showAllSeenHeardOptions) {
      return optionName;
    }
    
    const regex = new RegExp(`(${inputValue})`, 'gi');
    const parts = optionName.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === inputValue.toLowerCase()) {
        return <span key={index} className="location-highlight">{part}</span>;
      }
      return part;
    });
  }

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

  // Validate current observation against required fields
  validateCurrentObservation = () => {
    const currentObservation = this.getCurrentObservation();
    const missingFields = [];
    
    REQUIRED_FIELDS.forEach(field => {
      const fieldValue = currentObservation[field];
      if (!fieldValue || 
          (typeof fieldValue === 'string' && fieldValue.trim() === '') ||
          (typeof fieldValue === 'number' && isNaN(fieldValue))) {
        missingFields.push(field);
      }
    });
    
    return missingFields;
  };

  // Check if all observations are valid
  validateAllObservations = () => {
    const observationDetails = this.getObservationDetails();
    const allErrors = {};
    
    observationDetails.forEach((row, idx) => {
      const missingFields = [];
      REQUIRED_FIELDS.forEach(field => {
        const fieldValue = row[field];
        if (!fieldValue || 
            (typeof fieldValue === 'string' && fieldValue.trim() === '') ||
            (typeof fieldValue === 'number' && isNaN(fieldValue))) {
          missingFields.push(field);
        }
      });
      
      if (missingFields.length > 0) {
        allErrors[idx] = {};
        missingFields.forEach(field => {
          allErrors[idx][field] = `${field} is required`;
        });
      }
    });
    
    return allErrors;
  };

  renderErrorMessages = () => {
    const { fieldErrors = {} } = this.props;
    
    // Debug logging
    console.log('ObservationDetailsSection fieldErrors:', fieldErrors);
    
    if (Object.keys(fieldErrors).length === 0) {
      return null;
    }

    const totalErrors = Object.keys(fieldErrors).reduce((sum, rowIdx) => {
      return sum + Object.keys(fieldErrors[rowIdx]).length;
    }, 0);

    return (
      <div className="observation-errors-container">
        <div className="observation-errors-title">
          ⚠️ Cannot proceed - {totalErrors} validation error{totalErrors > 1 ? 's' : ''} found:
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
                <strong>Observation {rowNum}:</strong> All required fields must be filled in
              </div>
            );
          }
          
          // Otherwise, show individual field errors
          return errorFields.map((field, i) => (
            <div
              className="observation-error-message"
              key={`${rowIdx}-${field}-${i}`}
              onClick={() => this.setState({ currentObservationIndex: parseInt(rowIdx, 10) })}
              style={{ cursor: 'pointer' }}
            >
              <strong>Observation {rowNum}:</strong> {COLUMN_LABELS[field] || field} is required
            </div>
          ));
        })}
        <div style={{ 
          marginTop: '12px', 
          padding: '8px', 
          backgroundColor: 'rgba(220, 53, 69, 0.1)', 
          borderRadius: '4px',
          fontSize: '0.85rem',
          color: '#dc3545'
        }}>
          💡 Tip: Click on any error message above to navigate to that observation
        </div>
      </div>
    );
  };

  componentDidMount() {
    // Add event listener for clicks outside the dropdowns
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    // Remove event listener when component unmounts
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  componentDidUpdate(prevProps, prevState) {
    // Scroll selected time values into view when dropdown opens
    if (!prevState.showTimeDropdown && this.state.showTimeDropdown) {
      this.scrollSelectedTimeIntoView();
    }
  }

  scrollSelectedTimeIntoView = () => {
    const currentObservation = this.getCurrentObservation();
    const currentTime = currentObservation.Time || "";
    
    if (currentTime.includes(':')) {
      const [hour, minute] = currentTime.split(':');
      
      // Scroll selected hour into view
      setTimeout(() => {
        const hourElement = this.timeDropdownRef?.querySelector(`[data-hour="${hour}"]`);
        if (hourElement) {
          hourElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        
        // Scroll selected minute into view
        const minuteElement = this.timeDropdownRef?.querySelector(`[data-minute="${minute}"]`);
        if (minuteElement) {
          minuteElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 50);
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
    const { 
      currentObservationIndex, 
      activityPlaceholder, 
      seenHeardPlaceholder, 
      showActivityDropdown, 
      showSeenHeardDropdown, 
      showTimeDropdown,
      hourOptions,
      minuteOptions
    } = this.state;
    const { fieldErrors = {} } = this.props;
    const observationDetails = this.getObservationDetails();
    const currentIndex = Math.min(currentObservationIndex, observationDetails.length - 1);
    const currentObservation = this.getCurrentObservation();
    
    // Get filtered options
    const filteredActivityOptions = this.getFilteredActivityOptions();
    const filteredSeenHeardOptions = this.getFilteredSeenHeardOptions();
    
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
                    <div className="location-field-container" ref={this.setTimeDropdownRef}>
                      <input
                        id={`time-${currentIndex}`}
                        type="text"
                        className={`observation-form-input ${this.getErrorClass('Time')}`}
                        value={currentObservation.Time || ''}
                        onChange={this.handleTimeChange}
                        onFocus={this.handleTimeFieldFocus}
                        onClick={this.handleTimeFieldFocus}
                        placeholder="Select time (HH:MM)"
                        autoComplete="off"
                        readOnly
                        required
                        style={{ cursor: 'pointer' }}
                      />
                      {showTimeDropdown && (
                        <div className="location-dropdown time-dropdown" style={{ display: 'flex', width: '100%', zIndex: 999999 }}>
                          <div style={{ flex: 1, borderRight: '1px solid #ddd' }}>
                            <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', backgroundColor: '#f8f9fa' }}>
                              Hours
                            </div>
                            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                              {hourOptions.map((hour, index) => {
                                const currentObservation = this.getCurrentObservation();
                                const currentTime = currentObservation.Time || "";
                                const selectedHour = currentTime.includes(':') ? currentTime.split(':')[0] : "";
                                const isSelected = hour === selectedHour;
                                
                                return (
                                  <div 
                                    key={index} 
                                    className={`location-option ${isSelected ? 'highlighted' : ''}`}
                                    onClick={() => this.handleHourSelect(hour)}
                                    data-hour={hour}
                                    style={{ 
                                      padding: '6px 12px',
                                      backgroundColor: isSelected ? '#007bff' : 'transparent',
                                      color: isSelected ? 'white' : 'inherit'
                                    }}
                                  >
                                    {hour}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', backgroundColor: '#f8f9fa' }}>
                              Minutes
                            </div>
                            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                              {minuteOptions.map((minute, index) => {
                                const currentObservation = this.getCurrentObservation();
                                const currentTime = currentObservation.Time || "";
                                const selectedMinute = currentTime.includes(':') ? currentTime.split(':')[1] : "";
                                const isSelected = minute === selectedMinute;
                                
                                return (
                                  <div 
                                    key={index} 
                                    className={`location-option ${isSelected ? 'highlighted' : ''}`}
                                    onClick={() => this.handleMinuteSelect(minute)}
                                    data-minute={minute}
                                    style={{ 
                                      padding: '6px 12px',
                                      backgroundColor: isSelected ? '#007bff' : 'transparent',
                                      color: isSelected ? 'white' : 'inherit'
                                    }}
                                  >
                                    {minute}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="observation-form-field">
                    <label className={`observation-form-label ${this.getErrorClass('Activity')}`} htmlFor={`activity-${currentIndex}`}>
                      Activity*
                    </label>
                    <div className="location-field-container" ref={this.setActivityDropdownRef}>
                      <input
                        id={`activity-${currentIndex}`}
                        type="text"
                        className={`observation-form-input ${this.getErrorClass('Activity')}`}
                        value={currentObservation.Activity || ''}
                        onChange={this.handleActivityChange}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          this.toggleActivityDropdown();
                        }}
                        onFocus={(e) => {
                          // Only show dropdown on focus if it's not already shown
                          if (!this.state.showActivityDropdown) {
                            this.setState({ 
                              showActivityDropdown: true, 
                              showAllActivityOptions: true,
                              showSeenHeardDropdown: false,
                              showTimeDropdown: false
                            });
                          }
                        }}
                        placeholder={activityPlaceholder}
                        autoComplete="off"
                        required
                      />
                      {showActivityDropdown && (
                        <div className="location-dropdown">
                          {filteredActivityOptions.map((option, index) => (
                            <div 
                              key={index} 
                              className="location-option"
                              onClick={() => this.handleActivitySelect(option)}
                            >
                              {this.highlightActivityMatch(option)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Row 5: Seen/Heard, (empty for alignment) */}
                <div className="observation-form-row">
                  <div className="observation-form-field">
                    <label className={`observation-form-label ${this.getErrorClass('SeenHeard')}`} htmlFor={`seenHeard-${currentIndex}`}>
                      Seen/Heard*
                    </label>
                    <div className="observation-dropdown-container" ref={this.setSeenHeardDropdownRef}>
                      <input
                        id={`seenHeard-${currentIndex}`}
                        type="text"
                        className={`observation-form-input ${this.getErrorClass('SeenHeard')}`}
                        value={currentObservation.SeenHeard || ''}
                        onChange={this.handleSeenHeardChange}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          this.toggleSeenHeardDropdown();
                        }}
                        onFocus={(e) => {
                          // Only show dropdown on focus if it's not already shown
                          if (!this.state.showSeenHeardDropdown) {
                            this.setState({ 
                              showSeenHeardDropdown: true, 
                              showAllSeenHeardOptions: true,
                              showActivityDropdown: false,
                              showTimeDropdown: false
                            });
                          }
                        }}
                        placeholder={seenHeardPlaceholder}
                        autoComplete="off"
                        required
                      />
                      {showSeenHeardDropdown && (
                        <div className="observation-dropdown">
                          {filteredSeenHeardOptions.map((option, index) => (
                            <div 
                              key={index} 
                              className="observation-dropdown-option"
                              onClick={() => this.handleSeenHeardSelect(option)}
                            >
                              {this.highlightSeenHeardMatch(option)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
