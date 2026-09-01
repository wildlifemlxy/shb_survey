import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import isEqual from 'lodash/isEqual';
import { logger } from '../../utils/diagnosticLogger';
import '../../css/components/Table/ObservationTable.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const getRoadSide = (observation) => {
  observation = observation || {};
  const value = String(
    observation['Which side of the road is it on? (N/S/On road)']
    || observation['Which side of the road was it on?']
    || observation['Which side of the road did it come from? (N/S)']
    || observation['Which side of the road did it come from?']
    || observation['Road Side']
    || ''
  ).trim().toLowerCase();

  if (value === 'n' || value === 'north') return 'north';
  if (value === 's' || value === 'south') return 'south';
  if (value === 'on road' || value === 'onroad') return 'on road';
  return 'unknown';
};

const getExternalSide = (observation) => {
  observation = observation || {};
  const value = String(observation['Which side of the road was it on?'] || '').trim().toLowerCase();
  if (value === 'right') return 'right';
  if (value === 'left') return 'left';
  if (value === 'on road' || value === 'onroad') return 'on road';
  return 'unknown';
};

const getBridgeCategory = (observation) => {
  observation = observation || {};
  const candidateKeys = [
    'Rope Bridge ID',
    'Bridge ID',
    'Bridge',
    'Bridge Name',
    'RopeBridgeID',
    'BridgeID',
    'Bridge Number',
    'Bridge number',
    'Rope Bridge',
    'Bridge A/B',
    'Bridge Location'
  ];

  for (const key of candidateKeys) {
    const rawValue = observation[key];
    if (rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== '') {
      const normalized = String(rawValue).trim().toUpperCase();
      if (/^A\b|^BRIDGE\s*A\b/.test(normalized)) return 'A';
      if (/^B\b|^BRIDGE\s*B\b/.test(normalized)) return 'B';
      return 'off';
    }
  }

  return 'off';
};

const getSurveyCategory = (selectedDataType = '') => {
  const normalized = String(selectedDataType || '').trim().toLowerCase();
  if (normalized.includes('external')) return 'external';
  if (normalized.includes('rope bridge')) return 'rope bridge';
  return 'regular';
};

const ROW_COLORS = {
  primary: '#A8E6CF',
  secondary: '#FFE0B2',
  tertiary: '#FFCDD2',
  unknown: '#E0E0E0'
};

const SURVEY_LEGENDS = {
  regular: [
    { label: 'North', color: ROW_COLORS.primary },
    { label: 'South', color: ROW_COLORS.secondary },
    { label: 'On Road', color: ROW_COLORS.tertiary },
    { label: 'Unknown', color: ROW_COLORS.unknown }
  ],
  'rope bridge': [
    { label: 'Bridge A', color: ROW_COLORS.primary },
    { label: 'Bridge B', color: ROW_COLORS.secondary },
    { label: 'Off-bridge / unspecified sightings', color: ROW_COLORS.tertiary }
  ],
  external: [
    { label: 'Right', color: ROW_COLORS.primary },
    { label: 'Left', color: ROW_COLORS.secondary },
    { label: 'On road', color: ROW_COLORS.tertiary },
    { label: 'Unknown', color: ROW_COLORS.unknown }
  ]
};

/**
 * RifleRangeRoadObservationTable
 * 
 * Rifle Range Road specific observation table component using AG Grid.
 * Renders survey data with dynamic columns, cell editing, and deletion capabilities.
 */
class RifleRangeRoadObservationTable extends Component {
  constructor(props) {
    super(props);

    this.metadataKeys = new Set([
      'serialNumber',
      '_id',
      'type',
      'createdAt',
      'updatedAt',
      'userId',
      'userEmail',
      'userPhoneNumber',
      'userPhotoURL',
      '__v',
      'ropeLoadBearing',
      'ropeLoadBearingUnit',
      'commonName',
      'scientificName',
      'photoUrl',
      'photoPath',
      'projectId',
      'routeId',
      'isLampPost',
      'lamppostInfo',
      'recordedLatitude',
      'recordedLongitude',
      'ropeID'
    ]);

    this.gridRef = React.createRef();

    this.state = {
      rowData: this.getTableData(props.data),
      columnDefs: this.buildColumnDefs(props.data)
    };
  }

