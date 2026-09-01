var express = require('express');
var fs = require('fs');
var path = require('path');
var router = express.Router();
var SurveyController = require('../../Controller/strawHeadedBulbul/surveyController');

const lampPostGeoJsonPath = path.join(__dirname, '../../data/LTALampPost.geojson');

const normalizeLampPostNumber = (value) => {
	if (value === null || value === undefined) return null;
	const text = String(value).trim();
	if (!text) return null;

	return text
		.toUpperCase()
		.replace(/^NO\.?\s*/, '')
		.replace(/^LTA\s+/, '')
		.replace(/^LAMP\s*POST\s*/, '')
		.replace(/^LAMPPOST\s*/, '')
		.replace(/^LP\s*/, '')
		.replace(/^POST\s*/, '')
		.replace(/^#/, '')
		.replace(/\s+/g, '')
		.replace(/[^A-Z0-9/-]/g, '');
};

const parseLampPostFeature = (feature) => {
	if (!feature || !feature.geometry || !Array.isArray(feature.geometry.coordinates)) {
		return null;
	}

	const [lng, lat] = feature.geometry.coordinates;
	const lampPostNumber = normalizeLampPostNumber(feature?.properties?.LAMPPOST_NUM || feature?.properties?.LAMPPOST || feature?.properties?.lampPostNumber);
	if (!lampPostNumber || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
		return null;
	}

	return {
		lampPostNumber,
		lat: Number(lat),
		lng: Number(lng),
		source: 'geojson',
		sourceLabel: 'GeoJSON lamp-post file'
	};
};

router.post('/config', (req, res) => {
	try {
		const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

		if (!apiKey) {
			return res.status(500).json({
				success: false,
				error: 'Google Maps API key not configured'
			});
		}

		return res.json({
			success: true,
			apiKey,
			useGoogleMaps: process.env.USE_GOOGLE_MAPS !== 'false'
		});
	} catch (error) {
		console.error('Error fetching map config:', error);
		return res.status(500).json({
			success: false,
			error: 'Failed to fetch map configuration'
		});
	}
});

router.get('/lamp-posts', (req, res) => {
	fs.readFile(lampPostGeoJsonPath, 'utf8', (error, fileContents) => {
		if (error) {
			console.error('Failed to read lamp-post GeoJSON from backend:', error);
			return res.status(500).json({
				success: false,
				error: 'Lamp-post map data is unavailable'
			});
		}

		try {
			const geoJson = JSON.parse(fileContents);
			const features = (Array.isArray(geoJson.features) ? geoJson.features : []).map(feature => {
				const rawValue = feature?.properties?.LAMPPOST_NUM;
				if (rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '') {
					feature.properties = {
						...(feature.properties || {}),
						LAMPPOST_NUM: String(rawValue).trim(),
					};
				}
				return feature;
			});

			return res.json({
				success: true,
				features,
				count: features.length
			});
		} catch (parseError) {
			console.error('Failed to parse lamp-post GeoJSON:', parseError);
			return res.status(500).json({
				success: false,
				error: 'Lamp-post map data is invalid'
			});
		}
	});
});

router.get('/lamp-posts/list', async (req, res) => {
	try {
		const databaseName = req.query.databaseName || 'StrawHeadedBulbul';
		const fileContents = fs.readFileSync(lampPostGeoJsonPath, 'utf8');
		const geoJson = JSON.parse(fileContents);
		const geoJsonEntries = (Array.isArray(geoJson.features) ? geoJson.features : [])
			.map(parseLampPostFeature)
			.filter(Boolean);

		const surveyController = new SurveyController();
		const surveyResult = await surveyController.getAllSurveys(databaseName);
		const surveys = Array.isArray(surveyResult?.surveys) ? surveyResult.surveys : [];
		const databaseEntries = surveys
			.map((survey) => {
				const landmarkValue = survey?.['Co-ordinates/Nearest Landmarks'];
				const normalizedLampPostNumber = normalizeLampPostNumber(landmarkValue);
				if (!normalizedLampPostNumber) {
					return null;
				}

				const latValue = survey?.Lat ?? survey?.Latitude ?? survey?.latitude ?? survey?.lat;
				const lngValue = survey?.Long ?? survey?.Lon ?? survey?.Longitude ?? survey?.longitude ?? survey?.lng;
				const lat = Number(latValue);
				const lng = Number(lngValue);

				if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
					return null;
				}

				return {
					lampPostNumber: normalizedLampPostNumber,
					lat,
					lng,
					source: 'database',
					sourceLabel: 'Database survey landmark',
					_legacyRecordId: survey?._id || null
				};
			})
			.filter(Boolean);

		const mergedMap = new Map();
		for (const entry of geoJsonEntries) {
			const key = normalizeLampPostNumber(entry.lampPostNumber) || `${entry.lat},${entry.lng}`;
			mergedMap.set(key, {
				lampPostNumber: entry.lampPostNumber,
				lat: entry.lat,
				lng: entry.lng,
				source: 'geojson',
				sourceLabel: entry.sourceLabel,
				databaseMatches: 0
			});
		}

		for (const entry of databaseEntries) {
			const key = normalizeLampPostNumber(entry.lampPostNumber) || `${entry.lat},${entry.lng}`;
			if (mergedMap.has(key)) {
				const existing = mergedMap.get(key);
				existing.databaseMatches = (existing.databaseMatches || 0) + 1;
				existing.source = 'geojson+database';
				existing.sourceLabel = 'GeoJSON + database match';
				// Keep GeoJSON coordinates as the authoritative coordinates for lamp-post display.
				existing.lat = Number.isFinite(existing.lat) ? existing.lat : entry.lat;
				existing.lng = Number.isFinite(existing.lng) ? existing.lng : entry.lng;
				continue;
			}
			mergedMap.set(key, {
				lampPostNumber: entry.lampPostNumber,
				lat: entry.lat,
				lng: entry.lng,
				source: 'database',
				sourceLabel: entry.sourceLabel,
				databaseMatches: 1
			});
		}

		const list = Array.from(mergedMap.values())
			.filter(item => item.lampPostNumber || (Number.isFinite(item.lat) && Number.isFinite(item.lng)))
			.sort((a, b) => String(a.lampPostNumber || '').localeCompare(String(b.lampPostNumber || '')));

		return res.json({
			success: true,
			count: list.length,
			databaseName,
			list
		});
	} catch (error) {
		console.error('Failed to build lamp-post list from GeoJSON and database:', error);
		return res.status(500).json({
			success: false,
			error: 'Lamp-post list could not be generated',
			details: error.message
		});
	}
});

module.exports = router;
