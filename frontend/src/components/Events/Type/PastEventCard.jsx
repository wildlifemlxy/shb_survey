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

  // Helper method to check if current user attended this event
  isUserAttended = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserName = user.name || user.username || user.Name;
    const participants = this.props.event.Participants || [];
    
    return participants.some(participant => {
      const participantName = participant.name || participant.Name || participant.username || participant;
      return participantName && currentUserName && 
        participantName.toLowerCase() === currentUserName.toLowerCase();
    });
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div
              className="past-event-title"
              onClick={this.handleLocationClick}
            >
              <span className="past-event-label">Location:</span> {event.Location}
            </div>
            {this.isUserAttended() && (
              <div style={{
                backgroundColor: '#3b82f6',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}>
                <span>✓</span>
                <span>Attended</span>
              </div>
            )}
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
