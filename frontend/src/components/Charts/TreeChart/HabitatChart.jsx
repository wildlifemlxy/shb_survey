import React, { Component, createRef } from 'react';
import '../../../css/components/Charts/D3TreeHeightChart.css';
import TreeHeightChart from './TreeHeightChart';
import PercentageHeightChart from './PercentageHeightChart';

class HabitatChart extends Component {
  constructor(props) {
    super(props);
    this.containerRef = createRef();
    this.state = { viewMode: 'normal' };
  }

  setViewMode(mode) {
    this.setState({ viewMode: mode });
  }

  render() {
    const { viewMode = 'normal' } = this.state;
    // Pass original data to charts - let them handle filtering and sequential numbering
    return (
      <div ref={this.containerRef} className="chart-container">
        <div className="view-mode-controls" style={{ marginBottom: '8px' }}>
          <button onClick={() => this.setViewMode('normal')} className={`view-mode-button ${viewMode === 'normal' ? 'active' : ''}`}>📏 Height View</button>
          <button onClick={() => this.setViewMode('percentage')} className={`view-mode-button ${viewMode === 'percentage' ? 'active' : ''}`}>📊 Percentage View</button>
        </div>
        {viewMode === 'normal' ? (
          <TreeHeightChart data={this.props.data} />
        ) : (
          <PercentageHeightChart data={this.props.data} />
        )}
      </div>
    );
  }
}

export default HabitatChart;