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
import { logger } from '../../../utils/diagnosticLogger';

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
  };

  canViewAnomalyButton = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    const userRole = currentUser.role || localStorage.getItem('userRole');
    const restrictedRoles = ['WWF-Volunteer', 'Website Maintenance Assistance'];
    
    // Show button only if user role is NOT in restricted roles
    return !restrictedRoles.includes(userRole);
  };

  // Handle adding new observation
  handleAddObservation = async (newObservationData) => {
    try {
      console.log('\n📥 handleAddObservation() RECEIVED CALL');
      console.log('newObservationData:', JSON.stringify(newObservationData, null, 2));
      
      // Call the API to insert new survey
      console.log('Calling simpleApiService.submitSurvey()...');
      const response = await simpleApiService.submitSurvey(newObservationData);
      
      console.log('✅ simpleApiService response:', JSON.stringify(response, null, 2));
      
      if (response && response.success) {
        console.log('Response marked as success, adding to local state...');
        
        // Add the new record with the returned insertedId
        const newRecord = {
          ...newObservationData,
          _id: response.insertedId
        };
        
        const updatedDataArray = [...this.state.data, newRecord];
        this.setState({ data: updatedDataArray });
        
        // Notify parent component to refresh
        if (this.props.onDataRefresh) {
          console.log('🔄 Calling onDataRefresh after insert');
          this.props.onDataRefresh();
        }
        
        // Also notify parent component if there's an onDataChange callback
        if (this.props.onDataChange) {
          console.log('📡 Calling onDataChange with updated data after insert');
          this.props.onDataChange(updatedDataArray);
        }
        
        // Show success feedback to user
        console.log('✅ New observation added successfully');
        alert('✅ New observation added successfully!');
        return response;
      } else {
        throw new Error(response?.message || 'Failed to add new observation');
      }
    } catch (error) {
      console.error('❌ Error adding new observation:', error);
      alert('Error adding new observation. Please try again.');
      throw error;
    }
  }


  // Handle data deletion (when rows are deleted)
  handleDataDelete = async (recordId) => {
    try {
      // Always allow deletion in public mode using simple API service
      const response = await simpleApiService.deleteSurvey(recordId);
      
      if (response && response.success) {
        // Remove the deleted record from the local state
        const updatedData = this.state.data.filter(row => row._id !== recordId);
        this.setState({ data: updatedData });
        
        // Notify parent component to refresh
        if (this.props.onDataRefresh) {
          console.log('🔄 Calling onDataRefresh after delete');
          this.props.onDataRefresh();
        }
        
        // Also notify parent component if there's an onDataChange callback
        if (this.props.onDataChange) {
          console.log('📡 Calling onDataChange with updated data after delete');
          this.props.onDataChange(updatedData);
        }
        
        // Show success feedback to user
        console.log('✅ Record deleted successfully');
        
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
    logger.section('🎯 HANDLE DATA UPDATE - PARENT COMPONENT');
    logger.info('recordId', recordId);
    logger.info('updatedData', JSON.stringify(updatedData, null, 2));
    
    try {
      logger.pending('Calling simpleApiService.updateSurvey()');
      const response = await simpleApiService.updateSurvey(recordId, updatedData);
      
      logger.section('📋 UPDATE RESPONSE RECEIVED');
      logger.info('Response success', response?.success);
      logger.json('Full response', response);
      
      if (response && response.success) {
        logger.section('✅ UPDATE SUCCESSFUL');
        logger.success('Backend confirmed update', response.message);
        
        // Update the specific record in local state
        const recordIdStr = recordId.toString ? recordId.toString() : String(recordId);
        logger.info('recordIdStr for matching', recordIdStr);
        
        const updatedDataArray = this.state.data.map(row => {
          const rowIdStr = row._id && row._id.toString ? row._id.toString() : String(row._id || '');
          if (rowIdStr === recordIdStr) {
            logger.success('Found matching row', `rowIdStr: ${rowIdStr}`);
            return { ...row, ...updatedData };
          }
          return row;
        });
        
        this.setState({ data: updatedDataArray });
        
        // Notify parent component to refresh
        if (this.props.onDataRefresh) {
          logger.pending('Calling onDataRefresh callback');
          this.props.onDataRefresh();
        }
        
        // Also notify parent component if there's an onDataChange callback
        if (this.props.onDataChange) {
          logger.pending('Calling onDataChange callback');
          this.props.onDataChange(updatedDataArray);
        }  
        logger.complete(true);
        return response;
      } else {
        const errorMsg = response?.error || response?.message || 'Failed to update record';
        logger.section('❌ UPDATE FAILED');
        logger.error('Backend error message', errorMsg);
        alert(`Update failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } catch (error) {
      logger.section('⚠️ EXCEPTION IN HANDLE DATA UPDATE');
      logger.error('Error message', error.message);
      logger.error('Error type', error.constructor.name);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      logger.error('Error details', errorMessage);
      alert(`Error updating record: ${errorMessage}`);
      logger.complete(false);
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
          <div className="table-header-with-buttons">
            {this.canViewAnomalyButton() && (
              <button 
                className="btn-anomaly-detection"
                onClick={() => window.openAnomalyModal && window.openAnomalyModal(data)}
                title="Check for data anomalies"
              >
                🔍 Anomaly Detection
              </button>
            )}
            <button 
              className="btn-add-new-entry"
              onClick={() => onOpenNewSurveyModal && onOpenNewSurveyModal()}
              title="Add a new survey entry"
            >
              <span className="plus-icon">+</span> Add New Entry
            </button>
          </div>
          {currentView === 'table' ? (
            <ObservationTable 
              data={data} 
              onDataUpdate={this.handleDataUpdate}
              onDataDelete={this.handleDataDelete}
              onDataAdd={this.handleAddObservation}
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
