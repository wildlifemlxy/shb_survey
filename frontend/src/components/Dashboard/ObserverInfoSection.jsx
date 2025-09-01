import React, { Component } from 'react';
import '../../css/components/Location/Location.css'; // Import the new CSS file for location styling
import '../../css/components/Form/FormControls.css'; // Import common form controls CSS
import '../../css/components/Dashboard/ObserverInfoSection.css'; // Import component-specific styles

class ObserverInfoSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOthersSelected: false,
      showLocationDropdown: false,
      showAllLocationOptions: false, // Flag to show all options when clicking
      locationPlaceholder: "Enter a location",
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
  
  // Set ref for dropdown container
  setLocationDropdownRef = (node) => {
    this.locationDropdownRef = node;
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

  // Method to populate first observer name if empty and set up event listeners
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
    
    // Add event listener for clicks outside the dropdown
    document.addEventListener('mousedown', this.handleClickOutside);
  }
  
  componentWillUnmount() {
    // Remove event listener when component unmounts
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  // Simple location change handler that just passes the change to parent
  handleLocationChange = (e) => {
    // Show dropdown when user types and enable filtering
    this.setState({ 
      showLocationDropdown: true,
      showAllLocationOptions: false // Enable filtering when typing
    });
    
    if (this.props.onInputChange) {
      this.props.onInputChange(e);
    }
  }

  // Toggle location dropdown visibility
  toggleLocationDropdown = () => {
    this.setState(prevState => ({
      showLocationDropdown: !prevState.showLocationDropdown,
      showAllLocationOptions: true // Show all options when clicking
    }));
  }

  // Handle location selection from dropdown
  handleLocationSelect = (location) => {
    // Update placeholder if Others is selected and set appropriate value
    const newPlaceholder = location === "Others" ? "Others" : "Enter a location";
    
    // Create a synthetic event to pass to the parent's change handler
    const syntheticEvent = {
      target: {
        name: 'Location',
        value: location === "Others" ? "" : location
      }
    };
    
    if (this.props.onInputChange) {
      this.props.onInputChange(syntheticEvent);
    }
    
    // Update state with new placeholder and hide dropdown
    this.setState({ 
      showLocationDropdown: false,
      locationPlaceholder: newPlaceholder,
      isOthersSelected: location === "Others"
    });
  }
  
  // Handle clicks outside the dropdown
  handleClickOutside = (e) => {
    if (this.locationDropdownRef && !this.locationDropdownRef.contains(e.target)) {
      this.setState({ showLocationDropdown: false });
    }
  }

  // Filter parks list based on input value
  getFilteredParksList = () => {
    const { newSurvey } = this.props;
    const inputValue = (newSurvey['Location'] || '').toLowerCase().trim();
    
    // If showAllLocationOptions is true (clicked), show all options regardless of input
    if (this.state.showAllLocationOptions) {
      return this.state.parksList;
    }
    
    if (!inputValue) {
      return this.state.parksList; // Show all options if input is empty
    }
    
    const filtered = this.state.parksList.filter(park => 
      park.toLowerCase().includes(inputValue)
    );
    
    // If no matches found, return all parks instead of empty array
    return filtered.length > 0 ? filtered : this.state.parksList;
  }

  // Highlight matching text in park names
  highlightMatch = (parkName) => {
    const { newSurvey } = this.props;
    const inputValue = (newSurvey['Location'] || '').trim();
    
    // Don't highlight if we're showing all options (clicked mode)
    if (!inputValue || this.state.showAllLocationOptions) {
      return parkName;
    }
    
    const regex = new RegExp(`(${inputValue})`, 'gi');
    const parts = parkName.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === inputValue.toLowerCase()) {
        return <span key={index} className="location-highlight">{part}</span>;
      }
      return part;
    });
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
    const { isOthersSelected, showLocationDropdown, locationPlaceholder } = this.state;
    const filteredParksList = this.getFilteredParksList();
    
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
                  className="btn-remove-observer"
                  onClick={() => this.props.onRemoveObserverName(idx)}
                  aria-label="Remove observer"
                >
                  -
                </button>
              )}
              {idx === (newSurvey['Observer name'] || []).length - 1 && (
                <button
                  type="button"
                  className="btn-add-observer"
                  onClick={this.handleAddObserverName}
                  aria-label="Add observer"
                >
                  +
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Location with custom dropdown */}
        <div className="form-group">
          <label htmlFor="location-input">Location</label>
          <div className={`location-field-container ${showLocationDropdown ? 'dropdown-open' : ''}`} ref={this.setLocationDropdownRef}>
            <input
              id="location-input"
              type="text"
              name="Location"
              value={newSurvey['Location'] || ''}
              onChange={this.handleLocationChange}
              onClick={this.toggleLocationDropdown}
              onFocus={() => this.setState({ 
                showLocationDropdown: true, 
                showAllLocationOptions: true 
              })}
              className="form-control"
              placeholder={locationPlaceholder}
              autoComplete="off"
            />
            {showLocationDropdown && (
              <div className="location-dropdown">
                {filteredParksList.map((park, index) => (
                  <div 
                    key={index} 
                    className="location-option"
                    onClick={() => this.handleLocationSelect(park)}
                  >
                    {this.highlightMatch(park)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Date */}
        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            name="Date"
            value={newSurvey['Date'] || ''}
            onChange={onInputChange}
            className="form-control"
            placeholder="DD/MM/YYYY"
            autoComplete="off"
            style={{
              position: 'relative'
            }}
            onFocus={(e) => {
              e.target.showPicker && e.target.showPicker();
            }}
          />
        </div>
        
        {/* Number of Observation */}
        <div className="form-group">
          <label>Number of Observation</label>
          <input
            type="text"
            name="Number of Observation"
            value={newSurvey['Number of Observation'] || ''}
            onChange={onInputChange}
            className="form-control"
            placeholder="e.g. 1, 2, 3..."
          />
        </div>
      </div>
    );
  }
}

export default ObserverInfoSection;
