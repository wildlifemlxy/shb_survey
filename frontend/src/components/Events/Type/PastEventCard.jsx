import React, { Component } from 'react';
import './PastEvents.css';
import PastParticipantList from './PastParticipantList';

class PastEventCard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      expanded: false
    };
  }

  handleLocationClick = () => {
    this.setState(prevState => ({
      expanded: !prevState.expanded
    }));
  };

  render() {
    const { event, cardStyle } = this.props;
    return (
      <div
        className="past-event-card upcoming-event-card"
        style={{
          minWidth: 220,
          maxWidth: 340,
          width: '100%',
          padding: '18px 14px 14px 14px',
          borderRadius: 14,
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          gap: 12,
          transition: 'box-shadow 0.2s',
          fontFamily: 'Inter, Arial, sans-serif',
          border: 'none',
          cursor: 'pointer',
          ...cardStyle
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.13)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'}
      >
        <div style={{ width: '100%' }}>
          <div
            className="past-event-title"
            onClick={this.handleLocationClick}
          >
            <span className="past-event-label">Location:</span> {event.Location}
          </div>
          <div className="past-event-meta">{event.Date}{event.Time ? ` • ${event.Time}` : ''}</div>
        </div>
        {this.state.expanded && (
          <div className="participants-list-scroll">
            <div className="past-event-participants-list">
              <PastParticipantList participants={event.Participants} />
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default PastEventCard;
