import React, { Component } from 'react';
import '../../css/components/Dashboard/NewSurveyModal.css';
import '../../css/components/Dashboard/ObserverInfoSection.css';
import '../../css/components/Dashboard/RifleRangeRoadNewSurveyModal.css';
import simpleApiService from '../../utils/simpleApiService';

const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Light Rain', 'Heavy Rain', 'Clear Sky'];

const SECTIONS = [
  {
    key: 'volunteerInfo',
    legend: 'Volunteer & Weather Info',
    fields: ['Observer name', 'Date', 'Weather'],
  },
  {
    key: 'transect',
    legend: 'Transect Survey Times',
    fields: ['Transect Survey Start Time', 'Transect Survey End Time'],
  },
  {
    key: 'ropeBridge',
    legend: 'Rope Bridge Survey Times',
    fields: ['Rope Bridge A Survey Start Time', 'Rope Bridge B Survey Start Time'],
  },
];

const INITIAL_STATE = {
  'Observer name': [''],
  'Date': '',
  'Weather': '',
  'Transect Survey Start Time': '',
  'Transect Survey End Time': '',
  'Rope Bridge A Survey Start Time': '',
  'Rope Bridge B Survey Start Time': '',
};

const FIELD_META = {
  'Observer name': { label: "Volunteer names (everyone's names, in full)" },
  'Date': { label: 'Survey Date', type: 'date' },
  'Weather': { label: 'Weather', options: WEATHER_OPTIONS },
  'Transect Survey Start Time': { label: 'TRANSECT Survey start time', type: 'time' },
  'Transect Survey End Time': { label: 'TRANSECT Survey end time', type: 'time' },
  'Rope Bridge A Survey Start Time': { label: 'ROPE BRIDGE A survey start time (24hr, or N/A if not surveyed)', placeholder: 'e.g. 20:30 or N/A' },
  'Rope Bridge B Survey Start Time': { label: 'ROPE BRIDGE B survey start time (24hr, or N/A if not surveyed)', placeholder: 'e.g. 20:30 or N/A' },
};

// Fields present on every document in the shared "Wildlife Survey" collection, defaulted to null
// since a session-entry submission doesn't capture per-species observation data.
const SPECIES_FIELDS_REGULAR = {
  'Time of Observation': null,
  'iNat Username': null,
  'Image URL': null,
  'Lat': null,
  'Lon': null,
  'Scientific Name (Genus/Species)': null,
  'Common Name (If unavailable, sci name)': null,
  'Count': null,
  'Which side of the road is it on? (N/S/On road)': null,
  'Roadkill?': null,
  'Behaviours observed and/or other remarks': null,
  'Taxa': null,
  'Target Species': null,
  'Identified?': null,
};

// Rope bridge fields not captured by this form, always saved as null.
const SPECIES_FIELDS_ROPE_BRIDGE = {
  'iNat Username': null,
  'Image URL': null,
  'Lat': null,
  'Lon': null,
  'Scientific Name (Genus/Species)': null,
  'Common Name': null,
  'Count': null,
  'Is the animal physically on the rope bridge?': null,
  'Which side of the road did it come from? (N/S)': null,
  'Crossing Type': null,
  'Behaviours observed and/or other remarks': null,
  'Target Species?': null,
  'Identified?': null,
};

class RifleRangeRoadNewSurveyModal extends Component {
  state = {
    survey: { ...INITIAL_STATE },
    currentSection: 0,
    errors: {},
    isSubmitting: false,
    submitError: null,
  };

  handleChange = (field, value) => {
    this.setState(prevState => ({
      survey: { ...prevState.survey, [field]: value },
      errors: { ...prevState.errors, [field]: undefined },
    }));
  };

  handleObserverNameChange = (idx, value) => {
    this.setState(prevState => {
      const names = [...prevState.survey['Observer name']];
      names[idx] = value;
      return {
        survey: { ...prevState.survey, 'Observer name': names },
        errors: { ...prevState.errors, 'Observer name': undefined },
      };
    });
  };

  handleAddObserverName = () => {
    this.setState(prevState => ({
      survey: {
        ...prevState.survey,
        'Observer name': [...prevState.survey['Observer name'], ''],
      },
    }));
  };

  handleRemoveObserverName = (idx) => {
    this.setState(prevState => {
      const names = prevState.survey['Observer name'].filter((_, i) => i !== idx);
      return {
        survey: { ...prevState.survey, 'Observer name': names.length ? names : [''] },
      };
    });
  };

