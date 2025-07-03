import React, { Component } from 'react';
import './NewSurveyModal.css';
import ObserverInfoSection from './ObserverInfoSection';
import ObservationDetailsSection from './ObservationDetailsSection';
import SubmissionSummarySection from './SubmissionSummarySection';
import { insertSurveyData } from '../../data/shbData';

const SECTIONS = [
  {
    key: 'observer',
    legend: 'Observation Info',
    fields: [
      'Observer(s) name',
      'Location',
      'Date',
      'Number of Observation',
    ],
  },
  {
    key: 'observation',
    legend: 'Observation Details',
    fields: [
      'Lat',
      'Long',
      'Time',
    ],
  },
  {
    key: 'height',
    legend: 'Submission Summary Details',
    fields: [
      'Height of tree/m',
      'Height of bird/m',
    ],
  },
];

class NewSurveyModal extends Component {
  state = {
    newSurvey: {
      'Observer name': [''],
      'SHB individual ID': '',
      'Number of Birds': '',
      'Number of Observation': '', // <-- Add this line
      'Location': '',
      'Lat': '',
      'Long': '',
      'Date': '',
      'Time': '',
      'Height of tree/m': '',
      'Height of bird/m': '',
      'Activity (foraging, preening, calling, perching, others)': '',
      'Seen/Heard': '',
      'Activity Details': '',
    },
    currentSection: 0,
    errorMessages: {}, // changed from errorMessage: ''
  };

  // Utility to get observer names as a comma-separated string
  getObserverNamesString = () => {
    const names = (this.state.newSurvey['Observer name'] || []).filter(n => n && n.trim());
    return names.join(', ');
  };

  validateObserverSection = () => {
    const { newSurvey } = this.state;
    const errors = {};
    if (!(newSurvey['Observer name'] && newSurvey['Observer name'].some(name => name.trim()))) {
      errors['Observer name'] = 'At least one observer name is required.';
    }
    if (!newSurvey['Location'].trim()) {
      errors['Location'] = 'Location is required.';
    }
    if (!newSurvey['Date'].trim()) {
      errors['Date'] = 'Date is required.';
    }
    if (!newSurvey['Number of Observation'].trim() || isNaN(Number(newSurvey['Number of Observation']))) {
      errors['Number of Observation'] = 'Number of Observation is required and must be a number.';
    }
    return errors;
  };

  validateObservationSection = () => {
    const { newSurvey } = this.state;
    const errors = {};
    const requiredFields = [
      'Number of Birds',
      'HeightOfTree',
      'HeightOfBird',
      'Lat',
      'Long',
      'Time',
      'Activity',
      'SeenHeard',
    ];
    const details = Array.isArray(newSurvey['Observation Details']) ? newSurvey['Observation Details'] : [];
    details.forEach((row, idx) => {
      requiredFields.forEach(field => {
        if (!row[field] || row[field].toString().trim() === '') {
          if (!errors[idx]) errors[idx] = {};
          errors[idx][field] = `${field} is required for row ${idx + 1}`;
        }
      });
    });
    return errors;
  };

  handleObserverNameChange = (idx, value) => {
    this.setState((prevState) => {
      const names = [...prevState.newSurvey['Observer name']];
      names[idx] = value;
      return {
        newSurvey: {
          ...prevState.newSurvey,
          'Observer name': names,
        },
      };
    });
  };

  handleAddObserverName = () => {
    this.setState((prevState) => ({
      newSurvey: {
        ...prevState.newSurvey,
        'Observer name': [...prevState.newSurvey['Observer name'], ''],
      },
    }));
  };

