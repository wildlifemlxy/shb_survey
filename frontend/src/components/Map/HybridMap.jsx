import React, { Component } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './HybridMap.css';
import L from 'leaflet';
import HeatmapLayerZoom from './HeatmapLayerZoom';
import SimpleClusterLayer from './SimpleClusterLayer';
import { HYBRID_MAP_CONFIG, getTileSource } from './HybridMapConfig';

class HybridMap extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this.state = {
      currentZoom: HYBRID_MAP_CONFIG.DEFAULT_ZOOM,
      layersReady: false,
      mapType: 'hybrid',
    };
  }

  setMapType = (type) => {
    if (type === 'hybrid' || type === 'street') {
      this.setState({ mapType: type });
    }
  };

  render() {
    const { data = [], height = '100%' } = this.props;
    const { currentZoom, mapType } = this.state;
    const validData = data.filter(observation => {
      const lat = parseFloat(observation.Lat);
      const lng = parseFloat(observation.Long);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    }).map(observation => ({
      ...observation,
      Lat: parseFloat(observation.Lat),
      Long: parseFloat(observation.Long)
    }));
    const singaporeCenter = [1.3521, 103.8198];
    const singaporeBounds = [[1.15, 103.5], [1.50, 104.1]];
    const tileConfig = getTileSource(mapType, true);

    return (
      <div style={{ height, width: '100%', position: 'relative' }}>
        <div style={{ height: 'calc(100vh - 200px)', minHeight: '500px', border: '3px solid #DC2626', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
          {/* Map type toggle (hybrid/street) */}
          <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1200, background: 'rgba(255,255,255,0.85)', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '4px 8px', display: 'flex', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <button
              style={{ background: mapType === 'hybrid' ? '#10B981' : 'transparent', color: mapType === 'hybrid' ? 'white' : '#222', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', transition: 'background 0.2s' }}
              onClick={() => this.setMapType('hybrid')}
            >
              Hybrid
            </button>
            <button
              style={{ background: mapType === 'street' ? '#3B82F6' : 'transparent', color: mapType === 'street' ? 'white' : '#222', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', transition: 'background 0.2s' }}
              onClick={() => this.setMapType('street')}
            >
              Street
            </button>
          </div>
          <MapContainer
            center={singaporeCenter}
            zoom={HYBRID_MAP_CONFIG.DEFAULT_ZOOM}
            minZoom={HYBRID_MAP_CONFIG.MIN_ZOOM}
            maxZoom={HYBRID_MAP_CONFIG.MAX_ZOOM}
            style={{ height: '100%', width: '100%' }}
            maxBounds={singaporeBounds}
            maxBoundsViscosity={1.0}
            zoomControl={false}
            ref={this.mapRef}
            whenCreated={mapInstance => {
              window.hybridMap = mapInstance;
              mapInstance.on('zoomend', () => {
                this.setState({ currentZoom: mapInstance.getZoom() });
              });
              setTimeout(() => {
                mapInstance.invalidateSize();
              }, 100);
            }}
          >
            <TileLayer
              url={tileConfig.url}
              attribution={tileConfig.attribution}
              maxZoom={19}
              key={`hybrid-${mapType}`}
            />
            {validData.length > 1 && currentZoom < HYBRID_MAP_CONFIG.ZOOM_LAYER_CONFIG.HEATMAP_ZOOM_MIN && (
              <HeatmapLayerZoom
                data={validData}
                maxZoom={16}
                isLiveMode={true}
              />
            )}
            {validData.length === 1 || currentZoom >= HYBRID_MAP_CONFIG.ZOOM_LAYER_CONFIG.HEATMAP_ZOOM_MIN ? (
              <SimpleClusterLayer data={validData} />
            ) : null}
            <ZoomControl position="bottomright" />
          </MapContainer>
        </div>
      </div>
    );
  }
}

export default HybridMap;
