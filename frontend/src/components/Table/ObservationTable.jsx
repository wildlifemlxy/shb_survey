import React, { Component } from 'react';
import { createPortal } from 'react-dom';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { getUniqueSeenHeards } from '../../utils/dataProcessing';
import isEqual from 'lodash/isEqual';
import { logger } from '../../utils/diagnosticLogger';

ModuleRegistry.registerModules([AllCommunityModule]);

// Location options - available parks and locations in Singapore
const LOCATION_OPTIONS = [
  'Bidadari Park',
  'Bukit Timah Nature Park',
  'Bukit Batok Nature Park',
  'Gillman Barracks',
  'Hindhede Nature Park',
  'Mandai Boardwalk',
  'Pulau Ubin',
  'Rifle Range Nature Park',
  'Rail Corridor (Kranji)',
  'Rail Corridor (Hillview)',
  'Rail Corridor (Bukit Timah)',
  'Singapore Botanic Gardens',
  'Springleaf Nature Park',
  'Sungei Buloh Wetland Reserve',
  'Windsor Nature Park',
  'Others'
];

// Standalone LocationCellEditor component with custom dropdown
const LocationCellEditor = React.forwardRef((props, ref) => {
  const [value, setValue] = React.useState(props.value || '');
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [filteredOptions, setFilteredOptions] = React.useState(LOCATION_OPTIONS);
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0, width: 0 });
  const inputRef = React.useRef();
  const dropdownRef = React.useRef();
  const valueRef = React.useRef(props.value || '');

  React.useImperativeHandle(ref, () => ({
    getValue: () => valueRef.current || '',
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false
  }));

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 250)
      });
    }
  };

  React.useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
        updateDropdownPosition();
      }
    }, 50);
    
    setFilteredOptions(LOCATION_OPTIONS);
    setShowDropdown(true);

    const handleScroll = () => updateDropdownPosition();
    const handleResize = () => updateDropdownPosition();
    
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setValue(inputValue);
    valueRef.current = inputValue;
    
    const filtered = LOCATION_OPTIONS.filter(option =>
      option.toLowerCase().includes(inputValue.toLowerCase())
    );
    setFilteredOptions(filtered);
    setShowDropdown(true);
  };

  const handleOptionSelect = (option) => {
    setValue(option);
    valueRef.current = option;
    setShowDropdown(false);
    if (props.stopEditing) {
      props.stopEditing();
    }
  };

  const handleInputFocus = () => {
    setFilteredOptions(LOCATION_OPTIONS);
    setShowDropdown(true);
    updateDropdownPosition();
  };

  const handleInputBlur = (e) => {
    if (dropdownRef.current && dropdownRef.current.contains(e.relatedTarget)) {
      return;
    }
    valueRef.current = value;
    setTimeout(() => setShowDropdown(false), 150);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      if (props.stopEditing) {
        props.stopEditing();
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      setShowDropdown(false);
      valueRef.current = value;
      if (props.stopEditing) {
        props.stopEditing();
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder="Select or type location"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          padding: '4px 8px',
          fontSize: '14px',
          backgroundColor: 'white',
          boxSizing: 'border-box',
          cursor: 'text'
        }}
      />
      {showDropdown && typeof document !== 'undefined' && 
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 999999,
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
            }}
          >
            {filteredOptions.map((option, index) => (
              <div
                key={index}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOptionSelect(option);
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: index < filteredOptions.length - 1 ? '1px solid #f0f0f0' : 'none',
                  backgroundColor: 'white',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e9ecef';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                }}
              >
                {option}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div style={{
                padding: '8px 12px',
                color: '#666',
                fontStyle: 'italic',
                fontSize: '14px'
              }}>
                No matching locations found
              </div>
            )}
          </div>,
          document.body
        )
      }
    </>
  );
});

LocationCellEditor.displayName = 'LocationCellEditor';

