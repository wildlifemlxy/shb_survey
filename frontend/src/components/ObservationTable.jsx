import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import {getUniqueLocations, getUniqueSeenHeards } from '../utils/dataProcessing';
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

  convertExcelTime(serial) {
    if (!serial) return '';
    const totalSeconds = Math.round(86400 * serial);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  transformData(data) {
    return data.map((item) => {
      const newItem = { ...item };
      if (newItem["SHB individual ID (e.g. SHB1)"]) {
        newItem["SHB individual ID"] = newItem["SHB individual ID (e.g. SHB1)"];
        delete newItem["SHB individual ID (e.g. SHB1)"];
      }
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
          cardBackgroundColor = '#D1C4E9';  // Soft pastel purple
          break;
        case "Not found":
          cardBackgroundColor = '#FFCDD2';  // Soft pastel red
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
              <p><strong>Observer:</strong> {obs['Observer name']}</p>
              <p><strong>Bird ID:</strong> {obs['SHB individual ID']}</p>
              <p><strong>Activity:</strong> {obs["Activity (foraging, preening, calling, perching, others)"]}</p>
              <p><strong>Time:</strong> {this.convertExcelTime(obs.Time)}</p>
              <p><strong>Height of Tree:</strong> {obs["Height of tree/m"]}m</p>
              <p><strong>Height of Bird:</strong> {obs["Height of bird/m"]}m</p>
              <p><strong>Number of Bird(s):</strong> {obs["Number of Birds"]}</p>
              <p><strong>Seen/Heard:</strong> {obs["Seen/Heard"]}</p>
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
    const transformedData = this.transformData(data);

    // Get sort mode display text
    const getSortDirectionText = () => {
      switch(sortDirection) {
        case 'asc': return '↑ Ascending';
        case 'desc': return '↓ Descending';
        default: return '↕ Default';
      }
    };

    // Get sort mode button color (even darker shades)
    const getSortButtonColor = () => {
      switch (sortDirection) {
        case 'asc':
          return '#1f5c3b'; // Darker green
        case 'desc':
          return '#4b2c47'; // Darker purple
        default:
          return '#2f2f2f'; // Darker gray
      }
    };

    const columns = [
      { headerName: "S/N", valueGetter: "node.rowIndex + 1", width: 70 },
      { headerName: "Observer", field: "Observer name", width: 300 },
      { headerName: "Bird ID", field: "SHB individual ID", width: 100 },
      {
        headerName: "Location",
        field: "Location",
        cellRenderer: (params) =>
          `${params.value} (${params.data.Lat}, ${params.data.Long})`,
        width: 600
      },
      { headerName: "Number of Bird(s)", field: "Number of Birds" },
      {
        headerName: "Height of Tree",
        field: "Height of tree/m",
        cellRenderer: (params) => `${params.value}m`,
      },
      {
        headerName: "Height of Bird",
        field: "Height of bird/m",
        cellRenderer: (params) => `${params.value}m`,
      },
      { headerName: "Date", field: "Date" },
      {
        headerName: "Time",
        field: "Time",
        cellRenderer: (params) => this.convertExcelTime(params.value),
      },
      {
        headerName: "Activity",
        field: "Activity (foraging, preening, calling, perching, others)",
        width: 900
      },
      {
        headerName: "Seen/Heard",
        field: "Seen/Heard",
        width: 300
      }
    ];

    return (
      <>
        <div className="mobile-observation-cards hide-desktop">
          <div className="filters" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
            {/* Added search input */}
            <input
              type="text"
              placeholder="Search by observer, bird ID, or location..."
              value={searchQuery}
              onChange={this.handleSearchChange}
              style={{
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                width: '100%'
              }}
            />
            
            <div style={{ display: 'flex', gap: '1rem', width: "100%", flexWrap: 'wrap' }}>  
            <input
              type="text"
              value={selectedSeenHeard}
              onChange={this.handleSeenHeardChange}
              placeholder="All Status"
              list="seenHeardOptions"
              style={{
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                flex: 1
              }}
            />

            {/* Datalist for filtering options */}
            <datalist id="seenHeardOptions">
              <option value="All" /> 
              {seenHeards
                .map((seenHeard, index) => (
                  <option key={index} value={seenHeard} />
                ))}
            </datalist>

            </div>
            
            {/* New sorting controls */}
            <div style={{ display: 'flex', gap: '1rem', width: "100%", flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <label style={{ marginRight: '0.5rem', fontSize: '1rem' }}>Sort by:</label>
                <select 
                  value={sortField} 
                  onChange={this.handleSortChange} 
                  style={{
                    padding: '0.5rem',
                    fontSize: '1rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    flex: 1
                  }}
                >
                  <option value="Date">Date</option>
                  <option value="Seen/Heard">Seen/Heard</option>
                  <option value="Activity">Activity</option>
                  <option value="Time">Time</option>
                  <option value="Location">Location</option>
                </select>
              </div>
              
              <button 
                onClick={this.cycleSortDirection}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '1rem',
                  borderRadius: '4px',
                  background: getSortButtonColor(),
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 'auto',
                  transition: 'background-color 0.3s',
                }}
              >
                {getSortDirectionText()}
              </button>
            </div>
          </div>

          {this.renderMobileCards()}
          {this.renderPagination()}
        </div>

        {window.innerWidth >= 1024 && (
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
              getRowStyle={params => {
                let backgroundColor = '#f9f9f9';  // Default light gray

                // Adjust row background based on "Seen/Heard"
                switch (params.data["Seen/Heard"]) {
                  case "Seen":
                    backgroundColor = '#A8E6CF';  // Soft pastel green
                    break;
                  case "Heard":
                    backgroundColor = '#D1C4E9';  // Soft pastel purple
                    break;
                  case "Not found":
                    backgroundColor = '#FFCDD2';  // Soft pastel red
                    break;
                }

                return { backgroundColor };  // Apply background color to the row
              }}
            />
          </div>
        )}
      </>
    );
  }
}

export default ObservationTable;