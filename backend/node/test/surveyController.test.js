const test = require('node:test');
const assert = require('node:assert/strict');
const {
  extractCoordinatePair,
  replaceLampPostCoordinates,
} = require('../Controller/RifleRangeRoad/surveyController');

test('extractCoordinatePair reads a full coordinate value directly from the record', () => {
  const result = extractCoordinatePair('1.353, 103.788');
  assert.deepEqual(result, { lat: 1.353, lng: 103.788 });
});

test('replaceLampPostCoordinates preserves a full coordinate value without stripping it as a lamp-post ID', () => {
  const result = replaceLampPostCoordinates([
    {
      type: 'Data (External) cleaned',
      'Co-ordinates/Nearest Landmarks': '1.353, 103.788',
      Lat: null,
      Long: null,
    },
  ]);

  assert.equal(result[0]['Co-ordinates/Nearest Landmarks'], '1.353, 103.788');
  assert.equal(result[0].Lat, 1.353);
  assert.equal(result[0].Long, 103.788);
});
