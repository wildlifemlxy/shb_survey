import React, { Component } from 'react';

class NewSurveyButton extends Component {
  render() {
    const { onClick } = this.props;
    return (
      <button
        type="button"
        style={{
          background: '#1976d2',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 6,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 15,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          transition: 'background 0.2s',
          marginLeft: 16
        }}
        onClick={onClick}
      >
        + New Survey
      </button>
    );
  }
}

export default NewSurveyButton;
