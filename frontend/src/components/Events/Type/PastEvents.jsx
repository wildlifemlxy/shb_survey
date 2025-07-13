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

        {/* Events display - only show when both year and month are selected */}
        {this.state.selectedYear && this.state.selectedMonth && (
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
        )}
      </div>
    );
  }
}

export default PastEvents;