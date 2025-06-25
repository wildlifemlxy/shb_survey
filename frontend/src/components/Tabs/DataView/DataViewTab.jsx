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
              <button
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#1976d2',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: 15,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  transition: 'background 0.2s',
                  marginLeft: 16
                }}
              >
                + New Survey
              </button>
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
