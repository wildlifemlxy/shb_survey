import React, { Component } from 'react';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'pivottable/dist/pivot.css';
import 'react-pivottable/pivottable.css';
import '../../css/components/Table/PivotTable.css';

class PivotTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pivotState: {
        data: this.transformData(props.data),
        rows: [], // Empty by default
        cols: [], // Empty by default
        vals: [], // Empty by default
        aggregatorName: 'Count',
        rendererName: 'Table',
        valueFilter: {},
        rowOrder: 'key_a_to_z',
        colOrder: 'key_a_to_z'
      }
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data) {
      this.setState({
        pivotState: {
          ...this.state.pivotState,
          data: this.transformData(this.props.data)
        }
      });
    }
  }

  // Format dates for better display in pivot table
  formatDate(dateString) {
    if (!dateString || dateString === '') return '';
    
    try {
      // Check if it's already in a standard format
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          // Assuming dd/mm/yyyy format
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          return `${day}/${month}/${parts[2]}`;
        }
      }
      
      // Try to parse as a date string
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    } catch (e) {
      // If any error occurs, return the original string
      return dateString;
    }
    
    return dateString;
  }

  // Transform data to be more suitable for the pivot table
  transformData(data) {
    if (!data || data.length === 0) return [];
    return data
      .map(item => {
        // Create a standardized object with formatted values
        const transformedItem = {};
        // Clean and map all fields (exclude Lat, Long, Time Period, Activity Details, DateGroup)
        transformedItem["Observer"] = item["Observer name"] || '';
        transformedItem["Bird ID"] = item["SHB individual ID"] || '';
        transformedItem["Number of Birds"] = Number(item["Number of Birds"]) || 0;
        transformedItem["Location"] = item["Location"] || 'Unknown';
        transformedItem["Date"] = this.formatDate(item["Date"]) || '';
        transformedItem["Time"] = item["Time"] || '';
        transformedItem["Tree Height (m)"] = Number(item["Height of tree/m"]) || 0;
        transformedItem["Bird Height (m)"] = Number(item["Height of bird/m"]) || 0;
        transformedItem["Activity"] = item["Activity (foraging, preening, calling, perching, others)"] || '';
        transformedItem["Seen/Heard"] = item["Seen/Heard"] || '';
        // Add computed fields for analysis
        transformedItem["Height Difference (m)"] = transformedItem["Tree Height (m)"] - transformedItem["Bird Height (m)"];
        return transformedItem;
      })
      // Filter out any rows where Year is '2001' (if Date is present)
      .filter(item => {
        if (item["Date"] && item["Date"].length >= 4) {
          // Try to extract year from Date string
          const year = item["Date"].split('/').pop();
          return year !== '2001';
        }
        return true;
      });
  }

  // Helper function to extract month from date
  extractMonth(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(this.formatDateForParsing(dateString));
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('default', { month: 'long' });
      }
    } catch (e) {
      // If parsing fails, try to extract from DD-MMM-YY format
      if (dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length === 3 && parts[1].length === 3) {
          return parts[1];
        }
      }
    }
    return '';
  }

  // Helper function to extract year from date
  extractYear(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(this.formatDateForParsing(dateString));
      if (!isNaN(date.getTime())) {
        return date.getFullYear().toString();
      }
    } catch (e) {
      // If parsing fails, try to extract from DD-MMM-YY format
      if (dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length === 3) {
          let year = parts[2];
          if (year.length === 2) {
            year = parseInt(year) < 50 ? '20' + year : '19' + year;
          }
          return year;
        }
      }
    }
    return '';
  }

  // Helper function to categorize time periods
  getTimePeriod(timeString) {
    if (!timeString) return '';
    try {
      // Extract hour from time string
      let hour = 0;
      if (timeString.includes('AM') || timeString.includes('PM')) {
        const timePart = timeString.replace(/AM|PM/i, '').trim();
        const [hourStr] = timePart.split(':');
        hour = parseInt(hourStr);
        if (timeString.toUpperCase().includes('PM') && hour !== 12) {
          hour += 12;
        } else if (timeString.toUpperCase().includes('AM') && hour === 12) {
          hour = 0;
        }
      } else {
        const [hourStr] = timeString.split(':');
        hour = parseInt(hourStr);
      }
      
      if (hour >= 5 && hour < 9) return 'Early Morning (5-9 AM)';
      if (hour >= 9 && hour < 12) return 'Late Morning (9-12 PM)';
      if (hour >= 12 && hour < 17) return 'Afternoon (12-5 PM)';
      if (hour >= 17 && hour < 20) return 'Evening (5-8 PM)';
      return 'Other';
    } catch (e) {
      return '';
    }
  }

  // Helper function to format date for parsing
  formatDateForParsing(dateString) {
    if (!dateString) return '';
    // Convert DD-MMM-YY to MM/DD/YYYY format for parsing
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const monthMap = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const day = parts[0];
        const month = monthMap[parts[1]] || parts[1];
        let year = parts[2];
        if (year.length === 2) {
          year = parseInt(year) < 50 ? '20' + year : '19' + year;
        }
        return `${month}/${day}/${year}`;
      }
    }
    return dateString;
  }

  render() {
    const { data } = this.props;
    const { pivotState } = this.state;
    // Defensive: ensure renderers are always defined
    const rendererOptions = (PivotTableUI && PivotTableUI.renderers) ? PivotTableUI.renderers : {};
    const rendererNames = Object.keys(rendererOptions);
    // Aggregator options from react-pivottable
    const aggregatorOptions = PivotTableUI.aggregators ? Object.keys(PivotTableUI.aggregators) : [];

    // Prepare all PivotTableUI props outside JSX
    const pivotProps = {
      data: pivotState.data,
      onChange: s => this.setState({ pivotState: s }),
      ...pivotState,
      unusedOrientationCutoff: Infinity,
      menuLimit: 500,
      hiddenAttributes: ['_id', 'Year', 'Month', 'Latitude', 'Longitude', 'Time Period', 'Activity Details', 'DateGroup', 'Height Difference (m)'],
      hiddenFromAggregators: ['_id', 'Latitude', 'Longitude', 'Year', 'Month', 'Time Period', 'Activity Details', 'DateGroup', 'Height Difference (m)'],
      hiddenFromDragDrop: ['_id', 'Year', 'Month', 'Latitude', 'Longitude', 'Time Period', 'Activity Details', 'DateGroup', 'Height Difference (m)'],
      rendererName: pivotState.rendererName
    };

    // Check if data exists
    if (!data || data.length === 0) {
      return <div className="pivot-table-empty">No data available for pivot table</div>;
    }

    return (
      <div className="pivot-table-container">
        {/* Instructions Section */}
        <section className="pivot-table-section pivot-table-instructions-section">
          <h3>📊 Interactive Pivot Table</h3>
          <div className="pivot-table-instructions">
            <p><strong>How to use:</strong></p>
            <ul>
              <li>📋 Drag fields from the left panel to the <strong>Rows</strong>, <strong>Columns</strong>, or <strong>Values</strong> areas</li>
              <li>🔄 Drop fields back to the left panel to remove them</li>
              <li>📈 Change aggregation type (Count, Sum, Average, etc.) using the dropdown inside the table area</li>
              <li>🎯 Click on field values in the table to filter data</li>
              <li>📊 Switch between Table, Charts, and other renderers</li>
            </ul>
          </div>
        </section>

        {/* Gap */}
        <div className="pivot-table-gap" />

        {/* Renderer Selection Section (only one combobox) */}
        <section className="pivot-table-section pivot-table-renderer-select" style={{display: 'flex', gap: '2rem', alignItems: 'center'}}>
        </section>

        {/* Gap */}
        <div className="pivot-table-gap" />

        {/* Pivot Table Section */}
        <section className="pivot-table-section pivot-table-main-section" style={{ maxHeight: '500px', maxWidth: '100%', overflow: 'auto' }}>
          <PivotTableUI {...pivotProps} />
        </section>
      </div>
    );
  }
}

export default PivotTable;
