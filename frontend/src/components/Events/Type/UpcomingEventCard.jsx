import React, { Component } from 'react';
  import './UpcomingEvents.css';
  import ParticipantList from './ParticipantList';
  import '../../Dashboard/ObserverInfoSection.css'; // Import styles for location dropdown
  import '../../Dashboard/ObservationDetailsSection.css'; // Import styles for time dropdown

  const BASE_URL =
    window.location.hostname === 'localhost'
      ? 'http://localhost:3001'
      : 'https://shb-backend.azurewebsites.net';

  class UpcomingEventCard extends Component {
    constructor(props) {
      super(props);
      
      const localEvent = { ...props.event };
      
      // If Time exists but TimeStart/TimeEnd don't, parse the Time field
      if (localEvent.Time && !localEvent.TimeStart && !localEvent.TimeEnd) {
        // Handle different time formats: "HH:MM - HH:MM", "HH:MM-HH:MM", "HH:MM to HH:MM"
        const timeStr = localEvent.Time.toString().trim();
        let timeParts = [];
        
        if (timeStr.includes(' - ')) {
          timeParts = timeStr.split(' - ');
        } else if (timeStr.includes('-')) {
          timeParts = timeStr.split('-');
        } else if (timeStr.includes(' to ')) {
          timeParts = timeStr.split(' to ');
        }
        
        if (timeParts.length === 2) {
          localEvent.TimeStart = timeParts[0].trim();
          localEvent.TimeEnd = timeParts[1].trim();
        }
      }
      
      this.state = {
        localEvent,
        editing: false,
        user: JSON.parse(localStorage.getItem('user')),
        // Dropdown states
        showLocationDropdown: false,
        showTimeDropdown: false,
        showEndTimeDropdown: false,
        locationPlaceholder: "Enter a location",
        isLocationDropdownJustOpened: false,
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
        ],
        // Time options for dropdown
        selectedHour: '',
        selectedMinute: ''
      };
    
      // Refs
      this.locationDropdownRef = null;
      this.timeDropdownRef = null;
      this.endTimeDropdownRef = null;
      this.hourListRef = null;
      this.minuteListRef = null;
      this.endHourListRef = null;
      this.endMinuteListRef = null;
    }

    componentDidMount() 
    {    
      if (window.socket) {
        this.socket = window.socket;
        this.socket.on('survey-updated', (data) => {
          if (data && data.event && data.event._id === this.props.event._id) {
            // Update local event state with the new event data from the server
            const updatedEvent = { ...data.event };
            
            // If Time exists but TimeStart/TimeEnd don't, parse the Time field
            if (updatedEvent.Time && !updatedEvent.TimeStart && !updatedEvent.TimeEnd) {
              // Handle different time formats: "HH:MM - HH:MM", "HH:MM-HH:MM", "HH:MM to HH:MM"
              const timeStr = updatedEvent.Time.toString().trim();
              let timeParts = [];
              
              if (timeStr.includes(' - ')) {
                timeParts = timeStr.split(' - ');
              } else if (timeStr.includes('-')) {
                timeParts = timeStr.split('-');
              } else if (timeStr.includes(' to ')) {
                timeParts = timeStr.split(' to ');
              }
              
              if (timeParts.length === 2) {
                updatedEvent.TimeStart = timeParts[0].trim();
                updatedEvent.TimeEnd = timeParts[1].trim();
              }
            }
            
            this.setState({ localEvent: updatedEvent, editing: false });
            // Optionally notify parent
            if (typeof this.props.onUpdate === 'function') {
              this.props.onUpdate(data.event._id, 'save', updatedEvent);
            }
          }
        });
      }
      
      // Add event listener for clicks outside dropdowns
      document.addEventListener('mousedown', this.handleClickOutside);
    }

    componentWillUnmount() {
      // Remove event listener when component unmounts
      document.removeEventListener('mousedown', this.handleClickOutside);
    }

    // Set refs for dropdown containers
    setLocationDropdownRef = (node) => {
      this.locationDropdownRef = node;
    }

    setTimeDropdownRef = (node) => {
      this.timeDropdownRef = node;
    }

    setHourListRef = (node) => {
      this.hourListRef = node;
    }

    setMinuteListRef = (node) => {
      this.minuteListRef = node;
    }

    setEndTimeDropdownRef = (node) => {
      this.endTimeDropdownRef = node;
    }

    setEndHourListRef = (node) => {
      this.endHourListRef = node;
    }

    setEndMinuteListRef = (node) => {
      this.endMinuteListRef = node;
    }

    // Handle clicks outside dropdowns
    handleClickOutside = (e) => {
      if (this.locationDropdownRef && !this.locationDropdownRef.contains(e.target)) {
        this.setState({ showLocationDropdown: false });
      }
      if (this.timeDropdownRef && !this.timeDropdownRef.contains(e.target)) {
        this.setState({ showTimeDropdown: false });
      }
      if (this.endTimeDropdownRef && !this.endTimeDropdownRef.contains(e.target)) {
        this.setState({ showEndTimeDropdown: false });
      }
    }

    // Position dropdown relative to input
    getDropdownPosition = (inputRef) => {
      if (!inputRef) return { top: 0, left: 0, width: '160px' };
      
      const rect = inputRef.getBoundingClientRect();
      return {
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width + 'px'
      };
    }

    // Toggle location dropdown
    toggleLocationDropdown = () => {
      this.setState(prevState => ({
        showLocationDropdown: !prevState.showLocationDropdown,
        showTimeDropdown: false,
        showEndTimeDropdown: false,
        isLocationDropdownJustOpened: !prevState.showLocationDropdown
      }));
    }

    // Toggle time dropdown
    toggleTimeDropdown = () => {
      this.setState(prevState => ({
        showTimeDropdown: !prevState.showTimeDropdown,
        showLocationDropdown: false,
        showEndTimeDropdown: false
      }), () => {
        // Auto-scroll to selected time when dropdown opens
        if (this.state.showTimeDropdown) {
          this.scrollToSelectedTime();
        }
      });
    }

    // Toggle end time dropdown
    toggleEndTimeDropdown = () => {
      this.setState(prevState => ({
        showEndTimeDropdown: !prevState.showEndTimeDropdown,
        showLocationDropdown: false,
        showTimeDropdown: false
      }), () => {
        // Auto-scroll to selected end time when dropdown opens
        if (this.state.showEndTimeDropdown) {
          this.scrollToSelectedEndTime();
        }
      });
    }

    // Handle location input change (for typing)
    handleLocationChange = (value) => {
      this.handleFieldChange('Location', value);
      this.setState({ isLocationDropdownJustOpened: false });
    }

    // Handle location selection from dropdown
    handleLocationSelect = (location) => {
      const newPlaceholder = location === "Others" ? "Others" : "";
      const value = location === "Others" ? "" : location;
      
      this.handleFieldChange('Location', value);
      
      this.setState({ 
        showLocationDropdown: false,
        locationPlaceholder: newPlaceholder
      });
    }

    // Handle hour selection for time dropdown
    handleHourSelect = (hour) => {
      const currentTimeStart = this.state.localEvent.TimeStart || "";
      const currentMinute = currentTimeStart.includes(':') ? currentTimeStart.split(':')[1] : "00";
      const timeValue = `${hour}:${currentMinute}`;
      
      this.handleFieldChange('TimeStart', timeValue);
      this.setState({ 
        showTimeDropdown: false 
      });
    }

    // Handle minute selection for time dropdown
    handleMinuteSelect = (minute) => {
      const currentTimeStart = this.state.localEvent.TimeStart || "";
      const currentHour = currentTimeStart.includes(':') ? currentTimeStart.split(':')[0] : "00";
      const timeValue = `${currentHour}:${minute}`;
      
      this.handleFieldChange('TimeStart', timeValue);
      this.setState({ 
        showTimeDropdown: false 
      });
    }

    // Handle end hour selection for time dropdown
    handleEndHourSelect = (hour) => {
      const currentTimeEnd = this.state.localEvent.TimeEnd || "";
      const currentMinute = currentTimeEnd.includes(':') ? currentTimeEnd.split(':')[1] : "00";
      const timeValue = `${hour}:${currentMinute}`;
      
      this.handleFieldChange('TimeEnd', timeValue);
      this.setState({ showEndTimeDropdown: false });
    }

    // Handle end minute selection for time dropdown
    handleEndMinuteSelect = (minute) => {
      const currentTimeEnd = this.state.localEvent.TimeEnd || "";
      const currentHour = currentTimeEnd.includes(':') ? currentTimeEnd.split(':')[0] : "00";
      const timeValue = `${currentHour}:${minute}`;
      
      this.handleFieldChange('TimeEnd', timeValue);
      this.setState({ showEndTimeDropdown: false });
    }

    componentDidUpdate(prevProps) {
      // Only update if the event prop changes AND we're not currently editing
      if (prevProps.event !== this.props.event && !this.props.editing) {
        const newLocalEvent = { ...this.props.event };
        
        // If Time exists but TimeStart/TimeEnd don't, parse the Time field
        if (newLocalEvent.Time && !newLocalEvent.TimeStart && !newLocalEvent.TimeEnd) {
          // Handle different time formats: "HH:MM - HH:MM", "HH:MM-HH:MM", "HH:MM to HH:MM"
          const timeStr = newLocalEvent.Time.toString().trim();
          let timeParts = [];
          
          if (timeStr.includes(' - ')) {
            timeParts = timeStr.split(' - ');
          } else if (timeStr.includes('-')) {
            timeParts = timeStr.split('-');
          } else if (timeStr.includes(' to ')) {
            timeParts = timeStr.split(' to ');
          }
          
          if (timeParts.length === 2) {
            newLocalEvent.TimeStart = timeParts[0].trim();
            newLocalEvent.TimeEnd = timeParts[1].trim();
          }
        }
        
        this.setState({ localEvent: newLocalEvent });
      }
    }

    handleFieldChange = (field, value) => {
      console.log(`Updating field ${field} with value:`, value);
      this.setState(prev => ({
        localEvent: { ...prev.localEvent, [field]: value }
      }));
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

    // Helper method to handle input focus and prevent cross-input interference
    handleInputFocus = (inputType, event) => {
      // Ensure the correct input is focused and others don't interfere
      event.target.focus();
      event.stopPropagation();
    };

    onDelete = async (id, action) => {
      try {
        console.log('Deleting event:', id);
        
        // Call the parent's onUpdate function with delete action
        if (typeof this.props.onUpdate === 'function') {
          this.props.onUpdate(id, action, null);
        }
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    };

    saveEventUpdate = async (id, action, eventData) => {
      try {
        if (action === 'cancel') {
          console.log('Edit cancelled');
          if (typeof this.props.onUpdate === 'function') {
            this.props.onUpdate(this.state.localEvent._id, 'cancel', "");
          }
          return;
        }
        if (action === 'save') {
          console.log('Saving event update:', eventData);
          
          // Construct the Time field from TimeStart and TimeEnd if they exist
          const updatedEvent = { ...this.state.localEvent };
          if (updatedEvent.TimeStart && updatedEvent.TimeEnd) {
            updatedEvent.Time = `${updatedEvent.TimeStart} - ${updatedEvent.TimeEnd}`;
          }
          
          this.props.onUpdate(id, 'save', updatedEvent);
        }
      } catch (error) {
        console.error('Error saving event update:', error);
      }
    }

    // Filter parks based on input value for typing, but show all when dropdown opens
    getFilteredParks = (searchValue, showAll = false) => {
      if (showAll || !searchValue || searchValue.trim() === '') {
        return this.state.parksList;
      }
      
      const searchTerm = searchValue.toLowerCase().trim();
      const filtered = this.state.parksList.filter(park => 
        park.toLowerCase().includes(searchTerm)
      );
      
      // If no matches found, return all parks
      return filtered.length > 0 ? filtered : this.state.parksList;
    }

    // Auto-scroll to selected time value
    scrollToSelectedTime = () => {
      setTimeout(() => {
        const currentTime = this.state.localEvent.TimeStart || '';
        const [currentHour, currentMinute] = currentTime.split(':');
        
        if (this.hourListRef && currentHour) {
          const hourIndex = parseInt(currentHour, 10);
          const hourOption = this.hourListRef.children[hourIndex];
          if (hourOption) {
            hourOption.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }
        
        if (this.minuteListRef && currentMinute) {
          const minuteIndex = parseInt(currentMinute, 10);
          const minuteOption = this.minuteListRef.children[minuteIndex];
          if (minuteOption) {
            minuteOption.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }
      }, 100);
    }

    // Auto-scroll to selected end time value
    scrollToSelectedEndTime = () => {
      setTimeout(() => {
        const currentTime = this.state.localEvent.TimeEnd || '';
        const [currentHour, currentMinute] = currentTime.split(':');
        
        if (this.endHourListRef && currentHour) {
          const hourIndex = parseInt(currentHour, 10);
          const hourOption = this.endHourListRef.children[hourIndex];
          if (hourOption) {
            hourOption.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }
        
        if (this.endMinuteListRef && currentMinute) {
          const minuteIndex = parseInt(currentMinute, 10);
          const minuteOption = this.endMinuteListRef.children[minuteIndex];
          if (minuteOption) {
            minuteOption.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }
      }, 100);
    }

    render() {
      const {
        event,
        expanded,
        editing,
        onToggle,
        onUpdate
      } = this.props;
      const userRole = this.state.user?.role;
      // Debug logging
      console.log('Event:', event);
      console.log('Local Event:', this.state.localEvent);
      console.log('TimeStart:', this.state.localEvent.TimeStart);
      console.log('TimeEnd:', this.state.localEvent.TimeEnd);
      const isWWFLed = event.Organizer === 'WWF-led';

      return (
        <div className={`upcoming-event-card ${editing ? 'editing-mode' : ''}`} style={{position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '320px', maxHeight: editing ? '400px' : '320px', overflow: 'hidden'}}>
          {/* Header */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 0 16px'}}>
            {!editing && (
              <div
                className="upcoming-event-title clickable"
                onClick={() => onToggle(event._id)}
                style={{ cursor: 'pointer'}}
              >
                <span className="upcoming-event-label">Location:</span> {event.Location}
              </div>
            )}
            {!editing && (userRole === 'WWF-Volunteer' ? !isWWFLed : true) && (
              <div style={{display: 'flex', gap: 6, marginLeft: '2px'}}>
                <button
                  className="card-update-btn themed-btn themed-btn-outline"
                  style={{ padding: '0 8px', fontSize: '0.85em', height: 26, minWidth: 0, lineHeight: 1.2, borderRadius: 4, border: '1.5px solid var(--theme-accent, #4f46e5)', color: 'var(--theme-accent, #4f46e5)', background: 'transparent', transition: 'background 0.2s, color 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--theme-accent, #4f46e5)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--theme-accent, #4f46e5)'; }}
                  onClick={() => onUpdate(event._id, 'card-edit')}
                >
                  Edit
                </button>
                <button
                  className="card-delete-btn themed-btn themed-btn-outline"
                  style={{ padding: '0 8px', fontSize: '0.85em', height: 26, minWidth: 0, lineHeight: 1.2, borderRadius: 4, border: '1.5px solid #dc2626', color: '#dc2626', background: 'transparent', transition: 'background 0.2s, color 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#dc2626'; }}
                  onClick={() => this.onDelete(event._id, 'delete')}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          {/* Body */}
          <div style={{flex: 1, padding: '8px 16px 0 16px', overflowY: 'auto', maxHeight: editing ? '240px' : 'auto', position: 'relative', zIndex: 1}}>
            {editing ? (
              <form className="upcoming-event-edit-form" autoComplete="off" style={{display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 2}} onSubmit={e => { e.preventDefault(); onUpdate(event._id, 'save'); }}>
                {/* Location with custom dropdown */}
                <div className="form-row" style={{display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 3}}>
                  <label className="upcoming-event-label" htmlFor={`location-${event._id}`} style={{marginRight: 8, minWidth: '70px', fontSize: '0.9rem'}}>Location:</label>
                  <div className="location-field-container" ref={this.setLocationDropdownRef} style={{position: 'relative', width: '160px', zIndex: 1003}}>
                    <input
                      id={`location-${event._id}`}
                      className="themed-input"
                      type="text"
                      value={this.state.localEvent.Location || ''}
                      onChange={e => this.handleLocationChange(e.target.value)}
                      onFocus={this.toggleLocationDropdown}
                      style={{ border: 'none', borderBottom: '2px solid #4f46e5', borderRadius: 0, color: '#222', width: '100%', minWidth: '140px', fontWeight: 400, background: 'transparent', outline: 'none', padding: '4px 8px 4px 0', caretColor: '#4f46e5', position: 'relative', zIndex: 1 }}
                      placeholder={this.state.locationPlaceholder}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {this.state.showLocationDropdown && (
                      <div className="location-dropdown" style={{
                        position: 'fixed', 
                        top: this.locationDropdownRef ? this.getDropdownPosition(this.locationDropdownRef.querySelector('input')).top : 'auto',
                        left: this.locationDropdownRef ? this.getDropdownPosition(this.locationDropdownRef.querySelector('input')).left : 'auto',
                        width: this.locationDropdownRef ? this.getDropdownPosition(this.locationDropdownRef.querySelector('input')).width : '160px',
                        zIndex: 9999,
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {(() => {
                          const filteredParks = this.getFilteredParks(
                            this.state.localEvent.Location, 
                            this.state.isLocationDropdownJustOpened
                          );
                          
                          return filteredParks.map((park, index) => (
                            <div 
                              key={index} 
                              className="location-option"
                              onClick={() => this.handleLocationSelect(park)}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: index < filteredParks.length - 1 ? '1px solid #f0f0f0' : 'none'
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
                
                {/* Date with normal HTML5 date input */}
                <div className="form-row" style={{display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 2}}>
                  <label className="upcoming-event-label" htmlFor={`date-${event._id}`} style={{marginRight: 8, minWidth: '70px', fontSize: '0.9rem'}}>Date:</label>
                  <input
                    id={`date-${event._id}`}
                    className="themed-input"
                    type="date"
                    value={this.formatDateForInput(this.state.localEvent.Date || '')}
                    onChange={e => this.handleFieldChange('Date', this.formatDateForDisplay(e.target.value))}
                    style={{ border: 'none', borderBottom: '2px solid #4f46e5', borderRadius: 0, color: '#222', width: '140px', minWidth: '130px', fontWeight: 400, background: 'transparent', outline: 'none', padding: '4px 8px 4px 0', caretColor: '#4f46e5', position: 'relative', zIndex: 1 }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                
                {/* Time with custom dropdown */}
                <div className="form-row" style={{display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1}}>
                  <label className="upcoming-event-label" style={{marginRight: 8, minWidth: '50px', fontSize: '0.9rem'}}>Time:</label>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <div className="time-field-container" ref={this.setTimeDropdownRef} style={{position: 'relative', zIndex: 1001}}>
                      <input
                        className="themed-input"
                        type="text"
                        value={this.state.localEvent.TimeStart || ''}
                        onChange={e => this.handleFieldChange('TimeStart', e.target.value)}
                        onFocus={this.toggleTimeDropdown}
                        style={{ border: 'none', borderBottom: '2px solid #4f46e5', borderRadius: 0, color: '#222', width: '75px', minWidth: '75px', fontWeight: 400, background: 'transparent', outline: 'none', padding: '4px 8px 4px 0', caretColor: '#4f46e5', position: 'relative', zIndex: 1 }}
                        placeholder="Start"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      {this.state.showTimeDropdown && (
                        <div style={{
                          position: 'fixed',
                          top: this.timeDropdownRef ? this.getDropdownPosition(this.timeDropdownRef.querySelector('input')).top : 'auto',
                          left: this.timeDropdownRef ? this.getDropdownPosition(this.timeDropdownRef.querySelector('input')).left : 'auto',
                          zIndex: 9997,
                          background: 'white',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                          padding: '8px'
                        }}>
                          <div className="time-columns" style={{display: 'flex', gap: '8px'}}>
                            <div className="time-column" style={{width: '50px'}}>
                              <div className="time-column-header" style={{fontWeight: 'bold', textAlign: 'center', padding: '4px', borderBottom: '1px solid #eee', marginBottom: '4px', fontSize: '0.85rem'}}>Hour</div>
                              <div className="time-options" style={{maxHeight: '200px', overflowY: 'auto', padding: '2px', width: '50px'}} ref={this.setHourListRef}>
                                {Array.from({length: 24}, (_, i) => {
                                  const hour = i.toString().padStart(2, '0');
                                  const currentTime = this.state.localEvent.TimeStart || '';
                                  const [currentHour] = currentTime.split(':');
                                  const isSelected = currentHour === hour;
                                  
                                  return (
                                    <div 
                                      key={hour} 
                                      className="time-option"
                                      onClick={() => this.handleHourSelect(hour)}
                                      style={{
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        margin: '1px 0',
                                        textAlign: 'center',
                                        fontSize: '0.85rem',
                                        background: isSelected ? '#e0e7ff' : 'transparent',
                                        color: isSelected ? '#3730a3' : '#333',
                                        fontWeight: isSelected ? '600' : '400',
                                        width: '42px'
                                      }}
                                      onMouseEnter={e => {
                                        if (!isSelected) e.target.style.background = '#f5f5f5';
                                      }}
                                      onMouseLeave={e => {
                                        if (!isSelected) e.target.style.background = 'transparent';
                                      }}
                                    >
                                      {hour}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="time-column" style={{width: '50px'}}>
                              <div className="time-column-header" style={{fontWeight: 'bold', textAlign: 'center', padding: '4px', borderBottom: '1px solid #eee', marginBottom: '4px', fontSize: '0.85rem'}}>Min</div>
                              <div className="time-options" style={{maxHeight: '200px', overflowY: 'auto', padding: '2px', width: '50px'}} ref={this.setMinuteListRef}>
                                {Array.from({length: 60}, (_, i) => {
                                  const minute = i.toString().padStart(2, '0');
                                  const currentTime = this.state.localEvent.TimeStart || '';
                                  const [, currentMinute] = currentTime.split(':');
                                  const isSelected = currentMinute === minute;
                                  
                                  return (
                                    <div 
                                      key={minute} 
                                      className="time-option"
                                      onClick={() => this.handleMinuteSelect(minute)}
                                      style={{
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        margin: '1px 0',
                                        textAlign: 'center',
                                        fontSize: '0.85rem',
                                        background: isSelected ? '#e0e7ff' : 'transparent',
                                        color: isSelected ? '#3730a3' : '#333',
                                        fontWeight: isSelected ? '600' : '400',
                                        width: '42px'
                                      }}
                                      onMouseEnter={e => {
                                        if (!isSelected) e.target.style.background = '#f5f5f5';
                                      }}
                                      onMouseLeave={e => {
                                        if (!isSelected) e.target.style.background = 'transparent';
                                      }}
                                    >
                                      {minute}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <span style={{fontWeight: 600, margin: '0 4px', position: 'relative', zIndex: 1}}>-</span>
                    <div className="time-field-container-end" ref={this.setEndTimeDropdownRef} style={{position: 'relative', zIndex: 1000}}>
                      <input
                        className="themed-input"
                        type="text"
                        value={this.state.localEvent.TimeEnd || ''}
                        onChange={e => this.handleFieldChange('TimeEnd', e.target.value)}
                        onFocus={this.toggleEndTimeDropdown}
                        style={{ border: 'none', borderBottom: '2px solid #4f46e5', borderRadius: 0, color: '#222', width: '75px', minWidth: '75px', fontWeight: 400, background: 'transparent', outline: 'none', padding: '4px 8px 4px 0', caretColor: '#4f46e5', position: 'relative', zIndex: 1 }}
                        placeholder="End"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      {this.state.showEndTimeDropdown && (
                        <div style={{
                          position: 'fixed',
                          top: this.endTimeDropdownRef ? this.getDropdownPosition(this.endTimeDropdownRef.querySelector('input')).top : 'auto',
                          left: this.endTimeDropdownRef ? this.getDropdownPosition(this.endTimeDropdownRef.querySelector('input')).left : 'auto',
                          zIndex: 9996,
                          background: 'white',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                          padding: '8px'
                        }}>
                          <div className="time-columns" style={{display: 'flex', gap: '8px'}}>
                            <div className="time-column" style={{width: '50px'}}>
                              <div className="time-column-header" style={{fontWeight: 'bold', textAlign: 'center', padding: '4px', borderBottom: '1px solid #eee', marginBottom: '4px', fontSize: '0.85rem'}}>Hour</div>
                              <div className="time-options" style={{maxHeight: '200px', overflowY: 'auto', padding: '2px', width: '50px'}} ref={this.setEndHourListRef}>
                                {Array.from({length: 24}, (_, i) => {
                                  const hour = i.toString().padStart(2, '0');
                                  const currentTime = this.state.localEvent.TimeEnd || '';
                                  const [currentHour] = currentTime.split(':');
                                  const isSelected = currentHour === hour;
                                  
                                  return (
                                    <div 
                                      key={hour} 
                                      className="time-option"
                                      onClick={() => this.handleEndHourSelect(hour)}
                                      style={{
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        margin: '1px 0',
                                        textAlign: 'center',
                                        fontSize: '0.85rem',
                                        background: isSelected ? '#e0e7ff' : 'transparent',
                                        color: isSelected ? '#3730a3' : '#333',
                                        fontWeight: isSelected ? '600' : '400',
                                        width: '42px'
                                      }}
                                      onMouseEnter={e => {
                                        if (!isSelected) e.target.style.background = '#f5f5f5';
                                      }}
                                      onMouseLeave={e => {
                                        if (!isSelected) e.target.style.background = 'transparent';
                                      }}
                                    >
                                      {hour}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="time-column" style={{width: '50px'}}>
                              <div className="time-column-header" style={{fontWeight: 'bold', textAlign: 'center', padding: '4px', borderBottom: '1px solid #eee', marginBottom: '4px', fontSize: '0.85rem'}}>Min</div>
                              <div className="time-options" style={{maxHeight: '200px', overflowY: 'auto', padding: '2px', width: '50px'}} ref={this.setEndMinuteListRef}>
                                {Array.from({length: 60}, (_, i) => {
                                  const minute = i.toString().padStart(2, '0');
                                  const currentTime = this.state.localEvent.TimeEnd || '';
                                  const [, currentMinute] = currentTime.split(':');
                                  const isSelected = currentMinute === minute;
                                  
                                  return (
                                    <div 
                                      key={minute} 
                                      className="time-option"
                                      onClick={() => this.handleEndMinuteSelect(minute)}
                                      style={{
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        margin: '1px 0',
                                        textAlign: 'center',
                                        fontSize: '0.85rem',
                                        background: isSelected ? '#e0e7ff' : 'transparent',
                                        color: isSelected ? '#3730a3' : '#333',
                                        fontWeight: isSelected ? '600' : '400',
                                        width: '42px'
                                      }}
                                      onMouseEnter={e => {
                                        if (!isSelected) e.target.style.background = '#f5f5f5';
                                      }}
                                      onMouseLeave={e => {
                                        if (!isSelected) e.target.style.background = 'transparent';
                                      }}
                                    >
                                      {minute}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <>
                <div className="upcoming-event-meta">{event.Date} &bull; {event.Time}</div>
                {/* Organizer removed from display mode */}
              </>
            )}
            {(expanded && !editing) && (
              <div className="upcoming-event-participants-list">
                <div className="participants-list-scroll">
                  <ParticipantList
                    eventId={event._id}
                    participants={event.Participants}
                  />
                </div>
              </div>
            )}
          </div>
          {/* Footer */}
          {editing && (
            <div className="card-footer-btn-row" style={{display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px'}}>
              <button 
                className="card-cancel-btn themed-btn themed-btn-outline"
                style={{padding: '0 16px', height: 32, borderRadius: 6, border: '1.5px solid var(--theme-accent, #4f46e5)', color: 'var(--theme-accent, #4f46e5)', background: 'transparent', fontWeight: 500, fontSize: '1em', transition: 'background 0.2s, color 0.2s'}}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--theme-accent, #4f46e5)'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--theme-accent, #4f46e5)'; }}
                onClick={() => {
                    this.saveEventUpdate(this.state.localEvent._id, 'cancel', this.state.localEvent);
                }}
              >Cancel</button>
              <button 
                className="card-save-btn themed-btn themed-btn-accent"
                style={{padding: '0 16px', height: 32, borderRadius: 6, background: 'var(--theme-accent, #4f46e5)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '1em', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', transition: 'background 0.2s'}}
                onMouseOver={e => { e.currentTarget.style.background = '#3730a3'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'var(--theme-accent, #4f46e5)'; }}
                onClick={() => {
                    this.saveEventUpdate(this.state.localEvent._id, 'save', this.state.localEvent);
                }}
              >Save</button>
            </div>
          )}
        </div>
      );
    }
  }

  export default UpcomingEventCard;
