import React, { Component } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as XLSX from 'xlsx';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSAL_sN7qwE1seWkiDF-TAl-T_s-gtuV9F6XQiKLOQ03ru-5DVwf-uRsZ0HjKlOyA/pub?output=xlsx';

// Singapore coordinates for center of map
const singaporeCenter = [1.3521, 103.8198];

class ActivityPredictorClass extends Component {
  constructor(props) {
    super(props);
    this.state = {
      model: null,
      activityMap: {},
      locations: [],
      newLocationPredictions: [], // Locations with predictions
      isLoading: true,
      error: null,
      bounds: {
        minLat: 1.2, maxLat: 1.5,  // Singapore latitude range
        minLon: 103.6, maxLon: 104.1 // Singapore longitude range
      }
    };
  }

  // Load and Train TensorFlow Model
  async componentDidMount() {
    await this.loadAndTrainModel();
  }

  async loadAndTrainModel() {
    try {
      const response = await fetch(SHEET_URL);
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      
      jsonData.splice(0, 1); // Remove header row

      const processedData = this.preprocessData(jsonData);
      const inputs = processedData.map(d => [d.Lat, d.Long]);
      
      // Make sure we're using the right property name for activities
      const allActivities = [...new Set(processedData.map(d => d.Activity).filter(Boolean))];
      
      console.log('Unique activities:', allActivities);
      
      // Check if we have enough unique activities for classification
      if (allActivities.length < 2) {
        console.error('Not enough unique activities for classification (need at least 2)');
        // Add default activities if there aren't enough
        if (allActivities.length === 0) {
          allActivities.push('Unknown', 'Default');
        } else {
          allActivities.push('Other');
        }
        console.log('Added default activities. Updated activities:', allActivities);
      }
      
      const activityMap = this.createActivityMap(allActivities);
      console.log('Activity map:', activityMap);
      
      const labels = processedData.map(d => activityMap[d.Activity] ?? 0);
      console.log('Labels:', labels);

      // Calculate bounds for future predictions from actual data
      const bounds = this.calculateDataBounds(processedData);

      const xs = tf.tensor2d(inputs, [inputs.length, 2], 'float32');
      // Change from float32 to int32 for categorical labels
      const ys = tf.tensor1d(labels, 'float32');

      const model = tf.sequential();
      model.add(tf.layers.dense({ inputShape: [2], units: 16, activation: 'relu' }));
      model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
      model.add(tf.layers.dense({ units: allActivities.length, activation: 'softmax' }));

      model.compile({
        optimizer: tf.train.adam(),
        loss: 'sparseCategoricalCrossentropy',
        metrics: ['accuracy'],
      });

      await model.fit(xs, ys, { 
        epochs: 50, 
        validationSplit: 0.2, 
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
          }
        }
      });

      this.setState({
        model,
        activityMap: this.reverseActivityMap(activityMap),
        locations: this.getUniqueLocations(processedData),
        isLoading: false,
        bounds
      }, () => {
        // Generate and predict activities for dynamic locations
        this.generateDynamicLocations();
      });
    } catch (error) {
      console.error('Error loading or training model:', error);
      console.error('Error details:', error.stack);
      this.setState({
        isLoading: false,
        error: 'Failed to load or train model. Please try refreshing the page.'
      });
    }
  }

  calculateDataBounds(data) {
    const lats = data.map(item => item.Lat);
    const longs = data.map(item => item.Long);
    
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...longs),
      maxLon: Math.max(...longs)
    };
  }

  generateDynamicLocations() {
    const { bounds, dynamicLocations = [] } = this.state;  // Ensure dynamicLocations is initialized as an empty array
    const { minLat, maxLat, minLon, maxLon } = bounds;
  
    // Check if the bounds have changed or if dynamic locations need to be regenerated
    if (!this.hasBoundsChanged(bounds) && dynamicLocations.length > 0) {
      // If bounds haven't changed and dynamic locations exist, no need to regenerate
      return;
    }
  
    // Generate 5 dynamic locations within the bounds of existing data
    const newDynamicLocations = [];
    const locationNames = [
      'Northern District',
      'Eastern Area',
      'Southern Region',
      'Western Zone',
      'Central District'
    ];
  
    for (let i = 0; i < 5; i++) {
      // Generate random locations within the data bounds
      const padding = 0.02; // Add padding to avoid edge cases
      const lat = minLat + padding + (Math.random() * (maxLat - minLat - (padding * 2)));
      const lon = minLon + padding + (Math.random() * (maxLon - minLon - (padding * 2)));
  
      // To add more realistic clustering, apply a slight bias to the location
      const latVariation = (Math.random() - 0.5) * 0.015; // Slight bias to avoid uniformity
      const lonVariation = (Math.random() - 0.5) * 0.015;
  
      const adjustedLat = lat + latVariation;
      const adjustedLon = lon + lonVariation;
  
      // Assign a name to the area based on the location (smarter naming logic)
      let name = locationNames[i] || `Area ${i + 1}`;
  
      // If you have specific regions or clusters, you can refine the names based on regions
      if (adjustedLat > 1.3) {
        name = `North ${locationNames[i]}`;
      } else if (adjustedLon < 103.8) {
        name = `West ${locationNames[i]}`;
      }
  
      // Add to dynamic locations
      newDynamicLocations.push({ lat: adjustedLat, lon: adjustedLon, name });
    }
  
    // Update state with new dynamic locations
    this.setState({ dynamicLocations: newDynamicLocations });
  
    // Predict activities for all dynamic locations
    newDynamicLocations.forEach(location => {
      // Pass in dynamic location name and other contextual information for smarter prediction
      this.predictActivity(location.lat, location.lon, location.name);
    });
}
  
