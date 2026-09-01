import React, { Component } from 'react';
import ViewToggle from '../../Table/ViewToggle';
import RifleRangeRoadObservationTable from '../../Table/RifleRangeRoadObservationTable';
import RifleRangeRoadPivotTable from '../../Table/RifleRangeRoadPivotTable';
import '../../../css/components/Tabs/RifleRangeRoadDataViewTab.css';
import simpleApiService from '../../../utils/simpleApiService';
import { getCurrentUser } from '../../../data/loginData';
import { io } from 'socket.io-client';
import { BASE_URL } from '../../../config/apiConfig.js';
import { logger } from '../../../utils/diagnosticLogger';
import { matchesSelectedSurveyType } from '../../../utils/surveyTypeUtils';

class RifleRangeRoadDataViewTab extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentView: 'table',
      data: props.data || []
    };
    this.socket = null;
  }

  componentDidMount() {
    this.socket = io(BASE_URL);

    this.socket.on('surveyInserted', (eventData) => {
      console.log('RifleRangeRoadDataViewTab - Survey inserted:', eventData);
      if (this.props.onDataRefresh) {
        this.props.onDataRefresh();
      }
    });

    this.socket.on('surveyUpdated', (eventData) => {
      console.log('RifleRangeRoadDataViewTab - Survey updated:', eventData);
      if (this.props.onDataRefresh) {
        this.props.onDataRefresh();
      }
    });

    this.socket.on('surveyDeleted', (eventData) => {
      console.log('RifleRangeRoadDataViewTab - Survey deleted:', eventData);
      this.setState(prevState => ({
        data: prevState.data.filter(item => item._id !== eventData.surveyId)
      }));
    });
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  componentDidUpdate(prevProps) {
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
    return !restrictedRoles.includes(userRole);
  };

  handleAddObservation = async (newObservationData) => {
    try {
      const response = await simpleApiService.submitSurvey(newObservationData);

      if (response && response.success) {
        const newRecord = {
          ...newObservationData,
          _id: response.insertedId
        };

        const updatedDataArray = [...this.state.data, newRecord];
        this.setState({ data: updatedDataArray });

        if (this.props.onDataRefresh) {
          this.props.onDataRefresh();
        }

        if (this.props.onDataChange) {
          this.props.onDataChange(updatedDataArray);
        }

        alert('✅ New observation added successfully!');
        return response;
      }

      throw new Error(response?.message || 'Failed to add new observation');
    } catch (error) {
      console.error('❌ Error adding new observation:', error);
      alert('Error adding new observation. Please try again.');
      throw error;
    }
  }

  handleDataDelete = async (recordId) => {
    try {
      const response = await simpleApiService.deleteRifleRangeRoadSurvey(recordId);

      if (response && response.success) {
        const updatedData = this.state.data.filter(row => row._id !== recordId);
        this.setState({ data: updatedData });

        if (this.props.onDataRefresh) {
          this.props.onDataRefresh();
        }

        if (this.props.onDataChange) {
          this.props.onDataChange(updatedData);
        }

        return response;
      }

      throw new Error(response?.message || 'Failed to delete record');
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record. Please try again.');
      throw error;
    }
  }

  handleDataUpdate = async (recordId, updatedData) => {
    logger.section('🎯 HANDLE DATA UPDATE - PARENT COMPONENT');
    logger.info('recordId', recordId);
    logger.info('updatedData', JSON.stringify(updatedData, null, 2));

    try {
      logger.pending('Calling simpleApiService.updateRifleRangeRoadSurvey()');
      const response = await simpleApiService.updateRifleRangeRoadSurvey(recordId, updatedData);

      if (response && response.success) {
        const recordIdStr = recordId.toString ? recordId.toString() : String(recordId);
        const updatedDataArray = this.state.data.map(row => {
          const rowIdStr = row._id && row._id.toString ? row._id.toString() : String(row._id || '');
          if (rowIdStr === recordIdStr) {
            return { ...row, ...updatedData };
          }
          return row;
        });

        this.setState({ data: updatedDataArray });

        if (this.props.onDataRefresh) {
          logger.pending('Calling onDataRefresh callback');
          this.props.onDataRefresh();
        }

        if (this.props.onDataChange) {
          logger.pending('Calling onDataChange callback');
          this.props.onDataChange(updatedDataArray);
        }

        logger.complete(true);
        return response;
      }

      const errorMsg = response?.error || response?.message || 'Failed to update record';
      logger.section('❌ UPDATE FAILED');
      logger.error('Backend error message', errorMsg);
      alert(`Update failed: ${errorMsg}`);
      throw new Error(errorMsg);
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
    const { onOpenNewSurveyModal, className, selectedDataType } = this.props;
    const { currentView, data } = this.state;
    const selectedSurveyType = selectedDataType || 'All';
    const filteredData = Array.isArray(data)
      ? data.filter((record) => matchesSelectedSurveyType(record, selectedSurveyType))
      : [];
    const rootClassName = ['rifle-range-road-data-view-tab', className].filter(Boolean).join(' ');

    if (typeof window !== 'undefined') {
      window.dataViewCurrentView = currentView;
    }

    return (
      <div className={rootClassName}>
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
                onClick={() => window.openAnomalyModal && window.openAnomalyModal(filteredData)}
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
            <RifleRangeRoadObservationTable
              data={filteredData}
              selectedDataType={selectedSurveyType}
              onDataUpdate={this.handleDataUpdate}
              onDataDelete={this.handleDataDelete}
              onDataAdd={this.handleAddObservation}
            />
          ) : (
            <RifleRangeRoadPivotTable data={filteredData} />
          )}
        </div>
      </div>
    );
  }
}

export default RifleRangeRoadDataViewTab;