  handleRemoveObserverName = (idx) => {
    this.setState((prevState) => {
      const names = prevState.newSurvey['Observer name'].filter((_, i) => i !== idx);
      return {
        newSurvey: {
          ...prevState.newSurvey,
          'Observer name': names.length ? names : [''],
        },
      };
    });
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'Observer(s) name') return; // handled separately
    this.setState((prevState) => ({
      newSurvey: {
        ...prevState.newSurvey,
        [name]: value,
      },
    }));
  };

  handleNumberOfObservationChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    const num = Math.max(1, parseInt(value || '1', 10));
    this.setState((prevState) => {
      let details = prevState.newSurvey['Observation Details'] || [];
      if (num > details.length) {
        details = details.concat(Array(num - details.length).fill({ Location: '', Lat: '', Long: '', Date: '', Time: '' }));
      } else if (num < details.length) {
        details = details.slice(0, num);
      }
      return {
        newSurvey: {
          ...prevState.newSurvey,
          'Number of Observation': value,
          'Observation Details': details,
        },
      };
    });
  };

   handleObservationDetailChange = (idx, field, value) => {
    // Always treat newSurvey as an object, and Observation Details as an array
    let details = Array.isArray(this.state.newSurvey['Observation Details'])
      ? [...this.state.newSurvey['Observation Details']]
      : [];
  
    // If details is empty but Number of Observation is set, initialize array
    if (
      details.length === 0 &&
      this.state.newSurvey['Number of Observation'] &&
      !isNaN(Number(this.state.newSurvey['Number of Observation']))
    ) {
      const numRows = Math.max(1, parseInt(this.state.newSurvey['Number of Observation'], 10));
      details = Array.from({ length: numRows }, () => ({}));
    }
  
    // Support replaceAll for Observation Details (for Add Row)
    if (idx === 'replaceAll' && field === 'Observation Details') {
      details = value;
    } else {
      // Ensure the array is long enough
      if (typeof idx === 'number' && idx >= details.length) {
        details = [
          ...details,
          ...Array.from({ length: idx - details.length + 1 }, () => ({})),
        ];
      }
      details[idx] = { ...details[idx], [field]: value };
    }
  
    // --- Auto-generate SHB individual ID sequentially across all rows ---
    details = details.map((row, idx) => {
      const num = parseInt(row['Number of Birds'], 10);
      let shbId = '';
      if (num && num > 0) {
        let startNum = 1;
        // Calculate the starting ID number based on birds in previous rows
        for (let i = 0; i < idx; i++) {
          const prevNum = parseInt(details[i]?.['Number of Birds'] || '', 10);
          if (prevNum && prevNum > 0) startNum += prevNum;
        }
        shbId = Array.from({ length: num }, (_, i) => `SHB${startNum + i}`).join(', ');
      }
      return { ...row, 'SHB individual ID': shbId };
    });
  
    // Always sync 'Number of Observation' to the number of rows
    this.setState(prevState => ({
      newSurvey: {
        ...prevState.newSurvey,
        'Observation Details': details,
        'Number of Observation': details.length ? String(details.length) : '1',
      },
    }));
  };

  handleNext = () => {
    if (this.state.currentSection === 0) {
      const errors = this.validateObserverSection();
      if (Object.keys(errors).length > 0) {
        this.setState({ errorMessages: errors });
        return;
      }
    }
    if (this.state.currentSection === 1) {
      const errors = this.validateObservationSection();
      if (Object.keys(errors).length > 0) {
        this.setState({ errorMessages: errors });
        return;
      }
    }
    this.setState(prevState => ({
      currentSection: Math.min(prevState.currentSection + 1, SECTIONS.length - 1),
      errorMessages: {},
    }));
  };

  handleBack = () => {
    this.setState((prevState) => ({
      currentSection: Math.max(prevState.currentSection - 1, 0),
    }));
  };


  formatSubmissionSummaryAsJson = () => {
    const { newSurvey } = this.state;
    const isObservationArray = Array.isArray(newSurvey['Observation Details']);
    if (!isObservationArray) return '[]';
    
    // Recalculate sequential Bird IDs before submission
    const observationDetails = [...newSurvey['Observation Details']];
    const detailsWithCalculatedIds = observationDetails.map((obs, idx) => {
      const num = parseInt(obs['Number of Birds'], 10);
      let shbId = '';
      if (num && num > 0) {
        let startNum = 1;
        // Calculate the starting ID number based on birds in previous rows
        for (let i = 0; i < idx; i++) {
          const prevNum = parseInt(observationDetails[i]?.['Number of Birds'] || '', 10);
          if (prevNum && prevNum > 0) startNum += prevNum;
        }
        shbId = Array.from({ length: num }, (_, i) => `SHB${startNum + i}`).join(', ');
      }
      return { ...obs, 'SHB individual ID': shbId };
    });
    
    const summary = detailsWithCalculatedIds.map((obs, idx) => ({
      'Observer name': Array.isArray(newSurvey['Observer name'])
        ? newSurvey['Observer name'].join(', ')
        : (newSurvey['Observer name']),
      'SHB individual ID': obs['SHB individual ID'],
      'Number of Birds': obs['Number of Birds'] ,
      'Location': newSurvey['Location'],
      'Height of bird/m': obs['HeightOfBird'],
      'Lat': obs['Lat'],
      'Long': obs['Long'],
      'Date': newSurvey['Date'],
      'Time': obs['Time'],
      'Height of tree/m': obs['HeightOfTree'],
      'Activity (foraging, preening, calling, perching, others)': obs['Activity'],
      'Seen/Heard': obs['SeenHeard'],
      'Activity Details': obs['ActivityDetails']
    }));
    return JSON.stringify(summary, null, 2);
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const summary = JSON.parse(this.formatSubmissionSummaryAsJson());
    try {
      const result = await insertSurveyData(summary);
      console.log('Insert result:', result);
      if (result.success) {
        console.log('Survey inserted successfully:', result.message);
        this.handleCancel();
        // Optionally reset form or close modal here
      } else {
        console.error('Insert failed:', result.message);
      }
    } catch (error) {
      console.error('Error inserting survey:', error);
    }
  };

  handleCancel = () => {
    this.setState({
      newSurvey: {
        'Observer name': [''],
        'SHB individual ID': '',
        'Number of Birds': '',
        'Number of Observation': '', // <-- Reset this line
        'Location': '',
        'Lat': '',
        'Long': '',
        'Date': '',
        'Time': '',
        'Height of tree/m': '',
        'Height of bird/m': '',
        'Activity (foraging, preening, calling, perching, others)': '',
        'Seen/Heard': '',
        'Activity Details': '',
      },
      currentSection: 0,
      errorMessages: {},
    });
    if (this.props.onClose) this.props.onClose();
  };

  // Add swipe gesture support
  touchStartX = null;
  touchEndX = null;

  handleTouchStart = (e) => {
    this.touchStartX = e.touches[0].clientX;
  };

  handleTouchMove = (e) => {
    this.touchEndX = e.touches[0].clientX;
  };

  handleTouchEnd = () => {
    if (this.touchStartX !== null && this.touchEndX !== null) {
      const diff = this.touchEndX - this.touchStartX;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && !this.state.currentSection === 0) {
          this.handleBack(); // Swipe right to go back
        } else if (diff < 0 && this.state.currentSection < SECTIONS.length - 1) {
          this.handleNext(); // Swipe left to go next
        }
      }
    }
    this.touchStartX = null;
    this.touchEndX = null;
  };

  render() {
    const { show, onClose } = this.props;
    const { newSurvey, currentSection, errorMessages } = this.state;
    if (!show) return null;
    const section = SECTIONS[currentSection];
    const isLast = currentSection === SECTIONS.length - 1;
    const isFirst = currentSection === 0;
    const totalSections = SECTIONS.length;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center', /* Changed from flex-start to center */
        justifyContent: 'center',
        zIndex: 2000,
        background: 'rgba(0,0,0,0.35)',
        padding: 0
      }}>
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header" style={{marginBottom: 0}}>
            <h3 style={{marginBottom: 0}}>New Survey Entry</h3>
          </div>

          {/* Body */}
          <div className="modal-body" style={{margin: '32px 0 0 0', maxHeight: 'calc(80vh - 100px)', overflowY: 'auto'}}>
            {/* Section navigation and progress at the top of the body */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '0 0 18px 0' }}>
              {SECTIONS.map((s, idx) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    // Validate before switching tab
                    let errors = {};
                    if (currentSection === 0) {
                      errors = this.validateObserverSection();
                    } else if (currentSection === 1) {
                      errors = this.validateObservationSection();
                    }
                    if (Object.keys(errors).length > 0) {
                      this.setState({ errorMessages: errors });
                      return;
                    }
                    this.setState({ currentSection: idx, errorMessages: {} });
                  }}
                  style={{
                    background: idx === currentSection ? '#3949ab' : '#e3e7fd',
                    color: idx === currentSection ? '#fff' : '#3949ab',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontWeight: 500,
                    fontSize: '0.98rem',
                    cursor: 'pointer',
                    transition: 'background 0.18s, color 0.18s',
                  }}
                >
                  {s.legend}
                </button>
              ))}
            </div>
            <div style={{ width: '100%', height: 6, background: '#e3e7fd', borderRadius: 4, margin: '0 0 10px 0' }}>
              <div
                style={{
                  width: `${((currentSection + 1) / totalSections) * 100}%`,
                  height: '100%',
                  background: '#3949ab',
                  borderRadius: 4,
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <div style={{ textAlign: 'center', margin: '0 0 18px 0', color: '#3949ab', fontWeight: 500 }}>
              Page {currentSection + 1} of {totalSections}
            </div>

            {/* Actual form fields and navigation at the bottom of the body */}
            <form onSubmit={this.handleSubmit} style={{ position: 'relative' }}
              onTouchStart={this.handleTouchStart}
              onTouchMove={this.handleTouchMove}
              onTouchEnd={this.handleTouchEnd}
            >
              <div className="modal-form-flex">
                {/* Navigation arrows absolutely positioned and overlapping fields */}
                {!isFirst && (
                  <button
                    type="button"
                    onClick={this.handleBack}
                    className="modal-nav-arrow left"
                    aria-label="Previous section"
                  >
                    {'<'}
                  </button>
                )}
                <div className="modal-form-fields">
                  <fieldset style={{ marginBottom: 0, border: 'none', padding: 0 }}>
                    <legend className="modal-section-legend">{section.legend}</legend>
                    {section.key === 'observer' && (
                      <ObserverInfoSection
                        newSurvey={newSurvey}
                        onObserverNameChange={this.handleObserverNameChange}
                        onAddObserverName={this.handleAddObserverName}
                        onRemoveObserverName={this.handleRemoveObserverName}
                        onInputChange={this.handleInputChange}
                        onNumberOfObservationChange={this.handleNumberOfObservationChange}
                        fieldErrors={errorMessages}
                      />
                    )}
                    {section.key === 'observation' && (
                      <ObservationDetailsSection
                        newSurvey={newSurvey}
                        onObservationDetailChange={this.handleObservationDetailChange}
                        onDeleteObservationRow={(idx) => {
                          const details = newSurvey['Observation Details'].filter((_, i) => i !== idx);
                          this.setState(prevState => ({
                            newSurvey: {
                              ...prevState.newSurvey,
                              'Observation Details': details.length ? details : [{}],
                              'Number of Observation': details.length ? String(details.length) : '1',
                            },
                          }));
                        }}
                        fieldErrors={currentSection === 1 ? errorMessages : {}}
                      />
                    )}
                    {section.key === 'height' && (
                      <SubmissionSummarySection newSurvey={newSurvey} />
                    )}
                    {/* Render other fields for other sections */}
                    {section.key !== 'observer' && section.key !== 'observation' && section.key !== 'height' && section.fields.map((key) => (
                      <div key={key} style={{ marginBottom: 18 }}>
                        <label>
                          {key}
                          <input
                            type="text"
                            name={key}
                            value={newSurvey[key]}
                            onChange={this.handleInputChange}
                            required={key !== 'Activity Details'}
                          />
                        </label>
                      </div>
                    ))}
                  </fieldset>
                </div>
                {!isLast && (
                  <button
                    type="button"
                    onClick={this.handleNext}
                    className="modal-nav-arrow right"
                    aria-label="Next section"
                  >
                    {'>'}
                  </button>
                )}
              </div>
              {/* Footer: Cancel/Save */}
              {section.key === 'height' ? (
                <div className="modal-footer modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
                  <button type="button" onClick={this.handleCancel}>Cancel</button>
                  <button type="submit" onClick={() => this.handleSubmit()}>Submit</button>
                </div>
              ) : section.key === 'observation' ? (
                <div className="modal-footer modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
                  <button type="button" onClick={this.handleCancel}>Cancel</button>
                </div>
              ) : (
                <div className="modal-footer modal-actions" style={{ justifyContent: 'flex-end', marginTop: 32 }}>
                  <button type="button" onClick={this.handleCancel}>Cancel</button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default NewSurveyModal;