  componentDidMount() {
    this.syncGridData(this.props.data);
  }

  componentDidUpdate(prevProps) {
    // Only recompute rowData/columnDefs when the data reference actually changes.
    // Recreating these on every render (e.g. while the user interacts with AG Grid's
    // own pagination controls) fights AG Grid's internal row model and blanks the grid.
    if (prevProps.data !== this.props.data) {
      this.syncGridData(this.props.data);
    }
  }

  syncGridData = (data) => {
    const safeData = Array.isArray(data) ? data : [];
    this.setState({
      rowData: this.getTableData(safeData),
      columnDefs: this.buildColumnDefs(safeData)
    });
  };

  buildColumnDefs = (records = []) => {
    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }

    const standardDataFieldOrder = [
      'Observer name',
      'Observer Phone Number',
      'Location',
      'Date',
      'Time',
      'Species',
      'Quantity',
      'Male',
      'Female',
      'Immature',
      'Calling',
      'With young',
      'Display',
      'Flight',
      'Nesting',
      'Perching',
      'Feeding',
      'Bathing',
      'Preening',
      'Roosting',
      'Molting',
      'Hunting',
      'Other Behaviour',
      'Height',
      'Distance',
      'Concealment',
      'Cloud Cover',
      'Weather Condition',
      'Remarks',
      'Photo URL',
      'Accuracy'
    ];

    const keys = new Set();
    records.forEach(record => {
      Object.keys(record || {}).forEach(key => {
        if (!this.metadataKeys.has(key)) {
          keys.add(key);
        }
      });
    });

    const orderedKeys = [
      ...standardDataFieldOrder.filter(key => keys.has(key)),
      ...Array.from(keys).filter(key => !standardDataFieldOrder.includes(key))
    ];

    const getColumnWidth = (field) => {
      const longestValueLength = records.reduce((max, record) => {
        const value = record?.[field];
        if (value === null || value === undefined) return max;
        return Math.max(max, String(value).length);
      }, String(field).length);
      const baseWidth = Math.max(110, longestValueLength * 8 + 20);
      return Math.min(baseWidth, 400);
    };

    const serialNumberColumn = {
      field: 'serialNumber',
      headerName: 'S/N',
      valueGetter: (params) => params.data?.serialNumber ?? params.node?.rowIndex + 1 ?? '',
      pinned: 'left',
      lockPinned: true,
      sortable: true,
      filter: false,
      resizable: false,
      suppressMenu: true,
      width: 70,
      minWidth: 70,
      maxWidth: 70,
      cellStyle: { textAlign: 'center', fontWeight: 600 }
    };

    const dynamicColumns = orderedKeys.map(field => ({
      field,
      headerName: field,
      editable: true,
      onCellValueChanged: (e) => this.handleCellValueChanged(e),
      width: getColumnWidth(field),
      minWidth: getColumnWidth(field),
      // Actual data uses "Name of Surveyors"/"Survey Date"; keep older aliases for compatibility.
      ...(['Name of Surveyors', 'Observer name', 'Observer Name', 'Survey Date', 'Date'].includes(field)
        ? { pinned: 'left', lockPinned: true }
        : {})
    }));

