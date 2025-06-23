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
            <button onclick="window.autoZoomToHeatmap && window.autoZoomToHeatmap()" style="
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
    
    // Prepare heatmap points
    const heatmapPoints = [];
    locationGroups.forEach(group => {
      // Normalize intensity based on maximum count
      const intensity = group.count / maxCount;
      // Use count as weight for heatmap
      heatmapPoints.push([group.lat, group.lng, Math.min(group.count, 10) / 10]);
    });

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

    // Create a combined click handler for all layers
    const addClickHandlerToLayer = (layer) => {
      layer.on('click', (e) => {
        const clickedLatLng = e.latlng;
        const radius = 0.01;
        
        console.log('Layered heatmap clicked at:', clickedLatLng);
        
        // Find exact location groups first
        let nearbyObservations = [];
        locationGroups.forEach((group, key) => {
          const distance = Math.sqrt(
            Math.pow(group.lat - clickedLatLng.lat, 2) + 
            Math.pow(group.lng - clickedLatLng.lng, 2)
          );
          if (distance <= radius) {
            const groupObservations = data.filter(obs => {
              const lat = parseFloat(obs.Lat);
              const lng = parseFloat(obs.Long);
              return !isNaN(lat) && !isNaN(lng) && 
                     `${lat.toFixed(6)}_${lng.toFixed(6)}` === key;
            });
            nearbyObservations.push(...groupObservations);
          }
        });

        // Fallback to radius search
        if (nearbyObservations.length === 0) {
          nearbyObservations = data.filter(obs => {
            const lat = parseFloat(obs.Lat);
            const lng = parseFloat(obs.Long);
            if (!isNaN(lat) && !isNaN(lng)) {
              const distance = Math.sqrt(
                Math.pow(lat - clickedLatLng.lat, 2) + 
                Math.pow(lng - clickedLatLng.lng, 2)
              );
              return distance <= radius;
            }
            return false;
          });
        }

        console.log(`Found ${nearbyObservations.length} observations near click`);

        // Show notification if markers found
        if (nearbyObservations.length > 0) {
          L.popup()
            .setLatLng(clickedLatLng)
            .setContent(`
              <div style="
                text-align: center; 
                padding: 8px 12px; 
                background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                color: white;
                border-radius: 6px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
              ">
                📍 ${nearbyObservations.length} pin${nearbyObservations.length > 1 ? 's' : ''} added!
              </div>
            `)
            .openOn(map);
            
          setTimeout(() => map.closePopup(), 1500);
        }

        // Clear existing individual markers first
        if (window.individualMarkers) {
          window.individualMarkers.forEach(marker => {
            if (map.hasLayer(marker)) map.removeLayer(marker);
          });
          window.individualMarkers = [];
        }

        // Create individual markers for nearby observations
        nearbyObservations.forEach((obs, index) => {
          const lat = parseFloat(obs.Lat);
          const lng = parseFloat(obs.Long);
          const seenHeard = obs["Seen/Heard"];
          
          // Enhanced color scheme with more variety, similar to Google Maps
          let markerColor = '#6B7280';
          let icon = '📍';
          let shadowColor = 'rgba(0,0,0,0.4)';
          
          // Add some color variation based on index for visual appeal
          const colorVariations = [
            { base: '#34D399', shadow: 'rgba(52, 211, 153, 0.4)' }, // Green
            { base: '#60A5FA', shadow: 'rgba(96, 165, 250, 0.4)' }, // Blue  
            { base: '#F87171', shadow: 'rgba(248, 113, 113, 0.4)' }, // Red
            { base: '#FBBF24', shadow: 'rgba(251, 191, 36, 0.4)' },  // Yellow
            { base: '#A78BFA', shadow: 'rgba(167, 139, 250, 0.4)' }, // Purple
            { base: '#FB7185', shadow: 'rgba(251, 113, 133, 0.4)' }, // Pink
            { base: '#34D4AA', shadow: 'rgba(52, 212, 170, 0.4)' },  // Teal
            { base: '#FB923C', shadow: 'rgba(251, 146, 60, 0.4)' }   // Orange
          ];
          
          switch(seenHeard) {
            case 'Seen':
              markerColor = '#22C55E'; // Bright green
              icon = '👁️';
              shadowColor = 'rgba(34, 197, 94, 0.4)';
              break;
            case 'Heard':
              markerColor = '#3B82F6'; // Bright blue
              icon = '👂';
              shadowColor = 'rgba(59, 130, 246, 0.4)';
              break;
            case 'Not found':
              markerColor = '#EF4444'; // Bright red
              icon = '❌';
              shadowColor = 'rgba(239, 68, 68, 0.4)';
              break;
            default:
              // Use color variation for unknown status
              const colorIndex = index % colorVariations.length;
              markerColor = colorVariations[colorIndex].base;
              shadowColor = colorVariations[colorIndex].shadow;
              icon = '📍';
              break;
          }

          // Better spacing for overlapping pins with circular distribution
          const spreadRadius = 0.0003;
          const pinsPerRing = 8;
          const ringNumber = Math.floor(index / pinsPerRing);
          const positionInRing = index % pinsPerRing;
          const angle = (positionInRing * 360 / pinsPerRing) * Math.PI / 180;
          const currentRadius = spreadRadius * (ringNumber + 1);
          
          const offsetLat = lat + (Math.cos(angle) * currentRadius);
          const offsetLng = lng + (Math.sin(angle) * currentRadius);

        const individualMarker = L.divIcon({
          html: `
            <div style="
              position: relative;
              width: 40px;
              height: 48px;
              cursor: pointer;
              transform-origin: center bottom;
              transition: all 0.2s ease;
            " class="google-maps-pin-wrapper">
              <!-- Pin shadow -->
              <div style="
                position: absolute;
                bottom: -2px;
                left: 50%;
                transform: translateX(-50%);
                width: 24px;
                height: 8px;
                background: ${shadowColor};
                border-radius: 50%;
                filter: blur(3px);
                opacity: 0.6;
              "></div>
              <!-- Pin body -->
              <div style="
                background: linear-gradient(135deg, ${markerColor} 0%, ${markerColor}dd 100%);
                width: 32px;
                height: 32px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                position: absolute;
                top: 8px;
                left: 4px;
                border: 3px solid white;
                box-shadow: 
                  0 4px 12px rgba(0,0,0,0.25),
                  0 2px 4px rgba(0,0,0,0.15),
                  inset 0 1px 2px rgba(255,255,255,0.3);
              "></div>
              <!-- Pin highlight -->
              <div style="
                background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%);
                width: 20px;
                height: 20px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                position: absolute;
                top: 14px;
                left: 10px;
                pointer-events: none;
              "></div>
              <!-- Pin icon -->
              <div style="
                position: absolute;
                top: 14px;
                left: 10px;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 11px;
                font-weight: bold;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                z-index: 1000;
                transform: rotate(45deg);
              ">${icon}</div>
            </div>
          `,
          className: 'google-maps-pin',
          iconSize: [40, 48],
          iconAnchor: [20, 48]
        });

          const marker = L.marker([offsetLat, offsetLng], { 
            icon: individualMarker,
            zIndexOffset: 1000 
          });
          
          // Enhanced popup with better styling
          marker.bindPopup(`
            <div style="
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
              min-width: 300px; 
              max-width: 340px;
              padding: 4px;
            ">
              <div style="
                display: flex; 
                align-items: center; 
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 2px solid ${markerColor}20;
              ">
                <div style="
                  background: linear-gradient(135deg, ${markerColor} 0%, ${markerColor}dd 100%); 
                  color: white; 
                  border-radius: 50%; 
                  width: 28px; 
                  height: 28px; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  margin-right: 10px;
                  font-size: 14px;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                ">${icon}</div>
                <h3 style="
                  margin: 0; 
                  color: ${markerColor}; 
                  font-size: 18px; 
                  font-weight: 600;
                  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                ">
                  ${obs["SHB individual ID (e.g. SHB1)"] || 'Unknown ID'}
                </h3>
              </div>
              
              <div style="
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
                padding: 12px; 
                border-radius: 8px; 
                margin-bottom: 12px;
                border: 1px solid #dee2e6;
                box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
              ">
                <div style="
                  font-size: 11px; 
                  color: #6c757d; 
                  font-weight: 600; 
                  text-transform: uppercase; 
                  letter-spacing: 0.5px;
                  margin-bottom: 4px;
                ">📍 GPS COORDINATES</div>
                <div style="
                  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace; 
                  font-size: 15px; 
                  color: #212529; 
                  font-weight: 700;
                  background: white;
                  padding: 6px 8px;
                  border-radius: 4px;
                  border: 1px solid #ced4da;
                ">
                  ${lat.toFixed(6)}, ${lng.toFixed(6)}
                </div>
              </div>
              
              <div style="font-size: 13px; line-height: 1.4;">
                <p style="margin: 6px 0;"><strong>Status:</strong> 
                  <span style="color: ${markerColor}; font-weight: bold;">${seenHeard}</span>
                </p>
                <p style="margin: 6px 0;"><strong>Location:</strong> ${obs.Location || 'Unknown'}</p>
                <p style="margin: 6px 0;"><strong>Date:</strong> ${obs.Date || 'Unknown'}</p>
                <p style="margin: 6px 0;"><strong>Time:</strong> ${obs.Time || 'Unknown'}</p>
                ${obs['Tree species'] ? `<p style="margin: 6px 0;"><strong>Tree Species:</strong> ${obs['Tree species']}</p>` : ''}
                ${obs['Height of tree/m'] ? `<p style="margin: 6px 0;"><strong>Tree Height:</strong> ${obs['Height of tree/m']}m</p>` : ''}
              </div>
            </div>
          `);
          
          marker.addTo(map);
          
          if (!window.individualMarkers) window.individualMarkers = [];
          window.individualMarkers.push(marker);
          
          console.log(`Added marker ${index + 1} at ${offsetLat}, ${offsetLng}`);
        });

        // Show notification if no markers found
        if (nearbyObservations.length === 0) {
          L.popup()
            .setLatLng(clickedLatLng)
            .setContent(`
              <div style="text-align: center; padding: 10px;">
                <p style="margin: 0; color: #666;">No observations found at this location</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">Try clicking on a colored area</p>
              </div>
            `)
            .openOn(map);
            
          setTimeout(() => map.closePopup(), 2000);
        }
      });
    };

    // Add click handlers to all heatmap layers
    heatmapLayers.forEach(layer => addClickHandlerToLayer(layer));

    // Add enhanced number overlays using heatmap cluster configuration
    const numberMarkers = [];
    locationGroups.forEach((group, key) => {
      if (group.count > 1) {
        const intensity = group.count / maxCount;
        const iconConfig = createHeatmapClusterIcon(group.count, intensity);
        
        const numberIcon = L.divIcon({
          ...iconConfig,
          html: iconConfig.html.replace('border: 2px solid white;', '') // Remove border
        });
        
        const marker = L.marker([group.lat, group.lng], { 
          icon: numberIcon, 
          interactive: true // Make interactive so it can be clicked
        });

        // Add click handler to cluster markers
        marker.on('click', (e) => {
          console.log(`Cluster marker clicked for location group: ${key}`); // Debug log
          
          // Find all observations for this specific location group
          const groupObservations = data.filter(obs => {
            const lat = parseFloat(obs.Lat);
            const lng = parseFloat(obs.Long);
            return !isNaN(lat) && !isNaN(lng) && 
                   `${lat.toFixed(6)}_${lng.toFixed(6)}` === key;
          });

          console.log(`Found ${groupObservations.length} observations in this cluster`); // Debug log

          // Clear existing individual markers first
          if (window.individualMarkers) {
            window.individualMarkers.forEach(marker => {
              if (map.hasLayer(marker)) map.removeLayer(marker);
            });
            window.individualMarkers = [];
          }

          // Create individual markers for all observations in this group
          groupObservations.forEach((obs, index) => {
            const lat = parseFloat(obs.Lat);
            const lng = parseFloat(obs.Long);
            const seenHeard = obs["Seen/Heard"];
            
            let markerColor = '#6B7280'; // Default gray
            let icon = '📍';
            
            switch(seenHeard) {
              case 'Seen':
                markerColor = '#10B981'; // Green
                icon = '👁️';
                break;
              case 'Heard':
                markerColor = '#3B82F6'; // Blue  
                icon = '👂';
                break;
              case 'Not found':
                markerColor = '#EF4444'; // Red
                icon = '❌';
                break;
            }

            // Add circular offset for overlapping coordinates
            const angle = (index * 2 * Math.PI) / groupObservations.length;
            const offsetDistance = 0.0002; // Small offset distance
            const offsetLat = lat + (Math.cos(angle) * offsetDistance);
            const offsetLng = lng + (Math.sin(angle) * offsetDistance);

            const individualMarker = L.divIcon({
              html: `
                <div style="
                  position: relative;
                  width: 32px;
                  height: 40px;
                  cursor: pointer;
                ">
                  <!-- Pin body -->
                  <div style="
                    background: ${markerColor};
                    width: 32px;
                    height: 32px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    position: absolute;
                    top: 0;
                    left: 0;
                    border: 3px solid white;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.3);
                  "></div>
                  <!-- Pin icon -->
                  <div style="
                    position: absolute;
                    top: 6px;
                    left: 6px;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                    z-index: 1000;
                    transform: rotate(45deg);
                  ">${icon}</div>
                </div>
              `,
              className: 'google-maps-pin',
              iconSize: [32, 40],
              iconAnchor: [16, 40]
            });

            const individualMarkerInstance = L.marker([offsetLat, offsetLng], { 
              icon: individualMarker,
              zIndexOffset: 1000 
            });
            
            // Add popup with observation details
            individualMarkerInstance.bindPopup(`
              <div style="font-family: Arial, sans-serif; min-width: 250px; max-width: 300px;">
                <h3 style="margin: 0 0 10px 0; color: ${markerColor}; font-size: 16px; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                  ${obs["SHB individual ID (e.g. SHB1)"] || 'Unknown ID'}
                </h3>
                <div style="font-size: 13px; line-height: 1.4;">
                  <p style="margin: 6px 0;"><strong>Status:</strong> 
                    <span style="color: ${markerColor}; font-weight: bold;">${seenHeard}</span>
                  </p>
                  <p style="margin: 6px 0;"><strong>Location:</strong> ${obs.Location || 'Unknown'}</p>
                  <p style="margin: 6px 0;"><strong>Date:</strong> ${obs.Date || 'Unknown'}</p>
                  <p style="margin: 6px 0;"><strong>Time:</strong> ${obs.Time || 'Unknown'}</p>
                  <p style="margin: 6px 0;"><strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                  ${obs['Tree species'] ? `<p style="margin: 6px 0;"><strong>Tree Species:</strong> ${obs['Tree species']}</p>` : ''}
                  ${obs['Height of tree/m'] ? `<p style="margin: 6px 0;"><strong>Tree Height:</strong> ${obs['Height of tree/m']}m</p>` : ''}
                </div>
              </div>
            `);
            
            individualMarkerInstance.addTo(map);
            
            // Store marker reference for cleanup
            if (!window.individualMarkers) window.individualMarkers = [];
            window.individualMarkers.push(individualMarkerInstance);
            
            console.log(`Added individual marker ${index + 1} at ${offsetLat}, ${offsetLng}`); // Debug log
          });
        });
        
        marker.addTo(map);
        numberMarkers.push(marker);
      }
    });

    // Cleanup
    return () => {
      // Remove all heatmap layers
      heatmapLayers.forEach(layer => {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      });
      
      // Remove number markers
      numberMarkers.forEach(marker => {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      });
      
      // Clean up individual markers
      if (window.individualMarkers) {
        window.individualMarkers.forEach(marker => {
          if (map.hasLayer(marker)) map.removeLayer(marker);
        });
        window.individualMarkers = [];
      }
    };
  }, [data.length, maxZoom, map]);

  return null;
};

export default HeatmapLayer;
