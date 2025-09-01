import React from 'react';

export default function Telegram({ events }) {
  if (!events.length) return <div className="no-events">No current events.</div>;
  return events.map(event => (
    <div key={event.id} className="survey-event-card">
      <div className="survey-event-title" style={{ color: '#166534' }}>{event.title}</div>
      <div className="survey-event-date" style={{ color: '#2563eb' }}>{event.date}</div>
      <div
        className={`survey-event-status current`}
        style={{ color: '#f59e0b', background: '#fef9c3' }}
      >
        {event.status}
      </div>
    </div>
  ));
}
