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

// Helper to get month-year string
function getMonthYear(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
}

class PastEvents extends Component {
  constructor(props) {
    super(props);
    const monthYears = Array.from(
      new Set(props.events.map(ev => getMonthYear(ev.Date)))
    );
    this.state = {
      selectedTab: monthYears[0] || '',
    };
  }

  handleTabClick = (monthYear) => {
    this.setState({ selectedTab: monthYear });
  };

  render() {
    const { events } = this.props;
    if (!events.length) return <div className="no-events">No past events.</div>;

    // Get unique month-years
    const monthYears = Array.from(
      new Set(events.map(ev => getMonthYear(ev.Date)))
    );

    const grouped = groupByOrganizer(events);
    const organizerTypes = Object.keys(grouped);
    return (
      <div className="upcoming-organizer-sections" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Upper section: sub tab buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 24,
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            maxWidth: 1200,
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingLeft: 32,
            paddingRight: 32
          }}
        >
          {monthYears.map(monthYear => (
            <button
              key={monthYear}
              className={`themed-btn themed-btn-outline${this.state.selectedTab === monthYear ? ' active' : ''}`}
              style={{
                padding: '10px 28px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 18,
                background: this.state.selectedTab === monthYear ? '#22c55e' : '#fff',
                color: this.state.selectedTab === monthYear ? '#fff' : '#166534',
                border: '2.5px solid #22c55e',
                cursor: 'pointer',
                marginBottom: 8,
                boxShadow: this.state.selectedTab === monthYear ? '0 2px 8px #22c55e33' : '0 1px 4px #0001',
                transition: 'all 0.15s'
              }}
              onClick={() => this.handleTabClick(monthYear)}
            >
              {monthYear}
            </button>
          ))}
        </div>
        {/* Lower section: cards */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 32, width: '100%', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {organizerTypes.map((orgType, colIdx) => (
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
                {grouped[orgType]
                  .filter(ev => getMonthYear(ev.Date) === this.state.selectedTab)
                  .map((event, idx) => (
                    <PastEventCard key={event._id} event={event} cardStyle={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px #0001', padding: 20, marginBottom: 8 }} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default PastEvents;