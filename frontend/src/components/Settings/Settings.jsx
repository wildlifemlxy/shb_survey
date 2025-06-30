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
  constructor(props) {
    super(props);
    this.state = {
      activeTab: TABS[0].key,
      currentDateTime: this.getFormattedDateTime()
    };
    this.timer = null;
  }

  getFormattedDateTime = () => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[now.getDay()];
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const time = now.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `${day}, ${dd}/${mm}/${yyyy} ${time}`;
  }

  componentDidMount() {
    this.timer = setInterval(() => {
      this.setState({ currentDateTime: this.getFormattedDateTime() });
    }, 1000);
  }

  componentWillUnmount() {
    if (this.timer) clearInterval(this.timer);
  }

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
              <div className="settings-datetime">
                {this.state.currentDateTime}
              </div>
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
