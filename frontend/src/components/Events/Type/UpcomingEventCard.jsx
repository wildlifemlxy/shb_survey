import React, { Component } from 'react';
import './UpcomingEvents.css';
import ParticipantList from './ParticipantList';
import axios from 'axios';

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
      user: JSON.parse(localStorage.getItem('user'))
    };
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
        <div style={{flex: 1, padding: '8px 16px 0 16px', overflowY: 'auto', maxHeight: editing ? '240px' : 'auto'}}>
          {editing ? (
            <form className="upcoming-event-edit-form" autoComplete="off" style={{display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1}} onSubmit={e => { e.preventDefault(); onUpdate(event._id, 'save'); }}>
              {/* All rows horizontal: label and textbox */}
              <div className="form-row" style={{display: 'flex', alignItems: 'center', gap: 8, position: 'relative'}}>
                <label className="upcoming-event-label" htmlFor={`location-${event._id}`} style={{marginRight: 8, minWidth: '70px', fontSize: '0.9rem'}}>Location:</label>
                <input
                  id={`location-${event._id}`}
                  className="themed-input"
                  type="text"
                  value={this.state.localEvent.Location || ''}
                  onChange={e => this.handleFieldChange('Location', e.target.value)}
                  onFocus={e => this.handleInputFocus('text', e)}
                  style={{ border: 'none', borderBottom: '2px solid #4f46e5', borderRadius: 0, color: '#222', width: '160px', minWidth: '140px', fontWeight: 400, background: 'transparent', outline: 'none', padding: '4px 8px 4px 0', caretColor: '#4f46e5', position: 'relative', zIndex: 10 }}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="form-row" style={{display: 'flex', alignItems: 'center', gap: 8, position: 'relative'}}>
                <label className="upcoming-event-label" htmlFor={`date-${event._id}`} style={{marginRight: 8, minWidth: '70px', fontSize: '0.9rem'}}>Date:</label>
                <input
                  id={`date-${event._id}`}
                  className="themed-input-date"
                  type="date"
                  value={this.formatDateForInput(this.state.localEvent.Date || '')}
                  onChange={e => this.handleFieldChange('Date', this.formatDateForDisplay(e.target.value))}
                  onFocus={e => this.handleInputFocus('date', e)}
                  style={{ width: '140px', minWidth: '130px', position: 'relative', zIndex: 10 }}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="form-row" style={{display: 'flex', alignItems: 'center', gap: 8, position: 'relative'}}>
                <label className="upcoming-event-label" htmlFor={`time-start-${event._id}`} style={{marginRight: 8, minWidth: '50px', fontSize: '0.9rem'}}>Time:</label>
                <input
                  id={`time-start-${event._id}`}
                  className="themed-input-time"
                  type="time"
                  placeholder="Start"
                  value={this.state.localEvent.TimeStart || ''}
                  onChange={e => this.handleFieldChange('TimeStart', e.target.value)}
                  onFocus={e => this.handleInputFocus('time', e)}
                  style={{ width: '75px', minWidth: '75px', position: 'relative', zIndex: 5 }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <span style={{fontWeight: 600, margin: '0 4px', position: 'relative', zIndex: 1}}>-</span>
                <input
                  id={`time-end-${event._id}`}
                  className="themed-input-time"
                  type="time"
                  placeholder="End"
                  value={this.state.localEvent.TimeEnd || ''}
                  onChange={e => this.handleFieldChange('TimeEnd', e.target.value)}
                  onFocus={e => this.handleInputFocus('time', e)}
                  style={{ width: '75px', minWidth: '75px', position: 'relative', zIndex: 5 }}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </form>
          ) : (
            <>
              <div className="upcoming-event-meta">{event.Date} &bull; {event.Time}</div>
              {/* Organizer removed from display mode */}
            </>
          )}
          {(expanded) && (
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
