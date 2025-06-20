import React, { Component } from 'react';
import ObservationTable from '../../Table/ObservationTable';
import '../../../css/components/Tabs/DataViewTab.css';

class DataViewTab extends Component {
  render() {
    const { data } = this.props;

    return (
      <div className="data-view-tab">
        <section className="stats-section light-background">
          <div className="section-header">
            <h2>📊 Observation Data</h2>
          </div>
          <div className="table-container">
            <ObservationTable data={data} />
          </div>
        </section>
      </div>
    );
  }
}

export default DataViewTab;
