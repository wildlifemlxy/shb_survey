// Custom Heatmap Component for Singapore Observations
import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const HeatmapLayer = ({ data, maxZoom = 16, onHeatmapClick }) => {
  const map = useMap();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Create heatmap points from observation data with exact coordinate precision
    const coordinateGroups = new Map(); // Group observations by exact coordinates
    
    data.forEach(observation => {
      // Parse coordinates with maximum precision (no rounding)
      const lat = parseFloat(observation.Lat);
      const lng = parseFloat(observation.Long);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        // Use exact coordinates as key (no rounding) - preserve full precision
        const exactCoordKey = `${lat.toFixed(10)}_${lng.toFixed(10)}`;
        
        // Weight based on observation type
        let weight = 0.5; // default
        if (observation["Seen/Heard"]) {
          const type = observation["Seen/Heard"].toLowerCase();
          if (type.includes("seen")) weight = 1.0;
          else if (type.includes("heard")) weight = 0.7;
          else if (type.includes("not found")) weight = 0.2;
        }
        
        if (!coordinateGroups.has(exactCoordKey)) {
          coordinateGroups.set(exactCoordKey, {
            lat: lat,
            lng: lng,
            observations: [],
            totalWeight: 0,
            count: 0
          });
        }
        
        const group = coordinateGroups.get(exactCoordKey);
        group.observations.push(observation);
        group.totalWeight += weight;
        group.count += 1;
      }
    });

    // Simple density visualization using circle markers when zoomed in
    const currentZoom = map.getZoom();
    
    if (currentZoom >= maxZoom && coordinateGroups.size > 0) {
      // Create density circles for heatmap effect
      const densityCircles = [];
      
      coordinateGroups.forEach((group, coordKey) => {
        const { lat, lng, observations, totalWeight, count } = group;
        
        // Calculate average weight but ensure minimum visibility
        const avgWeight = Math.max(0.3, totalWeight / count);
        
        // Create a circle for each coordinate group
        const circle = L.circle([lat, lng], {
          color: avgWeight > 0.8 ? '#FF4444' : avgWeight > 0.5 ? '#FF8844' : '#FFAA44',
          fillColor: avgWeight > 0.8 ? '#FF4444' : avgWeight > 0.5 ? '#FF8844' : '#FFAA44',
          fillOpacity: Math.min(0.7, 0.4 + (count * 0.1)), // More opacity for multiple observations
          radius: Math.max(30, 40 * avgWeight + (count * 5)), // Larger radius for multiple observations
          stroke: true,
          strokeColor: '#FFFFFF',
          strokeWidth: 2,
          className: 'heatmap-circle'
        });
        
        // Add tooltip showing observation count at this exact location
        const tooltipContent = count > 1 
          ? `${count} observations at this exact location`
          : `1 observation at this location`;
        
        circle.bindTooltip(tooltipContent, {
          permanent: false,
          direction: 'top',
          offset: [0, -10]
        });
        
        // Add click handler to enable hybrid/street map modes and auto-zoom
        circle.on('click', (e) => {
          if (onHeatmapClick) {
            onHeatmapClick({
              latlng: e.latlng,
              observation: observations[0], // Use first observation as representative
              observations: observations, // Pass all observations at this location
              weight: avgWeight,
              zoom: currentZoom,
              autoZoom: true, // Flag to trigger auto-zoom
              count: count, // Number of observations at this exact coordinate
              exactCoordinates: { lat, lng } // Exact coordinates with full precision
            });
          }
        });
        
        densityCircles.push(circle);
        circle.addTo(map);
      });

      // Cleanup function
      return () => {
        densityCircles.forEach(circle => {
          if (map.hasLayer(circle)) {
            map.removeLayer(circle);
          }
        });
      };
    }
  }, [data, map, maxZoom]);

  return null;
};

export default HeatmapLayer;
