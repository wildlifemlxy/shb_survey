import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faCalendarAlt, faHistory } from '@fortawesome/free-solid-svg-icons';
import { faTelegramPlane } from '@fortawesome/free-brands-svg-icons';
import './SurveyEvents.css';
import UpcomingEvents from './Type/UpcomingEvents';
import Telegram from './Type/Telegram';
import PastEvents from './Type/PastEvents';

const TABS = [
  {
    key: 'Upcoming',
    label: 'Upcoming',
    icon: faCalendarAlt,
    component: UpcomingEvents,
    extraProps: { highlightFirstGreen: true },
  },
  {
    key: 'Past',
    label: 'Past',
    icon: faHistory,
    component: PastEvents,
    extraProps: {},
  }
];

class SurveyEvents extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'Upcoming',
    };
  }

  setActiveTab = (tab) => {
    this.setState({ activeTab: tab });
  };

  render() 
  {
    const { activeTab } = this.state;
    // Accept eventData and isLoading as props for linkage
    const events = this.props.eventData || [];
    const { isLoading } = this.props;
    // Filter events for each tab using Type field
    const eventsByStatus = {
      Upcoming: events.filter(event => event.Type === 'Upcoming'),
      Past: events.filter(event => event.Type === 'Past'),
    };

    const activeTabObj = TABS.find(tab => tab.key === activeTab);
    const TabComponent = activeTabObj.component;
    const tabProps = {
      events: eventsByStatus[activeTab],
      ...activeTabObj.extraProps,
      isLoading,
    };

    return (
      <div className="survey-events-container">
        <header className="survey-events-header">
          <div className="header-content">
            <div className="header-title">
              <h1>Survey Walk Management</h1>
              <p>Organize and track all survey walk events</p>
            </div>
            <div className="header-actions">
              <Link to="/" className="home-link">
                <FontAwesomeIcon icon={faHome} />
                <span>Home</span>
              </Link>
            </div>
          </div>
        </header>
        <div className="dashboard-tabs">
          <div className="tabs-container">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={activeTab === tab.key ? 'tab-button active' : 'tab-button'}
                onClick={() => this.setActiveTab(tab.key)}
              >
                <FontAwesomeIcon icon={tab.icon} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="dashboard-content">
          {isLoading ? (
            <div className="loading">Loading events...</div>
          ) : (
            <TabComponent {...tabProps} />
          )}
        </div>
      </div>
    );
  }
}

export default SurveyEvents;
