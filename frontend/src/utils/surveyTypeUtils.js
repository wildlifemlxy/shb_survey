export const normalizeSurveyType = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)\s*/g, ') ')
    .replace(/\s+/g, ' ')
    .trim();

export const matchesSelectedSurveyType = (record = {}, selectedType = '') => {
  const selected = normalizeSurveyType(selectedType);
  if (!selected || selected === 'all') {
    return true;
  }

  const recordType = normalizeSurveyType(
    record?.type
    ?? record?.Type
    ?? record?.['Survey Type']
    ?? record?.['Data Type']
    ?? ''
  );

  if (!recordType) {
    return false;
  }

  const canonicalize = (value) => {
    const normalized = normalizeSurveyType(value)
      .replace(/\s*cleaned\s*$/i, '')
      .replace(/^data\s*/i, '')
      .replace(/^\((.*)\)$/i, '$1')
      .replace(/\(\s*/g, ' (')
      .replace(/\s*\)/g, ') ')
      .trim();

    return normalized.replace(/\s+/g, ' ');
  };

  const selectedBase = canonicalize(selected);
  const recordBase = canonicalize(recordType);

  return selectedBase === recordBase;
};

export const matchesExternalType = (value) => {
  const normalized = normalizeSurveyType(value);
  return normalized.includes('external') || normalized.includes('data (external) cleaned');
};

const looksLikeCoordinatePair = (value) => {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  if (!text) return false;

  const match = text.match(/^-?\d+(?:\.\d+)?\s*[,\s]\s*-?\d+(?:\.\d+)?$/);
  if (!match) return false;

  const [latText, lngText] = text.split(/[\s,]+/).filter(Boolean);
  const lat = Number(latText);
  const lng = Number(lngText);

  return Number.isFinite(lat) && Number.isFinite(lng) && lat > 1 && lat < 2 && lng > 100 && lng < 110;
};

export const hasExternalLampPostReference = (record = {}) => {
  const landmark = String(
    record['Co-ordinates/Nearest Landmarks']
    ?? record['Nearest Landmarks']
    ?? record.Landmark
    ?? record['Nearest Landmark']
    ?? record['Co-ordinates/Nearest Landmark']
    ?? ''
  ).trim();

  if (looksLikeCoordinatePair(landmark)) {
    return true;
  }

  if (!landmark) return false;

  const compact = landmark.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return compact.length > 0 && /\d/.test(compact) && /LAMP|POST|LP/i.test(landmark);
};

const getRoadSideValue = (record = {}) => {
  const candidateKeys = [
    'Which side of the road is it on? (N/S/On road)',
    'Which side of the road was it on?',
    'Which side of the road did it come from? (N/S)',
    'Which side of the road did it come from?',
    'Road Side'
  ];

  for (const key of candidateKeys) {
    const value = record[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim().toLowerCase();
    }
  }

  return '';
};

