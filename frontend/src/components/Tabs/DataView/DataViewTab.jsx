import React, { Component } from 'react';
import ObservationTable from '../../Table/ObservationTable';
import PivotTable from '../../Table/PivotTable';
import ViewToggle from '../../Table/ViewToggle';
import '../../../css/components/Tabs/DataViewTab.css';
import NewSurveyButton from './NewSurveyButton';
import axios from 'axios';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

class DataViewTab extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentView: 'table' // Default view is 'table', alternative is 'pivot'
    };
  }

  handleViewToggle = (viewType) => {
    this.setState({ currentView: viewType });
    if (typeof window !== 'undefined') {
      window.dataViewCurrentView = viewType;
    }
  }

  // Handle data updates (when cells are edited)
  handleDataUpdate = async(updatedRowData, recordId) => 
  {
    console.log("Data Updated", { updatedRowData, recordId }, BASE_URL);
    const response = await axios.post(`${BASE_URL}/surveys`, { purpose: 'update', recordId, updatedRowData });
    //console.log('Data update requested', response);
  }

  // Handle data deletion (when rows are deleted)
  handleDataDelete = async (recordId) => {
    try {
      const response = await axios.post(`${BASE_URL}/surveys`, { purpose: 'delete', recordId });
      
      if (response.data.success) {
        console.log('Record deleted successfully:', response.data);
        
        // Trigger data refresh to update the UI
        if (this.props.onDataRefresh) {
          this.props.onDataRefresh();
        }
        
        return response;
      } else {
        throw new Error(response.data.message || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      // You might want to show a user-friendly error message here
      throw error;
    }
  }

  render() {
    const { data, onOpenNewSurveyModal } = this.props;
    const { currentView } = this.state;
    if (typeof window !== 'undefined') {
      window.dataViewCurrentView = currentView;
    }
    
    return (
      <div className="data-view-tab">
          <div className="section-header">
            <h2>📊 Observation Data</h2>
            <div className="section-actions">
              <div className="button-container">
                <NewSurveyButton onClick={onOpenNewSurveyModal} />
              </div>
            </div>
          </div>
          <div className="view-toggle-container">
            <ViewToggle 
                  currentView={currentView} 
                  onToggle={this.handleViewToggle} 
            />
          </div>
          <div className="table-container">
            {currentView === 'table' ? (
              <ObservationTable 
                data={data} 
                onDataUpdate={this.handleDataUpdate}
                onDataDelete={this.handleDataDelete}
              />
            ) : (
              <PivotTable data={data} />
            )}
          </div>
      </div>
    );
  }
}

export default DataViewTab;
