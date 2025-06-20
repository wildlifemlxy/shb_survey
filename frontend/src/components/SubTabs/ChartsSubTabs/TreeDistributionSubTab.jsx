import React, { Component } from 'react';
import D3TreeHeightChart from '../../Charts/D3TreeHeightChart';
import '../../../css/components/SubTabs/TreeDistributionSubTab.css';

class TreeDistributionSubTab extends Component {
  render() {
    const { data } = this.props;

    return (
      <div className="tree-distribution-subtab">
        <div className="tree-distribution-container">
          <div className="chart-container chart-full-width tree-chart-large">
            <h3 className="chart-title">🌲 Straw-headed Bulbul Survey Tree Distribution Analysis</h3>
            <D3TreeHeightChart data={data} />
          </div>
        </div>
      </div>
    );
  }
}

export default TreeDistributionSubTab;
