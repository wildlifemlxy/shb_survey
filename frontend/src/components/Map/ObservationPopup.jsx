import React, { Component } from 'react';

const popupStyle = {
  minWidth: 220,
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
  padding: 16,
  fontFamily: 'inherit',
  lineHeight: 1.5,
};
const labelStyle = {
  fontWeight: 600,
  color: '#2c3e50',
  marginRight: 4,
};
const valueStyle = {
  color: '#222',
};

class ObservationPopup extends Component {
  // Helper function to format time in 24-hour format (hh:mm)
  formatTime = (time) => {
    if (!time) return time;
    
    // Handle Excel time decimal (fraction of a day)
    if (typeof time === 'number' && time < 1) {
      const totalMinutes = Math.round(time * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // Handle string time formats (e.g., "8:19:00 AM")
    if (typeof time === 'string') {
      // Try to parse the time string
      const timeMatch = time.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const ampm = timeMatch[4];
        
        // Convert to 24-hour format if AM/PM is present
        if (ampm) {
          if (ampm.toUpperCase() === 'PM' && hours !== 12) {
            hours += 12;
          } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
          }
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    
    return time;
  };

  // Helper function to format date
  formatDate = (date) => {
    if (!date) return date;
    if (typeof date === 'number') {
      // Convert Excel date serial to readable date in dd/mm/yyyy format
      const excelDate = new Date((date - 25569) * 86400 * 1000);
      const day = excelDate.getDate().toString().padStart(2, '0');
      const month = (excelDate.getMonth() + 1).toString().padStart(2, '0');
      const year = excelDate.getFullYear();
      return `${day}/${month}/${year}`;
    }
    // If it's already a string, check if it needs formatting
    if (typeof date === 'string') {
      // Try to parse and reformat if it's a valid date
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        const day = parsedDate.getDate().toString().padStart(2, '0');
        const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
        const year = parsedDate.getFullYear();
        return `${day}/${month}/${year}`;
      }
    }
    return date;
  };

  render() {
    const { obs } = this.props;
    console.log('ObservationPopup rendering with data:', obs);
    
    if (!obs) {
      return <div style={popupStyle}>No data available</div>;
    }
    
    return (
      <div style={popupStyle} className="observation-popup">
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: '#1a237e' }}>
          {obs.Location || 'Unknown Location'}
        </div>
        {obs.Date && (
          <div><span style={labelStyle}>Date:</span> <span style={valueStyle}>{this.formatDate(obs.Date)}</span></div>
        )}
        {obs.Time && (
          <div><span style={labelStyle}>Time:</span> <span style={valueStyle}>{this.formatTime(obs.Time)}</span></div>
        )}
        {obs["Number of Birds"] && (
          <div><span style={labelStyle}>Number of birds:</span> <span style={valueStyle}>{obs["Number of Birds"]}</span></div>
        )}
        {obs["Seen/Heard"] && (
          <div><span style={labelStyle}>Seen/Heard:</span> <span style={valueStyle}>{obs["Seen/Heard"]}</span></div>
        )}
        {obs["Height of bird/m"] && (
          <div><span style={labelStyle}>Bird Height:</span> <span style={valueStyle}>{obs["Height of bird/m"]}m</span></div>
        )}
        {obs["Height of tree/m"] && (
          <div><span style={labelStyle}>Tree Height:</span> <span style={valueStyle}>{obs["Height of tree/m"]}m</span></div>
        )}
        {obs["Activity (foraging, preening, calling, perching, others)"] && (
          <div><span style={labelStyle}>Activity:</span> <span style={valueStyle}>{obs["Activity (foraging, preening, calling, perching, others)"]}</span></div>
        )}
        {obs["Observer name"] && (
          <div><span style={labelStyle}>Observer:</span> <span style={valueStyle}>{obs["Observer name"]}</span></div>
        )}
      </div>
    );
  }
}

export default ObservationPopup;