// Time Cell Editor component with time picker
const TimeCellEditor = React.forwardRef((props, ref) => {
  const inputRef = React.useRef();
  const valueRef = React.useRef('');

  React.useImperativeHandle(ref, () => ({
    getValue: () => valueRef.current,
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false
  }));

  const formatTimeValue = (timeValue) => {
    if (!timeValue) return '';
    
    // If it's already in HH:mm format, return it
    if (typeof timeValue === 'string' && timeValue.match(/^\d{2}:\d{2}$/)) {
      return timeValue;
    }
    
    // If it's a number (Excel time format), convert it
    if (typeof timeValue === 'number') {
      const totalSeconds = Math.round(86400 * timeValue);
      const hours = Math.floor(totalSeconds / 3600) % 24;
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // If it's a string, try to parse it
    if (typeof timeValue === 'string') {
      const parts = timeValue.split(':');
      if (parts.length >= 2) {
        const hours = parts[0].padStart(2, '0');
        const minutes = parts[1].padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    }
    
    return '';
  };

  React.useEffect(() => {
    const formattedTime = formatTimeValue(props.value);
    valueRef.current = formattedTime;
    
    if (inputRef.current) {
      inputRef.current.value = formattedTime;
      // Delay focus to allow ag-Grid to complete initialization
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [props.value]);

  const handleChange = (e) => {
    valueRef.current = e.target.value;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (props.stopEditing) {
        props.stopEditing(true); // Cancel editing
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.stopPropagation();
      if (props.stopEditing) {
        props.stopEditing(false); // Save value
      }
    }
  };

  const handleBlur = () => {
    if (props.stopEditing) {
      props.stopEditing(false);
    }
  };

  return (
    <input
      ref={inputRef}
      type="time"
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        padding: '4px 8px',
        fontSize: '14px',
        backgroundColor: 'white',
        boxSizing: 'border-box'
      }}
    />
  );
});

TimeCellEditor.displayName = 'TimeCellEditor';

// Standalone DateCellEditor component
const DateCellEditor = React.forwardRef((props, ref) => {
  const [value, setValue] = React.useState('');
  const inputRef = React.useRef();
  const valueRef = React.useRef('');

  console.log('DateCellEditor initialized with value:', props.value);

  React.useImperativeHandle(ref, () => ({
    getValue: () => {
      // Convert yyyy-mm-dd back to dd/mm/yyyy for storage
      if (!valueRef.current) return '';
      const [year, month, day] = valueRef.current.split('-');
      return `${day}/${month}/${year}`;
    },
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false
  }));

  React.useEffect(() => {
    // Convert dd/mm/yyyy to yyyy-mm-dd for the date input
    let initialValue = '';
    if (props.value) {
      const dateStr = props.value.toString().trim();
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          // Ensure proper formatting for date input (yyyy-mm-dd)
          const paddedDay = day.padStart(2, '0');
          const paddedMonth = month.padStart(2, '0');
          const fullYear = year.length === 2 ? (parseInt(year) < 50 ? `20${year}` : `19${year}`) : year;
          initialValue = `${fullYear}-${paddedMonth}-${paddedDay}`;
        }
      }
    }
    setValue(initialValue);
    valueRef.current = initialValue;
    
    // Focus the input when editor starts and ensure the value is set
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.value = initialValue;
        inputRef.current.focus();
        // Try to open the date picker calendar
        if (initialValue) {
          const inputEvent = new Event('input', { bubbles: true });
          inputRef.current.dispatchEvent(inputEvent);
          
          try {
            inputRef.current.showPicker && inputRef.current.showPicker();
          } catch (e) {
            console.log('showPicker not supported');
          }
        } else {
          try {
            inputRef.current.showPicker && inputRef.current.showPicker();
          } catch (e) {
            console.log('showPicker not supported');
          }
        }
      }
    }, 100);
  }, [props.value]);

  const handleInputChange = (e) => {
    setValue(e.target.value);
    valueRef.current = e.target.value;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (props.stopEditing) {
        props.stopEditing();
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      valueRef.current = value;
      if (props.stopEditing) {
        props.stopEditing();
      }
    }
  };

  const handleBlur = () => {
    valueRef.current = value;
    if (props.stopEditing) {
      props.stopEditing();
    }
  };

  const handleClick = () => {
    if (inputRef.current) {
      try {
        inputRef.current.showPicker && inputRef.current.showPicker();
      } catch (e) {
        console.log('showPicker not supported');
      }
    }
  };

  return (
    <input
      ref={inputRef}
      type="date"
      value={value}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onClick={handleClick}
      autoFocus
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        padding: '4px 8px',
        fontSize: '14px',
        backgroundColor: 'white',
        boxSizing: 'border-box'
      }}
    />
  );
});

DateCellEditor.displayName = 'DateCellEditor';

class ObservationTable extends Component {

constructor(props) {
  super(props);
  this.state = {
    currentPage: 0,
    cardsPerPage: 6,
    searchQuery: '',
    selectedLocation: 'All',
    selectedSeenHeard: 'All',
    filteredData: [],
    openCardIndex: null,
    sortField: 'Date', // Default sort field
    sortDirection: 'default', // Three modes: 'asc', 'desc', 'default'
    originalOrder: [], // To store original order for 'default' mode
    showAddModal: false, // State for add observation modal
    newObservationData: this.getEmptyObservation() // State for new observation form
  };
  
  // Flag to prevent infinite update loops
  this.isUpdating = false;
  
  // Location options for the dropdown editor
  this.locationOptions = [
    'Bidadari Park',
    'Bukit Timah Nature Park',
    'Bukit Batok Nature Park',
    'Gillman Barracks',
    'Hindhede Nature Park',
    'Mandai Boardwalk',
    'Pulau Ubin',
    'Rifle Range Nature Park',
    'Rail Corridor (Kranji)',
    'Rail Corridor (Hillview)',
    'Rail Corridor (Bukit Timah)',
    'Singapore Botanic Gardens',
    'Springleaf Nature Park',
    'Sungei Buloh Wetland Reserve',
    'Windsor Nature Park',
    'Others'
  ];
}

getEmptyObservation() {
  return {
    'Observer name': '',
    'SHB individual ID': '',
    'Location': '',
    'Number of Birds': '',
    'Height of tree/m': '',
    'Height of bird/m': '',
    'Date': '',
    'Time': '',
    'Activity (foraging, preening, calling, perching, others)': '',
    'Seen/Heard': 'Seen'
  };
}

  // Custom Date Cell Editor Component
  // Format bird ID to ensure consistent SHBx format
  formatBirdId(birdId) {
    if (!birdId || birdId === '') return '';
    
    // Handle multiple bird IDs separated by commas or spaces
    const ids = birdId.split(/[,\s]+/).filter(id => id.trim() !== '');
    
    const formattedIds = ids.map(id => {
      // Remove extra spaces and normalize
      id = id.trim();
      
      // If it already starts with SHB, ensure proper format
      if (id.toLowerCase().startsWith('shb')) {
        // Extract the number part
        const numberMatch = id.match(/\d+/);
        if (numberMatch) {
          return `SHB${numberMatch[0]}`;
        }
        return id; // Return as is if no number found
      }
      
      // If it's just a number, add SHB prefix
      if (/^\d+$/.test(id)) {
        return `SHB${id}`;
      }
      
      // Return as is for other formats
      return id;
    });
    
    return formattedIds.join(', ');
  }