export const normalizeMapMarkerValue = (record = {}, isExternalSurvey = false) => {
  const bridgeOnRecord = String(record['Is the animal physically on the rope bridge?'] ?? '').trim().toLowerCase();
  const bridgeOffRecord = String(record['Is the animal physically on the rope bridge?'] ?? '').trim().toLowerCase();
  const bridgeCrossing = String(record['Crossing Type'] ?? '').trim().toLowerCase();
  const hasCoordinates = Boolean(
    Number.isFinite(Number(record.Lat ?? record.lat ?? record.latitude ?? record.Latitude))
    && Number.isFinite(Number(record.Long ?? record.Longitude ?? record.lng ?? record.Lon))
  ) || looksLikeCoordinatePair(String(record['Co-ordinates/Nearest Landmarks'] ?? record['Co-ordinates/Nearest Landmark'] ?? record['Nearest Landmarks'] ?? record.Landmark ?? ''));

  if (bridgeOnRecord === 'yes' || bridgeOffRecord === 'no') {
    return bridgeOnRecord === 'yes' ? 'on bridge' : 'off bridge';
  }

  if (bridgeCrossing.includes('crossing') || bridgeCrossing.includes('bridge')) {
    return bridgeOnRecord === 'no' ? 'off bridge' : 'on bridge';
  }

  const roadSideValue = getRoadSideValue(record);
  const rawValue = isExternalSurvey
    ? String(record['Which side of the road was it on?'] ?? record['Which side of the road is it on? (N/S/On road)'] ?? roadSideValue ?? '').trim().toLowerCase()
    : String(record['Seen/Heard'] ?? roadSideValue ?? record['Which side of the road is it on? (N/S/On road)'] ?? record['Which side of the road was it on?'] ?? '').trim().toLowerCase();

  if (!rawValue) {
    if (hasCoordinates) {
      return 'seen';
    }

    return null;
  }

  if (rawValue === 'unknown' || rawValue === 'n/a' || rawValue === 'na') {
    return null;
  }

  const normalized = rawValue.replace(/[^a-z]/g, '');
  if (['n', 'north', 'right', 'seen', 'yes'].includes(rawValue) || normalized === 'north' || normalized === 'seen' || normalized === 'yes') return 'seen';
  if (['s', 'south', 'left', 'heard'].includes(rawValue) || normalized === 'south' || normalized === 'heard') return 'heard';
  if (['on road', 'not found'].includes(rawValue) || normalized === 'onroad' || normalized === 'notfound') return 'not found';

  return null;
};

export const filterExternalMapRecords = (records = []) =>
  Array.isArray(records)
    ? records.filter(record => {
        const hasCoordinates = Boolean(
          Number.isFinite(Number(record.Lat ?? record.lat ?? record.latitude ?? record.Latitude))
          && Number.isFinite(Number(record.Long ?? record.Longitude ?? record.lng ?? record.Lon))
        ) || looksLikeCoordinatePair(String(record['Co-ordinates/Nearest Landmarks'] ?? record['Co-ordinates/Nearest Landmark'] ?? record['Nearest Landmarks'] ?? record.Landmark ?? ''));

        return hasExternalLampPostReference(record) && hasCoordinates && normalizeMapMarkerValue(record, true) !== null;
      })
    : [];

export const filterLampPostOnlyExternalRecords = (records = []) =>
  Array.isArray(records)
    ? records.filter(record => {
        const typeMatches = matchesExternalType(record?.type || record?.Type || record?.['Survey Type'] || record?.['Data Type'] || '');
        return typeMatches && hasExternalLampPostReference(record);
      })
    : [];

export const getExternalLampPostRecords = (records = []) => {
  if (!Array.isArray(records)) return [];

  return records.filter(record => {
    const recordType = normalizeSurveyType(record?.type || record?.Type || record?.['Survey Type'] || record?.['Data Type'] || '');
    const landmarkValue = String(
      record['Co-ordinates/Nearest Landmarks']
      || record['Nearest Landmarks']
      || record.Landmark
      || record['Nearest Landmark']
      || record['Co-ordinates/Nearest Landmark']
      || ''
    ).trim();

    const hasLampPostText = /lamp|post/i.test(landmarkValue) || looksLikeCoordinatePair(landmarkValue);

    return matchesExternalType(recordType) && hasLampPostText;
  });
};

export const isExternalSurveySelection = (selectedDataType, records = []) => {
  const selectedType = normalizeSurveyType(selectedDataType);
  if (!selectedType || selectedType === 'all') {
    return false;
  }

  if (matchesExternalType(selectedType)) {
    return true;
  }

  if (selectedType.includes('regular') || selectedType.includes('rope bridge')) {
    return false;
  }

  return Array.isArray(records) && records.some(record => {
    const recordType = normalizeSurveyType(record?.type || record?.Type || record?.['Survey Type']);
    return matchesExternalType(recordType) && selectedType === recordType;
  });
};
