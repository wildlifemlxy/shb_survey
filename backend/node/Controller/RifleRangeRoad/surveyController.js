const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');
const DatabaseConnectivity = require('../../Database/databaseConnectivity');

const DATABASE_NAME = 'RifleRangeRoad';
const COLLECTION_NAME = 'Wildlife Survey';
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

const extractCoordinatePair = (value) => {
	if (value === null || value === undefined) return null;
	const text = String(value).trim();
	if (!text) return null;

	const parts = text.split(/[\s,]+/).filter(Boolean);
	if (parts.length < 2) return null;

	const lat = Number.parseFloat(parts[0]);
	const lng = Number.parseFloat(parts[1]);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

	return { lat, lng };
};

const getLampPostCoordinateMap = () => {
	try {
		const fileContents = fs.readFileSync(lampPostGeoJsonPath, 'utf8');
		const geoJson = JSON.parse(fileContents);
		const coordinateMap = new Map();

		(Array.isArray(geoJson.features) ? geoJson.features : []).forEach((feature) => {
			if (!feature || !feature.geometry || !Array.isArray(feature.geometry.coordinates)) return;
			const [lng, lat] = feature.geometry.coordinates;
			const rawValue = feature?.properties?.LAMPPOST_NUM || feature?.properties?.LAMPPOST || feature?.properties?.lampPostNumber;
			const lampPostNumber = normalizeLampPostNumber(rawValue);
			if (!lampPostNumber || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;
			coordinateMap.set(lampPostNumber, { lat: Number(lat), lng: Number(lng) });
		});

		return coordinateMap;
	} catch (error) {
		console.warn('Unable to load lamp-post GeoJSON for Rifle Range Road coordinate replacement:', error.message);
		return new Map();
	}
};

const replaceLampPostCoordinates = (surveyRecords = []) => {
	const coordinateMap = getLampPostCoordinateMap();

	return (Array.isArray(surveyRecords) ? surveyRecords : []).map((record) => {
		if (!record || String(record.type || '').trim() !== 'Data (External) cleaned') {
			return record;
		}

		const landmarkValue = String(record['Co-ordinates/Nearest Landmarks'] ?? '').trim();
		if (!landmarkValue) {
			return record;
		}

		const directCoordinates = extractCoordinatePair(landmarkValue);
		if (directCoordinates) {
			const nextRecord = { ...record };
			nextRecord['Co-ordinates/Nearest Landmarks'] = `${directCoordinates.lat}, ${directCoordinates.lng}`;
			nextRecord.Lat = directCoordinates.lat;
			nextRecord.Long = directCoordinates.lng;
			return nextRecord;
		}

		const normalizedLampPost = normalizeLampPostNumber(landmarkValue);
		if (!normalizedLampPost) {
			return record;
		}

		const coordinate = coordinateMap.get(normalizedLampPost);
		if (!coordinate) {
			return record;
		}

		const nextRecord = { ...record };
		nextRecord['Co-ordinates/Nearest Landmarks'] = `${coordinate.lat}, ${coordinate.lng}`;
		nextRecord.Lat = coordinate.lat;
		nextRecord.Long = coordinate.lng;
		return nextRecord;
	});
};

class RifleRangeRoadSurveyController {
	async getAllSurveys() {
		const db = DatabaseConnectivity.getInstance();

		try {
			await db.initialize('rifleRangeRoad');
			const surveys = await db.getAllDocuments(DATABASE_NAME, COLLECTION_NAME);
			const resolvedSurveys = replaceLampPostCoordinates(surveys);
			return {
				success: true,
				surveys: resolvedSurveys,
				count: resolvedSurveys.length,
				message: 'Rifle Range Road survey events retrieved successfully'
			};
		} catch (error) {
			console.error('Error retrieving Rifle Range Road survey events:', error);
			return {
				success: false,
				surveys: [],
				count: 0,
				message: 'Error retrieving Rifle Range Road survey events',
				error: error.message
			};
		}
	}

	async insertSurvey(surveyData) {
		const db = DatabaseConnectivity.getInstance();

		try {
			await db.initialize('rifleRangeRoad');
			const result = await db.insertDocument(DATABASE_NAME, COLLECTION_NAME, surveyData);

			return {
				success: true,
				message: 'Rifle Range Road survey inserted successfully',
				insertedId: result.insertedId || null
			};
		} catch (error) {
			console.error('Error in Rifle Range Road insertSurvey:', error);
			return {
				success: false,
				message: 'Error inserting Rifle Range Road survey',
				error: error.message
			};
		}
	}

	async updateSurvey(recordId, updatedData) {
		const db = DatabaseConnectivity.getInstance();

		try {
			if (!ObjectId.isValid(recordId)) {
				throw new Error('Invalid record ID format');
			}

			await db.initialize('rifleRangeRoad');

			const sanitizedData = { ...updatedData };
			delete sanitizedData._id;

			const result = await db.updateDocument(
				DATABASE_NAME,
				COLLECTION_NAME,
				{ _id: new ObjectId(recordId) },
				{ $set: sanitizedData }
			);

			if (result.matchedCount === 0) {
				throw new Error('Survey record not found');
			}

			return {
				success: true,
				matchedCount: result.matchedCount,
				modifiedCount: result.modifiedCount,
				message: 'Rifle Range Road survey updated successfully'
			};
		} catch (error) {
			console.error('Error in Rifle Range Road updateSurvey:', error);
			return {
				success: false,
				message: 'Error updating Rifle Range Road survey',
				error: error.message
			};
		}
	}

	async deleteSurvey(recordId) {
		const db = DatabaseConnectivity.getInstance();

		try {
			if (!ObjectId.isValid(recordId)) {
				throw new Error('Invalid record ID format');
			}

			await db.initialize('rifleRangeRoad');
			const result = await db.deleteDocument(
				DATABASE_NAME,
				COLLECTION_NAME,
				{ _id: new ObjectId(recordId) }
			);

			if (result.deletedCount === 0) {
				throw new Error('Survey record not found');
			}

			return {
				success: true,
				deletedCount: result.deletedCount,
				message: 'Rifle Range Road survey deleted successfully'
			};
		} catch (error) {
			console.error('Error in Rifle Range Road deleteSurvey:', error);
			return {
				success: false,
				message: 'Error deleting Rifle Range Road survey',
				error: error.message
			};
		}
	}
}

module.exports = RifleRangeRoadSurveyController;
module.exports.RifleRangeRoadSurveyController = RifleRangeRoadSurveyController;
module.exports.extractCoordinatePair = extractCoordinatePair;
module.exports.replaceLampPostCoordinates = replaceLampPostCoordinates;