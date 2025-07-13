import React, { Component } from 'react';
import './PastEvents.css';
import PastEventCard from './PastEventCard';

// Helper to group events by organizer type
function groupByOrganizer(events) {
  return events.reduce((acc, event) => {
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

class PastEvents extends Component {
  constructor(props) {
    super(props);
    const years = Array.from(
      new Set(props.events.map(ev => getYear(ev.Date)).filter(year => year))
    ).sort((a, b) => a - b); // Sort years in ascending order (oldest first)
    
    this.state = {
      selectedYear: '', // No year selected initially
      selectedMonth: '',
      viewMode: 'calendar', // 'list' or 'calendar' - default to calendar
      showEventPopup: false,
      selectedDateEvents: [],
      popupPosition: { x: 0, y: 0 }
    };
  }

  handleYearClick = (year) => {
    this.setState({ 
      selectedYear: year,
      selectedMonth: '' // Reset month when year changes
    });
  };

  handleMonthClick = (month) => {
    this.setState({ selectedMonth: month });
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
      console.log("No current user name found for participation check");
      return false;
    }
    
    // Debug logging
    console.log("Checking participation for:", currentUserName, "in event:", event.Event || event._id);
    console.log("Event participants:", participants);
    
    // Check if current user name matches any participant name
    const isParticipating = participants.some(participant => {
      const participantName = participant.name || participant.Name || participant.username || participant;
      const matches = participantName && participantName.toLowerCase() === currentUserName.toLowerCase();
      if (matches) {
        console.log("Found match:", participantName, "===", currentUserName);
      }
      return matches;
    });
    
    console.log("Participation result:", isParticipating);
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
    const { events } = this.props;
    if (!events.length) return <div className="no-events">No past events.</div>;

    // Get unique years
    const years = Array.from(
      new Set(events.map(ev => getYear(ev.Date)).filter(year => year))
    ).sort((a, b) => a - b); // Sort years in ascending order (oldest first)

    // Get unique months for the selected year
    const monthsInSelectedYear = this.state.selectedYear 
      ? Array.from(
          new Set(
            events
              .filter(ev => getYear(ev.Date) === this.state.selectedYear)
              .map(ev => getMonthYear(ev.Date)) // Use full month-year instead of just month
              .filter(monthYear => monthYear)
          )
        ).sort((a, b) => {
          // Sort months chronologically by converting back to date for comparison
          const getDateFromMonthYear = (monthYearStr) => {
            const [monthName, year] = monthYearStr.split(' ');
            const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December']
                               .indexOf(monthName);
            return new Date(parseInt(year), monthIndex);
          };
          return getDateFromMonthYear(a) - getDateFromMonthYear(b);
        })
      : [];

    const grouped = groupByOrganizer(events);
    // Define the order: WWF-led first, then Volunteer-led, then others
    const organizerOrder = ['WWF-led', 'Volunteer-led'];
    const organizerTypes = organizerOrder.filter(type => grouped[type]);
    // Add any other organizer types that aren't WWF-led or Volunteer-led
    Object.keys(grouped).forEach(type => {
      if (!organizerOrder.includes(type)) {
        organizerTypes.push(type);
      }
    });
    
    return (
      <div className="upcoming-organizer-sections" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
        {/* Year selection tabs */}
        {console.log("Current user name for participation check:", JSON.parse(localStorage.getItem('user') || '{}').name)}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 16,
            flexWrap: 'nowrap',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            maxWidth: 1200,
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingLeft: 32,
            paddingRight: 32,
            overflowX: 'auto',
            overflowY: 'hidden'
          }}
        >
          {years.map(year => (
            <button
              key={year}
              className={`themed-btn themed-btn-outline${this.state.selectedYear === year ? ' active' : ''}`}
              style={{
                padding: '10px 28px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 18,
                background: this.state.selectedYear === year ? '#3b82f6' : '#fff',
                color: this.state.selectedYear === year ? '#fff' : '#1e40af',
                border: '2.5px solid #3b82f6',
                cursor: 'pointer',
                marginBottom: 8,
                boxShadow: this.state.selectedYear === year ? '0 2px 8px #3b82f633' : '0 1px 4px #0001',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
              onClick={() => this.handleYearClick(year)}
            >
              {year}
            </button>
          ))}
        </div>

        {/* Month selection tabs (only show if year is selected) */}
        {this.state.selectedYear && monthsInSelectedYear.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 12,
              flexWrap: 'nowrap',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              maxWidth: 1200,
              marginLeft: 'auto',
              marginRight: 'auto',
              paddingLeft: 32,
              paddingRight: 32,
              overflowX: 'auto',
              overflowY: 'hidden'
            }}
          >
            {monthsInSelectedYear.map(monthYear => (
              <button
                key={monthYear}
                className={`themed-btn themed-btn-outline${this.state.selectedMonth === monthYear ? ' active' : ''}`}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 16,
                  background: this.state.selectedMonth === monthYear ? '#22c55e' : '#fff',
                  color: this.state.selectedMonth === monthYear ? '#fff' : '#166534',
                  border: '2px solid #22c55e',
                  cursor: 'pointer',
                  marginBottom: 8,
                  boxShadow: this.state.selectedMonth === monthYear ? '0 2px 8px #22c55e33' : '0 1px 4px #0001',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => this.handleMonthClick(monthYear)}
              >
                {monthYear}
              </button>
            ))}
          </div>
        )}

        {/* View Mode Toggle (only show when month is selected) */}
        {this.state.selectedYear && this.state.selectedMonth && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 20
          }}>
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
        )}

        {/* Content Area - List or Calendar View */}
        {this.state.selectedYear && this.state.selectedMonth && (
          <>
            {this.state.viewMode === 'list' ? (
              /* List View - Events display */
              <div style={{ display: 'flex', flexDirection: 'row', gap: 32, width: '100%', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {organizerTypes.map((orgType, colIdx) => {
                  const filteredEvents = grouped[orgType].filter(ev => {
                    const eventYear = getYear(ev.Date);
                    const eventMonthYear = getMonthYear(ev.Date);
                    
                    // Must match both selected year and month-year
                    return eventYear === this.state.selectedYear && eventMonthYear === this.state.selectedMonth;
                  });

                  if (filteredEvents.length === 0) return null;

                  return (
                    <div
                      className="organizer-section"
                      key={orgType}
                      style={{ minWidth: 320, flex: 1, maxWidth: '50%' }}
                    >
                      <div className={`organizer-section-title ${orgType === 'WWF-led' ? 'wwf' : orgType === 'Volunteer-led' ? 'volunteer' : 'other'}`}>{orgType}</div>
                      <div className="upcoming-events-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 24
                      }}>
                        {filteredEvents.map((event, idx) => (
                          <PastEventCard key={event._id} event={event} cardStyle={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px #0001', padding: 20, marginBottom: 8 }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
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
                  const eventsForMonth = events.filter(ev => {
                    const eventYear = getYear(ev.Date);
                    const eventMonthYear = getMonthYear(ev.Date);
                    return eventYear === this.state.selectedYear && eventMonthYear === this.state.selectedMonth;
                  });
                  
                  const calendarDays = this.generateCalendarDays(this.state.selectedMonth, eventsForMonth);
                  
                  return (
                    <div style={{
                      backgroundColor: '#fff',
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: 16,
                      width: "90vw"
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
          </>
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
                  background: 'none',
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
                {this.state.selectedDateEvents.map((event, idx) => (
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
                      <h4 style={{ margin: 0, color: '#111', fontSize: 16, fontWeight: 600 }}>
                        {event.Event || 'Event'}
                      </h4>
                      <p style={{ margin: '4px 0', color: '#666', fontSize: 14 }}>
                        <strong>Location:</strong> {event.Location || 'TBD'}
                      </p>
                      <p style={{ margin: '4px 0', color: '#666', fontSize: 14 }}>
                        <strong>Date:</strong> {event.Date} • <strong>Time:</strong> {event.Time || 'TBD'}
                      </p>
                      <p style={{ margin: '4px 0', color: '#666', fontSize: 14 }}>
                        <strong>Organizer:</strong> {event.Organizer || 'TBD'}
                      </p>
                    </div>

                    {/* Participants Section */}
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                      <h5 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: 14, fontWeight: 600 }}>
                        Participants ({(event.Participants || []).length})
                      </h5>
                      
                      {event.Participants && event.Participants.length > 0 ? (
                        <div style={{
                          maxHeight: '120px',
                          overflowY: 'auto',
                          border: '1px solid #e5e7eb',
                          borderRadius: 6,
                          padding: 8,
                          backgroundColor: '#f9fafb'
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
                                <span>{participantName}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>
                          No participants yet
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default PastEvents;