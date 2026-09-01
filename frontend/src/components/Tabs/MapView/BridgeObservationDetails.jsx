import React from 'react';

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

const BridgeObservationDetails = ({ observation, detailTab = 'overview', onDetailTabChange, onClose }) => {
  if (!observation) return null;

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
    ['Status', seenHeardValue], ['Identified?', identified], ['Count', numberOfBirds],
    ['Roadkill?', roadkill], ['Observer Name', observer], ['Date', date], ['Time', time], ['Location', location]
  ].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '');

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ffffff', border: '1px solid #dfe7e1', borderRadius: 10, padding: '18px 16px 8px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#ffffff', paddingBottom: '8px', marginTop: '-2px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button type="button" aria-label="Close survey details" onClick={onClose} style={{ background: 'none', border: 0, color: '#52647d', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>x</button>
        </div>

        <div>
          <h3 style={{ margin: 0, color: '#142039', fontSize: '26px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>{commonName || location}</h3>
          {scientificName && <div style={{ marginTop: '8px', color: '#52647d', fontSize: '18px', fontStyle: 'italic' }}>{scientificName}</div>}
        </div>

        {(targetSpecies || taxonomy || srdb3Status || iucnStatus) && (
          <div style={{ marginTop: '18px', padding: '18px 16px', border: '1px solid #9bbcab', borderRadius: 10, background: '#edf3ef' }}>
            <div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Target Species</div>
            <div style={{ color: '#142039', fontSize: '20px', fontWeight: 700 }}>{targetSpecies || taxonomy || srdb3Status || iucnStatus || 'Yes'}</div>
          </div>
        )}

        <div role="tablist" aria-label="Survey detail sections" style={{ display: 'flex', gap: '26px', borderBottom: '1px solid #dbe5df', margin: '18px 0 0', padding: '0 0 4px', backgroundColor: '#ffffff' }}>
          {[['overview', 'Overview'], ['survey', 'Survey']].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={detailTab === key} onClick={() => onDetailTabChange(key)} style={{ padding: '0 0 12px', border: 0, borderBottom: detailTab === key ? '3px solid #7ba995' : '3px solid transparent', outline: 'none', background: 'none', color: detailTab === key ? '#142039' : '#52647d', fontSize: '17px', fontWeight: detailTab === key ? 700 : 400, cursor: 'pointer' }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minHeight: 0, flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' }}>

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
          <div style={{ padding: '18px', border: '1px solid #9bbcab', borderRadius: 10, background: '#edf3ef' }}>
            <div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>Behaviours / Remarks</div>
            <div style={{ color: '#142039', fontSize: '17px', lineHeight: 1.6 }}>{notes}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BridgeObservationDetails;
