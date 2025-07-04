import React, { Component } from 'react';
import './UpcomingEvents.css';
import axios from 'axios';

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
      isWWFVolunteer
    };
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
    this.setState({ numEvents: value, events, hasInteracted: true });
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
          Type: '',
          Organizer: this.state.isWWFVolunteer ? 'Volunteer-led' : '',
          Location: '',
          Date: '',
          TimeStart: DEFAULT_TIME_START,
          TimeEnd: DEFAULT_TIME_END
        }
      ];
      return {
        numEvents: String(events.length),
        events
      };
    });
  };

  handleRemoveRow = (idx) => {
    this.setState(prevState => {
      const events = prevState.events.filter((_, i) => i !== idx);
      return {
        numEvents: String(events.length),
        events
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

  render() {
    const { onClose } = this.props;
    return (
      <div className="modal-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div className="modal-content" style={{
          background: '#fff',
          borderRadius: 10,
          padding: 0,
          minWidth: 340,
          minHeight: 180,
          boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '24px 32px 12px 32px',
            borderBottom: '1px solid #f0f0f0',
            fontWeight: 700,
            fontSize: 22,
            color: '#222',
            letterSpacing: 0.5
          }}>
            Add New Event(s)
          </div>
          {/* Form Body */}
          <div style={{
            flex: 1,
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ color: '#222', fontSize: 17 }}>
              How many events would you like to add?
            </div>
            <input
              type="text"
              className="themed-input"
              style={{
                width: '100%',
                fontSize: 18,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1.5px solid #22c55e',
                outline: 'none',
                marginBottom: 0
              }}
              placeholder="e.g. 1"
              value={this.state.numEvents}
              onChange={this.handleChange}
              autoFocus
            />
            {/* Show table if user has interacted or if there are any event rows */}
            {(this.state.hasInteracted || this.state.events.length > 0) && (
              <div style={{ overflowX: 'auto', marginTop: 18, maxHeight: 320, position: 'relative' }}>
                <table className="themed-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <tr className="themed-table-header">
                      <th className="themed-table-th">Type</th>
                      <th className="themed-table-th">Organizer</th>
                      <th className="themed-table-th">Location</th>
                      <th className="themed-table-th">Date</th>
                      <th className="themed-table-th">Time</th>
                      <th className="themed-table-th">Action</th>
                    </tr>
                  </thead>
                  <tbody style={{ overflowY: 'auto' }}>
                    {this.state.events.length === 0 && !this.state.numEvents ? (
                      <tr><td colSpan={6} className="themed-table-empty">No events to add.</td></tr>
                    ) : (
                      this.state.events.map((ev, idx) => (
                        <tr key={idx} className="themed-table-row">
                          <td className="themed-table-td">
                            <input
                              type="text"
                              className="themed-input"
                              style={{ width: '100%' }}
                              value={ev.Type}
                              disabled
                            />
                          </td>
                          <td className="themed-table-td">
                            <input
                              type="text"
                              className="themed-input"
                              style={{ width: '100%' }}
                              list={this.state.isWWFVolunteer ? undefined : `organizer-options-${idx}`}
                              value={ev.Organizer}
                              onChange={e => this.handleEventFieldChange(idx, 'Organizer', e.target.value)}
                              placeholder="Select Organizer"
                              readOnly={this.state.isWWFVolunteer}
                              disabled={this.state.isWWFVolunteer}
                            />
                            {!this.state.isWWFVolunteer && (
                              <datalist id={`organizer-options-${idx}`}>
                                {ORGANIZER_OPTIONS.map(opt => (
                                  <option key={opt} value={opt} />
                                ))}
                              </datalist>
                            )}
                          </td>
                          <td className="themed-table-td">
                            <input
                              type="text"
                              className="themed-input"
                              style={{ width: '100%' }}
                              value={ev.Location}
                              onChange={e => this.handleEventFieldChange(idx, 'Location', e.target.value)}
                              placeholder="e.g. TBC"
                            />
                          </td>
                          <td className="themed-table-td" style={{ position: 'relative', zIndex: 1 }}>
                            <input
                              type="date"
                              className="themed-input-date"
                              style={{ width: '100%', position: 'relative', zIndex: 2 }}
                              value={this.formatDateForInput(ev.Date)}
                              onChange={e => this.handleDateChange(idx, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              onFocus={e => e.stopPropagation()}
                              placeholder="DD/MM/YYYY"
                              key={`date-${idx}`}
                            />
                          </td>
                          <td className="themed-table-td" style={{ minWidth: 210, position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative', zIndex: 2 }}>
                              <input
                                type="time"
                                className="themed-input-time"
                                key={`time-start-${idx}`}
                                value={ev.TimeStart}
                                onChange={e => this.handleEventFieldChange(idx, 'TimeStart', e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onFocus={e => e.stopPropagation()}
                                placeholder="Start"
                                style={{ position: 'relative', zIndex: 3 }}
                              />
                              <span style={{ fontWeight: 600, margin: '0 4px' }}>-</span>
                              <input
                                type="time"
                                className="themed-input-time"
                                key={`time-end-${idx}`}
                                value={ev.TimeEnd}
                                onChange={e => this.handleEventFieldChange(idx, 'TimeEnd', e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onFocus={e => e.stopPropagation()}
                                placeholder="End"
                                style={{ position: 'relative', zIndex: 3 }}
                              />
                            </div>
                          </td>
                          <td className="themed-table-td" style={{ minWidth: 90, textAlign: 'center' }}>
                            <button
                              type="button"
                              className="themed-btn themed-btn-outline"
                              style={{ minWidth: 32, padding: '2px 8px', fontWeight: 700, fontSize: 18, marginRight: 4 }}
                              onClick={this.handleAddRow}
                              tabIndex={-1}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              className="themed-btn themed-btn-outline"
                              style={{ minWidth: 32, padding: '2px 8px', fontWeight: 700, fontSize: 18 }}
                              onClick={() => this.handleRemoveRow(idx)}
                              tabIndex={-1}
                              disabled={this.state.events.length <= 1}
                            >
                              -
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Footer */}
          <div style={{
            padding: '16px 32px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12
          }}>
            <button
              className="themed-btn themed-btn-green"
              style={{ minWidth: 90, borderRadius: 6, fontWeight: 600 }}
              onClick={this.handleCancel}
            >
              Cancel
            </button>
            <button
              className="themed-btn themed-btn-green"
              style={{ minWidth: 90, borderRadius: 6, fontWeight: 600 }}
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
