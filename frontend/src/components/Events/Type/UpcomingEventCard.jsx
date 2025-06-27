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
    this.state = {
      localEvent: { ...props.event },
      editing: false
    };
  }

  componentDidMount() {
    if (window.socket) {
      this.socket = window.socket;
      this.socket.on('survey-updated', (data) => {
        if (data && data.event && data.event._id === this.props.event._id) {
          // Update local event state with the new event data from the server
          this.setState({ localEvent: { ...data.event }, editing: false });
          // Optionally notify parent
          if (typeof this.props.onUpdate === 'function') {
            this.props.onUpdate(data.event._id, 'save', data.event);
          }
        }
      });
    }
  }

  handleFieldChange = (field, value) => {
    this.setState(prev => ({
      localEvent: { ...prev.localEvent, [field]: value }
    }));
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
        this.props.onUpdate(id, 'save', eventData);
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

    return (
      <div className="upcoming-event-card" style={{position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 320}}>
        {/* Header */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 0 16px'}}>
          {!editing && (
            <div
              className="upcoming-event-title clickable"
              onClick={() => onToggle(event._id)}
              style={{ cursor: 'pointer' }}
            >
              <span className="upcoming-event-label">Location:</span> {event.Location}
            </div>
          )}
          {!editing && (
            <button
              className="card-update-btn themed-btn themed-btn-outline"
              style={{ padding: '0 14px', fontSize: '1em', height: 32, minWidth: 0, lineHeight: 1.2, borderRadius: 6, border: '1.5px solid var(--theme-accent, #4f46e5)', color: 'var(--theme-accent, #4f46e5)', background: 'transparent', transition: 'background 0.2s, color 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--theme-accent, #4f46e5)'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--theme-accent, #4f46e5)'; }}
              onClick={() => onUpdate(event._id, 'card-edit')}
            >
              Edit
            </button>
          )}
        </div>
        {/* Body */}
        <div style={{flex: 1, padding: '8px 16px 0 16px'}}>
          {editing ? (
            <form className="upcoming-event-edit-form" autoComplete="off" style={{display: 'flex', flexDirection: 'column', gap: 12}} onSubmit={e => { e.preventDefault(); onUpdate(event._id, 'save'); }}>
              {/* All rows horizontal: label and textbox */}
              <div className="form-row" style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <label className="upcoming-event-label" htmlFor={`location-${event._id}`} style={{marginRight: 8, minWidth: 80}}>Location:</label>
                <input
                  id={`location-${event._id}`}
                  className="themed-input"
                  type="text"
                  value={this.state.localEvent.Location || ''}
                  onChange={e => this.handleFieldChange('Location', e.target.value)}
                  style={{ border: 'none', borderBottom: '2px solid #4f46e5', borderRadius: 0, color: '#222', width: 240, minWidth: 180, fontWeight: 400, background: 'transparent', outline: 'none', padding: '4px 8px 4px 0', caretColor: '#4f46e5' }}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="form-row" style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <label className="upcoming-event-label" htmlFor={`date-${event._id}`} style={{marginRight: 8, minWidth: 80}}>Date:</label>
                <input
                  id={`date-${event._id}`}
                  className="themed-input"
                  type="text"
                  value={this.state.localEvent.Date || ''}
                  onChange={e => this.handleFieldChange('Date', e.target.value)}
                  style={{ border: 'none', borderBottom: '2px solid #4f46e5', borderRadius: 0, color: '#222', width: 240, minWidth: 180, background: 'transparent', outline: 'none', padding: '4px 8px 4px 0', caretColor: '#4f46e5' }}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="form-row" style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <label className="upcoming-event-label" htmlFor={`time-start-${event._id}`} style={{marginRight: 8, minWidth: 50}}>Time:</label>
                <input
                  id={`time-start-${event._id}`}
                  className="themed-input"
                  type="text"
                  placeholder="Start"
                  value={this.state.localEvent.TimeStart !== undefined && this.state.localEvent.TimeStart !== '' ? this.state.localEvent.TimeStart : (this.state.localEvent.Time ? this.state.localEvent.Time.split(' - ')[0] : '')}
                  onChange={e => this.handleFieldChange('TimeStart', e.target.value)}
                  style={{ border: 'none', borderBottom: '2px solid #4f46e5', borderRadius: 0, color: '#222', width: 100, minWidth: 100, background: 'transparent', outline: 'none', padding: '4px 8px 4px 0', caretColor: '#4f46e5' }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <span style={{fontWeight: 600, margin: '0 4px'}}>-</span>
                <input
                  id={`time-end-${event._id}`}
                  className="themed-input"
                  type="text"
                  placeholder="End"
                  value={this.state.localEvent.TimeEnd !== undefined && this.state.localEvent.TimeEnd !== '' ? this.state.localEvent.TimeEnd : (this.state.localEvent.Time ? this.state.localEvent.Time.split(' - ')[1] : '')}
                  onChange={e => this.handleFieldChange('TimeEnd', e.target.value)}
                  style={{ border: 'none', borderBottom: '2px solid #4f46e5', borderRadius: 0, color: '#222', width: 100, minWidth: 100, background: 'transparent', outline: 'none', padding: '4px 8px 4px 0', caretColor: '#4f46e5' }}
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
