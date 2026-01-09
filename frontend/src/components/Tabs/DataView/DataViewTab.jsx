import React, { Component } from 'react';
import ObservationTable from '../../Table/ObservationTable';
import PivotTable from '../../Table/PivotTable';
import ViewToggle from '../../Table/ViewToggle';
import '../../../css/components/Tabs/DataViewTab.css';
import apiService from '../../../services/apiServices';
import simpleApiService from '../../../utils/simpleApiService';
import { getCurrentUser, isLoggedIn } from '../../../data/loginData';
import { io } from 'socket.io-client';
import { BASE_URL } from '../../../config/apiConfig.js';

class DataViewTab extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentView: 'table', // Default view is 'table', alternative is 'pivot'
      data: props.data || []
    };
    this.socket = null;
  }

  componentDidMount() {
    // Setup socket connection for real-time updates
    this.socket = io(BASE_URL);
    
    // Listen for real-time survey updates
    this.socket.on('surveyInserted', (eventData) => {
      console.log("DataViewTab - Survey inserted:", eventData);
      // Optionally refresh data or add the new item to local state
      if (this.props.onDataRefresh) {
        this.props.onDataRefresh();
      }
    });
    
    this.socket.on('surveyUpdated', (eventData) => {
      console.log("DataViewTab - Survey updated:", eventData);
      // Optionally refresh data or update the specific item in local state
      if (this.props.onDataRefresh) {
        this.props.onDataRefresh();
      }
    });
    
    this.socket.on('surveyDeleted', (eventData) => {
      console.log("DataViewTab - Survey deleted:", eventData);
      // Remove the deleted item from local state
      this.setState(prevState => ({
        data: prevState.data.filter(item => item._id !== eventData.surveyId)
      }));
    });
  }

  componentWillUnmount() {
    // Clean up socket connection
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  componentDidUpdate(prevProps) {
    // Only update local state if parent data changes and is different from current state
    if (
      prevProps.data !== this.props.data &&
      this.props.data !== this.state.data
    ) {
      this.setState({ data: this.props.data });
    }
  }
  handleViewToggle = (viewType) => {
    this.setState({ currentView: viewType });
    if (typeof window !== 'undefined') {
      window.dataViewCurrentView = viewType;
    }
  }


  // Handle data deletion (when rows are deleted)
  handleDataDelete = async (recordId) => {
    try {
      // Always allow deletion in public mode using simple API service
      const response = await simpleApiService.deleteSurvey(recordId);
      
      if (response && response.success) {
        // Remove the deleted record from the local state
        this.setState(prevState => ({
          data: prevState.data.filter(row => row._id !== recordId)
        }));
        
        // Also notify parent component if there's an onDataChange callback
        if (this.props.onDataChange) {
          this.props.onDataChange(this.state.data.filter(row => row._id !== recordId));
        }
        
        return response;
      } else {
        throw new Error(response?.message || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record. Please try again.');
      throw error;
    }
  }

  // Handle data update (for edits or other changes)
  handleDataUpdate = async (recordId, updatedData) => {
    try {
      // Always allow updates in public mode using simple API service
      const response = await simpleApiService.updateSurvey(recordId, updatedData);
      
      if (response && response.success) {
        // Update the specific record in local state
        this.setState(prevState => ({
          data: prevState.data.map(row => 
            row._id === recordId ? { ...row, ...updatedData } : row
          )
        }));
        
        // Also notify parent component if there's an onDataChange callback
        if (this.props.onDataChange) {
          const updatedDataArray = this.state.data.map(row => 
            row._id === recordId ? { ...row, ...updatedData } : row
          );
          this.props.onDataChange(updatedDataArray);
        }
        
        console.log('Survey updated successfully:', recordId);
        return response;
      } else {
        throw new Error(response?.message || 'Failed to update record');
      }
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record. Please try again.');
      throw error;
    }
  }

  render() {
    const { onOpenNewSurveyModal } = this.props;
    const { currentView, data } = this.state;
    if (typeof window !== 'undefined') {
      window.dataViewCurrentView = currentView;
    }
    return (
      <div className="data-view-tab">
        <div className="section-header">
          <h2>📊 Observation Data</h2>
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
