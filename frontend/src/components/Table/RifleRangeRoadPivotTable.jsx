import React, { Component } from 'react';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'pivottable/dist/pivot.css';
import 'react-pivottable/pivottable.css';
import '../../css/components/Table/PivotTable.css';

/**
 * RifleRangeRoadPivotTable
 * 
 * Rifle Range Road specific pivot table component for data analysis and aggregation.
 * Provides interactive pivot table view with configurable rows, columns, and aggregations.
 */
class RifleRangeRoadPivotTable extends Component {
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

      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      return date.toLocaleDateString('en-SG', options);
    } catch (e) {
      return dateString;
    }
  }

  // Transform data to ensure all string representations
  transformData = (data) => {
    if (!Array.isArray(data)) return [];

    return data.map((record) => {
      const transformed = {};
      Object.keys(record).forEach((key) => {
        const value = record[key];

        // Format specific fields for better display
        if (key === 'Date' && value) {
          transformed[key] = this.formatDate(value);
        } else if (key === 'Time' && value) {
          transformed[key] = String(value).substring(0, 5); // HH:MM format
        } else if (
          typeof value === 'object' &&
          value !== null
        ) {
          // Stringify objects for pivot table compatibility
          transformed[key] = JSON.stringify(value);
        } else if (typeof value === 'number') {
          transformed[key] = value;
        } else if (typeof value === 'boolean') {
          transformed[key] = value ? 'Yes' : 'No';
        } else {
          transformed[key] = String(value || '');
        }
      });

      return transformed;
    });
  };

  handlePivotChange = (s) => {
    this.setState({ pivotState: s });
  };

  render() {
    return (
      <div className="rifle-range-road-pivot-table">
        <PivotTableUI
          data={this.state.pivotState.data}
          onChange={this.handlePivotChange}
          {...this.state.pivotState}
        />
      </div>
    );
  }
}

export default RifleRangeRoadPivotTable;
