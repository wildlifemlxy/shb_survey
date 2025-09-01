import React from 'react';
import '../../css/components/Reports/ObservationDataReport.css';

const ObservationSummaryReport = ({
  reportDate,
  total,
  seen,
  heard,
  notFound,
  seenPercent,
  heardPercent,
  notFoundPercent,
  monthlyData
}) => (
  <div className="observation-report-card">
    <div className="report-header">
      <h4 style={{marginTop: 0, color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem'}}>Observation Data Report</h4>
      <span className="report-date">Generated on {reportDate}</span>
    </div>
    <h5 style={{color: '#4a5568', marginBottom: '0.5rem'}}>Summary Statistics</h5>
    <div className="summary-statistics-grid">
      <div className="stat total">
        <span className="stat-value">{total}</span>
        <span className="stat-label">Total Observations</span>
      </div>
      <div className="stat seen">
        <span className="stat-value">{seen}</span>
        <span className="stat-label">Seen ({seenPercent}%)</span>
      </div>
      <div className="stat heard">
        <span className="stat-value">{heard}</span>
        <span className="stat-label">Heard ({heardPercent}%)</span>
      </div>
      <div className="stat notfound">
        <span className="stat-value">{notFound}</span>
        <span className="stat-label">Not Found ({notFoundPercent}%)</span>
      </div>
    </div>
    <h5 style={{color: '#4a5568', marginBottom: '0.5rem'}}>Monthly Breakdown</h5>
    <div className="breakdown-table-container">
      <table className="breakdown-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Total</th>
            <th>Seen</th>
            <th>Heard</th>
            <th>Not Found</th>
          </tr>
        </thead>
        <tbody>
          {monthlyData.map(row => (
            <tr key={row.month}>
              <td>{row.month}</td>
              <td>{row.total}</td>
              <td>{row.seen}</td>
              <td>{row.heard}</td>
              <td>{row.notFound}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default ObservationSummaryReport;
