import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import { faTelegramPlane } from '@fortawesome/free-brands-svg-icons';
import '../../css/components/Settings/Settings.css';
import CreateTelegramBotTab from './CreateTelegramBotTab';
import BotDetailsTab from './BotDetailsTab';

const TABS = [
  {
    key: 'CreateBot',
    label: 'Create Telegram Bot',
    icon: faTelegramPlane,
    description: 'Set up a new Telegram bot for your survey platform. Follow the guided steps to register and connect your bot.',
    component: CreateTelegramBotTab,
    extraProps: {},
  },
  {
    key: 'BotDetails',
    label: 'Bot Details',
    icon: faTelegramPlane,
    description: 'View and manage details of your connected Telegram bots, including status and configuration.',
    component: BotDetailsTab,
    extraProps: {},
  },
];

class Settings extends Component {
  state = {
    activeTab: TABS[0].key
  };

  setActiveTab = (key) => {
    this.setState({ activeTab: key });
  };

  render() {
    const { eventData, isLoading } = this.props;
    const { activeTab } = this.state;
    const activeTabObj = TABS.find(tab => tab.key === activeTab);
    const TabComponent = activeTabObj.component;
    const tabProps = activeTabObj.extraProps;
    return (
      <div className="settings-container">
        <div className="settings-header">
          <div className="header-content">
            <div className="header-title">
              <h1>Settings</h1>
              <p>Manage your survey platform preferences and integrations for Telegram bots</p>
            </div>
            <div className="header-actions">
              <Link to="/" className="home-link">
                <FontAwesomeIcon icon={faHome} />
                <span>Home</span>
              </Link>
            </div>
            {/* You can add header actions here if needed */}
          </div>
        </div>
        <div className="dashboard-tabs">
          <div className="tabs-container">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={activeTab === tab.key ? 'tab-button active' : 'tab-button'}
                onClick={() => this.setActiveTab(tab.key)}
                title={tab.description}
              >
                <FontAwesomeIcon icon={tab.icon} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="dashboard-content">
          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            activeTab === 'BotDetails' ? (
              <TabComponent {...tabProps} botData={this.props.botData} isLoading={isLoading} />
            ) : (
              <TabComponent {...tabProps} />
            )
          )}
        </div>
      </div>
    );
  }
}

export default Settings;
