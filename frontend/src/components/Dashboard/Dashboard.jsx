import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Import tab components
import OverviewTab from '../Tabs/Overview';
import MapViewTab from '../Tabs/MapView/MapViewTab';
import DataViewTab from '../Tabs/DataView/DataViewTab';
import ChartsViewTab from '../Tabs/ChartsView/ChartsViewTab';

// Import filter component
import FilterSection from '../Filters/FilterSection';

// Import utilities
import { getValidCoordinates, getUniqueLocations, getUniqueActivity } from '../../utils/dataProcessing';
import { standardizeCoordinates } from '../../utils/coordinateStandardization';
import { handleTabChange } from '../../utils/mapUtils';
import { filterData } from '../../utils/filterUtils';

// Import CSS
import '../../css/components/Dashboard/DashboardContainer.css';

class DashboardContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data,
      filteredData: props.data,
      filterLocation: '',
      filterActivity: '',
      searchQuery: '',
      activeTab: 'overview', // Main tabs: overview, charts, map, data
      locations: [],
      activities: [],
      validCoordinates: [],
      showPopup: false,
      showExportPopup: false,
      fileName: '',
      orientation: 'landscape',
      isDownloading: false
    };
  }

  componentDidMount() {
    const uniqueLocations = getUniqueLocations(this.props.data);
    const uniqueActivities = getUniqueActivity(this.props.data);
    const validCoordinates = getValidCoordinates(this.props.data);
    
    // Add "All" options as first items in arrays
    const locationsWithAll = ["All Locations", ...uniqueLocations];
    const activitiesWithAll = ["All Activities", ...uniqueActivities];
    
    this.setState({
      locations: locationsWithAll,
      activities: activitiesWithAll,
      validCoordinates: validCoordinates,
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data) {
      const uniqueLocations = getUniqueLocations(this.props.data);
      const uniqueActivities = getUniqueActivity(this.props.data);
      const validCoordinates = getValidCoordinates(this.props.data);
      
      // Add "All" options as first items in arrays
      const locationsWithAll = ["All Locations", ...uniqueLocations];
      const activitiesWithAll = ["All Activities", ...uniqueActivities];
      
      this.setState({
        data: this.props.data,
        filteredData: this.props.data,
        locations: locationsWithAll,
        activities: activitiesWithAll,
        validCoordinates: validCoordinates,
      }, () => {
        this.applyFilters();
      });
    }
  }

  // Filter methods
  handleFilterChange = (filters) => {
    this.setState({ 
      filterLocation: filters.filterLocation,
      filterActivity: filters.filterActivity 
    }, this.applyFilters);
  };

  // Search methods
  handleSearchChange = (searchQuery) => {
    this.setState({ searchQuery }, this.applyFilters);
  };

  applyFilters = () => {
    const { data } = this.state;
    const filters = {
      filterLocation: this.state.filterLocation,
      filterActivity: this.state.filterActivity,
      searchQuery: this.state.searchQuery
    };
    
    let filtered = filterData(data, filters);
    
    // Apply additional search filtering if search query exists
    if (this.state.searchQuery && this.state.searchQuery.trim()) {
      const searchTerm = this.state.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => {
        return Object.values(item).some(value => 
          value && value.toString().toLowerCase().includes(searchTerm)
        );
      });
    }
    
    this.setState({ filteredData: filtered });
  };

  // Tab navigation
  setActiveTab = (tab) => {
    this.setState({ activeTab: tab });
    // Handle map resize when switching to map tab
    handleTabChange(tab);
  };

  // Export functionality
  openExportPopup = () => {
    this.setState({ showExportPopup: true });
  };

  closeExportPopup = () => {
    this.setState({ showExportPopup: false });
  };

  handleExportSubmit = () => {
    const { fileName, orientation } = this.state;
    this.exportChartsPDF(fileName, orientation);
    this.closeExportPopup();
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  exportChartsPDF = async (fileName, orientation, format = 'a4') => {
    this.setState({ isDownloading: true, showPopup: true });

    const dashboardElement = document.querySelector('.dashboard-content');

    if (!dashboardElement) {
      console.error('Dashboard element not found');
      return;
    }

    try {
      const screenWidth = window.innerWidth;
      const scale = screenWidth >= 1024 ? 5 : 2;

      const canvas = await html2canvas(dashboardElement, {
        backgroundColor: '#ffffff',
        useCORS: true,
        scale: scale,
        scrollY: -window.scrollY,
        windowWidth: dashboardElement.scrollWidth,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: format,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const ratioX = pageWidth / imgWidth;
      const ratioY = pageHeight / imgHeight;
      const ratio = Math.min(ratioX, ratioY);

      const newWidth = imgWidth * ratio;
      const newHeight = imgHeight * ratio;

      const xOffset = (pageWidth - newWidth) / 2;
      const yOffset = (pageHeight - newHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, newWidth, newHeight);
      pdf.save(`${fileName || 'dashboard'}.pdf`);

      this.setState({ isDownloading: false });

      setTimeout(() => {
        this.setState({ showPopup: false });
      }, 3000);

    } catch (error) {
      console.error('Error generating PDF:', error);
      this.setState({ isDownloading: false });
      setTimeout(() => {
        this.setState({ showPopup: false });
      }, 3000);
    }
  };

  render() {
    const { 
      filteredData, 
      filterLocation, 
      filterActivity, 
      activeTab, 
      locations, 
      activities, 
      showExportPopup, 
      fileName, 
      orientation,
      validCoordinates,
      showPopup,
      isDownloading
    } = this.state;

    // Standardize coordinates for consistent mapping
    const standardizedFilteredData = standardizeCoordinates(filteredData);
    const standardizedValidCoordinates = getValidCoordinates(standardizedFilteredData);

    return (
      <div className="dashboard-container">
        {/* Background Pattern */}
        <div className="dashboard-background" />

        {/* Header */}
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-title">
              <h3>Straw-headed Bulbul Survey Dashboard</h3>
              <p>Comprehensive Bird Observation Analytics</p>
            </div>
            <div className="header-actions">
              <Link to="/" className="home-link">
                <FontAwesomeIcon icon={faHome} />
                <span>Home</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Filters Section */}
        <FilterSection
          locations={this.state.locations}
          activities={this.state.activities}
          initialLocation={this.state.filterLocation}
          initialActivity={this.state.filterActivity}
          data={this.state.data}
          onFilterChange={this.handleFilterChange}
          onSearchChange={this.handleSearchChange}
        />

        {/* Desktop Tab Navigation */}
        <section className="dashboard-tabs">
          <div className="tabs-container">
            <button 
              className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => this.setActiveTab('overview')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z" />
              </svg>
              Overview
            </button>
            <button 
              className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => this.setActiveTab('charts')}
            >
              <svg viewBox="0 24 24 24" fill="currentColor">
                <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
              </svg>
              Data Visualizations
            </button>
            <button 
              className={`tab-button ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => this.setActiveTab('map')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15,19L9,16.89V5L15,7.11M20.5,3C20.44,3 20.39,3 20.34,3L15,5.1L9,3L3.36,4.9C3.15,4.97 3,5.15 3,5.38V20.5A0.5,0.5 0 0,0 3.5,21C3.55,21 3.61,21 3.66,21L9,18.9L15,21L20.64,19.1C20.85,19 21,18.85 21,18.62V3.5A0.5,0.5 0 0,0 20.5,3Z" />
              </svg>
              Map View
            </button>
            <button 
              className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => this.setActiveTab('data')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
              Data Table
            </button>
          </div>
        </section>

        {/* Tab Content */}
        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <OverviewTab 
              data={standardizedFilteredData}
              filteredData={filteredData}
            />
          )}
          
          {activeTab === 'charts' && (
            <ChartsViewTab 
              data={standardizedFilteredData}
            />
          )}
          
          {activeTab === 'map' && (
            <MapViewTab 
              data={standardizedValidCoordinates}
            />
          )}
          
          {activeTab === 'data' && (
            <DataViewTab 
              data={standardizedFilteredData}
            />
          )}
        </div>

        {/* Export Button */}
        {window.innerWidth >= 1024 && (
          <button
            onClick={this.openExportPopup}
            className="export-button"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
            Export PDF
          </button>
        )}

        {/* Loading Popup */}
        {showPopup && (
          <div className="loading-overlay">
            <div className="loading-content">
              <h3>{isDownloading ? 'Generating PDF...' : 'Download Complete!'}</h3>
              {!isDownloading && (
                <p>Your PDF has been saved successfully.</p>
              )}
              {isDownloading && (
                <div className="loading-animation">
                  <div className="loading-ball"></div>
                  <div className="loading-ball"></div>
                  <div className="loading-ball"></div>
                  <div className="loading-ball"></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Export Popup Modal */}
        {showExportPopup && (
          <div className="export-popup">
            <div className="popup-content">
              <h2>Export Dashboard to PDF</h2>
              <div className="form-group">
                <label htmlFor="fileName">File Name</label>
                <input 
                  type="text" 
                  id="fileName"
                  name="fileName" 
                  value={fileName}
                  placeholder="Enter filename (without extension)"
                  onChange={this.handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="orientation">Page Orientation</label>
                <select 
                  id="orientation"
                  name="orientation"
                  value={orientation}
                  onChange={this.handleInputChange}
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>
              <div className="popup-actions">
                <button 
                  onClick={this.handleExportSubmit} 
                  className="btn btn-primary"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                  Export PDF
                </button>
                <button 
                  onClick={this.closeExportPopup} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default DashboardContainer;
