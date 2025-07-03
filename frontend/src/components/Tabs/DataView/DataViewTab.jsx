import React, { Component } from 'react';
import ObservationTable from '../../Table/ObservationTable';
import PivotTable from '../../Table/PivotTable';
import ViewToggle from '../../Table/ViewToggle';
import '../../../css/components/Tabs/DataViewTab.css';
import NewSurveyButton from './NewSurveyButton';

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
              <ObservationTable data={data} />
            ) : (
              <PivotTable data={data} />
            )}
          </div>
      </div>
    );
  }
}

export default DataViewTab;
