import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

class ObservationTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      openCardIndex: 0 // First card open by default
    };
  }

  convertExcelTime(serial) {
    if (!serial) return '';
    const totalSeconds = Math.round(86400 * serial);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

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

  toggleCard = (index) => {
    this.setState((prevState) => ({
      openCardIndex: prevState.openCardIndex === index ? null : index
    }));
  };

  renderMobileCards(data) {
    return data.map((obs, i) => {
      const isOpen = this.state.openCardIndex === i;
  
      // Determine the pastel background color for the card based on "Seen/Heard"
      let cardBackgroundColor = '#f9f9f9';  // Default background color (light gray)
      switch (obs["Seen/Heard"]) {
        case "Seen":
          cardBackgroundColor = '#A8E6CF';  // Soft pastel green
          break;
        case "Heard":
          cardBackgroundColor = '#D1C4E9';  // Soft pastel purple
          break;
        case "Not found":
          cardBackgroundColor = '#FFCDD2';  // Soft pastel red
          break;
      }
  
      return (
        <div
          key={i}
          style={{
            border: '1px solid #ccc',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: cardBackgroundColor,  // Apply the pastel background color
            fontSize: '0.9rem',
            lineHeight: '1.4',
            height: 'auto',
            maxHeight: '300px', // Shorter height
            overflowY: 'auto', // Make it scrollable
          }}
        >
          <div
            onClick={() => this.toggleCard(i)}
            style={{
              fontWeight: 'bold',
              cursor: 'pointer',
              paddingBottom: '0.5rem', // Adjust space below header
            }}
          >
            <strong>S/N:</strong> {i + 1}
            <br />
            <strong>Location:</strong> {obs.Location}
          </div>
  
          {isOpen && (
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
          )}
        </div>
      );
    });
  }  

  render() {
    const { data } = this.props;
    const transformedData = this.transformData(data);

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

        {window.innerWidth >= 1024 && (
          <div className="ag-theme-alpine" style={{ height: '50vh', width: '100%' }}>
            <AgGridReact
              columnDefs={columns}
              rowData={transformedData}
              domLayout="normal"
              pagination={true}
              defaultColDef={{
                sortable: true,
                resizable: true,
              }}
              paginationPageSize={transformedData.length}
              getRowStyle={params => {
                let backgroundColor = '#f9f9f9';  // Default light gray

                // Adjust row background based on "Seen/Heard"
                switch (params.data["Seen/Heard"]) {
                  case "Seen":
                    backgroundColor = '#A8E6CF';  // Soft pastel green
                    break;
                  case "Heard":
                    backgroundColor = '#D1C4E9';  // Soft pastel purple
                    break;
                  case "Not found":
                    backgroundColor = '#FFCDD2';  // Soft pastel red
                    break;
                }

                return { backgroundColor };  // Apply background color to the row
              }}
            />
          </div>
        )}
      </>
    );
  }
}

export default ObservationTable;
