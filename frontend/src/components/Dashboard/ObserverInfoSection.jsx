import React, { Component } from 'react';
import '../../css/components/Location/Location.css'; // Import the new CSS file for location styling

class ObserverInfoSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOthersSelected: false,
      parksList: [
        "Bidadari Park",
        "Bukit Timah Nature Park",
        "Bukit Batok Nature Park",
        "Gillman Barracks",
        "Hindhede Nature Park",
        "Mandai Boardwalk",
        "Pulau Ubin",
        "Rifle Range Nature Park",
        "Rail Corridor (Kranji)",
        "Rail Corridor (Hillview)",
        "Rail Corridor (Bukit Timah)",
        "Singapore Botanic Gardens",
        "Springleaf Nature Park",
        "Sungei Buloh Wetland Reserve",
        "Windsor Nature Park",
        "Others"
      ]
    };
  }
  
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

  // Handle location change, including special case for "Others"
  handleLocationChange = (e) => {
    const value = e.target.value;
    
    // Check if "Others" is selected or entered
    const isOthers = value === 'Others';
    
    // Update state to show the placeholder
    if (isOthers !== this.state.isOthersSelected) {
      this.setState({ isOthersSelected: isOthers });
    }
    
    // If "Others" is selected, clear the value but keep "Others" as the placeholder
    if (this.props.onInputChange) {
      // Create a synthetic event object with target.name and target.value
      const syntheticEvent = {
        target: {
          name: 'Location',
          value: isOthers ? '' : value, // If "Others" is selected, set value to empty string
          placeholder: isOthers ? 'Others' : 'Select or enter location'
        }
      };
      this.props.onInputChange(syntheticEvent);
    }
  }

  // Handle when location input is focused
  handleLocationFocus = () => {
    // If it's already Others, keep it that way
    if (this.props.newSurvey && this.props.newSurvey.Location === 'Others') {
      // Make sure isOthersSelected is true
      if (!this.state.isOthersSelected) {
        this.setState({ isOthersSelected: true });
      }
    }
  }
  
  // Handle when location input loses focus
  handleLocationBlur = () => {
    // When "Others" is selected and user hasn't typed anything new
    const location = (this.props.newSurvey && this.props.newSurvey.Location) || '';
    if (location === 'Others' && this.state.isOthersSelected) {
      // Keep "Others" visible but mark the field for custom input
      this.setState({ isOthersSelected: true });
    }
  }

  // Helper to render a field label with an asterisk for required fields
  renderTitleWithAsterisk = (title) => {
    return (
      <div className="field-label">
        {title} <span className="required-asterisk">*</span>
      </div>
    );
  };

  render() {
    const { newSurvey, onInputChange, showError, isSubmitAttempted } = this.props;
    const { isOthersSelected, parksList } = this.state;
    
    return (
      <div className="observer-info-section">
        {/* Observer name (multiple entry) */}
        <div className="form-group">
          <label>Observer name</label>
          {(newSurvey['Observer name'] || ['']).map((name, idx) => (
            <div key={idx} className="observer-name-row">
              <input
                type="text"
                value={name}
                onChange={e => this.props.onObserverNameChange(idx, e.target.value)}
                className="form-control"
                placeholder={`Observer name${(newSurvey['Observer name'] || []).length > 1 ? ` #${idx + 1}` : ''}`}
                style={{ flex: 1 }}
              />
              {(newSurvey['Observer name'] || []).length > 1 && (
                <button
                  type="button"
                  className="remove-btn observer-btn"
                  onClick={() => this.props.onRemoveObserverName(idx)}
                  aria-label="Remove observer"
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
                >
                  +
                </button>
              )}
            </div>
          ))}
          {this.props.fieldErrors && this.props.fieldErrors['Observer name'] && (
            <div className="error-message">{this.props.fieldErrors['Observer name']}</div>
          )}
        </div>
        
        {/* Location with datalist */}
        <div className="form-group">
          <label htmlFor="location-input">Location</label>
          <div className="custom-combobox">
            <input
              id="location-input"
              type="text"
              name="Location"
              value={newSurvey['Location'] || ''}
              onChange={this.handleLocationChange}
              onFocus={this.handleLocationFocus}
              onBlur={this.handleLocationBlur}
              className={`form-control ${this.props.fieldErrors && this.props.fieldErrors['Location'] ? 'input-error' : ''}`}
              placeholder={isOthersSelected ? "Others" : "Select or type a location"}
              list="parks-list"
              autoComplete="off"
            />
            <datalist id="parks-list">
              {parksList.map((park, index) => (
                <option key={index} value={park} />
              ))}
            </datalist>
            <div className="combobox-arrow">▼</div>
          </div>
          {this.props.fieldErrors && this.props.fieldErrors['Location'] && (
            <div className="error-message">{this.props.fieldErrors['Location']}</div>
          )}
        </div>
        
        {/* Date */}
        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            name="Date"
            value={newSurvey['Date'] || ''}
            onChange={onInputChange}
            className={`form-control ${this.props.fieldErrors && this.props.fieldErrors['Date'] ? 'input-error' : ''}`}
            placeholder="DD/MM/YYYY"
            autoComplete="off"
            style={{
              position: 'relative'
            }}
            onFocus={(e) => {
              e.target.showPicker && e.target.showPicker();
            }}
          />
          {this.props.fieldErrors && this.props.fieldErrors['Date'] && (
            <div className="error-message">{this.props.fieldErrors['Date']}</div>
          )}
        </div>
        
        {/* Number of Observation */}
        <div className="form-group">
          <label>Number of Observation</label>
          <input
            type="text"
            name="Number of Observation"
            value={newSurvey['Number of Observation'] || ''}
            onChange={onInputChange}
            className={`form-control ${this.props.fieldErrors && this.props.fieldErrors['Number of Observation'] ? 'input-error' : ''}`}
            placeholder="e.g. 1, 2, 3..."
          />
          {this.props.fieldErrors && this.props.fieldErrors['Number of Observation'] && (
            <div className="error-message">{this.props.fieldErrors['Number of Observation']}</div>
          )}
        </div>
      </div>
    );
  }
}

export default ObserverInfoSection;
