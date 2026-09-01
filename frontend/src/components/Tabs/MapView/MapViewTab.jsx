import React, { Component } from 'react';
import { Map as MapIcon, PawPrint as PawPrintIcon } from 'lucide-react';
import { motion } from 'motion/react';
import GoogleMapComponent from '../../Map/GoogleMapComponent';
import BridgeSingleLayerMap from './BridgeSingleLayerMap';
import BridgeObservationDetails from './BridgeObservationDetails';
import '../../../css/components/Tabs/MapViewTab.css';

const getRoadSide = (observation) => {
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

  const bridgeOn = String(observation['Is the animal physically on the rope bridge?'] || '').trim().toLowerCase();
  if (bridgeOn === 'yes') return 'on bridge';
  if (bridgeOn === 'no') return 'off bridge';
  return 'unknown';
};

const matchesRopeBridgeType = (record = {}) => {
  const candidates = [
    record.type,
    record.Type,
    record['Survey Type'],
    record['Data Type'],
    record.typeName,
    record['type']
  ];

  const normalized = candidates
    .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
    .map(value => String(value).trim().toLowerCase().replace(/\s+/g, ' '))
    .find(value => value.includes('rope bridge') || value.includes('data (rope bridge) cleaned'));

  return Boolean(normalized);
};

const getObservationKey = (observation = {}) => {
  const candidates = [
    observation._id,
    observation.id,
    observation.serialNumber,
    observation['S/N'],
    observation['Serial Number'],
    observation['Survey ID'],
    observation['Observation ID'],
    observation['Rope Bridge ID'],
    observation['Bridge ID'],
    observation.Location,
    observation['Survey Date'],
    observation['Time of Observation'],
    observation['Observer Name']
  ];

  const firstValid = candidates.find(value => value !== null && value !== undefined && String(value).trim() !== '');
  return firstValid === undefined ? '' : String(firstValid).trim();
};

const dedupeObservations = (observations = []) => {
  const seen = {};
  const deduped = [];

  for (const observation of observations) {
    const key = getObservationKey(observation);

    if (key && !seen[key]) {
      seen[key] = true;
      deduped.push(observation);
      continue;
    }

    if (!key) {
      const fallbackKey = `__fallback__${Object.keys(seen).length}_${Math.random().toString(36).slice(2, 10)}`;
      if (!seen[fallbackKey]) {
        seen[fallbackKey] = true;
        deduped.push(observation);
      }
    }
  }

  return deduped;
};

const getBridgeIdentifier = (observation = {}) => {
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
      if (/^A$/i.test(normalized) || /^BRIDGE\s*A$/i.test(normalized) || /^A\s*\(.*\)$/i.test(normalized)) return 'A';
      if (/^B$/i.test(normalized) || /^BRIDGE\s*B$/i.test(normalized) || /^B\s*\(.*\)$/i.test(normalized)) return 'B';
      if (/^A\b|^BRIDGE\s*A\b/.test(normalized)) return 'A';
      if (/^B\b|^BRIDGE\s*B\b/.test(normalized)) return 'B';
      return normalized;
    }
  }

  return '';
};

const RIFLE_RANGE_ROAD_CENTER = { lat: 1.3492511, lng: 103.78822005 };

