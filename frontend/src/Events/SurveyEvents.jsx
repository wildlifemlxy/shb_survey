import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faCalendarAlt, faHistory } from '@fortawesome/free-solid-svg-icons';
import { faTelegramPlane } from '@fortawesome/free-brands-svg-icons';
import '../css/components/Events/SurveyEvents.css';
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

  componentDidUpdate(prevProps) {
    // Handle new event modal trigger from quick actions
    if (this.props.shouldOpenNewEventModal && !prevProps.shouldOpenNewEventModal) {
      console.log('SurveyEvents: Received request to open new event modal');
      this.handleAddNewEvent();
      // Notify parent that we've handled the modal request
      if (this.props.onNewEventModalHandled) {
        this.props.onNewEventModalHandled();
      }
    }
  }

  handleAddNewEvent = () => {
    console.log('SurveyEvents: handleAddNewEvent called');
    // Check if we have a ref to the active tab component and it has the handleAddNewEvent method
    if (this.activeTabRef && this.activeTabRef.handleAddNewEvent) {
      console.log('SurveyEvents: Calling handleAddNewEvent on active tab component');
      this.activeTabRef.handleAddNewEvent();
    } else {
      console.error('SurveyEvents: Active tab component does not have handleAddNewEvent method');
    }
  };

  setActiveTab = (tab) => {
    this.setState({ activeTab: tab });
  };

  render() 
  {
    const { activeTab } = this.state;
    // Accept eventData and isLoading as props for linkage
    const events = Array.isArray(this.props.eventData) ? this.props.eventData : [];
    console.log("Events data:", events);
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
      onRefreshEvents: this.props.onRefreshEvents,
    };

    return (
      <div className="survey-events-container">
        <header className="survey-events-header">
          <div className="header-content">
            <div className="header-title">
              <h1>Survey Walk Management</h1>
              <div className="survey-datetime" style={{ fontStyle: 'italic !important' }}>
                {this.state.currentDateTime}
              </div>
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
            <TabComponent 
              {...tabProps} 
              ref={(ref) => { this.activeTabRef = ref; }}
            />
          )}
        </div>
      </div>
    );
  }
}

export default SurveyEvents;
