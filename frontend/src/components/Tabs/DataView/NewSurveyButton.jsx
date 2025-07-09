import React, { Component } from 'react';

class NewSurveyButton extends Component {
  render() {
    const { onClick } = this.props;
    return (
      <button
        type="button"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          background: 'linear-gradient(135deg, var(--primary-green), var(--primary-green-dark))',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: 'pointer',
          transition: 'all var(--transition-medium)',
          fontFamily: 'inherit',
          boxShadow: 'var(--shadow-md)'
        }}
        onClick={onClick}
      >
        + New Survey
      </button>
    );
  }
}

export default NewSurveyButton;