const RopeRoadShell = () => (
  <motion.div
    className="rope-road-shell"
    initial={{ opacity: 0, scaleY: 0.82 }}
    animate={{ opacity: 1, scaleY: 1 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
  >
    <motion.div
      className="rope-road"
      animate={{
        boxShadow: [
          'inset 0 0 0 2px rgba(255,255,255,0.28), inset 0 0 18px rgba(0,0,0,0.12)',
          'inset 0 0 0 2px rgba(255,255,255,0.32), inset 0 0 28px rgba(0,0,0,0.18)',
          'inset 0 0 0 2px rgba(255,255,255,0.28), inset 0 0 18px rgba(0,0,0,0.12)'
        ]
      }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        className="rope-road-center-line"
        animate={{ opacity: [0.35, 0.95, 0.35], scaleY: [0.96, 1, 0.96] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  </motion.div>
);

const AnimalRoadBridgeOverlay = () => (
  <div className="animal-road-bridge-overlay" aria-hidden="true">
    <motion.div
      className="animal-road-bridge bridge-a"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: [0, -3, 0] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <span className="bridge-pole left" />
      <span className="bridge-pole right" />
      <span className="bridge-rail rail-top" />
      <span className="bridge-rail rail-bottom" />
      <span className="bridge-label">Bridge A</span>
    </motion.div>

    <motion.div
      className="animal-road-bridge bridge-b"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: [0, -3, 0] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.25 }}
    >
      <span className="bridge-pole left" />
      <span className="bridge-pole right" />
      <span className="bridge-rail rail-top" />
      <span className="bridge-rail rail-bottom" />
      <span className="bridge-label">Bridge B</span>
    </motion.div>
  </div>
);

class MapViewTab extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mapType: 'Hybrid', // Fixed to hybrid view
      zoomLevel: 16, // Default zoom for Rifle Range Road initial map view
      selectedBridgeObservation: null,
      bridgeDetailTab: 'overview',
    };
    this.bridgeScrollRefs = {};
    this.bridgeScrollDragState = {};
  }

  syncBridgeScrollThumb = (prefix, container) => {
    const scrollbar = this.bridgeScrollRefs[`${prefix}-scrollbar`];
    const thumb = this.bridgeScrollRefs[`${prefix}-thumb`];

    if (!container || !scrollbar || !thumb) return;

    const maxScroll = Math.max(container.scrollWidth - container.clientWidth, 0);
    const trackWidth = scrollbar.clientWidth || 0;

    if (maxScroll <= 0 || trackWidth <= 0) {
      thumb.style.width = '100%';
      thumb.style.left = '0px';
      return;
    }

    const thumbWidth = Math.max(24, (container.clientWidth / container.scrollWidth) * trackWidth);
    const thumbLeft = (container.scrollLeft / maxScroll) * (trackWidth - thumbWidth);

    thumb.style.width = `${thumbWidth}px`;
    thumb.style.left = `${thumbLeft}px`;
  };

  updateBridgeScrollFromPointer = (prefix, clientX) => {
    const scrollbar = this.bridgeScrollRefs[`${prefix}-scrollbar`];
    const container = this.bridgeScrollRefs[`${prefix}-scroll`];

    if (!scrollbar || !container) return;

    const maxScroll = Math.max(container.scrollWidth - container.clientWidth, 0);
    const trackWidth = scrollbar.clientWidth || 0;

    if (!trackWidth || maxScroll <= 0) {
      container.scrollLeft = 0;
      return;
    }

    const relativeX = Math.min(Math.max(clientX - scrollbar.getBoundingClientRect().left, 0), trackWidth);
    const ratio = relativeX / trackWidth;
    container.scrollLeft = ratio * maxScroll;
    this.syncBridgeScrollThumb(prefix, container);
  };

  handleBridgeScrollPointerDown = (prefix, event) => {
    if (event.button !== 0) return;

    event.preventDefault();
    const scrollbar = event.currentTarget;
    if (scrollbar.setPointerCapture) {
      scrollbar.setPointerCapture(event.pointerId);
    }

    this.bridgeScrollDragState[prefix] = true;
    this.updateBridgeScrollFromPointer(prefix, event.clientX);
  };

  handleBridgeScrollPointerMove = (prefix, event) => {
    if (!this.bridgeScrollDragState[prefix]) return;
    this.updateBridgeScrollFromPointer(prefix, event.clientX);
  };

  handleBridgeScrollPointerUp = (prefix, event) => {
    const scrollbar = this.bridgeScrollRefs[`${prefix}-scrollbar`];
    if (this.bridgeScrollDragState[prefix]) {
      delete this.bridgeScrollDragState[prefix];
    }

    if (scrollbar && scrollbar.hasPointerCapture && scrollbar.hasPointerCapture(event.pointerId)) {
      scrollbar.releasePointerCapture(event.pointerId);
    }
  };

  handleMapTypeChange = (mapType) => {
    // Since we only use hybrid, keep it fixed
    this.setState({ mapType: 'Hybrid' });
  };

  handleZoomLevelChange = (zoomLevel) => {
    console.log('Zoom level changed:', zoomLevel);
    this.setState({ zoomLevel });
  };

  handleBridgeMarkerClick = (observation) => {
    this.setState({ 
      selectedBridgeObservation: observation || null,
      bridgeDetailTab: 'overview',
    });
  };

  renderBridgeLogo = () => (
    <svg viewBox="0 0 64 64" width="38" height="38" aria-label="Road bridge logo" role="img" style={{ display: 'block', borderRadius: 8 }}>
      <path d="M10 22 L54 22 L54 26 L42 26 L42 42 L38 42 L38 26 L26 26 L26 42 L22 42 L22 26 L10 26 Z" fill="#2f3a3d"/>
      <path d="M10 26 H54" stroke="#6e4c2b" strokeWidth="4" strokeLinecap="round"/>
      <path d="M12 33 H52" stroke="#7a654f" strokeWidth="3" strokeLinecap="round"/>
      <path d="M18 20 V12 M32 20 V12 M46 20 V12" stroke="#2f3a3d" strokeWidth="3" strokeLinecap="round"/>
      <path d="M15 12 H49" stroke="#2f3a3d" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="29" cy="16" r="2.5" fill="#f5f7f4"/>
    </svg>
  );

  renderBridgeLayout = () => {
    const bridgeSourceRecords = Array.isArray(this.props.overviewData)
      ? this.props.overviewData
      : this.props.data;
    const bridgeObservations = Array.isArray(bridgeSourceRecords)
      ? dedupeObservations(bridgeSourceRecords.filter(record => matchesRopeBridgeType(record)))
      : [];
    const getBridgeId = (observation = {}) => getBridgeIdentifier(observation);
    const isBridgeA = (observation = {}) => getBridgeId(observation) === 'A';
    const isBridgeB = (observation = {}) => getBridgeId(observation) === 'B';
    const hasExplicitBridgeAssignment = (observation = {}) => Boolean(getBridgeId(observation));
    const bridgeAObservations = bridgeObservations.filter(isBridgeA);
    const bridgeBObservations = bridgeObservations.filter(isBridgeB);
    const offBridgeObservations = bridgeObservations.filter(
      obs => hasExplicitBridgeAssignment(obs) && !isBridgeA(obs) && !isBridgeB(obs)
    );
    const bridgeACount = bridgeAObservations.length;
    const bridgeBCount = bridgeBObservations.length;
    const offBridgeCount = offBridgeObservations.length;

    const renderObservationPanel = (observation) => {
      return (
        <BridgeObservationDetails
          observation={observation}
          detailTab={this.state.bridgeDetailTab}
          onDetailTabChange={(detailTab) => this.setState({ bridgeDetailTab: detailTab })}
          onClose={() => this.setState({ selectedBridgeObservation: null })}
        />
      );

      if (!observation) {
        return (
          <div style={{ padding: '18px 16px', border: '1px solid #dfe7e1', borderRadius: 10, background: '#f8faf8', color: '#52647d', fontSize: '14px' }}>
            Select an animal paw to view the survey details.
          </div>
        );
      }

      const formatDate = (dateValue) => {
        if (!dateValue) return dateValue;
        if (typeof dateValue === 'number') {
          const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
          const day = excelDate.getDate().toString().padStart(2, '0');
          const month = (excelDate.getMonth() + 1).toString().padStart(2, '0');
          const year = excelDate.getFullYear();
          return `${day}/${month}/${year}`;
        }
        if (typeof dateValue === 'string') {
          const parsedDate = new Date(dateValue);
          if (!Number.isNaN(parsedDate.getTime())) {
            const day = parsedDate.getDate().toString().padStart(2, '0');
            const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
            const year = parsedDate.getFullYear();
            return `${day}/${month}/${year}`;
          }
        }
        return dateValue;
      };

      const formatTime = (timeValue) => {
        if (!timeValue) return timeValue;
        if (typeof timeValue === 'number' && timeValue < 1) {
          const totalMinutes = Math.round(timeValue * 24 * 60);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
        if (typeof timeValue === 'string') {
          const timeMatch = timeValue.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const ampm = timeMatch[4];
            if (ampm) {
              if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
              if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
            }
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          }
        }
        return timeValue;
      };

      const detailTab = this.state.bridgeDetailTab === 'survey' ? 'survey' : 'overview';
      const commonName = observation['Common Name (If unavailable, sci name)'] || observation['Common Name'] || observation.Species || '';
      const scientificName = observation['Scientific Name (Genus/Species)'] || observation['Genus/Species Name'] || observation['Scientific Name'] || '';
      const location = observation.Location || observation.Site || observation['Survey Location'] || observation['Co-ordinates/Nearest Landmarks'] || 'Rifle Range Road';
      const seenHeardValue = observation['Which side of the road is it on? (N/S/On road)'] || observation['Which side of the road was it on?'] || observation['Road Side'] || observation['Seen/Heard'] || 'Unknown';
      const observer = observation.Observer || observation['Observer name'] || observation['Observer Name'] || observation['Name of Surveyors'] || observation['iNat Username'] || '';
      const date = formatDate(observation['Survey Date'] || observation['Survey date'] || observation.Date);
      const time = formatTime(observation['Time of Observation'] || observation['Observation Time'] || observation.Time);
      const notes = observation.Notes || observation['Behaviours observed and/or other remarks'] || observation['Remarks'] || '';
      const identified = observation['Identified?'] || '';
      const numberOfBirds = observation['Number of Birds'] || observation.Count || observation.count || '';
      const roadkill = observation['Roadkill?'] || '';
      const taxonomy = observation.Taxa || observation.Taxonomy || '';
      const targetSpecies = observation['Target Species?'] || observation['Target Species'] || '';
      const srdb3Status = observation['SRDB3 Status'] || observation['SRDB3 status'] || '';
      const iucnStatus = observation['IUCN Status'] || observation['IUCN status'] || '';
      const displayedFields = new Set([
        '_id', 'id', 'Location', 'Site', 'Survey Location', 'Seen/Heard',
        'Which side of the road is it on? (N/S/On road)', 'Which side of the road was it on?', 'Road Side', 'Survey Date',
        'Survey date', 'Date', 'Time of Observation', 'Observation Time', 'Time',
        'Lat', 'Latitude', 'latitude', 'lat', 'Long', 'Lon', 'Longitude', 'longitude', 'lng',
        'Observer', 'Observer name', 'Observer Name', 'Name of Surveyors', 'iNat Username', 'Species',
        'Common Name (If unavailable, sci name)', 'Common Name', 'Scientific Name (Genus/Species)',
        'Genus/Species Name', 'Scientific Name', 'Notes', 'Behaviours observed and/or other remarks', 'Remarks',
        'Image URL', 'Upload any pictures if available.', 'imageUrl', 'Survey Start Time', 'Survey End Time',
        'Survey Start Time and End Time', 'Survey Direction', 'Co-ordinates/Nearest Landmarks',
        'SHB individual ID', 'Number of Birds', 'Count', 'count', 'Height of tree/m',
        'Height of bird/m', 'Activity', 'Behaviour', 'Activity Details',
        'Activity (foraging, preening, calling, perching, others)', 'serialNumber',
        'Taxa', 'Taxonomy', 'Target Species?', 'Target Species', 'Identified?', 'Roadkill?',
        'SRDB3 Status', 'SRDB3 status', 'IUCN Status', 'IUCN status'
      ]);
      const additionalFields = Object.entries(observation).filter(([key, value]) =>
        !displayedFields.has(key) && value !== null && value !== undefined && String(value).trim() !== ''
      );
      const surveyFields = [
        ['Status', seenHeardValue],
        ['Identified?', identified],
        ['Count', numberOfBirds],
        ['Roadkill?', roadkill],
        ['Observer Name', observer],
        ['Date', date],
        ['Time', time],
        ['Location', location]
      ].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '');

      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ffffff', border: '1px solid #dfe7e1', borderRadius: 10, padding: '18px 16px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button type="button" aria-label="Close survey details" onClick={() => this.setState({ selectedBridgeObservation: null })} style={{ background: 'none', border: 0, color: '#52647d', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>x</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minHeight: 0, flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#142039', fontSize: '26px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>{commonName || location}</h3>
              {scientificName && <div style={{ marginTop: '8px', color: '#52647d', fontSize: '18px', fontStyle: 'italic' }}>{scientificName}</div>}
            </div>

            {(targetSpecies || taxonomy || srdb3Status || iucnStatus) && (
              <div style={{ display: 'block', padding: '18px 16px', border: '1px solid #9bbcab', borderRadius: '10px', background: '#edf3ef' }}>
                <div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Target Species</div>
                <div style={{ color: '#142039', fontSize: '20px', fontWeight: 700 }}>{targetSpecies || taxonomy || srdb3Status || iucnStatus || 'Yes'}</div>
              </div>
            )}

            <div role="tablist" aria-label="Survey detail sections" style={{ display: 'flex', gap: '26px', borderBottom: '1px solid #dbe5df', margin: '0 0 4px', padding: '0 0 4px', backgroundColor: '#ffffff', isolation: 'isolate' }}>
              {[['overview', 'Overview'], ['survey', 'Survey']].map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={detailTab === key} onClick={() => this.setState({ bridgeDetailTab: key })} style={{ padding: '0 0 12px', border: 0, borderBottom: detailTab === key ? '3px solid #7ba995' : '3px solid transparent', outline: 'none', background: 'none', color: detailTab === key ? '#142039' : '#52647d', fontSize: '17px', fontWeight: detailTab === key ? 700 : 400, cursor: 'pointer' }}>{label}</button>
              ))}
            </div>

            {detailTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '22px 28px', marginBottom: '12px' }}>
                {[['Identified?', identified], ['Count', numberOfBirds], ['Roadkill?', roadkill]].filter(([, value]) => value).map(([label, value]) => (
                  <div key={label} style={{ minWidth: 0 }}><div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</div><div style={{ color: '#142039', fontSize: '19px' }}>{value}</div></div>
                ))}
              </div>
            )}

            {detailTab === 'survey' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px 24px' }}>
                  {surveyFields.map(([label, value]) => (
                    <div key={label} style={{ minWidth: 0, padding: '8px 0', borderBottom: '1px solid #edf2f0' }}>
                      <strong style={{ display: 'block', color: '#52647d', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</strong>
                      <span style={{ color: '#142039', overflowWrap: 'anywhere' }}>{String(value)}</span>
                    </div>
                  ))}
                </div>
                {additionalFields.length > 0 && (
                  <div style={{ marginTop: '22px' }}>
                    <div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>Additional Survey Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px 24px' }}>
                      {additionalFields.map(([key, value]) => (
                        <div key={key} style={{ minWidth: 0, padding: '8px 0', borderBottom: '1px solid #edf2f0' }}>
                          <strong style={{ display: 'block', color: '#64748b', fontSize: '12px', marginBottom: '6px', overflowWrap: 'anywhere' }}>{key}</strong>
                          <span style={{ color: '#142039', overflowWrap: 'anywhere' }}>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {notes && (
              <div style={{ padding: '18px', border: '1px solid #9bbcab', borderRadius: '10px', background: '#edf3ef' }}>
                <div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>Behaviours / Remarks</div>
                <div style={{ color: '#142039', fontSize: '17px', lineHeight: 1.6 }}>{notes}</div>
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 0, width: '100%', minHeight: 420, alignItems: 'stretch', height: '100%', minWidth: 0 }}>
        <div style={{ flex: '1 1 680px', minWidth: 0, minHeight: 420, height: '100%', maxHeight: '100%', alignSelf: 'stretch', position: 'relative', overflow: 'hidden', borderRadius: 12, background: '#f5efe8' }}>
          <BridgeSingleLayerMap
            bridgeACount={bridgeACount}
            bridgeBCount={bridgeBCount}
            bridgeAObservations={bridgeAObservations}
            bridgeBObservations={bridgeBObservations}
            offBridgeCount={offBridgeCount}
            offBridgeObservations={offBridgeObservations}
            onPawClick={this.handleBridgeMarkerClick}
          />
        </div>
        {this.state.selectedBridgeObservation && (
          <div style={{ flex: '0 1 360px', minWidth: 280, minHeight: 420, height: '100%', maxHeight: '100%', alignSelf: 'stretch', overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
              {renderObservationPanel(this.state.selectedBridgeObservation)}
          </div>
        )}
      </div>
    );
  };

  render() {
    const { data, overviewData = data, isRifleRangeRoad = false, isExternalSurvey = false, selectedDataType } = this.props;
    const { mapType, zoomLevel } = this.state;
    const hasMapData = Array.isArray(data) && data.length > 0;
    const mapData = Array.isArray(data) ? data : [];
    const overviewRecords = Array.isArray(overviewData) ? overviewData : [];
    const selectedType = String(selectedDataType || '').trim().toLowerCase();
    const showBridgeLayout = isRifleRangeRoad && selectedType.includes('rope bridge');
    const ropeBridgeRecords = dedupeObservations(overviewRecords.filter(record => matchesRopeBridgeType(record)));
    const isRegularSurveyType = isRifleRangeRoad && (selectedType.includes('regular') || (!selectedType.includes('external') && !selectedType.includes('rope bridge')));
    const isExternalSurveyType = isExternalSurvey || selectedType.includes('external');
    const roadSideLabels = isExternalSurveyType
      ? { primary: 'Right', secondary: 'Left', tertiary: 'On road' }
      : showBridgeLayout
        ? { primary: 'Bridge A', secondary: 'Bridge B', tertiary: 'Off-bridge / unspecified sightings' }
        : { primary: 'North', secondary: 'South', tertiary: 'On road' };

    // Compute stats - normalize the seen/heard values for consistent counting
    const total = overviewRecords.length;
    const seen = overviewRecords.filter(obs => {
      const value = (obs["Seen/Heard"] || '').toLowerCase().trim();
      return value === 'seen';
    }).length;
    const heard = overviewRecords.filter(obs => {
      const value = (obs["Seen/Heard"] || '').toLowerCase().trim();
      return value === 'heard';
    }).length;
    const notFound = overviewRecords.filter(obs => {
      const value = (obs["Seen/Heard"] || '').toLowerCase().trim();
      return value === 'not found';
    }).length;
    const getExternalSide = observation => {
      const value = String(observation['Which side of the road was it on?'] || '').trim().toLowerCase();
      if (value === 'right') return 'right';
      if (value === 'left') return 'left';
      if (value === 'on road' || value === 'onroad') return 'on road';
      return 'unknown';
    };
    const north = overviewRecords.filter(obs => getRoadSide(obs) === 'north').length;
    const south = overviewRecords.filter(obs => getRoadSide(obs) === 'south').length;
    const onRoad = overviewRecords.filter(obs => (isExternalSurvey ? getExternalSide(obs) === 'on road' : getRoadSide(obs) === 'on road')).length;
    const bridgeId = (observation = {}) => getBridgeIdentifier(observation);
    const bridgeACount = ropeBridgeRecords.filter(obs => bridgeId(obs) === 'A').length;
    const bridgeBCount = ropeBridgeRecords.filter(obs => bridgeId(obs) === 'B').length;
    const offBridgeCount = ropeBridgeRecords.filter(
      obs => Boolean(bridgeId(obs)) && bridgeId(obs) !== 'A' && bridgeId(obs) !== 'B'
    ).length;
    const onBridge = overviewRecords.filter(obs => getRoadSide(obs) === 'on bridge').length;
    const offBridge = overviewRecords.filter(obs => getRoadSide(obs) === 'off bridge').length;
    const right = overviewRecords.filter(obs => getExternalSide(obs) === 'right').length;
    const left = overviewRecords.filter(obs => getExternalSide(obs) === 'left').length;

    // Debug logging to track legend counts
    console.log('MapViewTab Legend Counts:', { total, seen, heard, notFound });
    if (mapData && mapData.length > 0) {
      const sampleValues = mapData.slice(0, 5).map(obs => obs["Seen/Heard"]);
      console.log('Sample Seen/Heard values:', sampleValues);
    }
    const seenPct = total > 0 ? ((seen / total) * 100).toFixed(1) : '0.0';
    const heardPct = total > 0 ? ((heard / total) * 100).toFixed(1) : '0.0';
    const notFoundPct = total > 0 ? ((notFound / total) * 100).toFixed(1) : '0.0';

    const mapOverviewItems = showBridgeLayout
      ? [
          { label: 'Bridge', value: 'Rope Bridge' },
          { label: 'Survey Type', value: 'Data (Rope Bridge) cleaned' }
        ]
      : [
          { label: 'Map Type', value: mapType || 'Hybrid' },
          { label: 'Zoom Level', value: zoomLevel !== undefined ? zoomLevel : '-' }
        ];

    const bridgeDataOverviewItems = [
      { label: 'Bridge A', value: bridgeACount },
      { label: 'Bridge B', value: bridgeBCount },
      { label: 'Off-bridge / unspecified sightings', value: offBridgeCount }
    ];

    const dataOverviewItems = isRifleRangeRoad
      ? (isExternalSurveyType
        ? [
            { label: roadSideLabels.primary, value: right },
            { label: roadSideLabels.secondary, value: left },
            { label: roadSideLabels.tertiary, value: onRoad }
          ]
        : (showBridgeLayout
          ? bridgeDataOverviewItems
          : [
              { label: roadSideLabels.primary, value: north },
              { label: roadSideLabels.secondary, value: south },
              { label: roadSideLabels.tertiary, value: onRoad }
            ]))
      : [
          { label: 'Total Seen', value: `${seen} (${seenPct}%)` },
          { label: 'Total Heard', value: `${heard} (${heardPct}%)` },
          { label: 'Not Found', value: `${notFound} (${notFoundPct}%)` }
        ];

    const bridgeLegendItems = [
      { label: 'On bridge', color: '#16a34a' },
      { label: 'Off bridge', color: '#f59e0b' }
    ];

    const legendItems = isRifleRangeRoad
      ? (isExternalSurveyType
        ? [
            { label: roadSideLabels.primary, color: '#16a34a' },
            { label: roadSideLabels.secondary, color: '#f59e0b' },
            { label: roadSideLabels.tertiary, color: '#ef4444' }
          ]
        : (showBridgeLayout
          ? bridgeLegendItems
          : [
              { label: roadSideLabels.primary, color: '#16a34a' },
              { label: roadSideLabels.secondary, color: '#f59e0b' },
              { label: roadSideLabels.tertiary, color: '#ef4444' }
            ]))
      : [
          { label: 'Seen', color: '#16a34a' },
          { label: 'Heard', color: '#f59e0b' },
          { label: 'Not Found', color: '#ef4444' }
        ];

    if (showBridgeLayout) {
      return (
        <div className="map-view-tab">
          <div className="live-map-container" style={{ background: '#f4f5f7', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="map-header" style={{ background: '#eef1f3', padding: '14px 18px', margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {this.renderBridgeLogo()}
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>Live Observation Rope Bridge</h2>
              </div>
              <div className="live-indicator" style={{ marginTop: 4 }}>
                <span className="live-dot" />
                <span>Real-time Updates</span>
              </div>
            </div>

            <div className="map-sections" style={{ marginTop: 16, width: '100%', marginBottom: 20, marginLeft: 10, marginRight: 10 }}>
              <section className="data-overview" style={{ width: '100%', padding: '14px 16px', background: '#f7f7fa', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Data Overview</span>
                {dataOverviewItems.map(item => (
                  <span key={item.label}><strong>{item.label}:</strong> {item.value}</span>
                ))}
              </section>
            </div>

            {this.renderBridgeLayout()}
          </div>
        </div>
      );
    }

    return (
      <div className="map-view-tab">
        <div className="live-map-container" style={{ background: '#f4f5f7', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="map-header" style={{ background: '#eef1f3', padding: '14px 18px', margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>🗺️ Live Observation Map</h2>
            </div>
            <div className="live-indicator" style={{ marginTop: 4 }}>
              <span className="live-dot" />
              <span>Real-time Updates</span>
            </div>
          </div>
            {/* Map, Data, and Legend Sections */}
            <div className="map-sections" style={{ display: 'flex', flexDirection: 'row', gap: 32, marginTop: 16, width: '100%', marginBottom: 20, marginLeft: 10, marginRight: 10}}>
              <section className="map-overview" style={{ flex: 1, minWidth: 0, padding: '8px 16px', background: '#f7f7fa', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Map Overview</span>
                {mapOverviewItems.map(item => (
                  <span key={item.label}><strong>{item.label}:</strong> {item.value}</span>
                ))}
              </section>
              <section className="data-overview" style={{ flex: 1, minWidth: 0, padding: '8px 16px', background: '#f7f7fa', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Data Overview</span>
                {dataOverviewItems.map(item => (
                  <span key={item.label}><strong>{item.label}:</strong> {item.value}</span>
                ))}
              </section>
              <section className="map-legend" style={{ flex: 1, minWidth: 0, padding: '8px 16px', background: '#f7f7fa', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Legend</span>
                {legendItems.map(item => (
                  <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                    {item.label}
                  </span>
                ))}
              </section>
            </div>
          <div className="single-layer-map">
            <GoogleMapComponent
              data={mapData}
              isRifleRangeRoad={isRifleRangeRoad}
              isExternalSurvey={isExternalSurvey}
              center={isRifleRangeRoad ? RIFLE_RANGE_ROAD_CENTER : undefined}
              height="100%"
              onMapTypeChange={this.handleMapTypeChange}
              onZoomLevelChange={this.handleZoomLevelChange}
              zoom={zoomLevel}
              openObservationPopup={this.props.openObservationPopup}
              closeObservationPopup={this.props.closeObservationPopup}
            />
            {!isRifleRangeRoad && !hasMapData && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ padding: '0.6rem 1rem', borderRadius: 6, background: 'rgba(255, 255, 255, 0.9)', color: '#334155', fontWeight: 600 }}>
                  Rope Bridge
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default MapViewTab;
