import React, { Component } from 'react';
import './PastEvents.css';

class PastParticipantList extends Component {
  render() {
    const { participants } = this.props;
    return (
      <>
        <div style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #eee', boxShadow: '0 2px 4px -2px #ccc', background: '#fff' }}>
          <span className="upcoming-event-label">Participants</span>
        </div>
        <div className="past-event-participants-list" style={{ padding: 0 }}>
          <ul className="participants-array-list" style={{ textAlign: 'left', paddingLeft: 0, margin: 0 }}>
            {Array.isArray(participants) && participants.length > 0 ? (
              participants.map((p, i) => (
                <li
                  key={i}
                  className="participant-item-array"
                  style={{ textAlign: 'left', paddingLeft: 0 }}
                >
                  {i + 1} | {p}
                </li>
              ))
            ) : (
              <li style={{ color: '#888', fontStyle: 'italic', marginTop: 8, textAlign: 'left', display: 'block', paddingLeft: 0 }}>No participants recorded.</li>
            )}
          </ul>
        </div>
      </>
    );
  }
}

export default PastParticipantList;