    const deleteButtonColumn = {
      field: 'actions',
      headerName: 'Actions',
      pinned: 'right',
      lockPinned: true,
      sortable: false,
      resizable: false,
      cellRenderer: (params) => (
        <div
          onClick={() => this.handleDeleteRow(params.data._id)}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            margin: '2px',
            textAlign: 'center',
            userSelect: 'none',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}
          title="Delete this row"
        >
          Delete
        </div>
      ),
      width: 110,
      minWidth: 110,
      suppressSizeToFit: true
    };

    return [serialNumberColumn, ...dynamicColumns, deleteButtonColumn];
  };

  handleCellValueChanged = (e) => {
    const { data, onDataUpdate } = this.props;
    const recordId = e.data._id;
    const changedField = e.colDef.field;

    logger.info(`Cell value changed for record ${recordId}, field: ${changedField}, new value: ${e.newValue}`);

    if (onDataUpdate) {
      onDataUpdate(recordId, {
        [changedField]: e.newValue
      });
    }
  };

  handleDeleteRow = (recordId) => {
    const { onDataDelete } = this.props;
    if (onDataDelete && window.confirm('Are you sure you want to delete this record?')) {
      logger.info(`Deleting record: ${recordId}`);
      onDataDelete(recordId);
    }
  };

  getTableData = (records = []) => {
    if (!Array.isArray(records)) {
      return [];
    }

    return records.map((row, index) => ({
      ...row,
      _rowId: row?._id || row?.id || `row-${index}`,
      _originalIndex: index,
      serialNumber: index + 1
    }));
  };

  render() {
    const { selectedDataType } = this.props;
    const { rowData, columnDefs } = this.state;
    const surveyCategory = getSurveyCategory(selectedDataType);
    const legendItems = SURVEY_LEGENDS[surveyCategory];

    return (
      <>
      <div
        className="ag-theme-alpine rifle-range-road-observation-table"
        style={{ height: '50vh', width: '100%' }}
      >
        {columnDefs.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#6b7280',
            fontWeight: 600
          }}>
            No data available
          </div>
        ) : (
          <AgGridReact
            ref={this.gridRef}
            theme="legacy"
            className="ag-theme-alpine"
            popupParent={document.body}
            postProcessPopup={(params) => {
              // popupParent=document.body detaches the popup from the cell's own
              // positioning context, so pin it directly below the triggering cell.
              if (!params.eventSource || !params.ePopup) return;
              const rect = params.eventSource.getBoundingClientRect();
              params.ePopup.style.top = `${rect.bottom + window.scrollY}px`;
              params.ePopup.style.left = `${rect.left + window.scrollX}px`;
              // Force the popup above the table's own stacking context so it never
              // gets clipped by or interferes with the grid underneath.
              params.ePopup.style.zIndex = '9999';
            }}
            columnDefs={columnDefs}
            rowData={rowData}
            domLayout="normal"
            pagination={true}
            paginationPageSize={(() => {
              const allowedSizes = [20, 50, 100, 200, 500];
              const dataLength = rowData?.length || 0;
              if (dataLength === 0) return allowedSizes[0];
              return allowedSizes.find(size => size >= dataLength) || allowedSizes[allowedSizes.length - 1];
            })()}
            paginationPageSizeSelector={[20, 50, 100, 200, 500]}
            suppressCellFocus={false}
            rowSelection="multiple"
            suppressColumnVirtualisation={true}
            enableCellTextSelection={true}
            getRowId={(params) => params.data?._rowId || params.data?._id || params.node?.id || String(params.node?.rowIndex)}
            defaultColDef={{
              sortable: true,
              resizable: true
            }}
            getRowStyle={params => {
              // AG Grid can invoke this for transitional row nodes with no data yet
              // (e.g. while recalculating pagination after opening the page-size
              // selector). Bail out early instead of letting a downstream helper
              // throw on `null`, which would abort the whole render pass and leave
              // the grid blank until the next successful render.
              if (!params.data) {
                return { backgroundColor: '#f9f9f9' };
              }

              let backgroundColor = '#f9f9f9';

              if (surveyCategory === 'external') {
                const side = getExternalSide(params.data);
                if (side === 'right') backgroundColor = ROW_COLORS.primary;
                else if (side === 'left') backgroundColor = ROW_COLORS.secondary;
                else if (side === 'on road') backgroundColor = ROW_COLORS.tertiary;
                else backgroundColor = ROW_COLORS.unknown;
              } else if (surveyCategory === 'rope bridge') {
                const bridge = getBridgeCategory(params.data);
                if (bridge === 'A') backgroundColor = ROW_COLORS.primary;
                else if (bridge === 'B') backgroundColor = ROW_COLORS.secondary;
                else backgroundColor = ROW_COLORS.tertiary;
              } else {
                const side = getRoadSide(params.data);
                if (side === 'north') backgroundColor = ROW_COLORS.primary;
                else if (side === 'south') backgroundColor = ROW_COLORS.secondary;
                else if (side === 'on road') backgroundColor = ROW_COLORS.tertiary;
                else backgroundColor = ROW_COLORS.unknown;
              }

              return { backgroundColor };
            }}
          />
        )}
      </div>

      {/* Legend below the table */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginTop: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {legendItems.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: 18, height: 18, background: item.color, borderRadius: 3, border: '1px solid #ccc' }}></span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      </>
    );
  }
}

export default RifleRangeRoadObservationTable;