// Helper function to compare if bounds have changed
hasBoundsChanged(newBounds) {
    const { bounds } = this.state;
    return (
        newBounds.minLat !== bounds.minLat ||
        newBounds.maxLat !== bounds.maxLat ||
        newBounds.minLon !== bounds.minLon ||
        newBounds.maxLon !== bounds.maxLon
    );
}

  
  preprocessData(data) {
    return data.filter(row => row.Lat && row.Long).map(row => ({
      Lat: this.convertToNumber(row.Lat),
      Long: this.convertToNumber(row.Long),
      Activity: (row.Activity && typeof row.Activity === 'string') ? row.Activity.split(',')[0].trim() : 'Unknown',
      Time: this.convertExcelTimeTo24hr(row.Time),
    }));
  }

  convertToNumber(value) {
    return isNaN(parseFloat(value)) ? 0 : parseFloat(value);
  }

  convertExcelTimeTo24hr(excelTime) {
    if (!excelTime || isNaN(excelTime)) {
      return { hours: 0, minutes: 0 };
    }
    const hours = Math.floor(excelTime * 24);
    const minutes = Math.round((excelTime * 24 - hours) * 60);
    return { hours, minutes };
  }

  createActivityMap(allActivities) {
    return allActivities.reduce((map, activity, index) => {
      map[activity] = index;
      return map;
    }, {});
  }

  reverseActivityMap(activityMap) {
    return Object.fromEntries(Object.entries(activityMap).map(([key, value]) => [value, key]));
  }

  getUniqueLocations(data) {
    const uniqueLocations = new Map();
    data.forEach(record => {
      const key = `${record.Lat.toFixed(6)},${record.Long.toFixed(6)}`;
      if (!uniqueLocations.has(key)) {
        uniqueLocations.set(key, { lat: record.Lat, lon: record.Long, visited: true });
      }
    });
    return Array.from(uniqueLocations.values());
  }

  predictActivity(lat, lon, locationName = '') {
    const { model, activityMap } = this.state;
    if (!model) {
      console.warn('Model is not loaded yet.');
      return;
    }

    try {
      const inputTensor = tf.tensor2d([[lat, lon]], [1, 2], 'float32');
      const result = model.predict(inputTensor);
      
      // Get prediction probabilities for all classes
      const probabilities = result.dataSync();
      const predictedIndex = result.argMax(1).dataSync()[0];
      const prediction = activityMap[predictedIndex] || 'Unknown Activity';
      
      // Get confidence level
      const confidence = (probabilities[predictedIndex] * 100).toFixed(1);
      
      console.log(`Prediction for ${locationName || `[${lat}, ${lon}]`}: ${prediction} (${confidence}% confidence)`);

      this.setState(prevState => ({
        newLocationPredictions: [
          ...prevState.newLocationPredictions,
          { 
            lat, 
            lon, 
            prediction, 
            confidence,
            visited: false, 
            name: locationName 
          }
        ]
      }));
    } catch (error) {
      console.error('Error making prediction:', error);
    }
  }

  handleManualPrediction = () => {
    const lat = parseFloat(this.latInput.value);
    const lon = parseFloat(this.longInput.value);
    const name = this.nameInput.value.trim();
    
    if (!isNaN(lat) && !isNaN(lon)) {
      this.predictActivity(lat, lon, name);
      this.latInput.value = '';
      this.longInput.value = '';
      this.nameInput.value = '';
    }
  }

  handleMarkerClick(lat, lon) {
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
    window.open(googleMapsUrl, '_blank');
  }

  render() {
    const { locations, newLocationPredictions, isLoading, error } = this.state;

    if (isLoading) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Location Predictor</h2>
          <div style={{ marginTop: '2rem' }}>
            <p>Loading and training model... This may take a moment.</p>
            <div style={{ width: '50%', margin: '0 auto', backgroundColor: '#eee', borderRadius: '8px' }}>
              <div style={{ width: '100%', height: '20px', backgroundColor: '#4CAF50', borderRadius: '8px', animation: 'pulse 1.5s infinite ease-in-out' }}></div>
            </div>
            <style>{`
              @keyframes pulse {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
              }
            `}</style>
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: '2rem' }}>
        <h2>Location Predictor</h2>
        <div style={{ marginTop: '2rem', height: '400px' }}>
          <MapContainer 
            center={singaporeCenter}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            minZoom={11}
            zoomControl={false}
            attributionControl={false}
            dragging={true}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            maxBoundsViscosity={1.0}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {locations.map((location, index) => (
              <Marker
                key={`visited-${index}`}
                position={[location.lat, location.lon]}
                icon={new L.Icon({ 
                  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
                  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41]
                })}
                eventHandlers={{ click: () => this.handleMarkerClick(location.lat, location.lon) }}
              >
                <Popup>{`Lat: ${location.lat.toFixed(6)}, Lon: ${location.lon.toFixed(6)}`}</Popup>
              </Marker>
            ))}
            {newLocationPredictions.map((location, index) => (
              <Marker
                key={`prediction-${index}`}
                position={[location.lat, location.lon]}
                icon={new L.Icon({ 
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41]
                })}
                eventHandlers={{ click: () => this.handleMarkerClick(location.lat, location.lon) }}
              >
                <Popup>
                  {location.name ? <br/> : null}
                  {`Lat: ${location.lat.toFixed(6)}, Lon: ${location.lon.toFixed(6)}`}
                  <br/>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div style={{ marginTop: '1rem', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '5px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Legend:</h4>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: 'blue', marginRight: '0.5rem' }}></div>
              <span>Visited Locations</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: 'red', marginRight: '0.5rem' }}></div>
              <span>Unvisited </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ActivityPredictorClass;