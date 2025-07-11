import React, { Component } from 'react';
import './UpcomingEvents.css';
import axios from 'axios';
import '../../Dashboard/ObserverInfoSection.css'; // Import styles for location dropdown
import '../../Dashboard/ObservationDetailsSection.css'; // Import styles for time dropdown
import '../../Dashboard/NewSurveyModal.css'; // Import enhanced dropdown overlapping styles

const DEFAULT_TIME_START = '07:30';
const DEFAULT_TIME_END = '09:30';
const DEFAULT_TYPE = 'Upcoming';
const ORGANIZER_OPTIONS = [
  'WWF-led',
  'Volunteer-led'
];

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

class AddEventModal extends Component {
  constructor(props) {
    super(props);
    
    // Check if user is WWF-Volunteer
    const userData = JSON.parse(localStorage.getItem('user'));
    const isWWFVolunteer = userData.role === 'WWF-Volunteer';
    
    this.state = {
      numEvents: '',
      events: [],
      hasInteracted: false, // Track if user has interacted with the textbox
      isWWFVolunteer,
      currentCardIndex: 0, // Track which card is currently being viewed
      // Dropdown states
      activeDropdown: null, // Track which dropdown is open: 'organizer-{idx}', 'location-{idx}', 'timeStart-{idx}', 'timeEnd-{idx}'
      // Parks list for location dropdown
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
    
    // Refs for dropdown positioning
    this.dropdownRefs = {};
  }

  componentDidMount() {
    // Add event listener for clicks outside dropdowns
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    // Remove event listener when component unmounts
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  // Handle clicks outside dropdowns
  handleClickOutside = (e) => {
    if (this.state.activeDropdown) {
      const dropdownRef = this.dropdownRefs[this.state.activeDropdown];
      if (dropdownRef && !dropdownRef.contains(e.target)) {
        this.setState({ activeDropdown: null });
      }
    }
  }

  // Set refs for dropdown containers
  setDropdownRef = (key, node) => {
    this.dropdownRefs[key] = node;
  }

  // Position dropdown relative to input
  getDropdownPosition = (inputRef) => {
    if (!inputRef) return { top: 0, left: 0, width: '160px' };
    
    const rect = inputRef.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 8, // Increased offset from 4 to 8
      left: rect.left + window.scrollX,
      width: rect.width + 'px'
    };
  }

  // Toggle dropdown
  toggleDropdown = (dropdownKey) => {
    this.setState(prevState => {
      const isOpening = prevState.activeDropdown !== dropdownKey;
      const newActiveDropdown = isOpening ? dropdownKey : null;
      
      // If opening a time dropdown, scroll to selected values
      if (isOpening && (dropdownKey.includes('timeStart') || dropdownKey.includes('timeEnd'))) {
        const eventIdx = dropdownKey.split('-')[1];
        const currentEvent = this.state.events[eventIdx];
        
        if (dropdownKey.includes('timeStart')) {
          const selectedHour = this.getSelectedHour(currentEvent.TimeStart);
          const selectedMinute = this.getSelectedMinute(currentEvent.TimeStart);
          // Scroll to both hour and minute values
          this.scrollToSelectedValue(`timeStart-hour-${eventIdx}`, selectedHour);
          this.scrollToSelectedValue(`timeStart-minute-${eventIdx}`, selectedMinute);
        } else if (dropdownKey.includes('timeEnd')) {
          const selectedHour = this.getSelectedHour(currentEvent.TimeEnd);
          const selectedMinute = this.getSelectedMinute(currentEvent.TimeEnd);
          // Scroll to both hour and minute values
          this.scrollToSelectedValue(`timeEnd-hour-${eventIdx}`, selectedHour);
          this.scrollToSelectedValue(`timeEnd-minute-${eventIdx}`, selectedMinute);
        }
      }
      
      return {
        activeDropdown: newActiveDropdown
      };
    });
  }

  // Handle organizer selection
  handleOrganizerSelect = (idx, organizer) => {
    this.handleEventFieldChange(idx, 'Organizer', organizer);
    this.setState({ activeDropdown: null });
  }

  // Filter organizers based on input value
  getFilteredOrganizers = (searchValue) => {
    if (!searchValue || searchValue.trim() === '') {
      return ORGANIZER_OPTIONS;
    }
    
    const searchTerm = searchValue.toLowerCase().trim();
    const filtered = ORGANIZER_OPTIONS.filter(organizer => 
      organizer.toLowerCase().includes(searchTerm)
    );
    
    // If no matches found, return all organizers
    return filtered.length > 0 ? filtered : ORGANIZER_OPTIONS;
  }

  // Handle location selection
  handleLocationSelect = (idx, location) => {
    const value = location === "Others" ? "" : location;
    this.handleEventFieldChange(idx, 'Location', value);
    this.setState({ activeDropdown: null });
  }

  // Filter parks based on input value
  getFilteredParks = (searchValue) => {
    if (!searchValue || searchValue.trim() === '') {
      return this.state.parksList;
    }
    
    const searchTerm = searchValue.toLowerCase().trim();
    const filtered = this.state.parksList.filter(park => 
      park.toLowerCase().includes(searchTerm)
    );
    
    // If no matches found, return all parks
    return filtered.length > 0 ? filtered : this.state.parksList;
  }

  // Handle time hour selection
  handleTimeHourSelect = (idx, field, hour) => {
    const currentTime = this.state.events[idx][field] || "00:00";
    const currentMinute = currentTime.includes(':') ? currentTime.split(':')[1] : "00";
    const timeValue = `${hour}:${currentMinute}`;
    
    // Update the current field
    this.handleEventFieldChange(idx, field, timeValue);
    
    // If changing Start Time, also update End Time to match
    if (field === 'TimeStart') {
      this.handleEventFieldChange(idx, 'TimeEnd', timeValue);
    }
    
    this.setState({ activeDropdown: null });
  }

  // Handle time minute selection
  handleTimeMinuteSelect = (idx, field, minute) => {
    const currentTime = this.state.events[idx][field] || "00:00";
    const currentHour = currentTime.includes(':') ? currentTime.split(':')[0] : "00";
    const timeValue = `${currentHour}:${minute}`;
    
    // Update the current field
    this.handleEventFieldChange(idx, field, timeValue);
    
    // If changing Start Time, also update End Time to match
    if (field === 'TimeStart') {
      this.handleEventFieldChange(idx, 'TimeEnd', timeValue);
    }
    
    this.setState({ activeDropdown: null });
  }

  // Scroll to selected value in dropdown
  scrollToSelectedValue = (dropdownKey, selectedValue) => {
    setTimeout(() => {
      const dropdown = document.querySelector(`[data-dropdown="${dropdownKey}"]`);
      if (dropdown && selectedValue) {
        const selectedOption = dropdown.querySelector(`[data-value="${selectedValue}"]`);
        if (selectedOption) {
          selectedOption.scrollIntoView({ 
            behavior: 'auto', 
            block: 'center' 
          });
        }
      }
    }, 50); // Increased timeout to ensure dropdown is rendered
  }

  // Get all hours (no filtering)
  getAllHours = () => {
    return Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
  }

  // Get all minutes (no filtering)
  getAllMinutes = () => {
    return Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));
  }

  // Get selected hour from time value
  getSelectedHour = (timeValue) => {
    if (!timeValue || !timeValue.includes(':')) return '00';
    return timeValue.split(':')[0].padStart(2, '0');
  }

  // Get selected minute from time value
  getSelectedMinute = (timeValue) => {
    if (!timeValue || !timeValue.includes(':')) return '00';
    return timeValue.split(':')[1].padStart(2, '0');
  }

  handleChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '') === '' ? '' : e.target.value; // Only allow numbers
    let num = parseInt(value, 10);
    if (isNaN(num) || num < 1) num = '';
    let events = [...this.state.events];
    if (num) {
      if (num > events.length) {
        // Add blank rows as needed
        events = [
          ...events,
          ...Array.from({ length: num - events.length }, () => ({
            Type: DEFAULT_TYPE,
            Organizer: this.state.isWWFVolunteer ? 'Volunteer-led' : '',
            Location: '',
            Date: '',
            TimeStart: DEFAULT_TIME_START,
            TimeEnd: DEFAULT_TIME_END
          }))
        ];
      } else if (num < events.length) {
        // Prompt user ONCE to select which row(s) to remove (supporting ranges and lists)
        let toRemove = events.length - num;
        const rowInput = window.prompt(
          `You have ${events.length} rows. Enter row numbers to remove (e.g. 2,4-5):`
        );
        if (rowInput) {
          // Parse input: e.g. "2,4-5" => [1,3,4]
          let indices = [];
          rowInput.split(',').forEach(part => {
            if (part.includes('-')) {
              const [start, end] = part.split('-').map(x => parseInt(x, 10));
              if (!isNaN(start) && !isNaN(end) && start >= 1 && end >= 1 && start <= events.length && end <= events.length) {
                for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                  indices.push(i - 1);
                }
              }
            } else {
              const idx = parseInt(part, 10);
              if (!isNaN(idx) && idx >= 1 && idx <= events.length) {
                indices.push(idx - 1);
              }
            }
          });
          // Remove duplicates and sort descending
          indices = Array.from(new Set(indices)).sort((a, b) => b - a);
          if (indices.length === 0) {
            window.alert('Invalid row numbers.');
          } else {
            // Remove up to 'toRemove' rows
            let removed = 0;
            for (let i = 0; i < indices.length && removed < toRemove; i++) {
              const idx = indices[i];
              if (idx >= 0 && idx < events.length) {
                events.splice(idx, 1);
                removed++;
              }
            }
            if (removed < toRemove) {
              window.alert(`Only ${removed} row(s) removed. Please use the - button to remove more if needed.`);
            }
          }
        }
      }
    }
    // Do not clear events if textbox is empty
    this.setState({ 
      numEvents: value, 
      events, 
      hasInteracted: true,
      currentCardIndex: events.length > 0 ? Math.min(this.state.currentCardIndex, events.length - 1) : 0
    });
  };

  handleEventFieldChange = (idx, field, value) => {
    this.setState(prevState => {
      const events = prevState.events.map((ev, i) =>
        i === idx ? { ...ev, [field]: value } : ev
      );
      return { events };
    });
  };

  handleCancel = () => {
    if (this.props.onClose) this.props.onClose();
  };

  async saveEventsToDatabase(events) {
    // Only send events where Organizer, Location, and Date are not empty
    const filteredEvents = events
      .filter(ev =>
        ev.Organizer && ev.Organizer.trim() !== '' &&
        ev.Location && ev.Location.trim() !== '' &&
        ev.Date && ev.Date.trim() !== ''
      )
      .map(ev => ({
        ...ev,
        Type: DEFAULT_TYPE,
        Time: `${ev.TimeStart || DEFAULT_TIME_START} - ${ev.TimeEnd || DEFAULT_TIME_END}`
      }));
    if (filteredEvents.length === 0) {
      window.alert('No valid events to save. Please fill in Organizer, Location, and Date.');
      return null;
    }
    try {
      const result = await axios.post(`${BASE_URL}/events`, {
        purpose: 'addEvent',
        events: filteredEvents
      });
      console.log('Events saved successfully:', result.data);
      this.handleCancel()
    } catch (err) {
      window.alert('Error saving events: ' + err.message);
      return null;
    }
  }

    handleSave = async () => {
    // Save to backend first
    const result = await this.saveEventsToDatabase(this.state.events);
    // Only notify parent if save was successful
    if (result && this.props.onSave) {
        this.props.onSave(); // No need to pass local events, let parent fetch fresh data
    }
    };

  handleAddRow = () => {
    this.setState(prevState => {
      const events = [
        ...prevState.events,
        {
          Type: DEFAULT_TYPE,
          Organizer: this.state.isWWFVolunteer ? 'Volunteer-led' : '',
          Location: '',
          Date: '',
          TimeStart: DEFAULT_TIME_START,
          TimeEnd: DEFAULT_TIME_END
        }
      ];
      return {
        numEvents: String(events.length),
        events,
        currentCardIndex: events.length - 1, // Navigate to the new card
        activeDropdown: null
      };
    });
  };

  handleRemoveRow = () => {
    this.setState(prevState => {
      if (prevState.events.length <= 1) return prevState; // Don't remove if only one event
      
      const events = prevState.events.filter((_, i) => i !== prevState.currentCardIndex);
      const newCurrentIndex = Math.min(prevState.currentCardIndex, events.length - 1);
      
      return {
        numEvents: String(events.length),
        events,
        currentCardIndex: newCurrentIndex,
        activeDropdown: null
      };
    });
  };

  // Helper method to format date for the date input (YYYY-MM-DD)
  formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Handle DD/MM/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Handle other formats if needed
    return '';
  };

  // Helper method to format date for display (DD/MM/YYYY)
  formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    
    // If it's in YYYY-MM-DD format, convert to DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${parseInt(day)}/${parseInt(month)}/${year}`;
    }
    
    return dateStr;
  };

  // Handle date change from date picker
  handleDateChange = (idx, value) => {
    // Convert YYYY-MM-DD to DD/MM/YYYY for storage
    const displayDate = this.formatDateForDisplay(value);
    this.handleEventFieldChange(idx, 'Date', displayDate);
  };

  // Navigate to next card
  handleNextCard = () => {
    this.setState(prevState => ({
      currentCardIndex: Math.min(prevState.currentCardIndex + 1, prevState.events.length - 1),
      activeDropdown: null // Close any open dropdowns when navigating
    }));
  }

  // Navigate to previous card
  handlePrevCard = () => {
    this.setState(prevState => ({
      currentCardIndex: Math.max(prevState.currentCardIndex - 1, 0),
      activeDropdown: null // Close any open dropdowns when navigating
    }));
  }

  // Navigate to specific card
  handleGoToCard = (index) => {
    this.setState({
      currentCardIndex: Math.max(0, Math.min(index, this.state.events.length - 1)),
      activeDropdown: null
    });
  }

  render() {
    const { onClose } = this.props;
    return (
      <div className="modal-overlay1">
        <div className="modal-content" style={{
          background: '#fff',
          borderRadius: 8,
          padding: 0,
          width: '750px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 20px 8px 20px',
            borderBottom: '1px solid #f0f0f0',
            fontWeight: 700,
            fontSize: 16,
            color: '#222',
            letterSpacing: 0.3
          }}>
            Add New Event(s)
          </div>
          {/* Form Body */}
          <div style={{
            flex: 1,
            padding: '12px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            overflowY: 'auto'
          }}>
            <div style={{ color: '#222', fontSize: 14 }}>
              How many events would you like to add?
            </div>
            <input
              type="text"
              className="themed-input"
              style={{
                width: '100%',
                fontSize: 14,
                padding: '5px 10px 5px 0',
                border: 'none',
                borderBottom: '2px solid #22c55e',
                borderRadius: 0,
                background: 'transparent',
                outline: 'none',
                marginBottom: 0,
                caretColor: '#22c55e'
              }}
              placeholder="e.g. 1"
              value={this.state.numEvents}
              onChange={this.handleChange}
              autoFocus
            />
            {/* Show single card with navigation if user has interacted or if there are any event rows */}
            {(this.state.hasInteracted || this.state.events.length > 0) && (
              <div style={{ marginTop: 12 }}>
                {this.state.events.length === 0 && !this.state.numEvents ? (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#666', 
                    padding: '30px', 
                    background: '#f9f9f9', 
                    borderRadius: '6px',
                    fontStyle: 'italic',
                    fontSize: '14px'
                  }}>
                    No events to add.
                  </div>
                ) : this.state.events.length > 0 ? (
                  <div>
                    {/* Navigation Bar */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                      padding: '6px 10px',
                      background: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #e9ecef'
                    }}>
                      {/* Card Counter */}
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#495057'
                      }}>
                        Event {this.state.currentCardIndex + 1} of {this.state.events.length}
                      </div>

                      {/* Navigation Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Previous Button */}
                        <button
                          type="button"
                          onClick={this.handlePrevCard}
                          disabled={this.state.currentCardIndex === 0}
                          style={{
                            background: this.state.currentCardIndex === 0 ? '#e9ecef' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: this.state.currentCardIndex === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}
                          title="Previous Event"
                        >
                          ‹
                        </button>

                        {/* Card Dots */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {this.state.events.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => this.handleGoToCard(idx)}
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                border: 'none',
                                background: idx === this.state.currentCardIndex ? '#007bff' : '#dee2e6',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              title={`Go to Event ${idx + 1}`}
                            />
                          ))}
                        </div>

                        {/* Next Button */}
                        <button
                          type="button"
                          onClick={this.handleNextCard}
                          disabled={this.state.currentCardIndex === this.state.events.length - 1}
                          style={{
                            background: this.state.currentCardIndex === this.state.events.length - 1 ? '#e9ecef' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: this.state.currentCardIndex === this.state.events.length - 1 ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                          title="Next Event"
                        >
                          ›
                        </button>
                      </div>

                      {/* Universal Add/Remove Buttons */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={this.handleAddRow}
                          style={{
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                          title="Add New Event"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={this.handleRemoveRow}
                          disabled={this.state.events.length <= 1}
                          style={{
                            background: this.state.events.length <= 1 ? '#e9ecef' : '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: this.state.events.length <= 1 ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                          title="Remove Current Event"
                        >
                          −
                        </button>
                      </div>
                    </div>

                    {/* Current Event Card */}
                    {(() => {
                      const currentEvent = this.state.events[this.state.currentCardIndex];
                      const idx = this.state.currentCardIndex;
                      
                      return (
                        <>
                          {/* Event Information Section */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            width: '100%'
                          }}>
                            <fieldset style={{
                              border: '1px solid #e9ecef',
                              borderRadius: '8px',
                              padding: '20px',
                              margin: '0',
                              background: '#fff',
                              width: '100%',
                              maxWidth: '600px'
                            }}>
                            <legend style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#495057',
                              padding: '0 12px',
                              background: '#fff'
                            }}>
                              Event Information
                            </legend>
                            
                            <div className="observation-form-grid">
                              {/* Row 1: Event Type and Organizer */}
                              <div className="observation-form-row">
                                <div className="observation-form-field">
                                  <label style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '8px'
                                  }}>
                                    Event Type
                                  </label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    style={{ 
                                      width: '100%', 
                                      border: 'none', 
                                      borderBottom: '2px solid #4f46e5', 
                                      borderRadius: 0, 
                                      background: 'transparent', 
                                      outline: 'none', 
                                      padding: '8px 0',
                                      fontSize: '14px',
                                      color: '#6b7280'
                                    }}
                                    value={currentEvent.Type}
                                    disabled
                                  />
                                </div>

                                <div className="observation-form-field">
                                  <label style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '8px'
                                  }}>
                                    Organizer
                                  </label>
                                  <div 
                                    className="custom-combobox" 
                                    ref={node => this.setDropdownRef(`organizer-${idx}`, node)}
                                  >
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={{ 
                                        width: '100%', 
                                        border: 'none', 
                                        borderBottom: '2px solid #4f46e5', 
                                        borderRadius: 0, 
                                        background: 'transparent', 
                                        outline: 'none', 
                                        padding: '8px 0',
                                        fontSize: '14px',
                                        caretColor: '#4f46e5'
                                      }}
                                      value={currentEvent.Organizer}
                                      onChange={e => this.handleEventFieldChange(idx, 'Organizer', e.target.value)}
                                      onFocus={() => this.toggleDropdown(`organizer-${idx}`)}
                                      placeholder="Select Organizer"
                                      readOnly={this.state.isWWFVolunteer}
                                      disabled={this.state.isWWFVolunteer}
                                      autoComplete="off"
                                      spellCheck={false}
                                    />
                                    {!this.state.isWWFVolunteer && this.state.activeDropdown === `organizer-${idx}` && (
                                      <div 
                                        className="organizer-dropdown" 
                                        style={{
                                          position: 'fixed',
                                          top: this.dropdownRefs[`organizer-${idx}`] ? this.getDropdownPosition(this.dropdownRefs[`organizer-${idx}`].querySelector('input')).top : 'auto',
                                          left: this.dropdownRefs[`organizer-${idx}`] ? this.getDropdownPosition(this.dropdownRefs[`organizer-${idx}`].querySelector('input')).left : 'auto',
                                          width: this.dropdownRefs[`organizer-${idx}`] ? this.getDropdownPosition(this.dropdownRefs[`organizer-${idx}`].querySelector('input')).width : '160px',
                                          zIndex: 10001,
                                          background: 'white',
                                          border: '1px solid #ddd',
                                          borderRadius: '4px',
                                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                          maxHeight: '200px',
                                          overflowY: 'auto'
                                        }}
                                      >
                                        {(() => {
                                          const filteredOrganizers = this.getFilteredOrganizers(currentEvent.Organizer);
                                          
                                          return filteredOrganizers.map((organizer, orgIdx) => (
                                            <div 
                                              key={orgIdx} 
                                              className="organizer-option"
                                              onClick={() => this.handleOrganizerSelect(idx, organizer)}
                                              style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                borderBottom: orgIdx < filteredOrganizers.length - 1 ? '1px solid #f0f0f0' : 'none'
                                              }}
                                              onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                                              onMouseLeave={e => e.target.style.background = 'white'}
                                            >
                                              {organizer}
                                            </div>
                                          ));
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Row 2: Location and Date */}
                              <div className="observation-form-row">
                                <div className="observation-form-field">
                                  <label style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '8px'
                                  }}>
                                    Location
                                  </label>
                                  <div 
                                    className="custom-combobox" 
                                    ref={node => this.setDropdownRef(`location-${idx}`, node)}
                                  >
                                    <input
                                      type="text"
                                      className="location-input form-control"
                                      style={{ 
                                        width: '100%', 
                                        border: 'none', 
                                        borderBottom: '2px solid #4f46e5', 
                                        borderRadius: 0, 
                                        background: 'transparent', 
                                        outline: 'none', 
                                        padding: '8px 0',
                                        fontSize: '14px',
                                        caretColor: '#4f46e5'
                                      }}
                                      value={currentEvent.Location}
                                      onChange={e => this.handleEventFieldChange(idx, 'Location', e.target.value)}
                                      onFocus={() => this.toggleDropdown(`location-${idx}`)}
                                      placeholder="Select Location"
                                      autoComplete="off"
                                      spellCheck={false}
                                    />
                                    {this.state.activeDropdown === `location-${idx}` && (
                                      <div 
                                        className="location-dropdown" 
                                        style={{
                                          position: 'fixed',
                                          top: this.dropdownRefs[`location-${idx}`] ? this.getDropdownPosition(this.dropdownRefs[`location-${idx}`].querySelector('input')).top : 'auto',
                                          left: this.dropdownRefs[`location-${idx}`] ? this.getDropdownPosition(this.dropdownRefs[`location-${idx}`].querySelector('input')).left : 'auto',
                                          width: this.dropdownRefs[`location-${idx}`] ? this.getDropdownPosition(this.dropdownRefs[`location-${idx}`].querySelector('input')).width : '160px',
                                          zIndex: 10002,
                                          background: 'white',
                                          border: '1px solid #ddd',
                                          borderRadius: '4px',
                                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                          maxHeight: '200px',
                                          overflowY: 'auto'
                                        }}
                                      >
                                        {(() => {
                                          const filteredParks = this.getFilteredParks(currentEvent.Location);
                                          
                                          return filteredParks.map((park, parkIdx) => (
                                            <div 
                                              key={parkIdx} 
                                              className="location-option"
                                              onClick={() => this.handleLocationSelect(idx, park)}
                                              style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                borderBottom: parkIdx < filteredParks.length - 1 ? '1px solid #f0f0f0' : 'none'
                                              }}
                                              onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                                              onMouseLeave={e => e.target.style.background = 'white'}
                                            >
                                              {park}
                                            </div>
                                          ));
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="observation-form-field">
                                  <label style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '8px'
                                  }}>
                                    Date
                                  </label>
                                  <input
                                    type="date"
                                    className="form-control"
                                    style={{ 
                                      width: '100%', 
                                      border: 'none', 
                                      borderBottom: '2px solid #4f46e5', 
                                      borderRadius: 0, 
                                      background: 'transparent', 
                                      outline: 'none', 
                                      padding: '8px 0',
                                      fontSize: '14px',
                                      caretColor: '#4f46e5'
                                    }}
                                    value={this.formatDateForInput(currentEvent.Date)}
                                    onChange={e => this.handleDateChange(idx, e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    onFocus={e => e.stopPropagation()}
                                    key={`date-${idx}`}
                                  />
                                </div>
                              </div>

                              {/* Row 3: Start Time and End Time */}
                              <div className="observation-form-row">
                                <div className="observation-form-field">
                                  <label style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '8px'
                                  }}>
                                    Start Time
                                  </label>
                                  <div 
                                    className="time-field-container" 
                                    ref={node => this.setDropdownRef(`timeStart-${idx}`, node)}
                                    style={{position: 'relative', zIndex: 1}}
                                  >
                                    <input
                                      type="text"
                                      className="form-control"
                                      key={`time-start-${idx}`}
                                      value={currentEvent.TimeStart}
                                      onChange={e => this.handleEventFieldChange(idx, 'TimeStart', e.target.value)}
                                      onFocus={() => this.toggleDropdown(`timeStart-${idx}`)}
                                      onClick={e => e.stopPropagation()}
                                      placeholder="07:30"
                                      style={{ 
                                        width: '100%',
                                        border: 'none', 
                                        borderBottom: '2px solid #4f46e5', 
                                        borderRadius: 0, 
                                        background: 'transparent', 
                                        outline: 'none', 
                                        padding: '8px 0',
                                        fontSize: '14px',
                                        caretColor: '#4f46e5'
                                      }}
                                      autoComplete="off"
                                      spellCheck={false}
                                    />
                                    {this.state.activeDropdown === `timeStart-${idx}` && (
                                      <div style={{
                                        position: 'fixed',
                                        top: this.dropdownRefs[`timeStart-${idx}`] ? this.getDropdownPosition(this.dropdownRefs[`timeStart-${idx}`].querySelector('input')).top : 'auto',
                                        left: this.dropdownRefs[`timeStart-${idx}`] ? this.getDropdownPosition(this.dropdownRefs[`timeStart-${idx}`].querySelector('input')).left : 'auto',
                                        zIndex: 10003,
                                        background: 'white',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                        padding: '8px',
                                        width: 'fit-content'
                                      }}>
                                        <div className="time-columns" style={{display: 'flex', gap: '8px'}}>
                                          <div className="time-column" style={{width: '50px'}}>
                                            <div className="time-column-header" style={{fontWeight: 'bold', textAlign: 'center', padding: '4px', borderBottom: '1px solid #eee', marginBottom: '4px'}}>Hour</div>
                                            <div className="time-options" style={{maxHeight: '200px', overflowY: 'auto'}} data-dropdown={`timeStart-hour-${idx}`}>
                                              {(() => {
                                                const allHours = this.getAllHours();
                                                const selectedHour = this.getSelectedHour(currentEvent.TimeStart);
                                                
                                                return allHours.map((hour) => (
                                                  <div 
                                                    key={hour} 
                                                    className="time-option"
                                                    data-value={hour}
                                                    onClick={() => this.handleTimeHourSelect(idx, 'TimeStart', hour)}
                                                    style={{
                                                      padding: '3px 8px',
                                                      cursor: 'pointer',
                                                      borderRadius: '3px',
                                                      margin: '1px 0',
                                                      textAlign: 'center',
                                                      backgroundColor: hour === selectedHour ? '#e3f2fd' : 'transparent',
                                                      fontWeight: hour === selectedHour ? 'bold' : 'normal',
                                                      border: hour === selectedHour ? '1px solid #2196f3' : '1px solid transparent'
                                                    }}
                                                    onMouseEnter={e => {
                                                      if (hour !== selectedHour) {
                                                        e.target.style.background = '#f5f5f5';
                                                      }
                                                    }}
                                                    onMouseLeave={e => {
                                                      if (hour !== selectedHour) {
                                                        e.target.style.background = 'transparent';
                                                      } else {
                                                        e.target.style.background = '#e3f2fd';
                                                      }
                                                    }}
                                                  >
                                                    {hour}
                                                  </div>
                                                ));
                                              })()}
                                            </div>
                                          </div>
                                          <div className="time-column" style={{width: '50px'}}>
                                            <div className="time-column-header" style={{fontWeight: 'bold', textAlign: 'center', padding: '4px', borderBottom: '1px solid #eee', marginBottom: '4px'}}>Min</div>
                                            <div className="time-options" style={{maxHeight: '200px', overflowY: 'auto'}} data-dropdown={`timeStart-minute-${idx}`}>
                                              {(() => {
                                                const allMinutes = this.getAllMinutes();
                                                const selectedMinute = this.getSelectedMinute(currentEvent.TimeStart);
                                                
                                                return allMinutes.map((minute) => (
                                                  <div 
                                                    key={minute} 
                                                    className="time-option"
                                                    data-value={minute}
                                                    onClick={() => this.handleTimeMinuteSelect(idx, 'TimeStart', minute)}
                                                    style={{
                                                      padding: '3px 8px',
                                                      cursor: 'pointer',
                                                      borderRadius: '3px',
                                                      margin: '1px 0',
                                                      textAlign: 'center',
                                                      backgroundColor: minute === selectedMinute ? '#e3f2fd' : 'transparent',
                                                      fontWeight: minute === selectedMinute ? 'bold' : 'normal',
                                                      border: minute === selectedMinute ? '1px solid #2196f3' : '1px solid transparent',

                                                    }}
                                                    onMouseEnter={e => {
                                                      if (minute !== selectedMinute) {
                                                        e.target.style.background = '#f5f5f5';
                                                      }
                                                    }}
                                                    onMouseLeave={e => {
                                                      if (minute !== selectedMinute) {
                                                        e.target.style.background = 'transparent';
                                                      } else {
                                                        e.target.style.background = '#e3f2fd';
                                                      }
                                                    }}
                                                  >
                                                    {minute}
                                                  </div>
                                                ));
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="observation-form-field">
                                  <label style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '8px'
                                  }}>
                                    End Time
                                  </label>
                                  <div 
                                    className="time-field-container" 
                                    ref={node => this.setDropdownRef(`timeEnd-${idx}`, node)}
                                    style={{position: 'relative', zIndex: 1}}
                                  >
                                    <input
                                      type="text"
                                      className="form-control"
                                      key={`time-end-${idx}`}
                                      value={currentEvent.TimeEnd}
                                      onChange={e => this.handleEventFieldChange(idx, 'TimeEnd', e.target.value)}
                                      onFocus={() => this.toggleDropdown(`timeEnd-${idx}`)}
                                      onClick={e => e.stopPropagation()}
                                      placeholder="09:30"
                                      style={{ 
                                        width: '100%',
                                        border: 'none', 
                                        borderBottom: '2px solid #4f46e5', 
                                        borderRadius: 0, 
                                        background: 'transparent', 
                                        outline: 'none', 
                                        padding: '8px 0',
                                        fontSize: '14px',
                                        caretColor: '#4f46e5'
                                      }}
                                      autoComplete="off"
                                      spellCheck={false}
                                    />
                                    {this.state.activeDropdown === `timeEnd-${idx}` && (
                                      <div style={{
                                        position: 'fixed',
                                        top: this.dropdownRefs[`timeEnd-${idx}`] ? this.getDropdownPosition(this.dropdownRefs[`timeEnd-${idx}`].querySelector('input')).top : 'auto',
                                        left: this.dropdownRefs[`timeEnd-${idx}`] ? this.getDropdownPosition(this.dropdownRefs[`timeEnd-${idx}`].querySelector('input')).left : 'auto',
                                        zIndex: 10004,
                                        background: 'white',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                        padding: '8px',
                                        minWidth: '200px'
                                      }}>
                                        <div className="time-columns" style={{display: 'flex', gap: '8px'}}>
                                          <div className="time-column" style={{width: '50px'}}>
                                            <div className="time-column-header" style={{fontWeight: 'bold', textAlign: 'center', padding: '4px', borderBottom: '1px solid #eee', marginBottom: '4px'}}>Hour</div>
                                            <div className="time-options" style={{maxHeight: '200px', overflowY: 'auto'}} data-dropdown={`timeEnd-hour-${idx}`}>
                                              {(() => {
                                                const allHours = this.getAllHours();
                                                const selectedHour = this.getSelectedHour(currentEvent.TimeEnd);
                                                
                                                return allHours.map((hour) => (
                                                  <div 
                                                    key={hour} 
                                                    className="time-option"
                                                    data-value={hour}
                                                    onClick={() => this.handleTimeHourSelect(idx, 'TimeEnd', hour)}
                                                    style={{
                                                      padding: '2px 4px',
                                                      cursor: 'pointer',
                                                      borderRadius: '2px',
                                                      margin: '0',
                                                      textAlign: 'center',
                                                      backgroundColor: hour === selectedHour ? '#e3f2fd' : 'transparent',
                                                      fontWeight: hour === selectedHour ? 'bold' : 'normal',
                                                      border: hour === selectedHour ? '1px solid #2196f3' : '1px solid transparent',
                                                      fontSize: '12px',
                                                      lineHeight: '1.2'
                                                    }}
                                                    onMouseEnter={e => {
                                                      if (hour !== selectedHour) {
                                                        e.target.style.background = '#f5f5f5';
                                                      }
                                                    }}
                                                    onMouseLeave={e => {
                                                      if (hour !== selectedHour) {
                                                        e.target.style.background = 'transparent';
                                                      } else {
                                                        e.target.style.background = '#e3f2fd';
                                                      }
                                                    }}
                                                  >
                                                    {hour}
                                                  </div>
                                                ));
                                              })()}
                                            </div>
                                          </div>
                                          <div className="time-column" style={{width: '50px'}}>
                                            <div className="time-column-header" style={{fontWeight: 'bold', textAlign: 'center', padding: '4px', borderBottom: '1px solid #eee', marginBottom: '4px'}}>Min</div>
                                            <div className="time-options" style={{maxHeight: '200px', overflowY: 'auto'}} data-dropdown={`timeEnd-minute-${idx}`}>
                                              {(() => {
                                                const allMinutes = this.getAllMinutes();
                                                const selectedMinute = this.getSelectedMinute(currentEvent.TimeEnd);
                                                
                                                return allMinutes.map((minute) => (
                                                  <div 
                                                    key={minute} 
                                                    className="time-option"
                                                    data-value={minute}
                                                    onClick={() => this.handleTimeMinuteSelect(idx, 'TimeEnd', minute)}
                                                    style={{
                                                      padding: '2px 4px',
                                                      cursor: 'pointer',
                                                      borderRadius: '2px',
                                                      margin: '0',
                                                      textAlign: 'center',
                                                      backgroundColor: minute === selectedMinute ? '#e3f2fd' : 'transparent',
                                                      fontWeight: minute === selectedMinute ? 'bold' : 'normal',
                                                      border: minute === selectedMinute ? '1px solid #2196f3' : '1px solid transparent',
                                                      fontSize: '12px',
                                                      lineHeight: '1.2'
                                                    }}
                                                    onMouseEnter={e => {
                                                      if (minute !== selectedMinute) {
                                                        e.target.style.background = '#f5f5f5';
                                                      }
                                                    }}
                                                    onMouseLeave={e => {
                                                      if (minute !== selectedMinute) {
                                                        e.target.style.background = 'transparent';
                                                      } else {
                                                        e.target.style.background = '#e3f2fd';
                                                      }
                                                    }}
                                                  >
                                                    {minute}
                                                  </div>
                                                ));
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </fieldset>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : null}
              </div>
            )}
          </div>
          {/* Footer */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8
          }}>
            <button
              className="themed-btn themed-btn-green"
              style={{ minWidth: 70, borderRadius: 4, fontWeight: 600, fontSize: '14px' }}
              onClick={this.handleCancel}
            >
              Cancel
            </button>
            <button
              className="themed-btn themed-btn-green"
              style={{ minWidth: 70, borderRadius: 4, fontWeight: 600, fontSize: '14px' }}
              onClick={this.handleSave}
              disabled={!this.state.numEvents}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default AddEventModal;
