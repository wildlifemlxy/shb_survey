// Enhanced Heatmap Component with zoom-based layer visibility
import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { getHeatmapClusterConfig, createHeatmapClusterIcon, HYBRID_MAP_CONFIG } from './HybridMapConfig';

const HeatmapLayer = ({ data, maxZoom = 16, isLiveMode = false, onLayersReady }) => {
  const map = useMap();
  const heatmapLayersRef = useRef([]);
  const markerLayersRef = useRef([]);
  const [currentZoom, setCurrentZoom] = useState(map?.getZoom() || 12);
  const [layerVisibility, setLayerVisibility] = useState({
    heatmap: false,
    markers: true,
    transition: false
  });

  // Calculate layer opacity based on zoom level
  const calculateLayerOpacity = (zoom, layerType) => {
    const config = HYBRID_MAP_CONFIG.ZOOM_LAYER_CONFIG;
    const transition = config.TRANSITION_ZONE;
    
    // In transition zone, blend opacity smoothly
    if (zoom >= transition.START && zoom <= transition.END && transition.BLEND_OPACITY) {
      const progress = (zoom - transition.START) / (transition.END - transition.START);
      
      if (layerType === 'heatmap') {
        return Math.min(progress * 0.8, 0.8); // Max opacity 0.8 for heatmap
      } else if (layerType === 'markers') {
        return Math.max((1 - progress) * 1.0, 0.2); // Min opacity 0.2 for markers
      }
    }
    
    // Outside transition zone
    if (layerType === 'heatmap') {
      return zoom >= config.HEATMAP_ZOOM_MIN ? 0.8 : 0;
    } else if (layerType === 'markers') {
      return zoom <= config.MARKERS_ZOOM_MAX ? 1.0 : 0;
    }
    
    return 0;
  };

  // Update layer visibility based on zoom level
  const updateLayerVisibility = (zoom) => {
    const config = HYBRID_MAP_CONFIG.ZOOM_LAYER_CONFIG;
    
    const shouldShowHeatmap = zoom >= config.HEATMAP_ZOOM_MIN && zoom <= config.HEATMAP_ZOOM_MAX;
    const shouldShowMarkers = zoom >= config.MARKERS_ZOOM_MIN && zoom <= config.MARKERS_ZOOM_MAX;
    const inTransition = zoom >= config.TRANSITION_ZONE.START && zoom <= config.TRANSITION_ZONE.END;
    
    const newVisibility = {
      heatmap: shouldShowHeatmap,
      markers: shouldShowMarkers,
      transition: inTransition
    };

    setLayerVisibility(newVisibility);
    
    // Apply opacity changes to heatmap layers
    heatmapLayersRef.current.forEach(layer => {
      const opacity = calculateLayerOpacity(zoom, 'heatmap');
      
      if (opacity > 0) {
        if (!map.hasLayer(layer)) {
          layer.addTo(map);
        }
        layer.setOptions({ opacity: opacity });
      } else {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      }
    });

    // Apply opacity changes to marker layers
    markerLayersRef.current.forEach(marker => {
      const opacity = calculateLayerOpacity(zoom, 'markers');
      
      if (opacity > 0) {
        if (!map.hasLayer(marker)) {
          marker.addTo(map);
        }
        marker.setOpacity(opacity);
      } else {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      }
    });
  };

  // Create individual markers for low zoom levels
  const createIndividualMarkers = (locationGroups, data) => {
    const markerLayers = [];
    
    locationGroups.forEach((group, key) => {
      // Create different markers based on group size
      if (group.count === 1) {
        // Single observation marker
        const observation = data.find(obs => {
          const lat = parseFloat(obs.Lat);
          const lng = parseFloat(obs.Long);
          return !isNaN(lat) && !isNaN(lng) && 
                 `${lat.toFixed(6)}_${lng.toFixed(6)}` === key;
        });
        
        if (observation) {
          const seenHeard = observation["Seen/Heard"];
          let markerColor = '#6B7280';
          let icon = '📍';
          
          switch(seenHeard) {
            case 'Seen':
              markerColor = '#22C55E';
              icon = '👁️';
              break;
            case 'Heard':
              markerColor = '#3B82F6';
              icon = '👂';
              break;
            case 'Not found':
              markerColor = '#EF4444';
              icon = '❌';
              break;
          }

          const singleMarker = L.divIcon({
            html: `
              <div style="
                background: linear-gradient(135deg, ${markerColor} 0%, ${markerColor}dd 100%);
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                font-weight: bold;
                border: 3px solid white;
                box-shadow: 0 3px 8px rgba(0,0,0,0.3);
                cursor: pointer;
                transition: all 0.2s ease;
              " 
              onmouseover="this.style.transform='scale(1.2)'"
              onmouseout="this.style.transform='scale(1)'"
              >${icon}</div>
            `,
            className: 'individual-observation-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const marker = L.marker([group.lat, group.lng], { 
            icon: singleMarker,
            zIndexOffset: 500
          });

          marker.bindPopup(`
            <div style="font-family: Arial, sans-serif; min-width: 250px;">
              <h3 style="margin: 0 0 8px 0; color: ${markerColor}; font-size: 16px;">
                ${observation["SHB individual ID (e.g. SHB1)"] || 'Unknown ID'}
              </h3>
              <p style="margin: 4px 0;"><strong>Status:</strong> ${seenHeard}</p>
              <p style="margin: 4px 0;"><strong>Location:</strong> ${observation.Location || 'Unknown'}</p>
              <p style="margin: 4px 0;"><strong>Coordinates:</strong> ${group.lat.toFixed(6)}, ${group.lng.toFixed(6)}</p>
            </div>
          `);

          markerLayers.push(marker);
        }
      } else {
        // Cluster marker for multiple observations
        const intensity = group.count / Math.max(...Array.from(locationGroups.values()).map(g => g.count));
        const iconConfig = createHeatmapClusterIcon(group.count, intensity);
        
        const clusterIcon = L.divIcon({
          ...iconConfig,
          className: 'cluster-observation-marker'
        });

        const marker = L.marker([group.lat, group.lng], { 
          icon: clusterIcon,
          zIndexOffset: 600
        });

        marker.bindPopup(`
          <div style="font-family: Arial, sans-serif; min-width: 200px; text-align: center;">
            <h3 style="margin: 0 0 8px 0; color: #DC2626; font-size: 16px;">
              📍 ${group.count} Observations
            </h3>
            <p style="margin: 4px 0;">Click to zoom in for details</p>
            <p style="margin: 4px 0;"><strong>Coordinates:</strong> ${group.lat.toFixed(6)}, ${group.lng.toFixed(6)}</p>
            <button onclick="if(window.autoZoomToHeatmap) window.autoZoomToHeatmap()" style="
              background: #DC2626; 
              color: white; 
              border: none; 
              padding: 6px 12px; 
              border-radius: 4px; 
              cursor: pointer;
              margin-top: 8px;
            ">🔍 Zoom for Heatmap</button>
          </div>
        `);

        markerLayers.push(marker);
      }
    });
    
    return markerLayers;
  };

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clean up existing layers
    heatmapLayersRef.current.forEach(layer => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });
    markerLayersRef.current.forEach(marker => {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    });
    heatmapLayersRef.current = [];
    markerLayersRef.current = [];

    // Group observations by rounded coordinates (6 decimals)
    const locationGroups = new Map();
    data.forEach(observation => {
      const lat = parseFloat(observation.Lat);
      const lng = parseFloat(observation.Long);
      if (!isNaN(lat) && !isNaN(lng)) {
        const key = `${lat.toFixed(6)}_${lng.toFixed(6)}`;
        if (!locationGroups.has(key)) {
          locationGroups.set(key, { lat, lng, count: 0 });
        }
        locationGroups.get(key).count += 1;
      }
    });

    // Calculate intensity based on data distribution
    const maxCount = Math.max(...Array.from(locationGroups.values()).map(g => g.count));

    // Create layered heatmap with multiple intensity levels
    const heatmapLayers = [];
    
    // Layer 1: High intensity (75-100%)
    const highIntensityPoints = [];
    locationGroups.forEach(group => {
      const intensity = group.count / maxCount;
      if (intensity >= 0.75) {
        highIntensityPoints.push([group.lat, group.lng, intensity]);
      }
    });

    if (highIntensityPoints.length > 0) {
      const highLayer = L.heatLayer(highIntensityPoints, {
        radius: 30,
        blur: 10,
        maxZoom: maxZoom,
        max: 1.0,
        gradient: {
          0.0: '#DC2626',  // Red
          0.5: '#EF4444',  // Light red
          1.0: '#7F1D1D'   // Dark red
        }
      });
      heatmapLayers.push(highLayer);
    }

    // Layer 2: Medium intensity (50-74%)
    const mediumIntensityPoints = [];
    locationGroups.forEach(group => {
      const intensity = group.count / maxCount;
      if (intensity >= 0.5 && intensity < 0.75) {
        mediumIntensityPoints.push([group.lat, group.lng, intensity]);
      }
    });

    if (mediumIntensityPoints.length > 0) {
      const mediumLayer = L.heatLayer(mediumIntensityPoints, {
        radius: 35,
        blur: 12,
        maxZoom: maxZoom,
        max: 1.0,
        gradient: {
          0.0: '#D97706',  // Orange
          0.5: '#F59E0B',  // Light orange
          1.0: '#92400E'   // Dark orange
        }
      });
      heatmapLayers.push(mediumLayer);
    }

    // Layer 3: Low intensity (25-49%)
    const lowIntensityPoints = [];
    locationGroups.forEach(group => {
      const intensity = group.count / maxCount;
      if (intensity >= 0.25 && intensity < 0.5) {
        lowIntensityPoints.push([group.lat, group.lng, intensity]);
      }
    });

    if (lowIntensityPoints.length > 0) {
      const lowLayer = L.heatLayer(lowIntensityPoints, {
        radius: 40,
        blur: 15,
        maxZoom: maxZoom,
        max: 1.0,
        gradient: {
          0.0: '#059669',  // Green
          0.5: '#10B981',  // Light green
          1.0: '#047857'   // Dark green
        }
      });
      heatmapLayers.push(lowLayer);
    }

    // Layer 4: Very low intensity (0-24%)
    const veryLowIntensityPoints = [];
    locationGroups.forEach(group => {
      const intensity = group.count / maxCount;
      if (intensity < 0.25) {
        veryLowIntensityPoints.push([group.lat, group.lng, intensity]);
      }
    });

    if (veryLowIntensityPoints.length > 0) {
      const veryLowLayer = L.heatLayer(veryLowIntensityPoints, {
        radius: 45,
        blur: 18,
        maxZoom: maxZoom,
        max: 1.0,
        gradient: {
          0.0: '#1E40AF',  // Blue
          0.5: '#3B82F6',  // Light blue
          1.0: '#1E3A8A'   // Dark blue
        }
      });
      heatmapLayers.push(veryLowLayer);
    }

    // Store heatmap layers for zoom control
    heatmapLayersRef.current = heatmapLayers;
    
    // Create individual markers for low zoom levels
    const individualMarkers = createIndividualMarkers(locationGroups, data);
    markerLayersRef.current = individualMarkers;

    // Apply initial visibility based on current zoom
    const zoom = map.getZoom();
    updateLayerVisibility(zoom);

    // Set up zoom event listener for dynamic layer switching
    const handleZoomEnd = () => {
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);
      updateLayerVisibility(newZoom);
    };

    map.on('zoomend', handleZoomEnd);

    // Notify parent component that layers are ready
    if (onLayersReady) {
      onLayersReady({
        heatmapLayers: heatmapLayers,
        markerLayers: individualMarkers,
        locationGroups: locationGroups
      });
    }

    // Cleanup function
    return () => {
      map.off('zoomend', handleZoomEnd);
      
      // Remove all heatmap layers
      heatmapLayersRef.current.forEach(layer => {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      });
      
      // Remove all marker layers
      markerLayersRef.current.forEach(marker => {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      });
    };
  }, [data.length, maxZoom, map]);

  return (
    <>
      {/* Zoom-based layer visibility indicator */}
      <div style={{
        position: 'absolute',
        bottom: '60px',
        right: '10px',
        background: layerVisibility.transition 
          ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
          : layerVisibility.heatmap 
            ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
            : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        color: 'white',
        padding: '6px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '600',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        zIndex: 1000,
        minWidth: '140px',
        textAlign: 'center',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'white',
            opacity: 0.8
          }}></div>
          <span>
            {layerVisibility.transition 
              ? `🔄 Blending (Z${currentZoom})`
              : layerVisibility.heatmap 
                ? `🔥 Heatmap (Z${currentZoom})`
                : `📍 Markers (Z${currentZoom})`
            }
          </span>
        </div>
        <div style={{ fontSize: '9px', opacity: 0.7, marginTop: '2px' }}>
          {layerVisibility.transition 
            ? 'Smooth transition active'
            : layerVisibility.heatmap 
              ? 'Click for individual pins'
              : 'Auto-zoom for heatmap'
          }
        </div>
      </div>

      {/* Auto-zoom controls */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        display: 'flex',
        gap: '8px',
        zIndex: 1000
      }}>
        <button
          onClick={() => {
            if (map && HYBRID_MAP_CONFIG.ZOOM_LAYER_CONFIG.AUTO_ZOOM_CONFIG.ENABLED) {
              const targetZoom = HYBRID_MAP_CONFIG.ZOOM_LAYER_CONFIG.AUTO_ZOOM_CONFIG.ZOOM_TO_HEATMAP;
              map.setZoom(targetZoom, { animate: true, duration: 1 });
            }
          }}
          disabled={layerVisibility.heatmap && !layerVisibility.transition}
          style={{
            background: layerVisibility.heatmap && !layerVisibility.transition 
              ? '#9CA3AF' 
              : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 10px',
            fontSize: '10px',
            fontWeight: '600',
            cursor: layerVisibility.heatmap && !layerVisibility.transition ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease',
            opacity: layerVisibility.heatmap && !layerVisibility.transition ? 0.6 : 1
          }}
        >
          🔥 Heatmap
        </button>
        
        <button
          onClick={() => {
            if (map && HYBRID_MAP_CONFIG.ZOOM_LAYER_CONFIG.AUTO_ZOOM_CONFIG.ENABLED) {
              const targetZoom = HYBRID_MAP_CONFIG.ZOOM_LAYER_CONFIG.AUTO_ZOOM_CONFIG.ZOOM_TO_MARKERS;
              map.setZoom(targetZoom, { animate: true, duration: 1 });
            }
          }}
          disabled={!layerVisibility.heatmap && !layerVisibility.transition}
          style={{
            background: !layerVisibility.heatmap && !layerVisibility.transition 
              ? '#9CA3AF' 
              : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 10px',
            fontSize: '10px',
            fontWeight: '600',
            cursor: !layerVisibility.heatmap && !layerVisibility.transition ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease',
            opacity: !layerVisibility.heatmap && !layerVisibility.transition ? 0.6 : 1
          }}
        >
          📍 Markers
        </button>
      </div>

      {/* CSS for smooth transitions */}
      <style>{`
        .zooming-transition * {
          transition: opacity 0.3s ease, transform 0.3s ease !important;
        }
        
        .leaflet-heatmap-layer {
          transition: opacity 0.3s ease !important;
        }
        
        .leaflet-marker-icon {
          transition: opacity 0.3s ease !important;
        }
      `}</style>
    </>
  );
};

export default HeatmapLayer;
