import React, { Component } from 'react';
import './UpcomingEvents.css';
import UpcomingEventCard from './UpcomingEventCard';
import axios from 'axios';
import tokenService from '../../../utils/tokenService';
import AddEventModal from './AddEventModal';

// Helper to group events by organizer type and remove duplicates
function groupByOrganizer(events) {
  // First, remove duplicate events based on _id
  const uniqueEvents = events.filter((event, index, self) => 
    index === self.findIndex(e => String(e._id) === String(event._id))
  );
  
  console.log('Original events count:', events.length);
  console.log('Unique events count:', uniqueEvents.length);
  
  return uniqueEvents.reduce((acc, event) => {
    const key = event.Organizer || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});
}

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

class UpcomingEvents extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showAddEventModal: false,
    };
  }

  handleToggle = (eventId) => {
    // Remove centralized toggle handling - let each card manage its own state
  };

  handleUpdate = (eventId, action, updatedEvent) => {
    // Dummy function for compatibility - cards should manage their own state
    if (action === 'delete' && this.props.onRefreshEvents) {
      this.props.onRefreshEvents();
    }
  };

  handleAfterSave = () => {
    // Example: fetch events again or update state
    if (this.props.onRefreshEvents) {
      this.props.onRefreshEvents();
    }
    this.setState({ showAddEventModal: false });
  };

  render() {
    const { events, highlightFirstGreen } = this.props;
    const grouped = groupByOrganizer(events);
    // Always show both sections, even if empty
    if (!grouped["WWF-led"]) grouped["WWF-led"] = [];
    if (!grouped["Volunteer-led"]) grouped["Volunteer-led"] = [];
    const organizerTypes = ["WWF-led", "Volunteer-led"];
    return (
      <div className="upcoming-organizer-sections" style={{ position: 'relative' }}>
        <button
          className="themed-btn themed-btn-green"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            margin: '12px 16px',
            zIndex: 2
          }}
          onClick={() => this.setState({ showAddEventModal: true })}
        >
          Add New Event(s)
        </button>
        {this.state.showAddEventModal && (
          <AddEventModal
            onClose={() => this.setState({ showAddEventModal: false })}
            onSave={this.handleAfterSave}
          />
        )}
        {events.length === 0 ? (
          <div className="no-events">No upcoming events.</div>
        ) : (
          organizerTypes.map((orgType, colIdx) => (
            <div className="organizer-section" key={orgType}>
              <div className={`organizer-section-title ${orgType === 'WWF-led' ? 'wwf' : orgType === 'Volunteer-led' ? 'volunteer' : 'other'}`}>{orgType}</div>
              <div className="upcoming-events-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 32,
                background: 'none',
                padding: 0
              }}>
                {grouped[orgType].map((event, idx) => {
                  // Generate a unique key for React rendering
                  const eventKey = event._id ? String(event._id) : `event-${orgType}-${idx}`;
                  console.log(`Rendering event ${idx} with key:`, eventKey, 'Event ID:', event._id);
                  
                  return (
                    <UpcomingEventCard
                      key={eventKey}
                      event={event}
                      expanded={false}
                      editing={false}
                      newParticipants={[]}
                      onToggle={this.handleToggle}
                      onUpdate={this.handleUpdate}
                      onRefreshEvents={this.props.onRefreshEvents}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }
}

export default UpcomingEvents;
