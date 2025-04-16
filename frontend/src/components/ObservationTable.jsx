// ObservationTable.jsx
import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

class ObservationTable extends Component {
  convertExcelTime(serial) {
    if (!serial) return '';
    const totalSeconds = Math.round(86400 * serial);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Rename key "SHB individual ID (e.g. SHB1)" to "SHB individual ID"
  transformData(data) {
    return data.map((item) => {
      const newItem = { ...item };
      if (newItem["SHB individual ID (e.g. SHB1)"]) {
        newItem["SHB individual ID"] = newItem["SHB individual ID (e.g. SHB1)"];
        delete newItem["SHB individual ID (e.g. SHB1)"];
      }
      return newItem;
    });
  }

  render() {
    const { data } = this.props;
    const transformedData = this.transformData(data);
    console.log("Table Data:", transformedData);

    const columns = [
      { headerName: "S/N", valueGetter: "node.rowIndex + 1", width: 70 },
      { headerName: "Observer", field: "Observer name", width: 300 },
      { headerName: "Bird ID", field: "SHB individual ID", width: 100 },
      {
        headerName: "Location",
        field: "Location",
        cellRenderer: (params) =>
          `${params.value} (${params.data.Lat}, ${params.data.Long})`,
        width: 600
      },
      { headerName: "Number of Bird(s)", field: "Number of Birds" },
      {
        headerName: "Height of Tree",
        field: "Height of tree/m",
        cellRenderer: (params) => `${params.value}m`,
      },
      {
        headerName: "Height of Bird",
        field: "Height of bird/m",
        cellRenderer: (params) => `${params.value}m`,
      },
      { headerName: "Date", field: "Date" },
      {
        headerName: "Time",
        field: "Time",
        cellRenderer: (params) => this.convertExcelTime(params.value),
      },
      {
        headerName: "Activity",
        field: "Activity (foraging, preening, calling, perching, others)",
        width: 900
      },
      {
        headerName: "Seen/Heard",
        field: "Seen/Heard",
        width: 300
      }
    ];

    return (
      <>
        <div className="mobile-observation-cards hide-desktop">
          {this.renderMobileCards(transformedData)}
        </div>
        <div className="ag-theme-alpine" style={{ height: '30vh', width: '100%' }}>
          <AgGridReact
            columnDefs={columns}
            rowData={transformedData}
            domLayout="normal"
            pagination={true}
            defaultColDef={{
              sortable: true,
              resizable: true
            }}
            paginationPageSize={transformedData.length}
          />
        </div>
      </>
    );
  }

  // Accept transformed data here
  renderMobileCards(data) {
    return data.map((obs, i) => (
      <div key={i} className="observation-card">
        <div className="card-header">
          <strong>Location:</strong> {obs.Location}
        </div>
        <div className="card-body">
          <p><strong>Observer:</strong> {obs['Observer name']}</p>
          <p><strong>Bird ID:</strong> {obs['SHB individual ID']}</p>
          <p><strong>Activity:</strong> {obs["Activity (foraging, preening, calling, perching, others)"]}</p>
          <p><strong>Date:</strong> {obs.Date}</p>
          <p><strong>Time:</strong> {this.convertExcelTime(obs.Time)}</p>
          <p><strong>Height of Tree:</strong> {obs["Height of tree/m"]}m</p>
          <p><strong>Height of Bird:</strong> {obs["Height of bird/m"]}m</p>
          <p><strong>Number of Bird(s):</strong> {obs["Number of Birds"]}</p>
          <p><strong>Seen/Heard:</strong> {obs["Seen/Heard"]}</p>
        </div>
      </div>
    ));
  }
}

export default ObservationTable;
