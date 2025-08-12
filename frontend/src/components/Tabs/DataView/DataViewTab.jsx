import React, { Component } from 'react';
import ObservationTable from '../../Table/ObservationTable';
import PivotTable from '../../Table/PivotTable';
import ViewToggle from '../../Table/ViewToggle';
import '../../../css/components/Tabs/DataViewTab.css';
import NewSurveyButton from './NewSurveyButton';
import axios from 'axios';
import tokenService from '../../../utils/tokenService';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

class DataViewTab extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentView: 'table', // Default view is 'table', alternative is 'pivot'
      data: props.data || []
    };
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


<<<<<<< Updated upstream
=======
  // Handle data deletion (when rows are deleted)
  handleDataDelete = async (recordId) => {
    try {
      if (!tokenService.isTokenValid()) {
        console.error('Authentication required for data deletion');
        return;
      }
      const requestData = await tokenService.encryptData({ purpose: 'delete', recordId });
      const response = await tokenService.makeAuthenticatedRequest(`${BASE_URL}/surveys`, {
        method: 'POST',
        data: requestData
      });
      if (response.status === 200 && response.data.success) {
        this.setState(prevState => ({
          data: prevState.data.filter(row => row._id !== recordId)
        }));
        await tokenService.refreshTokenIfNeeded();
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      throw error;
    }
  }

  // Handle data update (for edits or other changes)
  handleDataUpdate = async (updatedData) => {
    this.setState({ data: updatedData });
    await tokenService.refreshTokenIfNeeded();
  }
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
          </div>
          <div className="table-container">
            {currentView === 'table' ? (
              <ObservationTable 
                data={data} handleDataDelete
              />
            ) : (
              <PivotTable data={data} />
            )}
          </div>
=======
          ) : (
            <PivotTable data={data} />
          )}
        </div>
>>>>>>> Stashed changes
      </div>
    );
  }
}

export default DataViewTab;
