import React, { Component } from 'react';
import SubTabManager from '../../SubTabs/Common/SubTabManager';
import GenericSubTab from '../../SubTabs/Common/GenericSubTab';
import { getAllSubTabConfigs, rifleRangeRoadSubTabConfigs } from '../../../config/subTabConfigs';
import '../../../css/components/Tabs/ChartsViewTab.css';
import birdLogo from '../../../assets/bird-logo.png';

class ChartsViewTab extends Component {
  constructor(props) {
    super(props);
    
    // Get all sub-tab configurations
    const configs = props.isRifleRangeRoad ? rifleRangeRoadSubTabConfigs : getAllSubTabConfigs();
    const configList = Array.isArray(configs) ? configs : Object.values(configs);
    const subTabConfigsMap = {};
    configList.forEach(config => {
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

    if (this.props.isRifleRangeRoad) {
      const sections = Object.values(subTabConfigs).flatMap(config => config.sections || []);

      return (
        <div className="charts-view-tab">
          <GenericSubTab
            config={{
              className: 'rifle-all-visualizations',
              title: 'Rifle Range Road Data Visualizations',
              description: 'Explore Rifle Range Road survey observations and field conditions.',
              layout: 'grid',
              sections
            }}
            data={data}
          />
        </div>
      );
    }

    return (
      <div className="charts-view-tab">      
          <SubTabManager
            subTabConfigs={subTabConfigs}
            data={data}
            defaultActiveTab={this.props.isRifleRangeRoad ? 'observations' : 'viewOne'}
            onTabChange={this.handleTabChange}
            className="charts-subtab-manager"
            tabsContainerClassName="charts-subtabs"
            contentClassName="charts-content"
            buttonClassName="subtab-button"
          />
      </div>
    );
  }
}

export default ChartsViewTab;
