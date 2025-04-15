// src/components/Dashboard.jsx
import React, { Component } from 'react';
import Map from './Map';
import DateLineChart from './DateLineChart';
import LocationStats from './LocationStats';
import ObservationTable from './ObservationTable';
import { getValidCoordinates } from '../utils/dataProcessing';

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data,
      filteredData: props.data,
      filterLocation: '',
      filterActivity: '',
      activeTab: 'dashboard', // For mobile navigation
    };
  }

  handleFilterChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value }, this.applyFilters);
  };

  applyFilters = () => {
    const { data, filterLocation, filterActivity } = this.state;
    
    let filtered = data;
    
    if (filterLocation) {
      filtered = filtered.filter(item => 
        item.Location && item.Location.toLowerCase().includes(filterLocation.toLowerCase())
      );
    }
    
    if (filterActivity) {
      filtered = filtered.filter(item => 
        item.Activity && item.Activity.toLowerCase().includes(filterActivity.toLowerCase())
      );
    }
    
    this.setState({ filteredData: filtered });
  };

  setActiveTab = (tab) => {
    this.setState({ activeTab: tab });
  };

  render() {
    const { filteredData, filterLocation, filterActivity, activeTab } = this.state;
    const validCoordinates = getValidCoordinates(filteredData);
    
    return (
      <div className="dashboard">
        <h1>Straw-headed Bulbul Observation Dashboard</h1>
        
        {/* Mobile Navigation Tabs */}   
        <div className="nav-tabs mb-20">
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => this.setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-tab ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => this.setActiveTab('map')}
          >
            Map
          </button>
          <button 
            className={`nav-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => this.setActiveTab('data')}
          >
            Data Table
          </button>
        </div>
        
        <div className="filters">
          <div>
            <label htmlFor="filterLocation">Filter by Location</label>
            <input 
              type="text" 
              id="filterLocation" 
              name="filterLocation"
              value={filterLocation}
              onChange={this.handleFilterChange}
              placeholder="e.g. BBNP"
            />
          </div>
          <div>
            <label htmlFor="filterActivity">Filter by Activity</label>
            <input 
              type="text" 
              id="filterActivity" 
              name="filterActivity"
              value={filterActivity}
              onChange={this.handleFilterChange}
              placeholder="e.g. Calling"
            />
          </div>
        </div>
        
        {/* Stats are always visible */}
        <div className="stats-grid">
          <div className="stats-summary">
            <h3>Total Observations</h3>
            <h3 className="stat-value">{filteredData.length}</h3>
          </div>
          <div className="stats-summary">
            <h3>Unique Locations</h3>
            <h3 className="stat-value">{new Set(filteredData.map(item => item.Location)).size}</h3>
          </div>
          <div className="stats-summary">
            <h3>Birds with Coordinates</h3>
            <h3 className="stat-value">{validCoordinates.length}</h3>
          </div>
        </div>
        <div id="export-section">
          {/* Dashboard View */}
          {(activeTab === 'dashboard' || window.innerWidth >= 1024) && (
            <div className="charts-grid">
              <DateLineChart data={filteredData} />
              <LocationStats data={filteredData} />
            </div>
          )}

          {/* Map View */}
          {(activeTab === 'map' || window.innerWidth >= 1024) && (
            <div className="map-section mb-20">
              <h2>Observation Map</h2>
              <Map data={validCoordinates} />
            </div>
          )}
        </div>

        {/* Data Table View (always visible on desktop, tab option on mobile) */}
        {(activeTab === 'data' || window.innerWidth >= 1024) && (
          <div className="table-section">
            <h2>Observation Data</h2>
            <div className="table-container">
              <ObservationTable data={filteredData} />
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default Dashboard;