  import React, { Component } from 'react';
  import { AgGridReact } from 'ag-grid-react';
  import { ModuleRegistry } from 'ag-grid-community';
  import { AllCommunityModule } from 'ag-grid-community';
  import {getUniqueLocations, getUniqueSeenHeards } from '../../utils/dataProcessing';
  import isEqual from 'lodash/isEqual';

  ModuleRegistry.registerModules([AllCommunityModule]);

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
        originalOrder: [] // To store original order for 'default' mode
      };
    }

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
      
      console.log('convertExcelTime input:', serial, 'type:', typeof serial);
      
      // If already a string in HH:mm format (24-hour), just return
      if (typeof serial === 'string' && serial.match(/^\d{2}:\d{2}$/)) {
        console.log('Already in HH:mm format:', serial);
        return serial;
      }
      
      // If already a string in H:mm format (24-hour), pad hour and return
      if (typeof serial === 'string' && serial.match(/^\d{1}:\d{2}$/)) {
        const parts = serial.split(':');
        const formatted = `${parts[0].padStart(2, '0')}:${parts[1]}`;
        console.log('Padded H:mm to HH:mm:', formatted);
        return formatted;
      }
      
      // If already a string in HH:mm:ss format, trim to HH:mm
      if (typeof serial === 'string' && serial.match(/^\d{2}:\d{2}:\d{2}$/)) {
        const formatted = serial.slice(0, 5);
        console.log('Trimmed HH:mm:ss to HH:mm:', formatted);
        return formatted;
      }
      
      // If already a string in H:mm:ss format, pad hour and trim
      if (typeof serial === 'string' && serial.match(/^\d{1}:\d{2}:\d{2}$/)) {
        const parts = serial.split(':');
        const formatted = `${parts[0].padStart(2, '0')}:${parts[1]}`;
        console.log('Padded and trimmed H:mm:ss to HH:mm:', formatted);
        return formatted;
      }
      
      // Handle 12-hour AM/PM format (e.g., 7:12:00 AM, 12:05 PM, 1:05 AM)
      if (typeof serial === 'string' && /\b(AM|PM)\b/i.test(serial)) {
        console.log('Processing AM/PM format:', serial);
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
        console.log('Converted AM/PM to 24-hour:', formatted);
        return formatted;
      }
      
      // Handle Excel serial time (decimal fraction of a day)
      if (typeof serial === 'number') {
        console.log('Processing Excel serial time:', serial);
        const totalSeconds = Math.round(86400 * serial);
        const hours = Math.floor(totalSeconds / 3600) % 24;
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        console.log('Converted Excel serial to HH:mm:', formatted);
        return formatted;
      }
      
      // If nothing matches, return the original value
      console.log('No conversion applied, returning original:', serial);
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
      return data.map((item, index) => {
        const newItem = { ...item };
        if (newItem["SHB individual ID (e.g. SHB1)"]) {
          newItem["SHB individual ID"] = newItem["SHB individual ID (e.g. SHB1)"];
          delete newItem["SHB individual ID (e.g. SHB1)"];
        }
        // Add serial number as a field
        newItem.serialNumber = index + 1;
        return newItem;
      });
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

    // New method to handle sort changes
    handleSortChange = (e) => {
      this.setState({ 
        sortField: e.target.value,
        currentPage: 0 
      }, this.updateFilteredData);
    }

    // Method to cycle through sort directions: default -> asc -> desc -> default
    cycleSortDirection = () => {
      this.setState(prevState => {
        let newDirection;
        switch(prevState.sortDirection) {
          case 'default':
            newDirection = 'asc';
            break;
          case 'asc':
            newDirection = 'desc';
            break;
          case 'desc':
          default:
            newDirection = 'default';
            break;
        }
        return { 
          sortDirection: newDirection,
          currentPage: 0
        };
      }, this.updateFilteredData);
    }

    // Method to handle row deletion using _id
    handleDeleteRow = async (rowData) => {
      const recordId = rowData._id || rowData._rowId;
      try {
        // Use setTimeout to avoid React lifecycle warning
        console.log('Deleting row with ID:', recordId);
        
        // If you have a callback to delete by ID, call it here
        if (this.props.onDataDelete) {
          await this.props.onDataDelete(recordId);
        } else if (this.props.onDataUpdate) {
          // Fallback: filter out the row from current data
          const transformedData = this.getStableTransformedData();
          console.log('Transformed data before deletion:', transformedData);
          const updatedData = transformedData.filter(row => 
            (row._id || row._rowId) !== recordId
          );
          this.props.onDataUpdate(updatedData);
        }
      } catch (error) {
        console.error('Error deleting row:', error);
      }
    };

    // Central method to update filtered data
    updateFilteredData = () => {
      const { searchQuery, selectedLocation, selectedSeenHeard, sortField, sortDirection, originalOrder } = this.state;
      const transformedData = this.transformData(this.props.data);

      // Filter data based on search query, location, and Seen/Heard status
      let filteredData = transformedData.filter((obs) => {
        const observerName = obs['Observer name'] || '';
        const birdId = obs['SHB individual ID'] || '';
        const location = obs['Location'] || '';

        const searchMatches =
          observerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          birdId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          location.toLowerCase().includes(searchQuery.toLowerCase());

        const locationMatches = selectedLocation === 'All' || obs['Location'] === selectedLocation;
        const seenHeardMatches = (selectedSeenHeard === 'All' || selectedSeenHeard === '') || obs['Seen/Heard'] === selectedSeenHeard;

        return searchMatches && locationMatches && seenHeardMatches;
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

      this.setState({ filteredData });
    }

    // Helper method to generate a unique ID for each item
    getItemId(item) {
      // Create a unique ID based on combination of fields
      return `${item['Observer name']}-${item['SHB individual ID']}-${item['Date']}-${item['Time']}`;
    }

    // Get stable transformed data with proper IDs
    getStableTransformedData = () => {
      const transformedData = this.transformData(this.props.data);
      // Ensure each row has a stable ID for ag-Grid tracking
      return transformedData.map((row, index) => ({
        ...row,
        _rowId: row._id || row.id || `row-${index}`, // Use _id from MongoDB if available
        _originalIndex: index // Keep track of original index
      }));
    };

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

    componentDidUpdate(prevProps, prevState) {
      // Check if the data from props has changed
      if (prevProps.data !== this.props.data) {
        // Initialize filteredData with updated props data
        const transformedData = this.transformData(this.props.data);
        
        // Store the original order of the data
        const originalOrder = transformedData.map(this.getItemId);
        
        // Apply current sorting if not in default mode
        let dataToShow = transformedData;
        if (this.state.sortDirection !== 'default') {
          dataToShow = this.sortData(transformedData, this.state.sortField, this.state.sortDirection);
        }
    
        // Update the state with the new data and original order
        this.setState({ 
          filteredData: dataToShow,
          originalOrder: originalOrder 
        });
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
      
      this.setState({ 
        filteredData: initialData,
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
                <p><strong>Bird ID:</strong> {this.formatBirdId(obs['SHB individual ID']) || ''}</p>
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
      const { data } = this.props;
      const { searchQuery, selectedSeenHeard, filteredData, sortField, sortDirection } = this.state;
      const seenHeards = getUniqueSeenHeards(data);
      const transformedData = this.getStableTransformedData();

      // Check if user is not WWF-Volunteer to enable editing
      const userRole = localStorage.getItem('userRole'); // Assuming user role is stored in localStorage
      const isEditable = userRole !== 'WWF-Volunteer' && userRole !== null;
      console.log('User role:', userRole, 'Editable:', isEditable);

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
          editable: isEditable
        },
        { 
          headerName: "Number of Bird(s)", 
          field: "Number of Birds",
          cellRenderer: (params) => 
            params.value != null && params.value !== '' ? params.value : '',
          editable: isEditable,
          cellEditor: 'agNumberCellEditor'
        },
        {
          headerName: "Height of Tree",
          field: "Height of tree/m",
          cellRenderer: (params) => 
            params.value != null && params.value !== '' && !isNaN(params.value) ? `${params.value}m` : '',
          editable: isEditable,
          cellEditor: 'agNumberCellEditor'
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
          editable: isEditable
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
          field: "Activity (foraging, preening, calling, perching, others)",
          cellRenderer: (params) => params.value || '',
          width: 300,
          editable: isEditable
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
          sortable: false,
          suppressMenu: true,
          editable: false, // Actions column should never be editable
          pinned: 'right',
          cellRenderer: (params) => {
            return (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  this.handleDeleteRow(params.data);
                }}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginTop: '2px'
                }}
                title="Delete this row"
              >
                Delete
              </button>
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
              domLayout="normal"
              pagination={true}
              defaultColDef={{
                sortable: true,
                resizable: true,
              }}
              paginationPageSize={transformedData.length}
              suppressScrollOnNewData={true}
              suppressMaintainUnsortedOrder={true}
              suppressCellFocus={!isEditable} // Allow cell focus if editable
              suppressRowHoverHighlight={false}
              maintainColumnOrder={true}
              suppressAnimationFrame={true}
              singleClickEdit={isEditable}
              stopEditingWhenCellsLoseFocus={true}
              getRowId={(params) => params.data._id || params.data._rowId || params.node.rowIndex}
              onCellValueChanged={(event) => {
                // Handle cell value changes when editing
                const recordId = event.data._id || event.data._rowId;
                console.log('Cell value changed:', {
                  recordId: recordId,
                  field: event.colDef.field,
                  oldValue: event.oldValue,
                  newValue: event.newValue,
                  rowIndex: event.node.rowIndex
                });
                
                // Update the data in the parent component if callback exists
                if (this.props.onDataUpdate) {
                  // Send the updated row data with its ID for backend update
                  const updatedRowData = { 
                    ...event.data,
                    [event.colDef.field]: event.newValue 
                  };
                  this.props.onDataUpdate(updatedRowData, recordId);
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
                    backgroundColor = '#E0E0E0';  // Soft pastel grey
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
              <span style={{ display: 'inline-block', width: 18, height: 18, background: '#E0E0E0', borderRadius: 3, border: '1px solid #ccc' }}></span>
              <span>Not found</span>
            </div>
          </div>
        </>
      );
    }
  }

  export default ObservationTable;