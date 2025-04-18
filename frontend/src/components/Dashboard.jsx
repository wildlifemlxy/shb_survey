import React, { Component } from 'react';
import Map from './Map';
import DateLineChart from './DateLineChart';
import LocationStats from './LocationStats';
import ObservationTable from './ObservationTable';
import D3TreeHeightChart from './D3TreeHeightChart';
import ActivityPredictorClass from "./ActivityPredictorClass";
import { getValidCoordinates, getUniqueLocations, getUniqueActivity } from '../utils/dataProcessing';

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data,
      filteredData: props.data,
      filterLocation: '',
      filterActivity: '',
      activeTab: 'dashboard', // For mobile navigation
      locations: [],
      activitys: [],
      validCoordinates: []
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
        item["Activity (foraging, preening, calling, perching, others)"] && item["Activity (foraging, preening, calling, perching, others)"].toLowerCase().includes(filterActivity.toLowerCase())
      );
    }
    
    this.setState({ filteredData: filtered });
  };

  setActiveTab = (tab) => {
    this.setState({ activeTab: tab });
  };

  componentDidMount() {
    const uniqueLocations = getUniqueLocations(this.props.data);
    const uniqueActivity = getUniqueActivity(this.props.data);
   
    this.setState({ 
      locations: uniqueLocations, 
      activitys: uniqueActivity, 
    });
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize = () => {
    this.setState({ windowWidth: window.innerWidth });
  };

  render() {
    const { filteredData, filterLocation, filterActivity, activeTab, locations, activitys } = this.state;
    const validCoordinates = getValidCoordinates(filteredData);  // Use this.props.data instead of filteredData

    const totalBirds = filteredData.reduce((sum, obs) => {
        const count = parseInt(obs["Number of Birds"], 10);
        return sum + (isNaN(count) ? 0 : count);
    }, 0);

    const totalSeenBirds = filteredData.reduce((sum, obs) => {
      if (obs["Seen/Heard"] === "Seen") {
        const count = parseInt(obs["Number of Birds"], 10);
        return sum + (isNaN(count) ? 0 : count);
      }
      return sum;
    }, 0);
    
    const totalHeardBirds = filteredData.reduce((sum, obs) => {
      if (obs["Seen/Heard"] === "Heard") {
        const count = parseInt(obs["Number of Birds"], 10);
        return sum + (isNaN(count) ? 0 : count);
      }
      return sum;
    }, 0);
    
    const totalNotFoundBirds = filteredData.reduce((sum, obs) => {
      if (obs["Seen/Heard"] === "Not found") {
        const count = parseInt(obs["Number of Birds"], 10);
        return sum + (isNaN(count) ? 0 : count);
      }
      return sum;
    }, 0);
    
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
          {/*<button 
            className={`nav-tab ${activeTab === 'AI' ? 'active' : ''}`}
            onClick={() => this.setActiveTab('AI')}
          >
            AI
          </button>*/}
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
              list="locationOptions"
              placeholder="e.g. BBNP"
            />
            <datalist id="locationOptions">
              {locations.map((location, index) => (
                <option key={index} value={location} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="filterActivity">Filter by Activity</label>
            <input 
              type="text" 
              id="filterActivity" 
              name="filterActivity"
              value={filterActivity}
              onChange={this.handleFilterChange}
              list="activitysOptions"
              placeholder="e.g. Calling"
            />
            <datalist id="activitysOptions">
              {activitys.map((activity, index) => (
                <option key={index} value={activity} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Stats are always visible */}
        {(activeTab === 'dashboard' || window.innerWidth >= 1024) && (
        <div className="stats-grid">
          <div className="stats-summary">
            <h1>Total Observations</h1>
            <h2 className="stat-value" style={{ color: '#8884d8' }}>{filteredData.length}</h2>
            <h3 className="stat-value" style={{ color: '#6DAE80' }}>Seen: {filteredData.filter(item => item["Seen/Heard"] === "Seen").length}</h3>
            <h3 className="stat-value" style={{ color: '#B39DDB' }}>Heard: {filteredData.filter(item => item["Seen/Heard"] === "Heard").length}</h3>
            <h3 className="stat-value" style={{ color: '#EF9A9A' }}>Not Found: {filteredData.filter(item => item["Seen/Heard"] === "Not found").length}</h3>
          </div>
          <div className="stats-summary">
            <h1>Unique Location Status </h1>
            <h2 style={{ color: '#8884d8' }}>
              {new Set(filteredData.map(item => `${item.Location}-${item["Seen/Heard"]}`)).size}
            </h2>
            <h3 className="stat-value" style={{ color: '#6DAE80' }}>
              Seen: {new Set(filteredData.filter(item => item["Seen/Heard"] === "Seen").map(item => item.Location)).size}
            </h3>
            <h3 className="stat-value" style={{ color: '#B39DDB' }}>
              Heard: {new Set(filteredData.filter(item => item["Seen/Heard"] === "Heard").map(item => item.Location)).size}
            </h3>
            <h3 className="stat-value" style={{ color: '#EF9A9A' }}>
              Not Found: {new Set(filteredData.filter(item => item["Seen/Heard"] === "Not found").map(item => item.Location)).size}
            </h3>
          </div>
          <div className="stats-summary">
            <h1>Total Birds</h1>
            <h2 className="stat-value" style={{ color: '#8884d8' }}>
              {totalBirds}
            </h2>
            <h3 className="stat-value" style={{ color: '#6DAE80' }}>
              Seen: {totalSeenBirds}
            </h3>
            <h3 className="stat-value" style={{ color: '#B39DDB' }}>
              Heard: {totalHeardBirds}
            </h3>
            <h3 className="stat-value" style={{ color: '#EF9A9A' }}>
              Not Found: {totalNotFoundBirds}
            </h3>
          </div>
        </div>
      )}

        {/* Dashboard View */}
        {(activeTab === 'dashboard' || window.innerWidth >= 1024) && (
          <div className="charts-grid">
            <DateLineChart data={filteredData} />
            <LocationStats data={filteredData} />
            <D3TreeHeightChart data={filteredData} />
          </div>
        )}

        {/* Map View */}
        {(activeTab === 'map' || window.innerWidth >= 1024)  && (
          <div className="map-section mb-20">
            <h2>Observation Map</h2>
            <Map data={validCoordinates} />
          </div>
        )}

       {/* {(activeTab === 'AI' || window.innerWidth >= 1024)  && (
          <div>
            <ActivityPredictorClass data={this.props.data}/>
          </div>
        )}*/}

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
