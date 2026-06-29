import React, { Component } from 'react';
import '../../css/components/Dashboard/AnomalyDetectionModal.css';

// Valid location options
const LOCATION_OPTIONS = [
  'Bidadari Park',
  'Bukit Timah Nature Park',
  'Bukit Batok Nature Park',
  'Gillman Barracks',
  'Hindhede Nature Park',
  'Mandai Boardwalk',
  'Pulau Ubin',
  'Rifle Range Nature Park',
  'Rail Corridor (Kranji)',
  'Rail Corridor (Hillview)',
  'Rail Corridor (Bukit Timah)',
  'Singapore Botanic Gardens',
  'Springleaf Nature Park',
  'Sungei Buloh Wetland Reserve',
  'Windsor Nature Park',
  'Others'
];

class AnomalyDetectionModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      anomalies: []
    };
  }

  componentDidMount() {
    this.detectAnomalies();
  }

  componentDidUpdate(prevProps) {
    // Use deep comparison to detect data changes (handles array content changes)
    const dataChanged = JSON.stringify(this.props.data) !== JSON.stringify(prevProps.data);
    if (dataChanged) {
      this.detectAnomalies();
    }
  }

  detectAnomalies = () => {
    const { data } = this.props;
    const anomalies = [];

    if (!Array.isArray(data)) {
      this.setState({ anomalies });
      return;
    }

    // Log first row to help debug field names
    if (data.length > 0) {
      console.log('First data row:', data[0]);
      console.log('Data row keys:', Object.keys(data[0]));
    }

    data.forEach((row, index) => {
      const rowNumber = index + 1;
      const errors = [];

      // Validate Location
      if (!row.Location || (typeof row.Location === 'string' && row.Location.trim() === '')) {
        errors.push('Location is empty');
      } else if (!LOCATION_OPTIONS.includes(row.Location)) {
        errors.push(`Location "${row.Location}" is not in the valid list`);
      }

      // Validate Bird ID format (should be like SHB 1, SHB 2, etc.)
      // Check both field names: 'Bird ID' and 'SHB individual ID'
      const birdIdValue = row['Bird ID'] || row['SHB individual ID'];
      if (birdIdValue) {
        const birdId = birdIdValue.toString().trim();
        // Check if Bird ID follows format: SHB followed by space and numbers (e.g., SHB 1, SHB 2)
        const validBirdIdPattern = /^SHB\s\d+$/;
        if (!validBirdIdPattern.test(birdId)) {
          errors.push(`Bird ID wrong format - "${birdId}" should be "SHB" followed by space and numbers (e.g., SHB 1, SHB 2)`);
        }
      }

      // Validate Height fields
      if (row['Height of tree/m'] || row['Height of bird/m']) {
        // Convert string values to float, handling "m" suffix and empty strings
        const treeHeightStr = row['Height of tree/m']?.toString().trim().replace(/m$/i, '') || '';
        const birdHeightStr = row['Height of bird/m']?.toString().trim().replace(/m$/i, '') || '';
        
        const treeHeight = treeHeightStr ? parseFloat(treeHeightStr) : NaN;
        const birdHeight = birdHeightStr ? parseFloat(birdHeightStr) : NaN;
        
        console.log(`Row ${rowNumber} - Tree Height: "${row['Height of tree/m']}" → ${treeHeight}, Bird Height: "${row['Height of bird/m']}" → ${birdHeight}`);
        
        // Only validate if both values are present and valid numbers
        if (!isNaN(treeHeight) && !isNaN(birdHeight)) {
          if (birdHeight > treeHeight) {
            console.log(`Row ${rowNumber} - ERROR: ${birdHeight} > ${treeHeight}`);
            errors.push('Height of Tree must be higher than Height of Bird');
          }
        }
      }

      // Add row errors if any
      if (errors.length > 0) {
        anomalies.push({
          rowNumber,
          errors,
          data: row
        });
      }
    });

    this.setState({ anomalies });
  };

  render() {
    const { show, onClose } = this.props;
    const { anomalies } = this.state;

    console.log('AnomalyDetectionModal render - show:', show, 'anomalies:', anomalies);

    if (!show) return null;

    return (
      <div className="anomaly-modal-overlay">
        <div className="anomaly-modal-content">
          {/* Header */}
          <div className="anomaly-modal-header">
            <h2>🔍 Anomaly Detection Report</h2>
            <button 
              className="anomaly-modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="anomaly-modal-body">
            {anomalies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                No issues found
              </div>
            ) : (
              <div className="anomaly-table-container">
                {/* Detailed Report */}
                <div className="anomaly-report-section">
                  <table className="anomaly-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Error Type</th>
                        <th>Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anomalies.map((anomaly, idx) => (
                        <tr key={idx} className="anomaly-table-row">
                          <td className="anomaly-row-num">Row {anomaly.rowNumber}</td>
                          <td className="anomaly-error-types">
                            <div className="error-list">
                              {anomaly.errors.map((error, errorIdx) => (
                                <div key={errorIdx} className="error-item">
                                  <span className="error-icon">⚠️</span>
                                  <span className="error-type">{error}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="anomaly-issue-count">
                            <span className="issue-badge">{anomaly.errors.length}</span>
                          </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="anomaly-modal-footer">
          </div>
        </div>
      </div>
    );
  }
}

export default AnomalyDetectionModal;
