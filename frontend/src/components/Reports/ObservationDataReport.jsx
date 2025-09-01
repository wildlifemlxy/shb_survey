import React, { Component } from 'react';
import '../../css/components/Reports/ObservationDataReport.css';
import Papa from 'papaparse';

const ObservationDataReport = ({
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
      <h2>Observation Data Report</h2>
      <span className="report-date">Generated on {reportDate}</span>
    </div>
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
    <div className="breakdown-table-container">
      <h3>Monthly Breakdown</h3>
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

export default ObservationDataReport;
