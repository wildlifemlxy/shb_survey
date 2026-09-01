import test from 'node:test';
import assert from 'node:assert/strict';
import { getValidCoordinates } from './dataProcessing.js';
import { filterExternalMapRecords, isExternalSurveySelection, matchesSelectedSurveyType, normalizeMapMarkerValue, normalizeSurveyType } from './surveyTypeUtils.js';

test('normalizes the exact cleaned external label used by the dataset', () => {
  assert.equal(normalizeSurveyType('Data (External) cleaned'), 'data (external) cleaned');
});

test('accepts the Rope Bridge field names used in the sample survey record and does not fall back to north/south labels', () => {
  assert.equal(normalizeMapMarkerValue({
    'Which side of the road did it come from? (N/S)': 'N',
    type: 'Data (Rope Bridge) cleaned',
    Lat: 1.35,
    Lon: 103.8
  }, false), 'seen');

  assert.equal(normalizeMapMarkerValue({
    'Is the animal physically on the rope bridge?': 'Yes',
    'Crossing Type': 'Complete Crossing',
    type: 'Data (Rope Bridge) cleaned',
    Lat: 1.35,
    Lon: 103.8
  }, false), 'on bridge');

  assert.equal(normalizeMapMarkerValue({
    'Is the animal physically on the rope bridge?': 'No',
    'Crossing Type': 'Partial Crossing',
    'Behaviours observed and/or other remarks': 'Did not use rope bridge at all, stayed on right side',
    type: 'Data (Rope Bridge) cleaned',
    Lat: 1.35,
    Lon: 103.8
  }, false), 'off bridge');
});

test('returns false for regular survey even when other records in the dataset are external', () => {
  const result = isExternalSurveySelection('Regular', [
    { type: 'Regular' },
    { type: 'External' }
  ]);

  assert.equal(result, false);
});

test('recognizes the exact cleaned external label used in the database', () => {
  const result = isExternalSurveySelection('Data (External) cleaned', [
    { type: 'Data (Regular) cleaned' },
    { type: 'Data (External) cleaned' }
  ]);

  assert.equal(result, true);
});

test('returns true only for the external survey type', () => {
  const result = isExternalSurveySelection('External', [
    { type: 'Regular' },
    { type: 'External' }
  ]);

  assert.equal(result, true);
});

test('returns false when no survey type is selected and no external record is active', () => {
  const result = isExternalSurveySelection('All', [
    { type: 'Regular' },
    { type: 'Rope Bridge' }
  ]);

  assert.equal(result, false);
});

test('matches selected survey type across cleaned and raw labels', () => {
  assert.equal(matchesSelectedSurveyType({ type: 'Data (Regular) cleaned' }, 'Regular'), true);
  assert.equal(matchesSelectedSurveyType({ type: 'Data (Regular) cleaned' }, 'Data (Rope Bridge) cleaned'), false);
  assert.equal(matchesSelectedSurveyType({ type: 'Data (External) cleaned' }, 'External'), true);
  assert.equal(matchesSelectedSurveyType({ type: 'Data (Rope Bridge) cleaned' }, 'All'), true);
});

test('keeps only lamp-post records that actually resolve to valid coordinates for the map', () => {
  const filtered = filterExternalMapRecords([
    { 'Co-ordinates/Nearest Landmarks': 'Lamp post 70', Lat: null, Long: null },
    { 'Co-ordinates/Nearest Landmarks': '', Lat: null, Long: null },
    { 'Co-ordinates/Nearest Landmarks': '1.353, 103.788', Lat: 1.353, Long: 103.788 },
    { 'Co-ordinates/Nearest Landmarks': 'Lamp post 12B', Lat: null, Long: null },
    { 'Co-ordinates/Nearest Landmarks': null, Lat: 1.35, Long: 103.8 }
  ]);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]['Co-ordinates/Nearest Landmarks'], '1.353, 103.788');
});

test('returns only true external lamp-post records using the cleaned external dataset label', async () => {
  const { getExternalLampPostRecords } = await import('./surveyTypeUtils.js');
  const filtered = getExternalLampPostRecords([
    { type: 'Data (External) cleaned', 'Co-ordinates/Nearest Landmarks': 'Lamp post 70', Lat: null, Long: null },
    { type: 'Data (Regular) cleaned', 'Co-ordinates/Nearest Landmarks': 'Lamp post 20', Lat: null, Long: null },
    { type: 'Data (External) cleaned', Lat: 1.35, Long: 103.8 },
    { type: 'Data (External) cleaned', 'Co-ordinates/Nearest Landmarks': 'Tree 10', Lat: null, Long: null }
  ]);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]['Co-ordinates/Nearest Landmarks'], 'Lamp post 70');
});

test('accepts already-resolved lamp-post coordinates from the backend', () => {
  const filtered = filterExternalMapRecords([
    { type: 'Data (External) cleaned', 'Co-ordinates/Nearest Landmarks': '1.353, 103.788', Lat: 1.353, Long: 103.788 },
    { type: 'Data (External) cleaned', 'Co-ordinates/Nearest Landmarks': 'Tree 10', Lat: 1.36, Long: 103.9 },
    { type: 'Data (External) cleaned', 'Co-ordinates/Nearest Landmarks': 'Lamp post 20', Lat: 1.38, Long: 103.6 }
  ]);

  assert.equal(filtered.length, 2);
  assert.equal(filtered[0]['Co-ordinates/Nearest Landmarks'], '1.353, 103.788');
  assert.equal(filtered[1]['Co-ordinates/Nearest Landmarks'], 'Lamp post 20');
});

test('drops any external record whose landmark is not a lamp-post even with valid coordinates', () => {
  const filtered = filterExternalMapRecords([
    { type: 'Data (External) cleaned', 'Co-ordinates/Nearest Landmarks': 'Lamp post 70', Lat: 1.35, Long: 103.8 },
    { type: 'Data (External) cleaned', 'Co-ordinates/Nearest Landmarks': 'Tree 10', Lat: 1.36, Long: 103.9 },
    { type: 'Data (External) cleaned', 'Co-ordinates/Nearest Landmarks': '', Lat: 1.37, Long: 103.7 },
    { type: 'Data (External) cleaned', 'Co-ordinates/Nearest Landmarks': 'Lamp post 20', Lat: 1.38, Long: 103.6 }
  ]);

  assert.equal(filtered.length, 2);
  assert.equal(filtered[0]['Co-ordinates/Nearest Landmarks'], 'Lamp post 70');
  assert.equal(filtered[1]['Co-ordinates/Nearest Landmarks'], 'Lamp post 20');
});

test('uses the coordinate string itself as a valid map coordinate when Lat and Long are missing', () => {
  const resolved = getValidCoordinates([
    { 'Co-ordinates/Nearest Landmarks': '1.353, 103.788' },
    { 'Co-ordinates/Nearest Landmarks': 'Tree 10' },
  ]);

  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].Lat, 1.353);
  assert.equal(resolved[0].Long, 103.788);
});

test('rejects unknown marker values so invalid rows never render on the map', () => {
  assert.equal(normalizeMapMarkerValue({ 'Which side of the road was it on?': 'North' }, true), 'seen');
  assert.equal(normalizeMapMarkerValue({ 'Which side of the road was it on?': 'Unknown' }, true), null);
  assert.equal(normalizeMapMarkerValue({ 'Seen/Heard': 'Heard' }, false), 'heard');
  assert.equal(normalizeMapMarkerValue({ 'Seen/Heard': 'Unknown' }, false), null);
});
