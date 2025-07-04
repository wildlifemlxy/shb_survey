import React, { Component } from 'react';
import './UpcomingEvents.css';
import UpcomingEventCard from './UpcomingEventCard';
import axios from 'axios';
import AddEventModal from './AddEventModal';

// Helper to group events by organizer type
function groupByOrganizer(events) {
  return events.reduce((acc, event) => {
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
      expanded: {},
      editing: {},
      updated: {},
      localParticipants: {},
      newParticipants: {} // eventId: ["", ...]
    };
  }

  handleToggle = (eventId) => {
    this.setState((prevState) => ({
      expanded: {
        ...prevState.expanded,
        [eventId]: !prevState.expanded[eventId]
      },
      editing: {
        ...prevState.editing,
        [eventId]: false
      }
    }));
  };

  handleAddRow = (eventId) => {
    this.setState((prevState) => ({
      expanded: {
        ...prevState.expanded,
        [eventId]: true
      },
      editing: {
        ...prevState.editing,
        [eventId]: true
      },
      newParticipants: {
        ...prevState.newParticipants,
        [eventId]: prevState.newParticipants[eventId]
          ? [...prevState.newParticipants[eventId], ""]
          : [""]
      }
    }));
  };

  handleInputChange = (eventId, idx, e) => {
    const value = e.target.value;
    this.setState(prevState => {
      const arr = prevState.newParticipants[eventId] ? [...prevState.newParticipants[eventId]] : [];
      arr[idx] = value;
      return {
        newParticipants: {
          ...prevState.newParticipants,
          [eventId]: arr
        }
      };
    });
  };

  handleInputBlur = (eventId) => {
    // Do not set editing[eventId] to false on blur
    // Optionally, you can keep this empty or handle other logic if needed
  };

  handleInputKeyDown = (eventId, idx, e) => {
    if (e.key === 'Enter') {
      this.setState(prevState => {
        const arr = prevState.newParticipants[eventId] ? [...prevState.newParticipants[eventId]] : [];
        // Only add a new row if current is not empty
        if (arr[idx] && arr[idx].trim() !== "") {
          arr.push("");
        }
        return {
          newParticipants: {
            ...prevState.newParticipants,
            [eventId]: arr
          },
          editing: { ...prevState.editing, [eventId]: true } // Always keep editing true
        };
      });
      e.preventDefault();
    }
  };

  // Clear localParticipants override if parent updates
  static getDerivedStateFromProps(nextProps, prevState) {
    const newState = { ...prevState };
    nextProps.events.forEach(ev => {
      if (
        prevState.localParticipants[ev._id] &&
        prevState.localParticipants[ev._id].length === ev.Participants.length
      ) {
        // If parent has updated, clear local override
        newState.localParticipants[ev._id] = undefined;
      }
    });
    return newState;
  }

  handleRemoveParticipant = (eventId, i) => {
    const event = this.props.events.find(ev => ev._id === eventId);
    const currentList = this.state.localParticipants[eventId] || event.Participants || [];
    const newList = currentList.filter((_, idx) => idx !== i);
    this.setState(prevState => ({
      updated: { ...prevState.updated, [eventId]: true },
      expanded: { ...prevState.expanded, [eventId]: true },
      localParticipants: { ...prevState.localParticipants, [eventId]: newList }
    }));
    this.props.onParticipantsChange && this.props.onParticipantsChange(eventId, newList);
  };

  handleUpdate = async (eventId, action, updatedEvent) => {
    try {
      if (action === 'card-edit') {
        this.setState(prevState => ({
          editing: { ...prevState.editing, [eventId]: true }
        }));
        return;
      }
      if (action === 'cancel') {
        this.setState(prevState => ({
          editing: { ...prevState.editing, [eventId]: false },
          newParticipants: { ...prevState.newParticipants, [eventId]: [] },
          localParticipants: { ...prevState.localParticipants, [eventId]: undefined }
        }));
        return;
      }
      if (action === 'save') {
        console.log('Saving participants for event:', eventId, updatedEvent);
        // Post updated event to backend, then update parent and local state
        if (updatedEvent) {
          const result = await axios.post(`${BASE_URL}/events`, {
            purpose: 'updateEvent',
            eventId: eventId,
            ...updatedEvent
          });
          if (result.data.success) {
            // Only update editing state, do not use componentDidMount or socket here
            this.setState(prevState => ({
              editing: { ...prevState.editing, [eventId]: false },
            }));
            return;
          }
        }
      }
      if (action === 'delete') {
        console.log('Deleting event:', eventId);
        // Confirm deletion with user

          const result = await axios.post(`${BASE_URL}/events`, {
            purpose: 'deleteEvent',
            eventId: eventId
          });
          if (result.data.success) {
            console.log('Event deleted successfully');
            // Refresh events list
            if (this.props.onRefreshEvents) {
              this.props.onRefreshEvents();
            }
            return;
          } else {
            console.error('Failed to delete event:', result.data.message);
          }
      }
    } catch (error) {
      console.error('Failed to update/delete event:', error);
      if (action === 'delete') {
        alert('Failed to delete event. Please try again.');
      }
    }
  }

  handleAfterSave = () => {
  // Example: fetch events again or update state
  if (this.props.onRefreshEvents) {
    this.props.onRefreshEvents();
  }
  this.setState({ showAddEventModal: false });
};

  render() {
    const { events, highlightFirstGreen } = this.props;
    const { expanded, editing, localParticipants } = this.state;
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
                  const participants = localParticipants[event._id] || event.Participants;
                  return (
                    <UpcomingEventCard
                      key={event._id}
                      event={{ ...event, Participants: participants }}
                      expanded={expanded[event._id]}
                      editing={editing[event._id]}
                      newParticipants={this.state.newParticipants[event._id] || []}
                      onToggle={this.handleToggle}
                      onAddRow={() => this.handleAddRow(event._id)}
                      onUpdate={this.handleUpdate}
                      updated={this.state.updated[event._id]}
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
