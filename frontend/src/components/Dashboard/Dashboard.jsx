import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import { faEye, faChartBar, faMapMarkedAlt, faTable } from '@fortawesome/free-solid-svg-icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
      filterLocation: '',
      filterActivity: '',
      searchQuery: '',
      activeTab: 'overview',
      locations: [],
      activities: [],
      validCoordinates: [],
      showPopup: false,
      showExportPopup: false,
      fileName: '',
      orientation: 'landscape',
      isDownloading: false,
      filteredData: props.shbData || []
    };
  }

  componentDidMount() {
    this.updateDataFromProps();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.shbData !== this.props.shbData) {
      this.updateDataFromProps();
    }
  }

  updateDataFromProps = () => {
    const { shbData } = this.props;
    const uniqueLocations = getUniqueLocations(shbData);
    const uniqueActivities = getUniqueActivity(shbData);
    const validCoordinates = getValidCoordinates(shbData);

    const locationsWithAll = ["All Locations", ...uniqueLocations];
    const activitiesWithAll = ["All Activities", ...uniqueActivities];

    this.setState({
      filteredData: shbData,
      locations: locationsWithAll,
      activities: activitiesWithAll,
      validCoordinates: validCoordinates,
    }, this.applyFilters);
  };

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
    const { shbData } = this.props;
    const filters = {
      filterLocation: this.state.filterLocation,
      filterActivity: this.state.filterActivity,
      searchQuery: this.state.searchQuery
    };
    
    let filtered = filterData(shbData, filters);
    
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
    const { activeTab } = this.state;
    // If exporting Excel (data tab), export immediately with hardcoded file name
    if (activeTab === 'data') {
      // Immediately export Excel and skip popup for data tab
      this.exportExcel();
      return;
    }
    else {
      // Immediately export PDF and skip popup for non-data tabs
      this.exportPDF();
      return;
    }
  };

  exportPDF = () => {
    // Use the visible tab's title for the PDF file name
    let tabTitle = '';
    switch (this.state.activeTab) {
      case 'overview':
        tabTitle = 'Key Statistics Overview';
        break;
      case 'charts':
        tabTitle = 'Data Visualizations';
        break;
      case 'map':
        tabTitle = 'Map View';
        break;
      case 'data':
        tabTitle = 'Data Table';
        break;
      default:
        tabTitle = 'Dashboard';
    }
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())} ${pad(now.getMinutes())} hrs`;
    const pdfFileName = `${tabTitle} ${dateStr} ${timeStr}`;
    // Remove blur by setting background and image smoothing options
    this.exportChartsPDF(pdfFileName, this.state.orientation, 'a4', false);
  };

  closeExportPopup = () => {
    this.setState({ showExportPopup: false });
  };

  exportExcel = async () => {
    const { filteredData } = this.state;
    if (!filteredData || filteredData.length === 0) return;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('SHB Survey Data');

    // Prepare data: replace _id with S/N (serial number)
    const processedData = filteredData.map((row, idx) => {
      const newRow = { ...row };
      if ('_id' in newRow) {
        delete newRow._id;
      }
      newRow['S/N'] = idx + 1;
      return newRow;
    });

    // Define columns: S/N first, then the rest (excluding _id)
    const allKeys = Object.keys(processedData[0] || {});
    const columns = ['S/N', ...allKeys.filter(k => k !== 'S/N')];
    worksheet.columns = columns.map(key => ({
      header: key,
      key: key,
      width: 20
    }));

    // Add rows
    processedData.forEach(row => {
      worksheet.addRow(row);
    });

    // Color mapping for Seen/Heard
    const seenColor = 'FFA8E6CF'; // pastel green
    const heardColor = 'FFFFE0B2'; // pastel orange
    const notFoundColor = 'FFE0E0E0'; // pastel grey
    const defaultColor = 'FFF9F9F9'; // default light gray

    // Style header row
    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FF333333' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB3B3B3' } // darker gray for header
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Style data rows with color based on Seen/Heard
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber !== 1) {
        // Find the Seen/Heard value for this row
        const seenHeardColIdx = worksheet.columns.findIndex(col => col.header === 'Seen/Heard') + 1;
        let bgColor = defaultColor;
        if (seenHeardColIdx > 0) {
          const value = row.getCell(seenHeardColIdx).value;
          if (value === 'Seen') bgColor = seenColor;
          else if (value === 'Heard') bgColor = heardColor;
          else if (value === 'Not found') bgColor = notFoundColor;
        }
        row.eachCell(cell => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });

    // Generate file name: SHB Survey Data_dd-mm-yyyy_HH-MM.xlsx
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())} ${pad(now.getMinutes())} hrs`;
    const fileName = `SHB Survey Data ${dateStr} ${timeStr}.xlsx`;

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
  };


  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

exportChartsPDF = async (fileName, orientation, format = 'a4', useImageSmoothing) => {
  this.setState({ isDownloading: true, showPopup: false });
  const dashboardElement = document.querySelector('.dashboard-content');
  if (!dashboardElement) {
    console.error('Dashboard element not found');
    return;
  }
  // Add a class to force solid background and full opacity for export
  dashboardElement.classList.add('dashboard-export-solid-bg');
  try {
    const screenWidth = window.innerWidth;
    const scale = screenWidth >= 1024 ? 5 : 2;
    const canvas = await html2canvas(dashboardElement, {
      useCORS: true,
      scale: scale,
      scrollY: -window.scrollY,
      windowWidth: dashboardElement.scrollWidth,
      imageSmoothingEnabled: useImageSmoothing,
      imageSmoothingQuality: useImageSmoothing ? 'high' : 'low',
      backgroundColor: '#fff'
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
    pdf.save(`${fileName}.pdf`);
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
  } finally {
    // Remove the export class after export
    dashboardElement.classList.remove('dashboard-export-solid-bg');
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
      isDownloading,
    } = this.state;

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
          locations={locations}
          activities={activities}
          initialLocation={filterLocation}
          initialActivity={filterActivity}
          data={filteredData}
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
              <FontAwesomeIcon icon={faEye} />
              <span style={{ marginLeft: 8 }}>Overview</span>
            </button>
            <button 
              className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => this.setActiveTab('charts')}
            >
              <FontAwesomeIcon icon={faChartBar} />
              <span style={{ marginLeft: 8 }}>Data Visualizations</span>
            </button>
            <button 
              className={`tab-button ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => this.setActiveTab('map')}
            >
              <FontAwesomeIcon icon={faMapMarkedAlt} />
              <span style={{ marginLeft: 8 }}>Map View</span>
            </button>
            <button 
              className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => this.setActiveTab('data')}
            >
              <FontAwesomeIcon icon={faTable} />
              <span style={{ marginLeft: 8 }}>Data Table</span>
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
              onOpenNewSurveyModal={this.props.onOpenNewSurveyModal}
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
            {activeTab === 'data' ? 'Export Excel' : 'Export PDF'}
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
        )}
      </div>
    );
  }
}

export default DashboardContainer;
