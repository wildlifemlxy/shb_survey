import React, { Component } from 'react';
import GenericSubTab from './GenericSubTab';
import '../../../css/components/SubTabs/SubTabManager.css';

class SubTabManager extends Component {
  constructor(props) {
    super(props);
    const { subTabConfigs, defaultActiveTab } = props;
    const firstTabKey = defaultActiveTab || (subTabConfigs && Object.keys(subTabConfigs)[0]);
    
    this.state = {
      activeSubTab: firstTabKey
    };
  }

  setActiveSubTab = (subTabKey) => {
    this.setState({ activeSubTab: subTabKey });
    
    // Call onTabChange callback if provided
    if (this.props.onTabChange) {
      this.props.onTabChange(subTabKey);
    }
  };

  renderTabButtons() {
    const { subTabConfigs, buttonClassName = 'subtab-button' } = this.props;
    const { activeSubTab } = this.state;

    if (!subTabConfigs) {
      return null;
    }

    return Object.values(subTabConfigs).map((config) => {
      const { key, title, icon } = config;
      const isActive = activeSubTab === key;
      
      return (
        <button 
          key={key}
          className={`${buttonClassName} ${isActive ? 'active' : ''}`}
          onClick={() => this.setActiveSubTab(key)}
        >
          {icon && (
            <span className="subtab-icon">
              {icon}
            </span>
          )}
          <span className="subtab-label">{title}</span>
        </button>
      );
    });
  }

  renderActiveSubTab() {
    const { subTabConfigs, data, commonProps = {} } = this.props;
    const { activeSubTab } = this.state;

    if (!subTabConfigs || !activeSubTab || !subTabConfigs[activeSubTab]) {
      return (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <div>No configuration found for sub-tab: {activeSubTab}</div>
        </div>
      );
    }

    const activeConfig = subTabConfigs[activeSubTab];
    
    return (
      <GenericSubTab 
        config={activeConfig}
        data={data}
        {...commonProps}
      />
    );
  }

  render() {
    const { 
      className = 'subtab-manager',
      tabsContainerClassName = 'subtabs-container',
      contentClassName = 'subtab-content-area',
      showTabs = true,
      title,
      description
    } = this.props;

    return (
      <div className={className}>
        {title && (
          <div className="subtab-manager-header">
            <h2 className="subtab-manager-title">{title}</h2>
            {description && (
              <p className="subtab-manager-description">{description}</p>
            )}
          </div>
        )}
        
        {showTabs && (
          <div className={tabsContainerClassName}>
            {this.renderTabButtons()}
          </div>
        )}
        
        <div className={contentClassName}>
          {this.renderActiveSubTab()}
        </div>
      </div>
    );
  }
}

export default SubTabManager;
