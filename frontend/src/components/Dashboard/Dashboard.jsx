import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import { faEye, faChartBar, faMapMarkedAlt, faTable } from '@fortawesome/free-solid-svg-icons';


// Import tab components
import OverviewTab from '../Tabs/Overview';
import MapViewTab from '../Tabs/MapView/MapViewTab';
import DataViewTab from '../Tabs/DataView/DataViewTab';
import RifleRangeRoadDataViewTab from '../Tabs/DataView/RifleRangeRoadDataViewTab';
import ChartsViewTab from '../Tabs/ChartsView/ChartsViewTab';

// Import modal components
import AddEventModal from '../../Events/Type/AddEventModal';

// Import filter component
import FilterSection from '../Filters/FilterSection';

// Import utilities
import { getValidCoordinates, getUniqueLocations, getUniqueActivity } from '../../utils/dataProcessing';
import { standardizeCoordinates } from '../../utils/coordinateStandardization';
import { handleTabChange } from '../../utils/mapUtils';
import { filterData } from '../../utils/filterUtils';
import { filterExternalMapRecords, isExternalSurveySelection, matchesSelectedSurveyType } from '../../utils/surveyTypeUtils';

// Import CSS
import '../../css/components/Dashboard/DashboardContainer.css';
import '../../css/components/Tabs/RifleRangeRoadDataViewTab.css';

class DashboardContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      filterLocation: '',
      filterActivity: '',
      searchQuery: '',
      activeTab: 'overview',
      selectedDataType: props.defaultDataType || 'All',
      filterType: '',
      filterTimeOfDay: '',
      filterWeather: '',
      filterTaxa: '',
      filterRoadkill: '',
      filterRoadSide: '',
      locations: [],
      activities: [],
      validCoordinates: [],
      filteredData: (props.dashboardData || props.shbData || props.shbDataForPublic?.surveys || []),
      currentDateTime: this.getFormattedDateTime(),
      showAddEventModal: false,
    };
    this.timer = null;
    this.isUpdating = false; // Flag to prevent infinite loops
  }

  getFormattedDateTime = () => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[now.getDay()];
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const time = now.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `${day}, ${dd}/${mm}/${yyyy} ${time}`;
  }

  componentDidMount() {
    // Initialize data from props
    if (this.getDashboardData().length > 0) {
      this.updateDataFromProps();
    }
    
    // Start the timer for date/time updates
    this.timer = setInterval(() => {
      this.setState({ currentDateTime: this.getFormattedDateTime() });
    }, 1000);
  }

  componentWillUnmount() {
    // Clear the timer
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    // Reset the updating flag
    this.isUpdating = false;
  }

  componentDidUpdate(prevProps) {
    // Only update if shbData actually changed and is different
    if (prevProps.shbData !== this.props.shbData || prevProps.dashboardData !== this.props.dashboardData) {
      // Use a flag to prevent infinite loops
      if (!this.isUpdating) {
        this.isUpdating = true;
        this.updateDataFromProps();
        // Reset the flag after state update is complete
        setTimeout(() => {
          this.isUpdating = false;
        }, 0);
      }
    }
  }

  updateDataFromProps = () => {
    const surveyData = this.getDashboardData();
    console.log('Updating data from props:', surveyData);

    const uniqueLocations = getUniqueLocations(surveyData);
    const uniqueActivities = getUniqueActivity(surveyData);
    const validCoordinates = getValidCoordinates(surveyData);

    const locationsWithAll = ["All Locations", ...uniqueLocations];
    const activitiesWithAll = ["All Activities", ...uniqueActivities];

    // Only update state if data has actually changed
    const stateUpdate = {
      filteredData: surveyData,
      locations: locationsWithAll,
      activities: activitiesWithAll,
      validCoordinates: validCoordinates,
    };
    
    this.setState(stateUpdate, () => {
      // Apply filters after state update is complete
      this.applyFilters();
    });
  };

  getDashboardData = () => {
    const data = this.getRawDashboardData();
    const records = Array.isArray(data) ? data : [];
    if (!this.props.enableTypeTabs || this.state.selectedDataType === 'All') {
      return records;
    }

    const selectedType = String(this.state.selectedDataType || '').trim();
    return records.filter(record => matchesSelectedSurveyType(record, selectedType));
  };

  getDataTypes = () => {
    const records = this.props.dashboardData || [];
    return [...new Set(records
      .map(record => String(record.type || '').trim())
      .filter(Boolean))];
  };

  getDataTypeLabel = (dataType) => dataType
    .replace(/^Data\s*\(/, '')
    .replace(/\)\s*cleaned$/, '')
    .trim();

  getRawDashboardData = () => {
    const data = this.props.enableTypeTabs
      ? this.props.dashboardData
      : this.props.dashboardData || this.props.shbData || this.props.shbDataForPublic?.surveys;
    return Array.isArray(data) ? data : [];
  };

  getTimeOfDay = (record) => {
    const value = record['Survey Start Time'] || record['Survey Start Time and End Time'] || '';
    const hour = Number.parseInt(String(value).trim().match(/^\d{1,2}/)?.[0], 10);
    return Number.isFinite(hour) ? (hour < 12 ? 'Morning' : 'Evening') : '';
  };

  getCustomFilters = () => {
    const records = this.getRawDashboardData();
    const uniqueValues = key => [...new Set(records.map(record => record[key]).filter(value => value !== null && value !== undefined && String(value).trim() !== '').map(String))].sort();
    const roadSideKey = records.some(record => Object.prototype.hasOwnProperty.call(record, 'Which side of the road was it on?'))
      ? 'Which side of the road was it on?'
      : 'Which side of the road is it on? (N/S/On road)';
    return [
      { key: 'filterType', label: 'Survey Type', options: uniqueValues('type'), value: this.state.filterType },
      { key: 'filterTimeOfDay', label: 'Time of Day', options: ['Morning', 'Evening'], value: this.state.filterTimeOfDay },
      { key: 'filterWeather', label: 'Weather Conditions', options: uniqueValues('Weather Conditions'), value: this.state.filterWeather },
      { key: 'filterTaxa', label: 'Taxa', options: uniqueValues('Taxa'), value: this.state.filterTaxa },
      { key: 'filterRoadkill', label: 'Roadkill', options: uniqueValues('Roadkill?'), value: this.state.filterRoadkill },
      { key: 'filterRoadSide', label: 'Road Side', options: uniqueValues(roadSideKey), value: this.state.filterRoadSide }
    ];
  };

  getSurveyCount = (records) => {
    const surveyKeys = new Set();
    records.forEach(record => {
      const date = record['Survey Date'] || record.Date || '';
      const start = record['Survey Start Time'] || '';
      const end = record['Survey End Time'] || '';
      const combinedTime = record['Survey Start Time and End Time'] || '';
      const timeKey = start || end ? `${start}|${end}` : combinedTime;
      if (date || timeKey) surveyKeys.add(`${date}|${timeKey}`);
    });
    return surveyKeys.size;
  };

  setDataType = (selectedDataType) => {
    this.setState({
      selectedDataType,
      filterType: selectedDataType === 'All' ? '' : selectedDataType
    }, this.updateDataFromProps);
  };

  // Filter methods
  handleFilterChange = (filters) => {
    this.setState(previousState => ({
      selectedDataType: filters.filterType !== undefined
        ? (filters.filterType || 'All')
        : previousState.selectedDataType,
      filterLocation: filters.filterLocation ?? previousState.filterLocation,
      filterActivity: filters.filterActivity ?? previousState.filterActivity,
      filterType: filters.filterType ?? previousState.filterType,
      filterTimeOfDay: filters.filterTimeOfDay ?? previousState.filterTimeOfDay,
      filterWeather: filters.filterWeather ?? previousState.filterWeather,
      filterTaxa: filters.filterTaxa ?? previousState.filterTaxa,
      filterRoadkill: filters.filterRoadkill ?? previousState.filterRoadkill,
      filterRoadSide: filters.filterRoadSide ?? previousState.filterRoadSide
    }), this.applyFilters);
  };

  // Search methods
  handleSearchChange = (searchQuery) => {
    this.setState({ searchQuery }, this.applyFilters);
  };

  applyFilters = () => {
    const surveyData = this.getDashboardData();
    
    // Early return if no data or currently updating
    if (this.isUpdating) {
      return;
    }
    
    const filters = {
      filterLocation: this.state.filterLocation,
      filterActivity: this.state.filterActivity,
      searchQuery: this.state.searchQuery
    };
    
    let filtered = filterData(surveyData, filters);

    const customFilters = {
      filterType: record => record.type,
      filterTimeOfDay: record => this.getTimeOfDay(record),
      filterWeather: record => record['Weather Conditions'],
      filterTaxa: record => record.Taxa,
      filterRoadkill: record => record['Roadkill?'],
      filterRoadSide: record => record['Which side of the road was it on?'] || record['Which side of the road is it on? (N/S/On road)']
    };
    Object.entries(customFilters).forEach(([filterKey, getValue]) => {
      const filterValue = this.state[filterKey];
      if (filterValue) filtered = filtered.filter(record => String(getValue(record) || '').trim() === filterValue);
    });
    
    // Apply additional search filtering if search query exists
    if (this.state.searchQuery && this.state.searchQuery.trim()) {
      const searchTerm = this.state.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => {
        return Object.values(item).some(value => 
          value && value.toString().toLowerCase().includes(searchTerm)
        );
      });
    }
    
    // Only update state if filtered data has actually changed
    if (JSON.stringify(filtered) !== JSON.stringify(this.state.filteredData)) {
      this.setState({ filteredData: filtered });
    }
  };

  // Tab navigation
  setActiveTab = (tab) => {
    this.setState({ activeTab: tab });
    // Handle map resize when switching to map tab
    handleTabChange(tab);
  };

  // Handle after save for AddEventModal
  handleAfterSave = () => {
    // Close the modal after saving
    this.setState({ showAddEventModal: false });
    // Could add additional logic here if needed
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
      imageSmoothingQuality: useImageSmoothing ? 'high' : 'low'
      // backgroundColor removed to allow CSS gradient
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
    const projectPath = this.props.projectPath || '/StrawheadedBulbul';
    const projectName = this.props.projectName || 'Straw Headed Bulbul';
    const isRifleRangeRoad = ['Rifle Range Road', 'Rifle Range Road Project'].includes(projectName);
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
      showAddEventModal,
    } = this.state;

    const standardizedFilteredData = standardizeCoordinates(filteredData);
    const standardizedValidCoordinates = getValidCoordinates(standardizedFilteredData);
    const dataTypes = this.props.enableTypeTabs
      ? [
        ...(this.props.hideAllDataType ? [] : ['All']),
        ...this.getDataTypes()
      ]
      : [];
    const showMapTab = true;
    const mapRequiresSurveyType = this.props.enableTypeTabs && this.state.selectedDataType === 'All';
    const isExternalSurvey = isRifleRangeRoad && isExternalSurveySelection(this.state.selectedDataType, filteredData);
    const mapCoordinates = isRifleRangeRoad
      ? (isExternalSurvey ? filterExternalMapRecords(filteredData) : getValidCoordinates(filteredData))
      : standardizedValidCoordinates;

    return (
      <div className="dashboard-container">
        {/* Background Pattern */}
        <div className="dashboard-background" />

        {/* Header */}
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-title">
              <h1>{projectName} Survey Dashboard</h1>
              <div className="dashboard-datetime">
                {this.state.currentDateTime}
              </div>
              <p>{this.props.enableTypeTabs ? 'Comprehensive Wildlife Survey Analytics' : 'Comprehensive Bird Observation Analytics'}</p>
            </div>
            <div className="header-actions">
              <Link to={projectPath} state={{ viaAppNavigation: true }} className="home-link">
                <FontAwesomeIcon icon={faHome} />
                <span>Home</span>
              </Link>
            </div>
          </div>
        </header>
        {/* Filters Section */}
        <FilterSection
          locations={locations || []}
          activities={activities || []}
          initialLocation={filterLocation}
          initialActivity={filterActivity}
          data={filteredData || []}
          onFilterChange={this.handleFilterChange}
          onSearchChange={this.handleSearchChange}
          customFilters={this.props.enableTypeTabs ? this.getCustomFilters() : []}
          hideLocationActivity={this.props.hideLocationActivity}
          className={this.props.filterClassName}
        />
        {/* Desktop Tab Navigation */}
        <section className="dashboard-tabs">
          <div className="tabs-container dashboard-tabs-container">
            <div className="dashboard-main-tabs-row">
              <button 
              key="overview-tab"
              className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => this.setActiveTab('overview')}
            >
              <FontAwesomeIcon icon={faEye} />
              <span style={{ marginLeft: 8 }}>Overview</span>
              </button>
              <button 
              key="charts-tab"
              className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => this.setActiveTab('charts')}
            >
              <FontAwesomeIcon icon={faChartBar} />
              <span style={{ marginLeft: 8 }}>Data Visualizations</span>
              </button>
              {showMapTab && (
                <button 
                  key="map-tab"
                  className={`tab-button ${activeTab === 'map' ? 'active' : ''}`}
                  onClick={() => this.setActiveTab('map')}
                >
                  <FontAwesomeIcon icon={faMapMarkedAlt} />
                  <span style={{ marginLeft: 8 }}>Map View</span>
                </button>
              )}
              <button 
              key="data-tab"
              className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => this.setActiveTab('data')}
            >
              <FontAwesomeIcon icon={faTable} />
              <span style={{ marginLeft: 8 }}>Data Table</span>
              </button>
            </div>
            {this.props.enableTypeTabs && (
              <>
                {!this.props.hideTypeLabel && <span className="dashboard-type-tabs-label">Survey type</span>}
                {dataTypes.filter(dataType => activeTab !== 'map' || dataType !== 'All').map(dataType => (
                  <button
                    key={dataType}
                    type="button"
                    className={`tab-button dashboard-type-tab-button ${this.state.selectedDataType === dataType ? 'active' : ''}`}
                    onClick={() => this.setDataType(dataType)}
                  >
                    {dataType === 'All' ? 'All Surveys' : this.getDataTypeLabel(dataType)}
                  </button>
                ))}
              </>
            )}
          </div>
        </section>

        {/* Tab Content */}
        <div className="dashboard-content">
          {activeTab === 'overview' && (
              <OverviewTab
              data={standardizedFilteredData}
              filteredData={filteredData}
                surveyCount={this.getSurveyCount(filteredData)}
                isRifleRangeRoad={isRifleRangeRoad}
            />
          )}
          
          {activeTab === 'charts' && (
            <ChartsViewTab 
              data={standardizedFilteredData}
              isRifleRangeRoad={isRifleRangeRoad}
            />
          )}
          
          {activeTab === 'map' && (
            mapRequiresSurveyType ? (
              <div className="map-view-selection-prompt" style={{ minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                <h2>Select a survey type to view the map</h2>
                <p>Choose Regular, Rope Bridge, or External above.</p>
              </div>
            ) : (
              <MapViewTab
                data={mapCoordinates}
                overviewData={standardizedFilteredData}
                isRifleRangeRoad={isRifleRangeRoad}
                isExternalSurvey={isExternalSurvey}
                selectedDataType={this.state.selectedDataType}
                openObservationPopup={this.props.openObservationPopup}
                closeObservationPopup={this.props.closeObservationPopup}
              />
            )
          )}
          
          {activeTab === 'data' && (
            isRifleRangeRoad ? (
              <RifleRangeRoadDataViewTab 
                data={standardizedFilteredData}
                selectedDataType={this.state.selectedDataType}
                onOpenNewSurveyModal={this.props.onOpenNewSurveyModal}
                onDataChange={this.props.onDataChange}
              />
            ) : (
              <DataViewTab 
                data={standardizedFilteredData}
                onOpenNewSurveyModal={this.props.onOpenNewSurveyModal}
                onDataChange={this.props.onDataChange}
              />
            )
          )}
        </div>

        {/* Loading Popup */}
        {showPopup && (
          <div className="loading-overlay" style={{ zIndex: 1001 }}>
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
          <div className="popup-content" style={{ zIndex: 1001 }}>
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

        {/* Add Event Modal */}
        {showAddEventModal && (
          <AddEventModal
            onClose={() => this.setState({ showAddEventModal: false })}
            onSave={this.handleAfterSave}
          />
        )}
      </div>
    );
  }
}

export default DashboardContainer;
