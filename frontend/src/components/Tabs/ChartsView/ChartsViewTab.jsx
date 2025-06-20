import React, { Component } from 'react';
import SubTabManager from '../../SubTabs/Common/SubTabManager';
import { getAllSubTabConfigs } from '../../../config/subTabConfigs';
import '../../../css/components/Tabs/ChartsViewTab.css';
import birdLogo from '../../../assets/bird-logo.png';

class ChartsViewTab extends Component {
  constructor(props) {
    super(props);
    
    // Get all sub-tab configurations
    const subTabConfigs = getAllSubTabConfigs();
    const subTabConfigsMap = {};
    subTabConfigs.forEach(config => {``
      subTabConfigsMap[config.key] = config;
    });
    
    this.state = {
      subTabConfigs: subTabConfigsMap
    };
  }

  handleTabChange = (activeTabKey) => {
    // Optional: Handle tab change events here
    console.log('Active sub-tab changed to:', activeTabKey);
  };

  render() {
    const { data } = this.props;
    const { subTabConfigs } = this.state;

    return (
      <div className="charts-view-tab">
        <section className="stats-section light-background">          
          <SubTabManager
            subTabConfigs={subTabConfigs}
            data={data}
            defaultActiveTab="viewOne"
            onTabChange={this.handleTabChange}
            className="charts-subtab-manager"
            tabsContainerClassName="charts-subtabs"
            contentClassName="charts-content"
            buttonClassName="subtab-button"
          />
        </section>
      </div>
    );
  }
}

export default ChartsViewTab;
