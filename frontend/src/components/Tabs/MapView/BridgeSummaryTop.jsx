import React, { Component } from 'react';

class BridgeSummaryTop extends Component {
  render() {
    return (
      <div
        style={{
          flex: '0 0 52%',
          minHeight: 120,
          background: '#edf3ed',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />
    );
  }
}

export default BridgeSummaryTop;
