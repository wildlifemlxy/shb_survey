import React, { Component } from 'react';

class ObservationTable extends Component {
  convertExcelTime(serial) {
    if (serial === undefined || serial === null || serial === "") return "";
  
    const totalSeconds = Math.round(86400 * serial); // seconds in a day
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
  
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

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
            <p><strong>Time:</strong> {this.convertExcelTime(observation.Time)}</p>
            <p><strong>Height of Tree:</strong> {observation["Height of tree/m"]}m</p>
            <p><strong>Height of Bird:</strong> {observation["Height of bird/m"]}m</p>
            <p><strong>Number of Bird(s):</strong> {observation["Number of Birds"]}</p>
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
                  <th>S/N</th>
                  <th>Observer</th>
                  <th>Bird ID</th>
                  <th>Location</th>
                  <th>Number of Bird(s)</th>
                  <th>Height of Tree</th>
                  <th>Height of Bird</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Activity</th>            
                </tr>
              </thead>
              <tbody>
                {data.map((observation, index) => (
                  <tr key={index}>
                    <td>{index+1}</td>
                    <td>{observation['Observer name']}</td>
                    <td>{observation['SHB individual ID (e.g. SHB1)']}</td>
                    <td>{observation.Location} ({observation.Lat}, {observation.Long})</td>
                    <td>{observation["Number of Birds"]}</td>
                    <td>{observation["Height of tree/m"]}m</td>
                    <td>{observation["Height of bird/m"]}m</td>
                    <td>{observation.Date}</td>
                    <td>{this.convertExcelTime(observation.Time)}</td>
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