  convertExcelTime(serial) {
    // Handle null, undefined, or empty string cases
    if (serial == null || serial === '') return '';
    
    // If already a string in HH:mm format (24-hour), just return
    if (typeof serial === 'string' && serial.match(/^\d{2}:\d{2}$/)) {
      return serial;
    }
    
    // If already a string in H:mm format (24-hour), pad hour and return
    if (typeof serial === 'string' && serial.match(/^\d{1}:\d{2}$/)) {
      const parts = serial.split(':');
      const formatted = `${parts[0].padStart(2, '0')}:${parts[1]}`;
      return formatted;
    }
    
    // If already a string in HH:mm:ss format, trim to HH:mm
    if (typeof serial === 'string' && serial.match(/^\d{2}:\d{2}:\d{2}$/)) {
      const formatted = serial.slice(0, 5);
      return formatted;
    }
    
    // If already a string in H:mm:ss format, pad hour and trim
    if (typeof serial === 'string' && serial.match(/^\d{1}:\d{2}:\d{2}$/)) {
      const parts = serial.split(':');
      const formatted = `${parts[0].padStart(2, '0')}:${parts[1]}`;
      return formatted;
    }
    
    // Handle 12-hour AM/PM format (e.g., 7:12:00 AM, 12:05 PM, 1:05 AM)
    if (typeof serial === 'string' && /\b(AM|PM)\b/i.test(serial)) {
      // Remove seconds if present and extract AM/PM
      let timeString = serial.trim();
      let ampmMatch = timeString.match(/(AM|PM)/i);
      let ampm = ampmMatch ? ampmMatch[0].toUpperCase() : '';
      timeString = timeString.replace(/(AM|PM)/i, '').trim();
      
      // Remove seconds if present (e.g., "8:19:00" -> "8:19")
      if (timeString.includes(':')) {
        const timeParts = timeString.split(':');
        timeString = `${timeParts[0]}:${timeParts[1]}`;
      }
      
      let [hour, minute] = timeString.split(':');
      hour = parseInt(hour, 10);
      minute = parseInt(minute, 10) || 0;
      
      // Convert to 24-hour format
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      
      const formatted = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      return formatted;
    }
    
    // Handle Excel serial time (decimal fraction of a day)
    if (typeof serial === 'number') {
      const totalSeconds = Math.round(86400 * serial);
      const hours = Math.floor(totalSeconds / 3600) % 24;
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      return formatted;
    }
    
    // If nothing matches, return the original value
    return serial;
  }