  validateSection = (sectionIndex) => {
    const { survey } = this.state;
    const errors = {};

    SECTIONS[sectionIndex].fields.forEach(field => {
      if (field === 'Observer name') {
        if (!survey['Observer name'].some(name => name.trim())) {
          errors['Observer name'] = 'At least one observer name is required.';
        }
      } else if (!String(survey[field] || '').trim()) {
        errors[field] = 'This field is required.';
      }
    });

    return errors;
  };

  handleNext = () => {
    const errors = this.validateSection(this.state.currentSection);
    if (Object.keys(errors).length > 0) {
      this.setState({ errors });
      return;
    }

    this.setState(prevState => ({
      currentSection: Math.min(prevState.currentSection + 1, SECTIONS.length - 1),
      errors: {},
    }));
  };

  handleBack = () => {
    this.setState(prevState => ({
      currentSection: Math.max(prevState.currentSection - 1, 0),
      errors: {},
    }));
  };

  handleCancel = () => {
    this.setState({ survey: { ...INITIAL_STATE }, currentSection: 0, errors: {}, submitError: null });
    this.props.onClose && this.props.onClose();
  };

  handleSubmit = async (event) => {
    event.preventDefault();
    const errors = this.validateSection(this.state.currentSection);

    if (Object.keys(errors).length > 0) {
      this.setState({ errors });
      return;
    }

    this.setState({ isSubmitting: true, submitError: null });

    try {
      const { survey } = this.state;
      const surveyorNames = survey['Observer name'].filter(name => name.trim()).join(', ');
      // Native date input yields yyyy-mm-dd; convert to dd/mm/yyyy for storage.
      const [year, month, day] = survey['Date'].split('-');
      const surveyDate = `${day}/${month}/${year}`;

      const documents = [
        {
          'Name of Surveyors': surveyorNames,
          'Survey Date': surveyDate,
          'Weather Conditions': survey['Weather'],
          'Survey Start Time': survey['Transect Survey Start Time'],
          'Survey End Time': survey['Transect Survey End Time'],
          ...SPECIES_FIELDS_REGULAR,
          'type': 'Data (Regular) cleaned',
        },
      ];

      [
        { id: 'A', time: survey['Rope Bridge A Survey Start Time'] },
        { id: 'B', time: survey['Rope Bridge B Survey Start Time'] },
      ].forEach(({ id, time }) => {
        // Always submit a document for each bridge, even when marked "N/A" (not surveyed).
        documents.push({
          'Name of Surveyors': surveyorNames,
          'Survey Date': surveyDate,
          'Weather Conditions': survey['Weather'],
          'Time of Observation': time,
          'Survey Start Time': survey['Transect Survey Start Time'],
          'Survey End Time': survey['Transect Survey End Time'],
          ...SPECIES_FIELDS_ROPE_BRIDGE,
          'Rope Bridge ID': id,
          'type': 'Data (Rope Bridge) cleaned',
        });
      });

      const responses = await Promise.all(
        documents.map(doc => simpleApiService.submitRifleRangeRoadSurvey(doc))
      );

      const failed = responses.find(response => !response || response.success === false);
      if (failed) {
        throw new Error(failed?.error || failed?.message || 'Failed to submit survey');
      }

      this.setState({ isSubmitting: false });
      this.props.onSubmitSuccess && this.props.onSubmitSuccess(responses);
      this.handleCancel();
    } catch (error) {
      this.setState({
        isSubmitting: false,
        submitError: error.message || 'Failed to submit survey. Please try again.',
      });
    }
  };

