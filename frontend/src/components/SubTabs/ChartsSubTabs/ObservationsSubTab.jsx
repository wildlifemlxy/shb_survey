import React, { Component } from 'react';
import DateLineChart from '../../Charts/DateLineChart';
import LocationStats from '../../Charts/LocationStats';
import '../../../css/components/SubTabs/ObservationsSubTab.css';

class ObservationsSubTab extends Component {
  render() {
    const { data } = this.props;

    return (
      <section
        className="observations-subtab"
        aria-labelledby="observations-section-title"
        tabIndex={-1}
      >
        <header style={{ marginBottom: '2rem' }}>
          <h2 id="observations-section-title" className="section-title">
            Data Visualizations
          </h2>
          <p className="section-description">
            Explore trends and patterns in your bird observations.
          </p>
        </header>
        <div className="charts-grid">
          <div className="chart-container" tabIndex={0} aria-label="Observations Over Time Chart">
            <h3 className="chart-title">📊 Observations Over Time (Monthly)</h3>
            <div className="chart-content">
              <DateLineChart data={data} />
            </div>
          </div>
          <div className="chart-container" tabIndex={0} aria-label="Bird Distribution Analysis Chart">
            <h3 className="chart-title">🐦 Bird Distribution Analysis</h3>
            <div className="chart-content">
              <LocationStats data={data} />
            </div>
          </div>
        </div>
      </section>
    );
  }
}

export default ObservationsSubTab;