  formatDate(dateString) {
    // Always output as dd/mm/yyyy, padding day and month to two digits
    if (!dateString || dateString === '') return '';
    let d, m, y;
    // Handle formats like 20-Jun-25 or 05-Feb-2024
    const monthMap = {
      Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
      Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
    };
    const monthNameRegex = /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/;
    const match = dateString.match(monthNameRegex);
    if (match) {
      d = parseInt(match[1], 10);
      m = monthMap[match[2].charAt(0).toUpperCase() + match[2].slice(1,3).toLowerCase()];
      let yy = parseInt(match[3], 10);
      y = match[3].length === 2 ? (yy < 50 ? 2000 + yy : 1900 + yy) : yy;
    } else if (dateString instanceof Date && !isNaN(dateString)) {
      d = dateString.getDate();
      m = dateString.getMonth() + 1;
      y = dateString.getFullYear();
    } else if (dateString.includes('/')) {
      // Accepts dd/mm/yyyy, d/m/yyyy, mm/dd/yyyy, m/d/yyyy, dd/mm/yy, d/m/yy
      const parts = dateString.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          d = parseInt(parts[2], 10);
        } else if (parts[2].length === 4) {
          d = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          y = parseInt(parts[2], 10);
        } else if (parts[2].length === 2) {
          // dd/mm/yy or d/m/yy
          d = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          let yy = parseInt(parts[2], 10);
          y = yy < 50 ? 2000 + yy : 1900 + yy;
        }
      }
    } else if (dateString.includes('-')) {
      // Accepts yyyy-mm-dd, y-m-d, dd-mm-yyyy, d-m-y, dd-mm-yy, d-m-yy
      const parts = dateString.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          d = parseInt(parts[2], 10);
        } else if (parts[2].length === 4) {
          d = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          y = parseInt(parts[2], 10);
        } else if (parts[2].length === 2) {
          d = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          let yy = parseInt(parts[2], 10);
          y = yy < 50 ? 2000 + yy : 1900 + yy;
        }
      }
    } else {
      return dateString;
    }
    if (!d || !m || !y) return dateString;
    return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
  }

  transformData(data) {
    try {
      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.warn('ObservationTable: transformData received non-array data:', data);
        return [];
      }
      
      return data.map((item, index) => {
        try {
          // Ensure item is an object
          if (!item || typeof item !== 'object') {
            console.warn('ObservationTable: Invalid item at index', index, item);
            return {
              serialNumber: index + 1,
              'Observer name': '',
              'SHB individual ID': '',
              'Location': '',
              'Date': '',
              'Time': '',
              'Seen/Heard': ''
            };
          }
          
          const newItem = { ...item };
          
          // Handle legacy field name conversion
          if (newItem["SHB individual ID (e.g. SHB1)"]) {
            newItem["SHB individual ID"] = newItem["SHB individual ID (e.g. SHB1)"];
            delete newItem["SHB individual ID (e.g. SHB1)"];
          }
          
          // Add serial number as a field
          newItem.serialNumber = index + 1;
          return newItem;
        } catch (itemError) {
          console.error('Error transforming item at index', index, itemError);
          return {
            serialNumber: index + 1,
            'Observer name': '',
            'SHB individual ID': '',
            'Location': '',
            'Date': '',
            'Time': '',
            'Seen/Heard': ''
          };
        }
      });
    } catch (error) {
      console.error('Error in transformData:', error);
      return [];
    }
  }

  toggleCard = (index) => {
    this.setState((prevState) => ({
      openCardIndex: prevState.openCardIndex === index ? null : index
    }));
  }

  handlePageChange = (newPage) => {
    this.setState({ currentPage: newPage });
  }

  handleLocationChange = (e) => {
    // Reset to first page when filters change
    this.setState({ 
      selectedLocation: e.target.value,
      currentPage: 0 
    }, this.updateFilteredData);
  }

  handleSeenHeardChange = (e) => {
    // Reset to first page when filters change
    this.setState({ 
      selectedSeenHeard: e.target.value,
      currentPage: 0
    }, this.updateFilteredData);
  }

  handleSearchChange = (e) => {
    // Reset to first page when search changes
    this.setState({ 
      searchQuery: e.target.value,
      currentPage: 0
    }, this.updateFilteredData);
  }

  // ...existing code...

  // Central method to update filtered data
  updateFilteredData = () => {
    try {
      const { searchQuery, selectedLocation, selectedSeenHeard, sortField, sortDirection, originalOrder } = this.state;
      const rawData = this.props.data || [];
      
      if (!Array.isArray(rawData)) {
        console.warn('ObservationTable: props.data is not an array in updateFilteredData');
        this.setState({ filteredData: [] });
        return;
      }
      
      const transformedData = this.transformData(rawData);

      // Filter data based on search query, location, and Seen/Heard status
      let filteredData = transformedData.filter((obs) => {
        try {
          const observerName = obs['Observer name'] || '';
          const birdId = obs['SHB individual ID'] || '';
          const location = obs['Location'] || '';

          const searchMatches =
            observerName.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
            birdId.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
            location.toLowerCase().includes((searchQuery || '').toLowerCase());

          const locationMatches = selectedLocation === 'All' || obs['Location'] === selectedLocation;
          const seenHeardMatches = (selectedSeenHeard === 'All' || selectedSeenHeard === '') || obs['Seen/Heard'] === selectedSeenHeard;

          return searchMatches && locationMatches && seenHeardMatches;
        } catch (filterError) {
          console.error('Error filtering observation:', obs, filterError);
          return false; // Exclude problematic items
        }
      });

    // If we're in default mode and we have original order data, reorder based on that
    if (sortDirection === 'default' && originalOrder.length > 0) {
      // Create a map of the original indices
      const originalIndices = new Map();
      originalOrder.forEach((id, index) => {
        originalIndices.set(id, index);
      });

      // Sort based on original indices
      filteredData.sort((a, b) => {
        const aIndex = originalIndices.get(this.getItemId(a)) ?? Infinity;
        const bIndex = originalIndices.get(this.getItemId(b)) ?? Infinity;
        return aIndex - bIndex;
      });
    } 
    // Otherwise sort as normal
    else if (sortDirection !== 'default') {
      filteredData = this.sortData(filteredData, sortField, sortDirection);
    }

    // Add stable IDs for ag-Grid to each row
    const dataWithIds = filteredData.map((row, index) => {
      if (!row || typeof row !== 'object') {
        return {
          _rowId: `row-${index}`,
          _originalIndex: index,
          serialNumber: index + 1
        };
      }
      return {
        ...row,
        _rowId: row._id || row.id || `row-${index}`,
        _originalIndex: index
      };
    });

    this.setState({ filteredData: dataWithIds });
    } catch (error) {
      console.error('Error in updateFilteredData:', error);
      this.setState({ filteredData: [] }); // Set empty array on error
    }
  }

  // Helper method to generate a unique ID for each item
  getItemId(item) {
    // Create a unique ID based on combination of fields
    return `${item['Observer name']}-${item['SHB individual ID']}-${item['Date']}-${item['Time']}`;
  }

  sortData(data, field, direction) {
    // If direction is 'default', return data as is
    if (!field || direction === 'default') {
      return [...data]; // Return a copy of original data
    }
  
    const sortedData = [...data];
  
    sortedData.sort((a, b) => {
      let aValue, bValue;
  
      // Convert DD/MM/YYYY to YYYY-MM-DD for proper parsing
      const convertDateFormat = (dateString) => {
        if (!dateString) return '';
        const parts = dateString.split('/');
        if (parts.length !== 3) return dateString;
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      };
  
      switch (field) {
        case 'Date':
          aValue = new Date(convertDateFormat(a[field] || ''));
          bValue = new Date(convertDateFormat(b[field] || ''));
          if (isNaN(aValue.getTime())) aValue = new Date(0);
          if (isNaN(bValue.getTime())) bValue = new Date(0);
          break;
  
        case 'Activity':
          aValue = a["Activity (foraging, preening, calling, perching, others)"] || '';
          bValue = b["Activity (foraging, preening, calling, perching, others)"] || '';
          break;
  
        case 'Time':
          // Use the raw Excel time value for sorting
          aValue = parseFloat(a[field] || 0);
          bValue = parseFloat(b[field] || 0);
          break;
  
        default:
          aValue = a[field] || '';
          bValue = b[field] || '';
          break;
      }
  
      // Sort logic
      if (aValue instanceof Date && bValue instanceof Date) {
        const comparison = aValue.getTime() - bValue.getTime();
        return direction === 'asc' ? comparison : -comparison;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return direction === 'asc' ? comparison : -comparison;
      } else {
        const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return direction === 'asc' ? comparison : -comparison;
      }
    });
    return sortedData;
  }

  // Modal handlers for adding new observation
  openAddObservationModal = () => {
    this.setState({ 
      showAddModal: true,
      newObservationData: this.getEmptyObservation()
    });
  }

  closeAddObservationModal = () => {
    this.setState({ 
      showAddModal: false,
      newObservationData: this.getEmptyObservation()
    });
  }

  handleAddObservationInputChange = (field, value) => {
    this.setState(prevState => ({
      newObservationData: {
        ...prevState.newObservationData,
        [field]: value
      }
    }));
  }

  handleSubmitNewObservation = async () => {
    const { newObservationData } = this.state;
    
    // Basic validation
    if (!newObservationData['Observer name'] || newObservationData['Observer name'].trim() === '') {
      alert('Please enter observer name');
      return;
    }
    
    if (!newObservationData['Date'] || newObservationData['Date'].trim() === '') {
      alert('Please enter date');
      return;
    }
    
    try {
      // Call the add handler from parent
      if (this.props.onDataAdd) {
        await this.props.onDataAdd(newObservationData);
        this.closeAddObservationModal();
      } else {
        alert('Add functionality not available');
      }
    } catch (error) {
      console.error('Error adding observation:', error);
      alert('Failed to add observation. Please try again.');
    }
  }

  componentDidUpdate(prevProps, prevState) {
      // Only update if the data reference has actually changed and we have valid data
      if (
        prevProps.data !== this.props.data &&
        this.props.data &&
        Array.isArray(this.props.data)
      ) {
        try {
          const transformedData = this.transformData(this.props.data);
          // Compare with previous transformed data, not filteredData
          const prevTransformedData = this.transformData(prevProps.data);
          const newTransformedDataString = JSON.stringify(transformedData);
          const prevTransformedDataString = JSON.stringify(prevTransformedData);
          // Only update if transformed data actually changed and filteredData is not already correct
          if (
            prevTransformedDataString !== newTransformedDataString &&
            JSON.stringify(this.state.filteredData) !== newTransformedDataString
          ) {
            // Store the original order of the data
            const originalOrder = transformedData.map(this.getItemId);
            // Apply current sorting if not in default mode
            let dataToShow = transformedData;
            if (this.state.sortDirection !== 'default') {
              dataToShow = this.sortData(transformedData, this.state.sortField, this.state.sortDirection);
            }
            
            // Add stable IDs for ag-Grid to each row
            const dataWithIds = dataToShow.map((row, index) => {
              if (!row || typeof row !== 'object') {
                return {
                  _rowId: `row-${index}`,
                  _originalIndex: index,
                  serialNumber: index + 1
                };
              }
              return {
                ...row,
                _rowId: row._id || row.id || `row-${index}`,
                _originalIndex: index
              };
            });
            
            // Update the state with the new data and original order
            this.setState({
              filteredData: dataWithIds,
              originalOrder: originalOrder
            });
          }
        } catch (error) {
          console.error('Error in componentDidUpdate:', error);
        }
      }
  }
  
  componentDidMount() {
    // Initialize filteredData with all data
    const transformedData = this.transformData(this.props.data);
    
    // Store the original order
    const originalOrder = transformedData.map(this.getItemId);
    
    // Apply default sorting
    let initialData = transformedData;
    if (this.state.sortDirection !== 'default') {
      initialData = this.sortData(transformedData, this.state.sortField, this.state.sortDirection);
    }
    
    // Add stable IDs for ag-Grid to each row
    const dataWithIds = initialData.map((row, index) => {
      if (!row || typeof row !== 'object') {
        return {
          _rowId: `row-${index}`,
          _originalIndex: index,
          serialNumber: index + 1
        };
      }
      return {
        ...row,
        _rowId: row._id || row.id || `row-${index}`,
        _originalIndex: index
      };
    });
    
    this.setState({ 
      filteredData: dataWithIds,
      originalOrder: originalOrder
    });
  }

  renderMobileCards() {
    const { currentPage, cardsPerPage, filteredData } = this.state;
    
    // Apply pagination to the already filtered data
    const paginatedData = filteredData.slice(
      currentPage * cardsPerPage, 
      (currentPage + 1) * cardsPerPage
    );

    return paginatedData.map((obs, i) => {
      const isOpen = this.state.openCardIndex === i;
      let cardBackgroundColor = '#f9f9f9';  // Default background color (light gray)
      
      switch (obs["Seen/Heard"]) {
        case "Seen":
          cardBackgroundColor = '#A8E6CF';  // Soft pastel green
          break;
        case "Heard":
          cardBackgroundColor = '#FFE0B2';  // Soft pastel orange
          break;
        case "Not found":
          cardBackgroundColor = '#E0E0E0';  // Soft pastel grey
          break;
      }

      const serialNumber = currentPage * cardsPerPage + (i + 1);

      return (
        <div
          key={i}
          style={{
            border: '1px solid #ccc',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: cardBackgroundColor,
            fontSize: '0.9rem',
            lineHeight: '1.4',
            height: 'auto',
            maxHeight: '300px', // Shorter height
            overflowY: 'auto', // Make it scrollable
          }}
        >
          <div
            onClick={() => this.toggleCard(i)}
            style={{
              fontWeight: 'bold',
              cursor: 'pointer',
              paddingBottom: '0.5rem', // Adjust space below header
            }}
          >
            <strong>S/N:</strong> {serialNumber} {/* Displaying the adjusted serial number */}
            <br />
            <strong>Location:</strong> {obs.Location}
            <br />
            <strong>Date:</strong> {obs.Date}
          </div>

          {isOpen && (
            <div className="card-body">
              <p><strong>Observer:</strong> {obs['Observer name'] || ''}</p>
              <p><strong>Bird ID:</strong> {obs['SHB individual ID'] || ''}</p>
              <p><strong>Activity:</strong> {obs["Activity (foraging, preening, calling, perching, others)"] || ''}</p>
              <p><strong>Time:</strong> {this.convertExcelTime(obs.Time) || ''}</p>
              <p><strong>Height of Tree:</strong> {obs["Height of tree/m"] != null && !isNaN(obs["Height of tree/m"]) ? `${obs["Height of tree/m"]}m` : ''}</p>
              <p><strong>Height of Bird:</strong> {obs["Height of bird/m"] != null && !isNaN(obs["Height of bird/m"]) ? `${obs["Height of bird/m"]}m` : ''}</p>
              <p><strong>Number of Bird(s):</strong> {obs["Number of Birds"] != null ? obs["Number of Birds"] : ''}</p>
              <p><strong>Seen/Heard:</strong> {obs["Seen/Heard"] || ''}</p>
            </div>
          )}
        </div>
      );
    });
  }

  renderPagination() {
    const { currentPage, cardsPerPage, filteredData } = this.state;
    const totalPages = Math.ceil(filteredData.length / cardsPerPage);
    const pageNumbers = [];

    const maxPageNumbersToShow = 5;

    if (totalPages <= maxPageNumbersToShow) {
      for (let i = 0; i < totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage < 3) {
        for (let i = 0; i < maxPageNumbersToShow - 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
      } else if (currentPage > totalPages - 4) {
        pageNumbers.push(0);
        pageNumbers.push('...');
        for (let i = totalPages - maxPageNumbersToShow + 2; i < totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(0);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages - 1);
      }
    }

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: '1rem',
        fontSize: '0.75rem',
        width: '40%',
        height: '40%',
        marginLeft: "auto",
        marginRight: "auto",
      }}>
        <button
          onClick={() => this.handlePageChange(0)}
          disabled={currentPage === 0}
          style={{
            padding: '0.3rem',
            margin: '0 5px',
            background: 'none',
            border: 'none',
            fontSize: '0.7rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          {"<<"}
        </button>
        <button
          onClick={() => this.handlePageChange(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          style={{
            padding: '0.3rem',
            margin: '0 5px',
            background: 'none',
            border: 'none',
            fontSize: '0.7rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          {"<"}
        </button>

        {pageNumbers.map((pageNum, index) => (
          pageNum === '...' ? (
            <span key={index} style={{
              padding: '0.3rem',
              margin: '0 5px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              color: '#333',
            }}>
              {"..."}
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => this.handlePageChange(pageNum)}
              style={{
                padding: '0.3rem',
                margin: '0 5px',
                background: 'none',
                border: 'none',
                fontSize: '0.7rem',
                cursor: 'pointer',
                fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                color: '#333',
              }}
            >
              {pageNum + 1}
            </button>
          )
        ))}

        <button
          onClick={() => this.handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
          disabled={currentPage === totalPages - 1 || totalPages === 0}
          style={{
            padding: '0.3rem',
            margin: '0 5px',
            background: 'none',
            border: 'none',
            fontSize: '0.7rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          {">"}
        </button>

        <button
          onClick={() => this.handlePageChange(totalPages - 1)}
          disabled={currentPage === totalPages - 1 || totalPages === 0}
          style={{
            padding: '0.3rem',
            margin: '0 5px',
            background: 'none',
            border: 'none',
            fontSize: '0.7rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          {">>"}
        </button>
      </div>
    );
  }

  render() {
    try {
      const { data } = this.props;
      const { searchQuery, selectedSeenHeard, filteredData, sortField, sortDirection } = this.state;
      
      // Safety check for data
      const safeData = data || [];
      const seenHeards = getUniqueSeenHeards(safeData);
      // Use filteredData from state instead of recalculating on every render to avoid infinite loops
      // filteredData is already properly managed in state and updated only when data actually changes
      const transformedData = filteredData && Array.isArray(filteredData) ? filteredData : [];

      // Check if user is not WWF-Volunteer to enable editing
      const userRole = localStorage.getItem('userRole'); // Assuming user role is stored in localStorage
      const isEditable = userRole !== 'WWF-Volunteer' && userRole !== null;
      
      const columns = [
        { 
          headerName: "S/N", 
          field: "serialNumber",
          width: 70,
          sortable: false,
          editable: false, // Serial number should never be editable
        },
        { 
          headerName: "Observer", 
          field: "Observer name", 
          width: 300,
          editable: isEditable
        },
        { 
          headerName: "Bird ID", 
          field: "SHB individual ID", 
          width: 200,
          editable: isEditable,
          cellRenderer: (params) => {
            if (!params.value || params.value === '') return '';
            // Format bird IDs to ensure they follow SHBx format
            return this.formatBirdId(params.value);
          }
        },
        {
          headerName: "Location",
          field: "Location",
          cellRenderer: (params) =>
            params.value ? `${params.value}` : '',
          width: 300,
          editable: isEditable,
          cellEditor: 'LocationCellEditor',
          cellEditorParams: {
            values: LOCATION_OPTIONS
          }
        },
        { 
          headerName: "Number of Bird(s)", 
          field: "Number of Birds",
          cellRenderer: (params) => 
            params.value != null && params.value !== '' ? params.value : '',
          editable: isEditable,
        },
        {
          headerName: "Height of Tree",
          field: "Height of tree/m",
          cellRenderer: (params) => 
            params.value != null && params.value !== '' && !isNaN(params.value) ? `${params.value}m` : '',
          editable: isEditable,
        },
        {
          headerName: "Height of Bird",
          field: "Height of bird/m",
          cellRenderer: (params) => 
            params.value != null && params.value !== '' && !isNaN(params.value) ? `${params.value}m` : '',
          editable: isEditable,
          cellEditor: 'agNumberCellEditor'
        },
        { 
          headerName: "Date", 
          field: "Date", 
          cellRenderer: (params) => params.value ? this.formatDate(params.value) : '',
          editable: isEditable,
          width: 120
        },
        {
          headerName: "Time",
          field: "Time",
          cellRenderer: (params) => {
            if (params.value == null || params.value === '') return '';
            console.log('Time value:', params.value, 'Type:', typeof params.value);
            const formattedTime = this.convertExcelTime(params.value);
            console.log('Formatted time:', formattedTime);
            return formattedTime;
          },
          width: 100,
          editable: isEditable
        },
        {
          headerName: "Activity",
          field: "Activity",
          cellRenderer: (params) => params.value || '',
          width: 300,
          editable: isEditable,
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: {
            values: ['Calling', 'Feeding', 'Perching', 'Preening', 'Others']
          }
        },
        {
          headerName: "Seen/Heard",
          field: "Seen/Heard",
          cellRenderer: (params) => params.value || '',
          width: 300,
          editable: isEditable,
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: {
            values: ['Seen', 'Heard', 'Not found']
          }
        },
        // Add delete button column as the LAST column for non-WWF-Volunteer users
        ...(isEditable ? [{
          headerName: "Actions",
          field: "actions",
          width: 100,
          pinned: 'right',
          cellRenderer: (params) => {
            // Make the whole cell act as a delete button
            return (
              <div
                onClick={async (e) => {
                  e.stopPropagation();
                  
                  // Get the record ID from the row data
                  const recordId = params.data._id;
                  if (!recordId) {
                    console.error('No record ID found for deletion');
                    alert('Cannot delete record: No ID found');
                    return;
                  }
                  
                  // Confirm deletion
                  const confirmed = window.confirm('Are you sure you want to delete this survey record?');
                  if (!confirmed) return;
                  
                  try {
                    // Call the delete handler passed from parent
                    if (this.props.onDataDelete) {
                      await this.props.onDataDelete(recordId);
                      console.log('Record deleted successfully:', recordId);
                    } else {
                      console.error('No delete handler provided');
                      alert('Delete functionality not available');
                    }
                  } catch (error) {
                    console.error('Error deleting record:', error);
                    alert('Failed to delete record. Please try again.');
                  }
                }}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  margin: '2px',
                  textAlign: 'center',
                  userSelect: 'none',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
                title="Delete this row"
              >
                Delete
              </div>
            );
          }
        }] : [])
      ];

      return (
        <>
          <div className="ag-theme-alpine" style={{ height: '50vh', width: '100%' }}>
            <AgGridReact
              columnDefs={columns}
              rowData={transformedData}
              components={{
                LocationCellEditor: LocationCellEditor
              }}
              domLayout="normal"
                pagination={true}
                defaultColDef={{
                  sortable: true,
                  resizable: true,
              }}
              paginationPageSize={(() => {
                try {
                  const dataLength = transformedData?.length || 0;
                  const allowedSizes = [20, 50, 100, 200, 500];
                  
                  // If no data, default to smallest size
                  if (dataLength === 0) {
                    return allowedSizes[0]; // 20
                  }
                  
                  // Find the smallest allowed size that can accommodate all data
                  const appropriateSize = allowedSizes.find(size => size >= dataLength);
                  
                  // If no size is large enough (more than 500 items), use the largest size
                  return appropriateSize || allowedSizes[allowedSizes.length - 1]; // 500
                } catch (error) {
                  console.error('Error calculating pagination size:', error);
                  return 50; // Safe fallback
                }
              })()}
              paginationPageSizeSelector={[20, 50, 100, 200, 500]}
              suppressScrollOnNewData={true}
              suppressMaintainUnsortedOrder={true}
              suppressCellFocus={!isEditable} // Allow cell focus if editable
              suppressRowHoverHighlight={false}
              maintainColumnOrder={true}
              suppressAnimationFrame={true}
              singleClickEdit={isEditable}
              stopEditingWhenCellsLoseFocus={true}
              getRowId={(params) => {
                // Ensure we return a string ID, not an object
                if (params.data._id) {
                  if (typeof params.data._id === 'string') {
                    return params.data._id;
                  } else if (params.data._id && params.data._id.buffer) {
                    // Handle MongoDB ObjectId buffer format
                    return JSON.stringify(params.data._id);
                  } else {
                    return String(params.data._id);
                  }
                }
                if (params.data._rowId) {
                  return String(params.data._rowId);
                }
                return String(params.node.rowIndex);
              }}
              onCellValueChanged={async (event) => {
                logger.section('📝 CELL EDIT DETECTED');
                logger.info('Field being edited', event.colDef?.field);
                logger.info('Old value', event.oldValue);
                logger.info('New value', event.newValue);
                
                // CRITICAL: Special logging for Location field
                if (event.colDef?.field === 'Location') {
                  logger.section('🎯 LOCATION FIELD UPDATE TRIGGERED');
                  logger.info('Location old value', event.oldValue);
                  logger.info('Location new value', event.newValue);
                  logger.info('Editable', event.colDef.editable);
                }
                
                // DEBUG: Log all available ID fields in the row
                logger.section('🔍 AVAILABLE ID FIELDS');
                logger.info('_id', event.data._id);
                logger.info('id', event.data.id);
                logger.info('_rowId', event.data._rowId);
                logger.info('surveyId', event.data.surveyId);
                
                // Validate that the new value is actually different
                if (event.oldValue === event.newValue) {
                  logger.info('No change', 'Old and new values are the same - skipping update');
                  return;
                }

                // Handle cell value changes when editing
                let recordId = event.data._id || event.data.id || event.data._rowId || event.data.surveyId;
                
                logger.section('📌 EXTRACTED RECORD ID');
                logger.info('recordId extracted', recordId);
                logger.info('recordId type', typeof recordId);
                
                // Enhanced MongoDB ObjectId handling
                if (recordId && typeof recordId === 'object') {
                  logger.section('🔧 CONVERTING OBJECT ID');
                  if (recordId.buffer) {
                    try {
                      const buffer = recordId.buffer;
                      recordId = Array.from(new Uint8Array(Object.values(buffer)))
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join('');
                      logger.success('Converted ObjectId buffer to hex', recordId);
                    } catch (bufferError) {
                      logger.error('Error converting buffer', bufferError.message);
                      if (recordId.toString) {
                        recordId = recordId.toString();
                        logger.success('Converted using toString()', recordId);
                      } else {
                        recordId = JSON.stringify(recordId);
                        logger.success('Converted using JSON.stringify()', recordId);
                      }
                    }
                  } else if (recordId.$oid) {
                    recordId = recordId.$oid;
                    logger.success('Extracted $oid field', recordId);
                  } else {
                    recordId = recordId.toString ? recordId.toString() : JSON.stringify(recordId);
                    logger.success('Stringified object', recordId);
                  }
                }
                
                // Final validation of record ID
                if (!recordId || typeof recordId !== 'string' || recordId.trim() === '') {
                  logger.section('❌ RECORD ID VALIDATION FAILED');
                  logger.error('Invalid record ID', recordId);
                  setTimeout(() => {
                    event.node.setDataValue(event.colDef.field, event.oldValue);
                  }, 50);
                  return;
                }
                
                recordId = recordId.trim();
                logger.success('Final valid recordId', recordId);
                
                try {
                  // Check if we have a valid record ID and onDataUpdate handler
                  if (!this.props.onDataUpdate) {
                    logger.error('No update handler', 'this.props.onDataUpdate is undefined');
                    return;
                  }
                  logger.success('Update handler found', '✓');
                  
                  // Prepare the updated data (only the changed field)
                  const updateData = {
                    [event.colDef.field]: event.newValue
                  };
                  
                  logger.section('📦 PREPARING UPDATE DATA');
                  logger.info('Field to update', event.colDef.field);
                  logger.info('New value', event.newValue);
                  logger.json('Update payload', updateData);
                  
                  logger.section('🔄 CALLING UPDATE HANDLER');
                  logger.pending('Sending update to parent component');
                  
                  // Call the update handler from parent component
                  await this.props.onDataUpdate(recordId, updateData);
                  
                  logger.success('Update handler completed', '✓');
                  
                } catch (updateError) {
                  logger.section('❌ UPDATE ERROR');
                  logger.error('Error message', updateError.message);
                  logger.error('Error type', updateError.constructor.name);
                  
                  let errorMessage = 'Error updating record. Please try again.';
                  if (updateError.response?.data?.error) {
                    errorMessage = updateError.response.data.error;
                  } else if (updateError.message) {
                    errorMessage = updateError.message;
                  }
                  
                  logger.error('Error to show user', errorMessage);
                  
                  // Revert the change in the grid
                  setTimeout(() => {
                    const gridApi = event.api;
                    const rowNode = event.node;
                    rowNode.setDataValue(event.colDef.field, event.oldValue);
                  }, 50);
                }
              }}
              getRowStyle={params => {
                let backgroundColor = '#f9f9f9';  // Default light gray

                // Adjust row background based on "Seen/Heard"
                switch (params.data["Seen/Heard"]) {
                  case "Seen":
                    backgroundColor = '#A8E6CF';  // Soft pastel green
                    break;
                  case "Heard":
                    backgroundColor = '#FFE0B2';  // Soft pastel orange
                    break;
                  case "Not found":
                    backgroundColor = '#FFCDD2';  // Soft pastel grey
                    break;
                }

                return { backgroundColor };  // Apply background color to the row
              }}
              />
          </div>
          
          {/* Legend below the table */}
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginTop: '1rem', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-block', width: 18, height: 18, background: '#A8E6CF', borderRadius: 3, border: '1px solid #ccc' }}></span>
              <span>Seen</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-block', width: 18, height: 18, background: '#FFE0B2', borderRadius: 3, border: '1px solid #ccc' }}></span>
              <span>Heard</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-block', width: 18, height: 18, background: '#FFCDD2', borderRadius: 3, border: '1px solid #ccc' }}></span>
              <span>Not found</span>
            </div>
          </div>
        </>
      );
      } catch (error) {
        console.error('Error in ObservationTable render:', error);
        return (
          <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
            <h3>Error loading table</h3>
            <p>There was an error loading the observation table. Please try refreshing the page.</p>
            <details style={{ marginTop: '10px', textAlign: 'left' }}>
              <summary>Error Details</summary>
              <pre style={{ background: '#f8f8f8', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                {error.toString()}
              </pre>
            </details>
          </div>
        );
      }
    }
}

export default ObservationTable;