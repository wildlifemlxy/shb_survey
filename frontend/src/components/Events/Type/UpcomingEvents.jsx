import React, { Component } from 'react';
import './UpcomingEvents.css';
import UpcomingEventCard from './UpcomingEventCard';
import axios from 'axios';
import tokenService from '../../../utils/tokenService';
import AddEventModal from './AddEventModal';
import { deleteEvents, updateEvents, updateParticipants } from '../../../data/surveyData';

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

// Helper to get year from date string
function getYear(dateStr) {
  if (!dateStr) return '';
  
  // Handle dd/mm/yyyy format (e.g., 26/06/2025)
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (year) return year.toString();
  }
  
  // Handle other formats (existing logic)
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.getFullYear().toString();
}

// Helper to get month from date string
function getMonth(dateStr) {
  if (!dateStr) return '';
  
  // Handle dd/mm/yyyy format (e.g., 26/06/2025)
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (day && month && year) {
      // month is 1-based in dd/mm/yyyy format, so subtract 1 for JS Date
      const date = new Date(year, month - 1, day);
      if (!isNaN(date)) {
        return date.toLocaleString('default', { month: 'short' });
      }
    }
  }
  
  // Handle other formats (existing logic)
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleString('default', { month: 'short' });
}

// Helper to get full month name with year from date string
function getMonthYear(dateStr) {
  if (!dateStr) return '';
  
  // Handle dd/mm/yyyy format (e.g., 26/06/2025)
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (day && month && year) {
      // month is 1-based in dd/mm/yyyy format, so subtract 1 for JS Date
      const date = new Date(year, month - 1, day);
      if (!isNaN(date)) {
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
      }
    }
  }
  
  // Handle other formats (existing logic)
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
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
      viewMode: 'calendar', // 'list' or 'calendar' - default to calendar
      showEventPopup: false,
      selectedDateEvents: [],
      popupPosition: { x: 0, y: 0 },
      editingEventId: null, // Track which event is being edited
      editingParticipants: {} // Track participants being edited for each event
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

  toggleViewMode = () => {
    this.setState(prevState => ({
      viewMode: prevState.viewMode === 'list' ? 'calendar' : 'list'
    }));
  };

  handleDayClick = (day, event, eventsForDay) => {
    const rect = event.target.getBoundingClientRect();
    this.setState({
      showEventPopup: true,
      selectedDateEvents: eventsForDay,
      popupPosition: {
        x: rect.left + rect.width / 2,
        y: rect.bottom + window.scrollY
      }
    });
  };

  closeEventPopup = () => {
    this.setState({
      showEventPopup: false,
      selectedDateEvents: [],
      popupPosition: { x: 0, y: 0 }
    });
  };

  handleEditEvent = (event) => {
    // Enable editing mode for this specific event
    this.setState({ editingEventId: event._id });
  };

  handleSaveEvent = async (event) => {
    try {
      const result = await updateEvents(event._id, event);
      
      if (result.success) {
        alert('Event updated successfully');
        this.setState({ editingEventId: null });
        // Refresh events to show updated data
        if (this.props.onRefreshEvents) {
          this.props.onRefreshEvents();
        }
        // Update the popup with new data
        const updatedEvents = this.state.selectedDateEvents.map(e => 
          e._id === event._id ? { ...event } : e
        );
        this.setState({ selectedDateEvents: updatedEvents });
      } else {
        alert(`Failed to save event: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    }
  };

  handleCancelEdit = () => {
    this.setState({ editingEventId: null });
    // Refresh the popup data to reset any unsaved changes
    if (this.props.onRefreshEvents) {
      this.props.onRefreshEvents();
    }
  };

  handleDeleteEvent = async (event) => {
    if (!window.confirm(`Are you sure you want to delete the event with ID "${event._id || 'Unknown ID'}"?`)) {
      return;
    }

    try {
      const result = await deleteEvents(event._id);
      
      if (result.success) {
        alert('Event deleted successfully');
        // Close popup and refresh events
        this.closeEventPopup();
        if (this.props.onRefreshEvents) {
          this.props.onRefreshEvents();
        }
      } else {
        alert(`Failed to delete event: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  handleJoinEvent = async (event) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!user.name) {
        alert('Please log in to join events');
        return;
      }

      // Add current user to participants
      const updatedParticipants = [...(event.Participants || []), user.name];
      
      const result = await updateParticipants(event._id, updatedParticipants);

      if (result.success) {
        alert('Successfully joined the event!');
        // Refresh events to show updated participation
        if (this.props.onRefreshEvents) {
          this.props.onRefreshEvents();
        }
        // Update the popup with new data
        const updatedEvents = this.state.selectedDateEvents.map(e => 
          e._id === event._id ? { ...e, Participants: updatedParticipants } : e
        );
        this.setState({ selectedDateEvents: updatedEvents });
      } else {
        alert(`Failed to join event: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error joining event:', error);
      alert('Failed to join event. Please try again.');
    }
  };

  // Helper function to get events for a specific day
  getEventsForDay = (day, events) => {
    return events.filter(ev => {
      const eventDate = this.parseEventDate(ev.Date);
      return eventDate && eventDate.getDate() === day;
    });
  };

  // Helper function to parse event date
  parseEventDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Handle dd/mm/yyyy format
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(Number);
      if (day && month && year) {
        return new Date(year, month - 1, day);
      }
    }
    
    // Handle other formats
    const date = new Date(dateStr);
    return isNaN(date) ? null : date;
  };

  // Helper function to check if user is participating in an event
  isUserParticipating = (event) => {
    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const participants = event.Participants || [];
    
    // Check by user name - adjust property names based on your data structure
    const currentUserName = currentUser.name || currentUser.username || currentUser.Name;
    
    if (!currentUserName) {
      return false;
    }
    
    // Check if current user name matches any participant name
    const isParticipating = participants.some(participant => {
      const participantName = participant.name || participant.Name || participant.username || participant;
      return participantName && participantName.toLowerCase() === currentUserName.toLowerCase();
    });
    
    return isParticipating;
  };

  // Generate calendar days for the selected month/year
  generateCalendarDays = (monthYear, events) => {
    if (!monthYear) return [];
    
    const [monthName, year] = monthYear.split(' ');
    const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
                       .indexOf(monthName);
    
    const firstDay = new Date(parseInt(year), monthIndex, 1);
    const lastDay = new Date(parseInt(year), monthIndex + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const current = new Date(startDate);
    
    // Generate 6 weeks (42 days) to fill the calendar grid
    for (let i = 0; i < 42; i++) {
      const day = current.getDate();
      const isCurrentMonth = current.getMonth() === monthIndex;
      const eventsForDay = isCurrentMonth ? this.getEventsForDay(day, events) : [];
      
      days.push({
        day,
        date: new Date(current),
        isCurrentMonth,
        eventsCount: eventsForDay.length,
        events: eventsForDay
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  render() {
    const { events, highlightFirstGreen } = this.props;
    
    const grouped = groupByOrganizer(events || []);
    // Always show both sections, even if empty
    if (!grouped["WWF-led"]) grouped["WWF-led"] = [];
    if (!grouped["Volunteer-led"]) grouped["Volunteer-led"] = [];
    const organizerTypes = ["WWF-led", "Volunteer-led"];
    
    const hasEvents = events && events.length > 0;
    
    return (
      <div className="upcoming-organizer-sections" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
        {/* Add Event Button - Always visible */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          paddingLeft: 16,
          paddingRight: 16,
          marginBottom: 10,
          width: '100%'
        }}>
          <button
            className="themed-btn themed-btn-green"
            onClick={() => this.setState({ showAddEventModal: true })}
            style={{
              padding: '12px 20px',
              backgroundColor: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
              transition: 'all 0.2s',
              minWidth: '140px',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#16a34a';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#22c55e';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Add New Event(s)
          </button>
        </div>

        {/* Only show view toggles and content if there are events */}
        {hasEvents && (
          <>
            {/* Header with View Toggle buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          marginBottom: 20,
          paddingLeft: 16,
          paddingRight: 16
        }}>
          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f3f4f6',
            borderRadius: 8,
            padding: 4
          }}>
            <button
              onClick={this.toggleViewMode}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s',
                backgroundColor: this.state.viewMode === 'list' ? '#fff' : 'transparent',
                color: this.state.viewMode === 'list' ? '#333' : '#666',
                boxShadow: this.state.viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              📋 List View
            </button>
            <button
              onClick={this.toggleViewMode}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s',
                backgroundColor: this.state.viewMode === 'calendar' ? '#fff' : 'transparent',
                color: this.state.viewMode === 'calendar' ? '#333' : '#666',
                boxShadow: this.state.viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              📅 Calendar View
            </button>
          </div>
        </div>

        {/* Content Area - List or Calendar View */}
        {this.state.viewMode === 'list' ? (
          /* List View - Events display */
          <div style={{ display: 'flex', flexDirection: 'row', gap: 32, width: '100%', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {organizerTypes.map((orgType, colIdx) => (
              <div className="organizer-section" key={orgType} style={{ minWidth: 320, flex: 1, maxWidth: '50%' }}>
                <div className={`organizer-section-title ${orgType === 'WWF-led' ? 'wwf' : orgType === 'Volunteer-led' ? 'volunteer' : 'other'}`}>{orgType}</div>
                <div className="upcoming-events-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 24
                }}>
                  {grouped[orgType].map((event, idx) => {
                    const eventKey = event._id ? String(event._id) : `event-${orgType}-${idx}`;
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
            ))}
          </div>
        ) : (
          /* Calendar View */
          <div style={{
            maxWidth: 2400,
            marginLeft: 0,
            marginRight: 'auto',
            paddingLeft: 10,
            paddingRight: 10
          }}>
            {(() => {
              // Get current month and year for calendar display
              const currentDate = new Date();
              const currentMonthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
              
              const calendarDays = this.generateCalendarDays(currentMonthYear, events);
              
              return (
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  padding: 16,
                  width: "1320px",
                  zIndex: 3000
                }}>
                  {/* Legend */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 16,
                    gap: 24,
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        backgroundColor: '#059669',
                        width: 20,
                        height: 12,
                        borderRadius: 3
                      }}></div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>WWF-led</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        backgroundColor: '#2563eb',
                        width: 20,
                        height: 12,
                        borderRadius: 3
                      }}></div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Volunteer-led</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        backgroundColor: '#dc2626',
                        width: 20,
                        height: 12,
                        borderRadius: 3
                      }}></div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Other</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, color: '#059669' }}>✓</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>You're participating</span>
                    </div>
                  </div>
                  {/* Calendar Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: 6,
                    marginBottom: 12
                  }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} style={{
                        textAlign: 'center',
                        fontWeight: 700,
                        color: '#666',
                        padding: '6px 0',
                        fontSize: 12
                      }}>
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Days */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: 4
                  }}>
                    {calendarDays.map((dayData, idx) => (
                      <div
                        key={idx}
                        onClick={(e) => dayData.eventsCount > 0 ? this.handleDayClick(dayData.day, e, dayData.events) : null}
                        style={{
                          height: 75,
                          border: '1px solid #e5e7eb',
                          borderRadius: 4,
                          padding: 4,
                          cursor: dayData.eventsCount > 0 ? 'pointer' : 'default',
                          backgroundColor: dayData.isCurrentMonth ? '#fff' : '#f9fafb',
                          opacity: dayData.isCurrentMonth ? 1 : 0.5,
                          position: 'relative',
                          transition: 'all 0.15s',
                          display: 'flex',
                          flexDirection: 'column',
                          ':hover': dayData.eventsCount > 0 ? {
                            backgroundColor: '#f3f4f6',
                            borderColor: '#22c55e'
                          } : {}
                        }}
                        onMouseEnter={(e) => {
                          if (dayData.eventsCount > 0) {
                            e.target.style.backgroundColor = '#f3f4f6';
                            e.target.style.borderColor = '#22c55e';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (dayData.eventsCount > 0) {
                            e.target.style.backgroundColor = dayData.isCurrentMonth ? '#fff' : '#f9fafb';
                            e.target.style.borderColor = '#e5e7eb';
                          }
                        }}
                      >
                        <div style={{
                          fontSize: 10,
                          fontWeight: dayData.eventsCount > 0 ? 600 : 400,
                          color: dayData.isCurrentMonth ? '#111' : '#9ca3af',
                          marginBottom: 2
                        }}>
                          {dayData.day}
                        </div>
                        
                        {/* Show individual event badges for multiple events */}
                        {dayData.events.length > 0 && (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            overflow: 'hidden',
                            flex: 1
                          }}>
                            {dayData.events.slice(0, 5).map((event, eventIdx) => {
                              const organizer = event.Organizer || 'Other';
                              const isParticipating = this.isUserParticipating(event);
                              let badgeColor = '#6b7280'; // Default gray
                              let badgeText = 'Event';
                              
                              if (organizer === 'WWF-led') {
                                badgeColor = '#059669'; // Green-600
                                badgeText = 'WWF-led';
                              } else if (organizer === 'Volunteer-led') {
                                badgeColor = '#2563eb'; // Blue-600
                                badgeText = 'Volunteer-led';
                              } else {
                                badgeColor = '#dc2626'; // Red-600
                                badgeText = organizer;
                              }
                              
                              return (
                                <div
                                  key={eventIdx}
                                  style={{
                                    backgroundColor: badgeColor,
                                    color: '#fff',
                                    borderRadius: 3,
                                    padding: '2px 4px',
                                    fontSize: 7,
                                    fontWeight: 700,
                                    lineHeight: 1.1,
                                    textAlign: 'center',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.025em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 2,
                                    position: 'relative',
                                    minHeight: '12px',
                                    width: 'fit-content',
                                    maxWidth: '100%',
                                    pointerEvents: 'none'
                                  }}
                                  title={`${badgeText}: ${event.Event || 'Event'}${isParticipating ? ' (You\'re participating)' : ''}`}
                                >
                                  <span style={{ 
                                    whiteSpace: 'nowrap',
                                    fontSize: '7px',
                                    fontWeight: 700
                                  }}>
                                    {badgeText}
                                  </span>
                                  {isParticipating && (
                                    <span style={{
                                      fontSize: 8,
                                      fontWeight: 900,
                                      color: '#fff',
                                      flexShrink: 0
                                    }}>✓</span>
                                  )}
                                </div>
                              );
                            })}
                            {dayData.events.length > 5 && (
                              <div style={{
                                backgroundColor: '#4b5563',
                                color: '#fff',
                                borderRadius: 3,
                                padding: '1px 3px',
                                fontSize: 7,
                                fontWeight: 700,
                                textAlign: 'center',
                                textTransform: 'uppercase',
                                letterSpacing: '0.025em'
                              }}>
                                +{dayData.events.length - 5} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        
        {/* End of conditional content */}
        </>
        )}

        {/* Add Event Modal */}
        {this.state.showAddEventModal && (
          <AddEventModal
            onClose={() => this.setState({ showAddEventModal: false })}
            onSave={this.handleAfterSave}
          />
        )}

        {/* Event Popup */}
        {this.state.showEventPopup && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={this.closeEventPopup}
          >
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: '24px 24px 24px 24px',
                paddingTop: '50px', // Extra space for close button
                maxWidth: 800,
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={this.closeEventPopup}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  fontSize: 16,
                  cursor: 'pointer',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  transition: 'all 0.15s',
                  '&:hover': {
                    backgroundColor: '#e5e7eb'
                  }
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
              >
                ×
              </button>
              
              <h3 style={{ marginBottom: 20, color: '#333', marginTop: 0 }}>
                Events for {this.state.selectedDateEvents[0] && this.parseEventDate(this.state.selectedDateEvents[0].Date)?.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: 20,
                maxHeight: '60vh',
                overflowY: 'auto'
              }}>
                {this.state.selectedDateEvents.map((event, idx) => {
                  const isEditing = this.state.editingEventId === event._id;
                  return (
                    <div
                      key={event._id || idx}
                      style={{
                        background: '#fff',
                        borderRadius: 8,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        padding: 16,
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                    >
                      {/* Event Details */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <h4 style={{ margin: 0, color: '#111', fontSize: 16, fontWeight: 600, flex: 1 }}>
                            {event.Event || 'Event'}
                          </h4>
                          
                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
                            {!isEditing && !this.isUserParticipating(event) &&  JSON.parse(localStorage.getItem('user')).role === "WWF-Volunteer" && (
                              <button
                                onClick={() => this.handleJoinEvent(event)}
                                style={{
                                  background: 'transparent',
                                  color: '#22c55e',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  fontSize: 11,
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#f0f9ff';
                                  e.target.style.color = '#16a34a';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.color = '#22c55e';
                                }}
                                title="Join Event"
                              >
                                ➕ Join
                              </button>
                            )}
                            {isEditing ? (
                              <>
                                <button
                                  onClick={this.handleCancelEdit}
                                  style={{
                                    background: '#6b7280',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    padding: '4px 8px',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    transition: 'all 0.15s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
                                  title="Cancel Edit"
                                >
                                  ❌ Cancel
                                </button>
                                <button
                                  onClick={() => this.handleSaveEvent(event)}
                                  style={{
                                    background: '#22c55e',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    padding: '4px 8px',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    transition: 'all 0.15s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#16a34a'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#22c55e'}
                                  title="Save Changes"
                                >
                                  💾 Save
                                </button>
                              </>
                            ) : (
                              <>
                                {(() => {
                                  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                  const isWWFVolunteer = currentUser.role === 'WWF-Volunteer' || currentUser.Role === 'WWF-Volunteer';
                                  const isWWFLed = event.Organizer === 'WWF-led';
                                  // WWF-Volunteers cannot edit WWF-led events (hide button)
                                  if (isWWFVolunteer && isWWFLed) {
                                    return null;
                                  } else {
                                    return (
                                      <button
                                        onClick={() => this.handleEditEvent(event)}
                                        style={{
                                          background: 'transparent',
                                          color: '#3b82f6',
                                          border: 'none',
                                          borderRadius: 4,
                                          padding: '4px 8px',
                                          fontSize: 11,
                                          cursor: 'pointer',
                                          fontWeight: 600,
                                          transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.backgroundColor = '#eff6ff';
                                          e.target.style.color = '#2563eb';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.backgroundColor = 'transparent';
                                          e.target.style.color = '#3b82f6';
                                        }}
                                        title="Edit Event"
                                      >
                                        ✏️ Edit
                                      </button>
                                    );
                                  }
                                })()}
                                <button
                                  onClick={() => this.handleDeleteEvent(event)}
                                  style={{
                                    background: 'transparent',
                                    color: '#ef4444',
                                    border: 'none',
                                    borderRadius: 4,
                                    padding: '4px 8px',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    transition: 'all 0.15s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#fef2f2';
                                    e.target.style.color = '#dc2626';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.color = '#ef4444';
                                  }}
                                  title="Delete Event"
                                >
                                  🗑️ Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>Location:</label>
                                <input
                                  type="text"
                                  value={event.Location || ''}
                                  onChange={(e) => {
                                    const updatedEvents = this.state.selectedDateEvents.map(ev => 
                                      ev._id === event._id ? { ...ev, Location: e.target.value } : ev
                                    );
                                    this.setState({ selectedDateEvents: updatedEvents });
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '4px 8px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 4,
                                    fontSize: 14
                                  }}
                                  placeholder="Event location"
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>Time:</label>
                                <input
                                  type="text"
                                  value={event.Time || ''}
                                  onChange={(e) => {
                                    const updatedEvents = this.state.selectedDateEvents.map(ev => 
                                      ev._id === event._id ? { ...ev, Time: e.target.value } : ev
                                    );
                                    this.setState({ selectedDateEvents: updatedEvents });
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '4px 8px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 4,
                                    fontSize: 14
                                  }}
                                  placeholder="Event time"
                                />
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>Organizer:</label>
                              {(() => {
                                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                const isWWFVolunteer = currentUser.role === 'WWF-Volunteer' || currentUser.Role === 'WWF-Volunteer';
                                if (isWWFVolunteer) {
                                  // WWF-Volunteers: show disabled textbox, default to Volunteer-led
                                  return (
                                    <input
                                      type="text"
                                      value={event.Organizer || 'Volunteer-led'}
                                      disabled
                                      style={{
                                        width: '100%',
                                        padding: '4px 8px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 4,
                                        fontSize: 14,
                                        backgroundColor: '#f3f4f6',
                                        color: '#9ca3af',
                                        cursor: 'not-allowed'
                                      }}
                                      placeholder="Organizer"
                                    />
                                  );
                                } else {
                                  // Non-WWF: show combo box with only Volunteer-led and WWF-led
                                  return (
                                    <select
                                      value={event.Organizer || ''}
                                      onChange={(e) => {
                                        const updatedEvents = this.state.selectedDateEvents.map(ev => 
                                          ev._id === event._id ? { ...ev, Organizer: e.target.value } : ev
                                        );
                                        this.setState({ selectedDateEvents: updatedEvents });
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '4px 8px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 4,
                                        fontSize: 14
                                      }}
                                    >
                                      <option value="">Select organizer</option>
                                      <option value="WWF-led">WWF-led</option>
                                      <option value="Volunteer-led">Volunteer-led</option>
                                    </select>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        ) : (
                          <>
                            <p style={{ margin: '4px 0', color: '#666', fontSize: 14 }}>
                              <strong>Location:</strong> {event.Location || 'TBD'}
                            </p>
                            <p style={{ margin: '4px 0', color: '#666', fontSize: 14 }}>
                              <strong>Date:</strong> {event.Date} • <strong>Time:</strong> {event.Time || 'TBD'}
                            </p>
                            <p style={{ margin: '4px 0', color: '#666', fontSize: 14 }}>
                              <strong>Organizer:</strong> {event.Organizer || 'TBD'}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Participants Section - Only show in view mode */}
                      {!isEditing && (
                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                          <h5 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: 14, fontWeight: 600 }}>
                            Participants ({(event.Participants || []).length})
                          </h5>
                          
                          {/* View Mode - Show participants list with add/remove functionality */}
                          <div>
                            {event.Participants && event.Participants.length > 0 ? (
                              <div style={{
                                maxHeight: '120px',
                                overflowY: 'auto',
                                border: '1px solid #e5e7eb',
                                borderRadius: 6,
                                padding: 8,
                                backgroundColor: '#f9fafb',
                                marginBottom: 8
                              }}>
                                {event.Participants.map((participant, pIdx) => {
                                  const participantName = participant.name || participant.Name || participant.username || participant;
                                  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                  const currentUserName = currentUser.name || currentUser.username || currentUser.Name;
                                  const isCurrentUser = participantName && currentUserName && 
                                    participantName.toLowerCase() === currentUserName.toLowerCase();
                                  
                                  return (
                                    <div
                                      key={pIdx}
                                      style={{
                                        padding: '4px 8px',
                                        marginBottom: 4,
                                        backgroundColor: isCurrentUser ? '#dcfce7' : '#fff',
                                        border: isCurrentUser ? '1px solid #22c55e' : '1px solid #e5e7eb',
                                        borderRadius: 4,
                                        fontSize: 12,
                                        color: isCurrentUser ? '#166534' : '#374151',
                                        fontWeight: isCurrentUser ? 600 : 400,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                      }}
                                    >
                                      {isCurrentUser && (
                                        <span style={{ color: '#059669', fontSize: 12 }}>✓</span>
                                      )}
                                      <span>{pIdx + 1}</span>
                                      <span>|</span>
                                      {(() => {
                                        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                        const isWWFVolunteer = currentUser.role === 'WWF-Volunteer' || currentUser.Role === 'WWF-Volunteer';
                                        
                                        if (isWWFVolunteer) {
                                          // WWF volunteers: non-clickable name
                                          return <span style={{ flex: 1 }}>{participantName}</span>;
                                        } else {
                                          // Non-WWF users: clickable name for editing
                                          return (
                                            <span 
                                              style={{ 
                                                flex: 1, 
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                color: '#3b82f6'
                                              }}
                                              onClick={async () => {
                                                const newName = prompt('Edit participant name:', participantName);
                                                if (newName && newName.trim() && newName.trim() !== participantName) {
                                                  // Update participant name and save to backend
                                                  const updatedParticipants = [...event.Participants];
                                                  updatedParticipants[pIdx] = newName.trim();
                                                  
                                                  try {
                                                    const result = await updateParticipants(event._id, updatedParticipants);
                                                    
                                                    if (result.success) {
                                                      // Update local state on success
                                                      const updatedEvents = this.state.selectedDateEvents.map(ev => 
                                                        ev._id === event._id ? { ...ev, Participants: updatedParticipants } : ev
                                                      );
                                                      this.setState({ selectedDateEvents: updatedEvents });
                                                      
                                                      // Refresh main events list
                                                      if (this.props.onRefreshEvents) {
                                                        this.props.onRefreshEvents();
                                                      }
                                                    } else {
                                                      alert(`Failed to update participant: ${result.message || 'Unknown error'}`);
                                                    }
                                                  } catch (error) {
                                                    console.error('Error updating participant:', error);
                                                    alert('Failed to update participant. Please try again.');
                                                  }
                                                }
                                              }}
                                              title="Click to edit participant name"
                                            >
                                              {participantName}
                                            </span>
                                          );
                                        }
                                      })()}
                                      {/* Role-based remove button permissions */}
                                      {(() => {
                                        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                        const isWWFVolunteer = currentUser.role === 'WWF-Volunteer' || currentUser.Role === 'WWF-Volunteer';
                                        const canRemove = !isWWFVolunteer || isCurrentUser; // Non-WWF can remove anyone, WWF can only remove themselves
                                        
                                        return canRemove ? (
                                          <button
                                            onClick={async () => {
                                              // Remove participant and update backend
                                              const updatedParticipants = event.Participants.filter((_, index) => index !== pIdx);
                                              
                                              try {
                                                const result = await updateParticipants(event._id, updatedParticipants);
                                                
                                                if (result.success) {
                                                  // Update local state on success
                                                  const updatedEvents = this.state.selectedDateEvents.map(ev => 
                                                    ev._id === event._id ? { ...ev, Participants: updatedParticipants } : ev
                                                  );
                                                  this.setState({ selectedDateEvents: updatedEvents });
                                                  
                                                  // Refresh main events list
                                                  if (this.props.onRefreshEvents) {
                                                    this.props.onRefreshEvents();
                                                  }
                                                } else {
                                                  alert(`Failed to remove participant: ${result.message || 'Unknown error'}`);
                                                }
                                              } catch (error) {
                                                console.error('Error removing participant:', error);
                                                alert('Failed to remove participant. Please try again.');
                                              }
                                            }}
                                            style={{
                                              background: '#ef4444',
                                              color: '#fff',
                                              border: 'none',
                                              borderRadius: '50%',
                                              width: 18,
                                              height: 18,
                                              fontSize: 10,
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                                            title={isWWFVolunteer ? "Remove your participation" : "Remove participant"}
                                          >
                                            −
                                          </button>
                                        ) : null;
                                      })()}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{
                                padding: '8px',
                                color: '#9ca3af',
                                fontSize: 12,
                                fontStyle: 'italic',
                                textAlign: 'center',
                                marginBottom: 8
                              }}>
                                No participants yet
                              </div>
                            )}
                            
                            {/* Add Participant Option in View Mode - Role-based permissions */}
                            {(() => {
                              const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                              const currentUserName = currentUser.name || currentUser.username || currentUser.Name;
                              const isWWFVolunteer = currentUser.role === 'WWF-Volunteer' || currentUser.Role === 'WWF-Volunteer';
                              const isAlreadyParticipating = (event.Participants || []).some(participant => {
                                const participantName = participant.name || participant.Name || participant.username || participant;
                                return participantName && currentUserName && 
                                  participantName.toLowerCase() === currentUserName.toLowerCase();
                              });
                              
                              if (isWWFVolunteer) {
                                // WWF Volunteers: Only show add option if user is not already participating
                                if (!isAlreadyParticipating && currentUserName) {
                                  return (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      padding: '6px 8px',
                                      backgroundColor: '#f0f9ff',
                                      border: '2px dashed #3b82f6',
                                      borderRadius: 4
                                    }}>
                                      <span style={{
                                        flex: 1,
                                        fontSize: 12,
                                        color: '#374151',
                                        fontStyle: 'italic'
                                      }}>
                                        Click + to add yourself: {currentUserName}
                                      </span>
                                      <button
                                        onClick={async () => {
                                          // Add current user as participant and update backend
                                          const updatedParticipants = [...(event.Participants || []), currentUserName];
                                          
                                          try {
                                            const result = await updateParticipants(event._id, updatedParticipants);
                                            
                                            if (result.success) {
                                              // Update local state on success
                                              const updatedEvents = this.state.selectedDateEvents.map(ev => 
                                                ev._id === event._id ? { ...ev, Participants: updatedParticipants } : ev
                                              );
                                              this.setState({ selectedDateEvents: updatedEvents });
                                              
                                              // Refresh main events list
                                              if (this.props.onRefreshEvents) {
                                                this.props.onRefreshEvents();
                                              }
                                            } else {
                                              alert(`Failed to add participant: ${result.message || 'Unknown error'}`);
                                            }
                                          } catch (error) {
                                            console.error('Error adding participant:', error);
                                            alert('Failed to add participant. Please try again.');
                                          }
                                        }}
                                        style={{
                                          background: '#22c55e',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '50%',
                                          width: 22,
                                          height: 22,
                                          fontSize: 12,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#16a34a'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#22c55e'}
                                        title="Add yourself to this event"
                                      >
                                        +
                                      </button>
                                    </div>
                                  );
                                }
                                return null;
                              } else {
                                // Non-WWF Users: Can add anyone
                                return (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 8px',
                                    backgroundColor: '#f0f9ff',
                                    border: '2px dashed #3b82f6',
                                    borderRadius: 4
                                  }}>
                                    <input
                                      type="text"
                                      placeholder="Enter participant name"
                                      style={{
                                        flex: 1,
                                        border: 'none',
                                        background: 'transparent',
                                        outline: 'none',
                                        fontSize: 13,
                                        color: '#374151'
                                      }}
                                      onKeyPress={async (e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                          // Add participant and update backend
                                          const newParticipant = e.target.value.trim();
                                          const updatedParticipants = [...(event.Participants || []), newParticipant];
                                          
                                          try {
                                            const result = await updateParticipants(event._id, updatedParticipants);
                                            
                                            if (result.success) {
                                              // Update local state on success
                                              const updatedEvents = this.state.selectedDateEvents.map(ev => 
                                                ev._id === event._id ? { ...ev, Participants: updatedParticipants } : ev
                                              );
                                              this.setState({ selectedDateEvents: updatedEvents });
                                              e.target.value = '';
                                              
                                              // Refresh main events list
                                              if (this.props.onRefreshEvents) {
                                                this.props.onRefreshEvents();
                                              }
                                            } else {
                                              alert(`Failed to add participant: ${result.message || 'Unknown error'}`);
                                            }
                                          } catch (error) {
                                            console.error('Error adding participant:', error);
                                            alert('Failed to add participant. Please try again.');
                                          }
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={async (e) => {
                                        const input = e.target.parentElement.querySelector('input');
                                        if (input && input.value.trim()) {
                                          // Add participant and update backend
                                          const newParticipant = input.value.trim();
                                          const updatedParticipants = [...(event.Participants || []), newParticipant];
                                          
                                          try {
                                            const result = await updateParticipants(event._id, updatedParticipants);
                                            
                                            if (result.success) {
                                              // Update local state on success
                                              const updatedEvents = this.state.selectedDateEvents.map(ev => 
                                                ev._id === event._id ? { ...ev, Participants: updatedParticipants } : ev
                                              );
                                              this.setState({ selectedDateEvents: updatedEvents });
                                              input.value = '';
                                              
                                              // Refresh main events list
                                              if (this.props.onRefreshEvents) {
                                                this.props.onRefreshEvents();
                                              }
                                            } else {
                                              alert(`Failed to add participant: ${result.message || 'Unknown error'}`);
                                            }
                                          } catch (error) {
                                            console.error('Error adding participant:', error);
                                            alert('Failed to add participant. Please try again.');
                                          }
                                        }
                                      }}
                                      style={{
                                        background: '#22c55e',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: 22,
                                        height: 22,
                                        fontSize: 12,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.15s'
                                      }}
                                      onMouseEnter={(e) => e.target.style.backgroundColor = '#16a34a'}
                                      onMouseLeave={(e) => e.target.style.backgroundColor = '#22c55e'}
                                      title="Add participant"
                                    >
                                      +
                                    </button>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default UpcomingEvents;
