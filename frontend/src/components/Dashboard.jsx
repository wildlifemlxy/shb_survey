import React, { Component } from 'react';
import Map from './Map';
import DateLineChart from './DateLineChart';
import LocationStats from './LocationStats';
import ObservationTable from './ObservationTable';
import D3TreeHeightChart from './D3TreeHeightChart';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getValidCoordinates, getUniqueLocations, getUniqueActivity } from '../utils/dataProcessing';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';

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
      validCoordinates: [],
      showPopup: false,
      showExportPopup: false,  // New state to control the export popup visibility
      fileName: '',
      orientation: 'landscape', // Default orientation
      isDownloading: false
    };
  }

  openExportPopup = () => {
    this.setState({ showExportPopup: true });
  };

  closeExportPopup = () => {
    this.setState({ showExportPopup: false });
  };

  handleExportSubmit = () => {
    const { fileName, orientation } = this.state;
    console.log("Export:", this.state.orientation);
    this.exportChartsPDF(fileName, orientation);
    this.closeExportPopup();
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  exportChartsPDF = async (fileName, orientation, format = 'a4') => {
    this.setState({ isDownloading: true, showPopup: true, popupMessage: 'Loading...' });
  
    const dashboardElement = document.querySelector('.charts-grid');
  
    if (!dashboardElement) {
      console.error('Dashboard element not found');
      return;
    }
  
    try {
      // Dynamically set the scale based on the screen size
      const screenWidth = window.innerWidth;
      const scale = screenWidth >= 1024 ? 5 : 2; // Higher scale for larger screens, lower for smaller screens
  
      const canvas = await html2canvas(dashboardElement, {
        backgroundColor: '#ffffff',
        useCORS: true,
        scale: scale, // Dynamically adjust scale
        scrollY: -window.scrollY,
        windowWidth: dashboardElement.scrollWidth,
      });
  
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
  
      // Dynamically set format based on passed parameter
      const pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: format, // Dynamically choose the format (e.g., 'a4')
      });
  
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
  
      // Use the same layout for all screen sizes
      const ratioX = pageWidth / imgWidth;
      const ratioY = pageHeight / imgHeight;
      const ratio = Math.min(ratioX, ratioY); // Ensure the image fits within the page dimensions
  
      const newWidth = imgWidth * ratio;
      const newHeight = imgHeight * ratio;
  
      // Add the image to the PDF
      pdf.addImage(imgData, 'PNG', 0, 0, newWidth, newHeight);
  
      const saveFileName = fileName?.trim() ? `${fileName}.pdf` : 'dashboard_with_charts.pdf';
      pdf.save(saveFileName);
  
      // After saving, show the "Download Finished" message
      this.setState({ isDownloading: false, popupMessage: 'Download Finished' });
  
      // Automatically close the popup after 5-10 seconds
      setTimeout(() => {
        this.setState({ showPopup: false });
      }, 10000); // Set a delay (5 seconds)
    } catch (error) {
      console.error('Error generating high-res PDF:', error);
      this.setState({ isDownloading: false, popupMessage: 'Error during download' });
  
      // Automatically close the popup after 5-10 seconds if there's an error
      setTimeout(() => {
        this.setState({ showPopup: false });
      }, 10000); // Set a delay (5 seconds)
    }
  };

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
    const { filteredData, filterLocation, filterActivity, activeTab, locations, activitys, showExportPopup, fileName, orientation } = this.state;
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

    const exportButtonStyle = {
      padding: '0.5rem 1rem',
      fontSize: '1rem',
      border: '1px solid #ccc',
      borderRadius: '4px',
      background: '#4a5568',
      color: '#fff',
      cursor: 'pointer',
      marginBottom: '1rem',
      display: 'block', // Ensures the button is a block element
      marginLeft: 'auto', // Centers the button horizontally
      marginRight: 'auto', // Centers the button horizontally
    };
    
    const popupOverlayStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,  // Ensure it's above all other elements
    };

    const popupContentStyle = {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '8px',
      width: '400px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    };
    
    const inputStyle = {
      width: '100%',
      padding: '0.5rem',
      marginTop: '0.5rem',
    };
    
    const selectStyle = {
      width: '100%',
      padding: '0.5rem',
      marginTop: '0.5rem',
    };
    
    // Updated style for each ball with delay for sequential bounce
    const ballStyle = (index) => ({
      width: '15px',
      height: '15px',
      margin: '20px 5px',
      borderRadius: '50%',
      backgroundColor: '#333',
      animation: `bounce 1.2s ${(index + 1) * 0.3}s infinite ease-in-out`, // Sequential delay
    });

    // Add the bounce animation to the stylesheet
    const styleSheet = document.styleSheets[0];
      styleSheet.insertRule(`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }
      `, styleSheet.cssRules.length);

    return (
      <div className="dashboard">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              position: 'sticky',
              top: 0,
              backgroundColor: 'white', // Adding background color to ensure content doesn't show through
              zIndex: 1005, // Ensures the header stays on top of other elements
            }}>
            <h1 style={{
              textAlign: 'center',
              margin: 0,
              flexGrow: 1
            }}>
              Straw-headed Bulbul Observation Dashboard
            </h1>
            <Link to="/" style={{
              color: 'black',
              padding: '10px 15px',
              textDecoration: 'none',
              borderRadius: '5px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FontAwesomeIcon icon={faHome} style={{ fontSize: '3rem' }} />
            </Link>
          </div>  
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

        {
          window.innerWidth >= 1024 && (
            // Export Button
            <button
              onClick={this.openExportPopup}
              style={exportButtonStyle}
            >
              Export Chart To PDF
            </button>
          )
        }

        {this.state.showPopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Semi-transparent background
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,  // Ensure it is on top of other elements
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            }}>
              {/* Loading Text or Download Finished */}
              <p style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#333333',  // Dark text for better readability
                marginBottom: '10px',  // Space between text and bouncing balls
              }}>
                {this.state.isDownloading ? 'Loading...' : 'Download Finished'}
              </p>

              {/* If the download is finished, show this message */}
              {!this.state.isDownloading && (
                <p style={{
                  fontSize: '14px',
                  color: '#555555',  // Lighter text color
                  marginTop: '10px',  // Space between the two lines
                }}>
                  You can open it after the popup closes
                </p>
              )}

              {/* Bouncing Balls */}
              {this.state.isDownloading && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <div style={ballStyle(0)}></div>
                  <div style={ballStyle(1)}></div>
                  <div style={ballStyle(2)}></div>
                  <div style={ballStyle(3)}></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Export Popup Modal */}
        {showExportPopup && (
          <div className="export-popup" style={popupOverlayStyle}>
            <div className="popup-content" style={popupContentStyle}>
              <h2>Export PDF</h2>
              <label>
                File Name:
                <input 
                  type="text" 
                  name="fileName" 
                  value={fileName}
                  placeholder={"Please type in the filename without extension"}
                  onChange={this.handleInputChange}
                  style={inputStyle}
                />
              </label>
              <br />
              <label>
                Orientation:
                <select 
                  name="orientation"
                  value={orientation}
                  onChange={this.handleInputChange}
                  style={selectStyle}
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </label>
              <br />
              <div 
                style={{
                  display: 'flex', 
                  justifyContent: 'space-between', // This will space out the buttons
                  gap: '0.25rem', // Smaller gap between buttons
                  width: '30%', // Allows the container to adapt to the content widt
                  marginTop: '2rem',
                  marginBottom: 'auto',
                  marginLeft: '30%',
                  marginRight: 'auto',
                }}
              >
                <button onClick={this.handleExportSubmit} style={{
                  padding: '0.5rem 1rem',
                  fontSize: '1rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  background: '#4a5568',
                  color: '#fff',
                  cursor: 'pointer',
                }}>
                  Export
                </button>
                <button onClick={this.closeExportPopup} style={{
                  padding: '0.5rem 1rem',
                  fontSize: '1rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  background: '#4a5568',
                  color: '#fff',
                  cursor: 'pointer',
                }}>
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

export default Dashboard;
