import React, { Component } from 'react';

const COLUMN_LABELS = {
  'Number of Birds': 'Number of Birds',
  "SHB individual ID": 'SHB individual ID',
  HeightOfTree: 'Height of tree',
  HeightOfBird: 'Height of bird',
  Time: 'Time',
  Activity: 'Activity',
  SeenHeard: 'Seen/Heard',
  ActivityDetails: 'Activity Details',
};

const REQUIRED_FIELDS = [
  'Number of Birds',
  'SHB individual ID',
  'HeightOfTree',
  'HeightOfBird',
  'Lat',
  'Long',
  'Time',
  'Activity',
  'SeenHeard',
];

class ObservationDetailsSection extends Component {
  render() {
    const { newSurvey, onObservationDetailChange, onDeleteObservationRow, fieldErrors = {} } = this.props;
    
    console.log('Rendering ObservationDetailsSection with observationDetails:', newSurvey);
    
    // Defensive: always use an array for observationDetails
    let observationDetails = [];
    if (Array.isArray(newSurvey['Observation Details'])) {
      observationDetails = newSurvey['Observation Details'];
    } else if (typeof newSurvey['Number of Observation'] === 'string' && parseInt(newSurvey['Number of Observation'], 10) > 0) {
      // If Number of Observation is set but no Observation Details, create empty rows
      const numRows = parseInt(newSurvey['Number of Observation'], 10);
      observationDetails = Array.from({ length: numRows }, () => ({ 
      }));
    }
    // Ensure 'Number of Observation' always matches the number of rows
    if (observationDetails.length !== parseInt(newSurvey['Number of Observation'], 10)) {
      if (typeof onObservationDetailChange === 'function') {
        onObservationDetailChange('replaceAll', 'Observation Details', observationDetails);
      }
    }
    // Defensive: always use observationDetails for all row access
    return (
      <div style={{ marginBottom: 18, maxWidth: 1200, margin: '0 auto 18px auto' }}>
        <div className="observation-table-scroll" style={{ 
          minWidth: '100%', 
          maxWidth: '100%', 
          overflowX: 'auto',
          display: 'flex',
          justifyContent: 'center',
          paddingLeft: '20px',
          paddingRight: '20px'
        }}>
          <table style={{
            minWidth: 1160,
            width: 'max-content',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>Number of Birds</th>
                <th style={{ whiteSpace: 'nowrap' }}>Bird ID</th>
                <th style={{ whiteSpace: 'nowrap' }}>Height of tree</th>
                <th style={{ whiteSpace: 'nowrap' }}>Height of bird</th>
                <th style={{ whiteSpace: 'nowrap' }}>Lat</th>
                <th style={{ whiteSpace: 'nowrap' }}>Long</th>
                <th style={{ whiteSpace: 'nowrap' }}>Time</th>
                <th style={{ whiteSpace: 'nowrap' }}>Activity</th>
                <th style={{ whiteSpace: 'nowrap' }}>Seen/Heard</th>
                <th style={{ whiteSpace: 'nowrap' }}>Activity Details</th>
                <th style={{ whiteSpace: 'nowrap' }}>Row Actions</th>
              </tr>
            </thead>
            <tbody>
              {observationDetails.map((row, idx) => {
                return (
                  <tr key={idx}>
                    <td>
                      <input
                        className="table-input"
                        type="text"
                        style={{ width: '180px' }}
                        value={row['Number of Birds'] ?? ''}
                        onChange={e => {
                          const val = e.target.value.replace(/[^\d]/g, '');
                          onObservationDetailChange(idx, 'Number of Birds', val);
                        }}
                        placeholder="Enter number"
                        title="Enter the number of birds - Bird ID will be auto-generated"
                        required
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        type="text"
                        style={{ width: '390px', overflowX: 'auto', whiteSpace: 'nowrap' }}
                        value={row['SHB individual ID'] || ''}
                        onChange={e => {
                          let value = e.target.value;
                          
                          // Auto-add "SHB" after each comma
                          if (value.endsWith(',')) {
                            value = value + ' SHB';
                          } else if (value.endsWith(', ')) {
                            value = value + 'SHB';
                          }
                          
                          onObservationDetailChange(idx, 'SHB individual ID', value);
                        }}
                        placeholder="Enter Bird ID(s) - e.g., SHB1, SHB2, SHB3"
                        title="Enter bird IDs separated by commas. SHB will be added automatically after commas. Number of Birds will be auto-calculated."
                      />
                    </td>
                    <td>
                      <input className="table-input" type="text" style={{ width: '210px' }} value={row.HeightOfTree || ''} onChange={e => onObservationDetailChange(idx, 'HeightOfTree', e.target.value)} required />
                    </td>
                    <td>
                      <input className="table-input" type="text" style={{ width: '210px' }} value={row.HeightOfBird || ''} onChange={e => onObservationDetailChange(idx, 'HeightOfBird', e.target.value)} required />
                    </td>
                    <td>
                      <input className="table-input" type="text" style={{ width: '140px' }} value={row.Lat || ''} onChange={e => onObservationDetailChange(idx, 'Lat', e.target.value)} required />
                    </td>
                    <td>
                      <input className="table-input" type="text" style={{ width: '140px' }} value={row.Long || ''} onChange={e => onObservationDetailChange(idx, 'Long', e.target.value)} required />
                    </td>
                    <td>
                      <input 
                        className="table-input" 
                        type="time" 
                        style={{ 
                          width: '180px',
                          colorScheme: 'light',
                          position: 'relative'
                        }} 
                        value={row.Time || ''} 
                        onChange={e => onObservationDetailChange(idx, 'Time', e.target.value)} 
                        onFocus={(e) => {
                          e.target.showPicker && e.target.showPicker();
                        }}
                        required 
                      />
                    </td>
                    <td>
                      <input 
                        className="table-input" 
                        type="text" 
                        style={{ width: '240px' }} 
                        value={row.Activity || ''} 
                        onChange={e => onObservationDetailChange(idx, 'Activity', e.target.value)} 
                        list={`activityOptions-${idx}`}
                        placeholder="Select or type"
                        required 
                      />
                      <datalist id={`activityOptions-${idx}`}>
                        <option value="Calling" />
                        <option value="Feeding" />
                        <option value="Perching" />
                        <option value="Preening" />
                        <option value="Others" />
                      </datalist>
                    </td>
                    <td>
                      <input 
                        className="table-input" 
                        type="text" 
                        style={{ width: '210px' }} 
                        value={row.SeenHeard || ''} 
                        onChange={e => onObservationDetailChange(idx, 'SeenHeard', e.target.value)} 
                        list={`seenHeardOptions-${idx}`}
                        placeholder="Select or type"
                        required 
                      />
                      <datalist id={`seenHeardOptions-${idx}`}>
                        <option value="Seen" />
                        <option value="Heard" />
                        <option value="Not Found" />
                      </datalist>
                    </td>
                    <td>
                      <input className="table-input" type="text" style={{ width: '390px' }} value={row.ActivityDetails || ''} onChange={e => onObservationDetailChange(idx, 'ActivityDetails', e.target.value)} />
                    </td>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 90, justifyContent: 'center' }}>
                      <button
                        type="button"
                        aria-label="Add Row"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: '1px solid #bdbdbd',
                          background: '#f5f7fa',
                          color: '#1976d2',
                          fontWeight: 700,
                          fontSize: '1.3rem',
                          cursor: 'pointer',
                          marginRight: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}
                        onClick={() => {
                          const details = [...observationDetails];
                          details.splice(idx + 1, 0, {
                            'Number of Birds': '',
                            'SHB individual ID': '',
                            HeightOfTree: '',
                            HeightOfBird: '',
                            Lat: '',
                            Long: '',
                            Time: '',
                            Activity: '',
                            SeenHeard: '',
                            ActivityDetails: '',
                          });
                          console.log('Adding new observation row:', details)
                          onObservationDetailChange('replaceAll', 'Observation Details', details);
                        }}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        aria-label="Delete Row"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: '1px solid #bdbdbd',
                          background: '#f5f7fa',
                          color: '#d32f2f',
                          fontWeight: 700,
                          fontSize: '1.3rem',
                          cursor: observationDetails.length === 1 ? 'not-allowed' : 'pointer',
                          opacity: observationDetails.length === 1 ? 0.5 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}
                        disabled={observationDetails.length === 1}
                        onClick={() => onDeleteObservationRow(idx)}
                      >
                        -
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Show all error messages below the table as a summary */}
          {Object.keys(fieldErrors).length > 0 && (
            <div style={{
              marginTop: 20,
              maxHeight: 180,
              overflowY: 'auto',
              background: '#fff8f6',
              border: '1px solid #f5c6cb',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(220, 53, 69, 0.07)',
              padding: '16px 18px',
              color: '#b71c1c',
              fontSize: '1rem',
              maxWidth: 1160,
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              <div style={{fontWeight: 600, marginBottom: 8, color: '#b71c1c', letterSpacing: 0.2}}>Please fix the following errors:</div>
              {Object.entries(fieldErrors).map(([rowIdx, rowErrs]) => {
                const errorFields = Object.keys(rowErrs);
                // If all required fields are missing, show a single summary error
                const isAllEmpty = REQUIRED_FIELDS.every(f => errorFields.includes(f));
                if (isAllEmpty) {
                  return (
                    <div
                      className="error-message"
                      key={rowIdx + '-all-empty'}
                      style={{
                        marginBottom: 6,
                        background: '#fdecea',
                        borderRadius: 5,
                        border: '1px solid #f5c6cb',
                        fontSize: '0.97rem',
                        fontWeight: 500,
                        boxShadow: '0 1px 2px rgba(220,53,69,0.04)'
                      }}
                    >
                      Row {parseInt(rowIdx, 10) + 1}: All fields are required.
                    </div>
                  );
                }
                // Otherwise, show individual field errors
                return Object.entries(rowErrs).filter(([field]) => field !== 'BirdID').map(([field, msg], i) => (
                  <div
                    className="error-message"
                    key={rowIdx + '-' + field + '-' + i}
                    style={{
                      marginBottom: 6,
                      background: '#fdecea',
                      borderRadius: 5,
                      border: '1px solid #f5c6cb',
                      fontSize: '0.97rem',
                      fontWeight: 500,
                      boxShadow: '0 1px 2px rgba(220,53,69,0.04)'
                    }}
                  >
                    Row {parseInt(rowIdx, 10) + 1} - {COLUMN_LABELS[field] || field}: {msg}
                  </div>
                ));
              })}
            </div>
          )}
        </div>
        {/* Error messages outside the scroll container */}
        <style jsx>{`
          input[type="time"]::-webkit-calendar-picker-indicator {
            opacity: 0;
            position: absolute;
            right: 0;
            width: 100%;
            height: 100%;
            cursor: pointer;
          }
          input[type="time"]::-webkit-inner-spin-button,
          input[type="time"]::-webkit-clear-button {
            display: none;
          }
        `}</style>
      </div>
    );
  }
}

export default ObservationDetailsSection;