  renderObserverNameField = () => {
    const { survey, errors } = this.state;
    const names = survey['Observer name'];

    return (
      <div className="form-group" key="Observer name">
        <div className="field-label">
          {FIELD_META['Observer name'].label} <span className="required-asterisk">*</span>
        </div>
        {names.map((name, idx) => (
          <div key={idx} className="observer-name-row">
            <input
              type="text"
              value={name}
              onChange={(e) => this.handleObserverNameChange(idx, e.target.value)}
              className="form-control"
              placeholder={`Volunteer name${names.length > 1 ? ` #${idx + 1}` : ''}`}
              style={{ flex: 1 }}
            />
            {names.length > 1 && (
              <button
                type="button"
                className="btn-remove-observer"
                onClick={() => this.handleRemoveObserverName(idx)}
                aria-label="Remove volunteer"
              >
                -
              </button>
            )}
            {idx === names.length - 1 && (
              <button
                type="button"
                className="btn-add-observer"
                onClick={this.handleAddObserverName}
                aria-label="Add volunteer"
              >
                +
              </button>
            )}
          </div>
        ))}
        {errors['Observer name'] && (
          <div style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: 4 }}>{errors['Observer name']}</div>
        )}
      </div>
    );
  };

  renderRopeBridgeTimeField = (field) => {
    const { survey, errors } = this.state;
    const { label } = FIELD_META[field];
    const value = survey[field];
    const isNA = value === 'N/A';

    return (
      <div className="form-group" key={field}>
        <div className="field-label">
          {label} <span className="required-asterisk">*</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="time"
            lang="en-GB"
            className="form-control"
            value={isNA ? '' : value}
            onChange={(e) => this.handleChange(field, e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => this.handleChange(field, 'N/A')}
            style={{
              padding: '8px 14px',
              borderRadius: 4,
              border: '1px solid #ccc',
              background: isNA ? '#007bff' : '#f8f9fa',
              color: isNA ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            N/A
          </button>
        </div>
        {errors[field] && (
          <div style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: 4 }}>{errors[field]}</div>
        )}
      </div>
    );
  };

  renderField = (field) => {
    if (field === 'Observer name') return this.renderObserverNameField();
    if (field === 'Rope Bridge A Survey Start Time' || field === 'Rope Bridge B Survey Start Time') {
      return this.renderRopeBridgeTimeField(field);
    }

    const { survey, errors } = this.state;
    const { label, type = 'text', placeholder, options } = FIELD_META[field];

    return (
      <div className="form-group" key={field}>
        <div className="field-label">
          {label} <span className="required-asterisk">*</span>
        </div>
        {options ? (
          <select
            className="form-control"
            value={survey[field]}
            onChange={(e) => this.handleChange(field, e.target.value)}
          >
            <option value="">Select {label}</option>
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            lang={type === 'time' ? 'en-GB' : undefined}
            className="form-control"
            value={survey[field]}
            placeholder={placeholder}
            onChange={(e) => this.handleChange(field, e.target.value)}
          />
        )}
        {errors[field] && (
          <div style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: 4 }}>{errors[field]}</div>
        )}
      </div>
    );
  };

  render() {
    const { show } = this.props;
    if (!show) return null;

    const { currentSection, isSubmitting, submitError } = this.state;
    const section = SECTIONS[currentSection];
    const isFirst = currentSection === 0;
    const isLast = currentSection === SECTIONS.length - 1;
    const totalSections = SECTIONS.length;

    return (
      <div className="modal-overlay rrr-new-survey-modal">
        <div className="modal-content">
          <div className="modal-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3 style={{ margin: 0 }}>New Survey Entry (Rifle Range Road)</h3>
              <button
                type="button"
                onClick={this.handleCancel}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
          </div>

          <div className="modal-body">
            <div className="modal-body-controls">
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {SECTIONS.map((s, idx) => (
                  <button
                    key={s.key}
                    type="button"
                    style={{
                      background: idx === currentSection ? '#007bff' : '#f8f9fa',
                      color: idx === currentSection ? '#fff' : '#333',
                      border: '1px solid #ccc',
                      borderRadius: 4,
                      padding: '6px 14px',
                      fontWeight: 500,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {s.legend}
                  </button>
                ))}
              </div>

              <div className="modal-progress-container" style={{ margin: '0 auto 10px auto' }}>
                <div className="modal-progress-bar">
                  <div
                    className="modal-progress-fill"
                    style={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
                  />
                </div>
              </div>

              <div className="modal-page-number" style={{ textAlign: 'center', marginBottom: 0 }}>
                Page {currentSection + 1} of {totalSections}
              </div>
            </div>

            <div className="modal-body-form">
              <form onSubmit={this.handleSubmit}>
                <div className="form-section">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    {!isFirst ? (
                      <button type="button" onClick={this.handleBack} className="modal-mid-nav-btn section-nav-btn">
                        ←
                      </button>
                    ) : (
                      <div style={{ width: 48 }}></div>
                    )}
                    <h3 className="section-title" style={{ margin: 0, flex: 1, textAlign: 'center' }}>{section.legend}</h3>
                    {!isLast ? (
                      <button type="button" onClick={this.handleNext} className="modal-mid-nav-btn section-nav-btn">
                        →
                      </button>
                    ) : (
                      <div style={{ width: 48 }}></div>
                    )}
                  </div>
                  {section.fields.map(field => this.renderField(field))}
                </div>

                {submitError && (
                  <div style={{ color: '#dc3545', marginTop: 8 }}>{submitError}</div>
                )}
              </form>
            </div>
          </div>

          <div className="modal-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {!isFirst ? (
                <button type="button" onClick={this.handleBack} disabled={isSubmitting}>
                  ← Back
                </button>
              ) : (
                <button type="button" onClick={this.handleCancel} disabled={isSubmitting}>
                  Cancel
                </button>
              )}

              {!isLast ? (
                <button type="button" onClick={this.handleNext}>
                  Next →
                </button>
              ) : (
                <button type="submit" onClick={this.handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default RifleRangeRoadNewSurveyModal;
