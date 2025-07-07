import React, { Component } from 'react';

const popupStyle = {
  minWidth: 220,
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
  padding: 16,
  fontFamily: 'inherit',
  lineHeight: 1.5,
};
const labelStyle = {
  fontWeight: 600,
  color: '#2c3e50',
  marginRight: 4,
};
const valueStyle = {
  color: '#222',
};

class ObservationPopup extends Component {
  render() {
    const { obs } = this.props;
    return (
      <div style={popupStyle} className="observation-popup">
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: '#1a237e' }}>{obs.Location}</div>
        {obs.Date && (
          <div><span style={labelStyle}>Date:</span> <span style={valueStyle}>{obs.Date}</span></div>
        )}
        {obs.Time && (
          <div><span style={labelStyle}>Time:</span> <span style={valueStyle}>{obs.Time}</span></div>
        )}
        {obs["Number of Birds"] && (
          <div><span style={labelStyle}>Number of birds:</span> <span style={valueStyle}>{obs["Number of Birds"]}</span></div>
        )}
        {obs["Seen/Heard"] && (
          <div><span style={labelStyle}>Seen/Heard:</span> <span style={valueStyle}>{obs["Seen/Heard"]}</span></div>
        )}
        {obs["Activity (foraging, preening, calling, perching, others)"] && (
          <div><span style={labelStyle}>Activity:</span> <span style={valueStyle}>{obs["Activity (foraging, preening, calling, perching, others)"]}</span></div>
        )}
        {obs["Observer name"] && (
          <div><span style={labelStyle}>Observer:</span> <span style={valueStyle}>{obs["Observer name"]}</span></div>
        )}
      </div>
    );
  }
}

export default ObservationPopup;
