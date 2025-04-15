import React, { Component } from 'react';

class ObservationTable extends Component {
  render() {
    const { data } = this.props;

    // Mobile-friendly data display
    const renderMobileCards = () => {
      return data.map((observation, index) => (
        <div key={index} className="observation-card">
          <div className="card-header">
            <strong>Location:</strong> {observation.Location}
          </div>
          <div className="card-body">
            <p><strong>Observer:</strong> {observation['Observer name']}</p>
            <p><strong>Bird ID:</strong> {observation['SHB individual ID (e.g. SHB1)']}</p>
            <p><strong>Activity:</strong> {observation["Activity (foraging, preening, calling, perching, others)"]}</p>
            <p><strong>Date:</strong> {observation.Date}</p>
          </div>
        </div>
      ));
    };

    return (
      <>
        {/* Mobile view - cards */}
        <div className="mobile-observation-cards hide-desktop">
          {renderMobileCards()}
        </div>

        {/* Desktop/tablet view - table */}
        <div className="desktop-observation-table hide-mobile">
            <table className="observation-table">
              <thead>
                <tr>
                  <th>Observer</th>
                  <th>Bird ID</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Activity</th>
                </tr>
              </thead>
              <tbody>
                {data.map((observation, index) => (
                  <tr key={index}>
                    <td>{observation['Observer name']}</td>
                    <td>{observation['SHB individual ID (e.g. SHB1)']}</td>
                    <td>{observation.Location}</td>
                    <td>{observation.Date}</td>
                    <td>{observation["Activity (foraging, preening, calling, perching, others)"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </>
    );
  }
}

export default ObservationTable;
