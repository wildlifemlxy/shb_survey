import React, { useEffect } from 'react';
import './ObservationPopup.css';

const ObservationPopup = ({ position, data, onClose }) => {
  if (!position || !data) return null;

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on the popup itself
      if (event.target.closest('.observation-popup')) {
        return;
      }
      // Don't close if clicking on a marker (let marker handle toggle)
      if (event.target.closest('.leaflet-marker-icon')) {
        return;
      }
      // Close popup for any other click
      onClose();
    };

    // Add escape key to close
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Add wheel/scroll event to close popup
    const handleScroll = (event) => {
      // Only close if not scrolling inside the popup
      if (!event.target.closest('.observation-popup')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('wheel', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('wheel', handleScroll);
    };
  }, [onClose]);

  const handleClose = (e) => {
    e.stopPropagation();
    onClose();
  };

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  // Helper function to format time in 24-hour format (hh:mm)
  const formatTime = (time) => {
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
  const formatDate = (date) => {
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

  // Calculate popup position based on marker position
  const popupStyle = {
    left: position.x + 35, // Position to the right of the marker with 35px gap
    top: position.y, // Use marker's y position
    transform: 'translateY(-50%)', // Center vertically relative to marker
  };

  // Auto-switch to left side if near right edge
  if (position.x > window.innerWidth - 350) {
    popupStyle.left = position.x - 35;
    popupStyle.transform = 'translate(-100%, -50%)';
  }

  // Ensure popup stays within viewport bounds
  if (popupStyle.left < 0) {
    popupStyle.left = 10;
    popupStyle.transform = 'translateY(-50%)';
  }
  
  if (popupStyle.top < 0) {
    popupStyle.top = 10;
  }
  
  if (popupStyle.top > window.innerHeight - 150) {
    popupStyle.top = window.innerHeight - 160;
  }

  // Temporary debug positioning - show popup in center if position is invalid
  if (position.x === 0 && position.y === 0) {
    popupStyle.left = '50%';
    popupStyle.top = '50%';
    popupStyle.transform = 'translate(-50%, -50%)';
  }

  console.log('Popup position:', position, 'Popup style:', popupStyle);

  return (
    <div 
      className="observation-popup"
      style={popupStyle}
      onClick={handleContentClick}
    >
      <div className="observation-popup-header">
        <strong>{data.Location || 'Unknown Location'}</strong>
        <button 
          onClick={handleClose}
          style={{
            float: 'right',
            background: 'none',
            border: 'none',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '0 2px',
            color: '#666',
            lineHeight: 1,
            marginTop: '-2px'
          }}
          title="Close popup"
        >
          ×
        </button>
      </div>
      
      {data.Date && (
        <div><strong>Date:</strong> {formatDate(data.Date)}</div>
      )}
      {data.Time && (
        <div><strong>Time:</strong> {formatTime(data.Time)}</div>
      )}
      {data["Number of Birds"] && (
        <div><strong>Number of birds:</strong> {data["Number of Birds"]}</div>
      )}
      {data["Seen/Heard"] && (
        <div><strong>Seen/Heard:</strong> {data["Seen/Heard"]}</div>
      )}
      {data["Height of bird/m"] && (
        <div><strong>Bird Height:</strong> {data["Height of bird/m"]}m</div>
      )}
      {data["Height of tree/m"] && (
        <div><strong>Tree Height:</strong> {data["Height of tree/m"]}m</div>
      )}
      {data["Activity (foraging, preening, calling, perching, others)"] && (
        <div><strong>Activity:</strong> {data["Activity (foraging, preening, calling, perching, others)"]}</div>
      )}
      {data["Observer name"] && (
        <div><strong>Observer:</strong> {data["Observer name"]}</div>
      )}
    </div>
  );
};

export default ObservationPopup;
