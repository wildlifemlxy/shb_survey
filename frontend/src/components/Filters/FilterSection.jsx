import React, { Component } from 'react';
import { filterData } from '../../utils/filterUtils';

// Import CSS
import '../../css/components/Filters/FilterSection.css';

class FilterSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      filterLocation: '',
      filterActivity: '',
      searchQuery: '',
      locationDropdownOpen: false,
      activityDropdownOpen: false,
      locationSearchTerm: '', // Start with empty string to show placeholder
      activitySearchTerm: '', // Start with empty string to show placeholder
      // Add keyboard navigation state
      locationFocusedIndex: -1,
      activityFocusedIndex: -1
    };
    
    // Track mount time to reduce console spam during initial loading
    this.mountTime = null;
    
    // Refs for dropdown positioning
    this.locationInputRef = React.createRef();
    this.activityInputRef = React.createRef();
    this.locationDropdownRef = React.createRef();
    this.activityDropdownRef = React.createRef();
  }

  componentDidMount() {
    // Set mount time for console spam prevention
    this.mountTime = Date.now();
    
    // Debug logging
    console.log('FilterSection mounted with props:', {
      locations: this.props.locations?.length || 0,
      activities: this.props.activities?.length || 0,
      initialLocation: this.props.initialLocation,
      initialActivity: this.props.initialActivity
    });

    // Initialize filters if props contain default values
    if (this.props.initialLocation) {
      this.setState({ 
        filterLocation: this.props.initialLocation,
        locationSearchTerm: this.props.initialLocation
      });
    }
    if (this.props.initialActivity) {
      this.setState({ 
        filterActivity: this.props.initialActivity,
        activitySearchTerm: this.props.initialActivity
      });
    }
    
    // Add click outside listener
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
    
    // Clean up debounce timers
    if (this.locationDebounceTimer) {
      clearTimeout(this.locationDebounceTimer);
    }
    if (this.activityDebounceTimer) {
      clearTimeout(this.activityDebounceTimer);
    }
  }

  handleClickOutside = (event) => {
    if (
      this.locationDropdownRef.current &&
      !this.locationDropdownRef.current.contains(event.target) &&
      !this.locationInputRef.current.contains(event.target)
    ) {
      this.setState({ locationDropdownOpen: false });
    }
    
    if (
      this.activityDropdownRef.current &&
      !this.activityDropdownRef.current.contains(event.target) &&
      !this.activityInputRef.current.contains(event.target)
    ) {
      this.setState({ activityDropdownOpen: false });
    }
  };

  handleFilterChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value }, () => {
      // Call parent callback to apply filters
      if (this.props.onFilterChange) {
        this.props.onFilterChange({
          filterLocation: this.state.filterLocation,
          filterActivity: this.state.filterActivity
        });
      }
    });
  };

  handleInputChange = (type, value) => {
    if (type === 'location') {
      this.setState({
        locationSearchTerm: value,
        locationDropdownOpen: true,
        filterLocation: value,
        locationFocusedIndex: -1 // Reset focus when typing
      });
      
      // Debounce the filter change callback to improve performance
      if (this.locationDebounceTimer) {
        clearTimeout(this.locationDebounceTimer);
      }
      this.locationDebounceTimer = setTimeout(() => {
        if (this.props.onFilterChange) {
          this.props.onFilterChange({
            filterLocation: value,
            filterActivity: this.state.filterActivity
          });
        }
      }, 300); // 300ms debounce
      
    } else if (type === 'activity') {
      this.setState({
        activitySearchTerm: value,
        activityDropdownOpen: true,
        filterActivity: value,
        activityFocusedIndex: -1 // Reset focus when typing
      });
      
      // Debounce the filter change callback to improve performance
      if (this.activityDebounceTimer) {
        clearTimeout(this.activityDebounceTimer);
      }
      this.activityDebounceTimer = setTimeout(() => {
        if (this.props.onFilterChange) {
          this.props.onFilterChange({
            filterLocation: this.state.filterLocation,
            filterActivity: value
          });
        }
      }, 300); // 300ms debounce
    }
  };

  handleOptionSelect = (type, value) => {
    if (type === 'location') {
      // Clear the debounce timer
      if (this.locationDebounceTimer) {
        clearTimeout(this.locationDebounceTimer);
      }
      
      // If "All Locations" is selected, use empty string for filtering
      const filterValue = value === "All Locations" ? '' : value;
      
      this.setState({
        filterLocation: filterValue,
        locationSearchTerm: value, // Show the actual selected text
        locationDropdownOpen: false,
        locationFocusedIndex: -1
      }, () => {
        if (this.props.onFilterChange) {
          this.props.onFilterChange({
            filterLocation: filterValue,
            filterActivity: this.state.filterActivity
          });
        }
      });
    } else if (type === 'activity') {
      // Clear the debounce timer
      if (this.activityDebounceTimer) {
        clearTimeout(this.activityDebounceTimer);
      }
      
      // If "All Activities" is selected, use empty string for filtering
      const filterValue = value === "All Activities" ? '' : value;
      
      this.setState({
        filterActivity: filterValue,
        activitySearchTerm: value, // Show the actual selected text
        activityDropdownOpen: false,
        activityFocusedIndex: -1
      }, () => {
        if (this.props.onFilterChange) {
          this.props.onFilterChange({
            filterLocation: this.state.filterLocation,
            filterActivity: filterValue
          });
        }
      });
    }
  };

  handleInputFocus = (type) => {
    if (type === 'location') {
      this.setState({ locationDropdownOpen: true });
    } else if (type === 'activity') {
      this.setState({ activityDropdownOpen: true });
    }
  };

  handleKeyDown = (type, event) => {
    const { key } = event;
    
    if (key === 'Escape') {
      if (type === 'location') {
        this.setState({ 
          locationDropdownOpen: false,
          locationFocusedIndex: -1 
        });
      } else if (type === 'activity') {
        this.setState({ 
          activityDropdownOpen: false,
          activityFocusedIndex: -1 
        });
      }
      return;
    }
    
    if (key === 'ArrowDown') {
      event.preventDefault();
      if (type === 'location') {
        const { locationDropdownOpen, locationFocusedIndex } = this.state;
        const locations = Array.isArray(this.props.locations) ? this.props.locations : [];
        const filteredLocations = this.getFilteredOptions(locations, this.state.locationSearchTerm);
        
        if (!locationDropdownOpen) {
          this.setState({ locationDropdownOpen: true, locationFocusedIndex: 0 });
        } else {
          const nextIndex = Math.min(locationFocusedIndex + 1, filteredLocations.length - 1);
          this.setState({ locationFocusedIndex: nextIndex });
        }
      } else if (type === 'activity') {
        const { activityDropdownOpen, activityFocusedIndex } = this.state;
        const activities = Array.isArray(this.props.activities) ? this.props.activities : [];
        const filteredActivities = this.getFilteredOptions(activities, this.state.activitySearchTerm);
        
        if (!activityDropdownOpen) {
          this.setState({ activityDropdownOpen: true, activityFocusedIndex: 0 });
        } else {
          const nextIndex = Math.min(activityFocusedIndex + 1, filteredActivities.length - 1);
          this.setState({ activityFocusedIndex: nextIndex });
        }
      }
      return;
    }
    
    if (key === 'ArrowUp') {
      event.preventDefault();
      if (type === 'location') {
        const { locationFocusedIndex } = this.state;
        const prevIndex = Math.max(locationFocusedIndex - 1, 0);
        this.setState({ locationFocusedIndex: prevIndex });
      } else if (type === 'activity') {
        const { activityFocusedIndex } = this.state;
        const prevIndex = Math.max(activityFocusedIndex - 1, 0);
        this.setState({ activityFocusedIndex: prevIndex });
      }
      return;
    }
    
    if (key === 'Enter') {
      event.preventDefault();
      if (type === 'location') {
        const { locationFocusedIndex, locationSearchTerm } = this.state;
        const locations = Array.isArray(this.props.locations) ? this.props.locations : [];
        const filteredLocations = this.getFilteredOptions(locations, locationSearchTerm);
        
        if (locationFocusedIndex >= 0 && locationFocusedIndex < filteredLocations.length) {
          // Select specific location
          this.handleOptionSelect('location', filteredLocations[locationFocusedIndex]);
        }
      } else if (type === 'activity') {
        const { activityFocusedIndex, activitySearchTerm } = this.state;
        const activities = Array.isArray(this.props.activities) ? this.props.activities : [];
        const filteredActivities = this.getFilteredOptions(activities, activitySearchTerm);
        
        if (activityFocusedIndex >= 0 && activityFocusedIndex < filteredActivities.length) {
          // Select specific activity
          this.handleOptionSelect('activity', filteredActivities[activityFocusedIndex]);
        }
      }
      return;
    }
  };

  handleSearchInputChange = (e) => {
    const value = e.target.value;
    this.setState({ searchQuery: value });
    if (this.props.onSearchChange) {
      this.props.onSearchChange(value);
    }
  };

  getFilteredOptions = (options, searchTerm) => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Always show "All" option regardless of search term
  getOptionsWithAll = (options, searchTerm, allLabel) => {
    const filteredOptions = this.getFilteredOptions(options, searchTerm);
    return {
      allOption: allLabel,
      filteredOptions: filteredOptions
    };
  };

  // Generate placeholder text based on available options
  getPlaceholderText = (type) => {
    if (type === 'location') {
      const locations = Array.isArray(this.props.locations) ? this.props.locations : [];
      // Filter out "All Locations" and get a real example
      const realLocations = locations.filter(loc => loc !== "All Locations");
      if (realLocations.length > 0) {
        return `e.g., ${realLocations[0]}`;
      }
      return "Search or select location...";
    } else if (type === 'activity') {
      const activities = Array.isArray(this.props.activities) ? this.props.activities : [];
      // Filter out "All Activities" and get a real example
      const realActivities = activities.filter(act => act !== "All Activities");
      if (realActivities.length > 0) {
        return `e.g., ${realActivities[0]}`;
      }
      return "Search or select activity...";
    }
    return "";
  };

  clearFilters = () => {
    this.setState({
      filterLocation: '',
      filterActivity: '',
      locationSearchTerm: '', // Clear to show placeholder
      activitySearchTerm: '', // Clear to show placeholder
      locationDropdownOpen: false,
      activityDropdownOpen: false
    }, () => {
      if (this.props.onFilterChange) {
        this.props.onFilterChange({
          filterLocation: '',
          filterActivity: ''
        });
      }
    });
  };

  render() {
    const { 
      filterLocation, 
      filterActivity, 
      locationDropdownOpen, 
      activityDropdownOpen,
      locationSearchTerm,
      activitySearchTerm 
    } = this.state;
    
    // Ensure we have arrays and provide defaults
    const locations = Array.isArray(this.props.locations) ? this.props.locations : [];
    const activities = Array.isArray(this.props.activities) ? this.props.activities : [];
    const className = this.props.className || '';

    // Only log warnings if component has been mounted for a while and still no data
    // AND if we have some data props but they're still empty (which indicates a real issue)
    // This prevents spam during initial loading
    if (this.mountTime && Date.now() - this.mountTime > 5000) { // Increased to 5 seconds
      // Only warn if we have props.data but no processed locations/activities
      const hasData = this.props.data && Array.isArray(this.props.data) && this.props.data.length > 0;
      
      if (hasData && locations.length === 0) {
        console.warn('FilterSection: No locations provided after initial load, despite having data');
      }
      if (hasData && activities.length === 0) {
        console.warn('FilterSection: No activities provided after initial load, despite having data');
      }
    }

    const filteredLocations = this.getFilteredOptions(locations, locationSearchTerm);
    const filteredActivities = this.getFilteredOptions(activities, activitySearchTerm);

    return (
      <section className={`filters-section ${className}`}>
        <div className="filters-container">
          <div className="filters-header">
            <h3>Filter Data</h3>
            {(filterLocation || filterActivity) && (
              <button 
                className="clear-filters-btn"
                onClick={this.clearFilters}
                type="button"
              >
                Clear Filters
              </button>
            )}
          </div>
          {/* One row: location, activity, search */}
          <div className="filters-grid" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="filter-group" style={{ flex: 1 }}>
              <label htmlFor="filterLocation">Filter by Location</label>
              <div className="combobox-container">
                <input
                  ref={this.locationInputRef}
                  type="text"
                  id="filterLocation"
                  name="filterLocation"
                  value={locationSearchTerm}
                  onChange={(e) => this.handleInputChange('location', e.target.value)}
                  onFocus={() => this.handleInputFocus('location')}
                  onKeyDown={(e) => this.handleKeyDown('location', e)}
                  className="combobox-input"
                  placeholder={this.getPlaceholderText('location')}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={locationDropdownOpen}
                  aria-haspopup="listbox"
                  aria-owns="location-listbox"
                />
                <button
                  type="button"
                  className="combobox-toggle"
                  onClick={() => this.setState({ locationDropdownOpen: !locationDropdownOpen })}
                  aria-label="Toggle location dropdown"
                >
                  <svg 
                    className={`dropdown-arrow ${locationDropdownOpen ? 'open' : ''}`}
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {locationDropdownOpen && (
                  <div 
                    ref={this.locationDropdownRef}
                    className="combobox-dropdown"
                    role="listbox"
                    id="location-listbox"
                  >
                    {filteredLocations.length > 0 ? (
                      filteredLocations.map((location, index) => (
                        <div
                          key={index}
                          className={`combobox-option ${this.state.locationFocusedIndex === index ? 'focused' : ''}`}
                          onClick={() => this.handleOptionSelect('location', location)}
                          role="option"
                          aria-selected={filterLocation === location}
                        >
                          {location}
                        </div>
                      ))
                    ) : (
                        <></>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="filter-group" style={{ flex: 1 }}>
              <label htmlFor="filterActivity">Filter by Activity</label>
              <div className="combobox-container">
                <input
                  ref={this.activityInputRef}
                  type="text"
                  id="filterActivity"
                  name="filterActivity"
                  value={activitySearchTerm}
                  onChange={(e) => this.handleInputChange('activity', e.target.value)}
                  onFocus={() => this.handleInputFocus('activity')}
                  onKeyDown={(e) => this.handleKeyDown('activity', e)}
                  className="combobox-input"
                  placeholder={this.getPlaceholderText('activity')}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={activityDropdownOpen}
                  aria-haspopup="listbox"
                  aria-owns="activity-listbox"
                />
                <button
                  type="button"
                  className="combobox-toggle"
                  onClick={() => this.setState({ activityDropdownOpen: !activityDropdownOpen })}
                  aria-label="Toggle activity dropdown"
                >
                  <svg 
                    className={`dropdown-arrow ${activityDropdownOpen ? 'open' : ''}`}
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {activityDropdownOpen && (
                  <div 
                    ref={this.activityDropdownRef}
                    className="combobox-dropdown"
                    role="listbox"
                    id="activity-listbox"
                  >
                    {filteredActivities.length > 0 ? (
                      filteredActivities.map((activity, index) => (
                        <div
                          key={index}
                          className={`combobox-option ${this.state.activityFocusedIndex === index ? 'focused' : ''} ${index === filteredActivities.length - 1 ? 'last-option' : ''}`}
                          onClick={() => this.handleOptionSelect('activity', activity)}
                          role="option"
                          aria-selected={filterActivity === activity}
                        >
                          {activity}
                        </div>
                      ))
                    ) : (
                        <></>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Simple search input, with search icon */}
            <div className="filter-group" style={{ flex: 2, position: 'relative' }}>
              <label htmlFor="searchInput">Search</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  id="searchInput"
                  name="searchInput"
                  value={this.state.searchQuery}
                  onChange={this.handleSearchInputChange}
                  className="combobox-input"
                  placeholder="Type to search..."
                  autoComplete="off"
                  style={{ minWidth: '180px', paddingRight: '2.5rem' }}
                />
                <span style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748b',
                  opacity: 0.8,
                  zIndex: 2
                }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="11" cy="11" r="7" strokeWidth="2" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
}

export default FilterSection;
