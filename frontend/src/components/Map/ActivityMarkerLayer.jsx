// ActivityMarkerLayer.jsx - Activity-based marker layer with all activities shown
import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  parseActivityFromObservation, 
  getPrimaryActivity,
  createActivityMarkerIcon,
  generateActivityLegend,
  countObservationsByActivity,
  ACTIVITY_MARKER_CONFIG 
} from './ActivityMarkerConfig';

const ActivityMarkerLayer = ({ 
  data = [], 
  zoom = 13,
  isVisible = true,
  onLayersReady,
  showAllActivities = true
}) => {
  const map = useMap();
  const markersRef = useRef([]);
  const [activityStats, setActivityStats] = useState({});

  // Group observations by location and activity
  const groupObservationsByLocation = (data) => {
    const locationGroups = new Map();
    
    data.forEach(observation => {
      const lat = parseFloat(observation.Lat);
      const lng = parseFloat(observation.Long);
      
      if (isNaN(lat) || isNaN(lng)) return;
      
      const locationKey = `${lat.toFixed(6)}_${lng.toFixed(6)}`;
      const activities = parseActivityFromObservation(observation);
      
      if (!locationGroups.has(locationKey)) {
        locationGroups.set(locationKey, {
          lat,
          lng,
          observations: [],
          activities: new Set(),
          primaryActivity: null,
          count: 0
        });
      }
      
      const group = locationGroups.get(locationKey);
      group.observations.push(observation);
      group.count++;
      
      // Add all activities to the set
      activities.forEach(activity => {
        group.activities.add(activity);
      });
      
      // Update primary activity (highest priority)
      const allActivities = Array.from(group.activities);
      group.primaryActivity = getPrimaryActivity(allActivities);
    });
    
    return locationGroups;
  };

  // Create activity markers
  const createActivityMarkers = (locationGroups) => {
    const markers = [];
    
    locationGroups.forEach((group, locationKey) => {
      const { lat, lng, observations, activities, primaryActivity, count } = group;
      const activitiesArray = Array.from(activities);
      
      // Get seen/heard status (use primary observation's status)
      const primaryObs = observations[0];
      const seenHeard = primaryObs["Seen/Heard"] || 'Seen';
      
      // Create marker icon based on activities
      const iconConfig = createActivityMarkerIcon(activitiesArray, seenHeard);
      const markerIcon = L.divIcon(iconConfig);
      
      // Create marker
      const marker = L.marker([lat, lng], {
        icon: markerIcon,
        zIndexOffset: count > 1 ? 600 : 500
      });
      
      // Create detailed popup
      const popupContent = createActivityPopupContent(group);
      marker.bindPopup(popupContent);
      
      // Add hover tooltip
      const tooltipContent = `
        <div style="text-align: center; font-weight: 600;">
          <div style="color: ${ACTIVITY_MARKER_CONFIG.ACTIVITY_TYPES[primaryActivity]?.color || '#6B7280'};">
            ${ACTIVITY_MARKER_CONFIG.ACTIVITY_TYPES[primaryActivity]?.name || 'Unknown'}
          </div>
          <div style="font-size: 12px; color: #666; margin-top: 2px;">
            ${count} observation${count > 1 ? 's' : ''}
          </div>
        </div>
      `;
      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -35],
        className: 'activity-tooltip'
      });
      
      markers.push(marker);
    });
    
    return markers;
  };

  // Create popup content for activity markers
  const createActivityPopupContent = (group) => {
    const { observations, activities, primaryActivity, count, lat, lng } = group;
    const primaryConfig = ACTIVITY_MARKER_CONFIG.ACTIVITY_TYPES[primaryActivity] || {};
    
    // Get unique seen/heard statuses
    const seenHeardCounts = {};
    observations.forEach(obs => {
      const status = obs["Seen/Heard"] || 'Unknown';
      seenHeardCounts[status] = (seenHeardCounts[status] || 0) + 1;
    });
    
    // Format activities list
    const activitiesHtml = Array.from(activities).map(activity => {
      const config = ACTIVITY_MARKER_CONFIG.ACTIVITY_TYPES[activity] || {};
      return `
        <span style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: ${config.color}20;
          color: ${config.color};
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          margin: 2px;
          border: 1px solid ${config.color}40;
        ">
          ${config.emoji} ${config.name}
        </span>
      `;
    }).join('');

    // Format seen/heard status
    const statusHtml = Object.entries(seenHeardCounts).map(([status, count]) => {
      const statusColors = {
        'Seen': '#10B981',
        'Heard': '#3B82F6', 
        'Not found': '#EF4444'
      };
      const color = statusColors[status] || '#6B7280';
      
      return `
        <span style="
          color: ${color};
          font-weight: 600;
          margin-right: 8px;
        ">
          ${status}: ${count}
        </span>
      `;
    }).join('');

    return `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        min-width: 300px;
        max-width: 400px;
        padding: 4px;
      ">
        <!-- Header -->
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid ${primaryConfig.color}20;
        ">
          <div style="
            background: linear-gradient(135deg, ${primaryConfig.color} 0%, ${primaryConfig.color}dd 100%);
            color: white;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            font-size: 16px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          ">${primaryConfig.emoji || '📍'}</div>
          <div>
            <h3 style="margin: 0; color: ${primaryConfig.color}; font-size: 16px; font-weight: 600;">
              ${count} Observation${count > 1 ? 's' : ''}
            </h3>
            <div style="font-size: 12px; color: #666; margin-top: 2px;">
              Primary Activity: ${primaryConfig.name || 'Unknown'}
            </div>
          </div>
        </div>

        <!-- Activities -->
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px;">
            🎯 ACTIVITIES OBSERVED
          </div>
          <div style="line-height: 1.4;">
            ${activitiesHtml}
          </div>
        </div>

        <!-- Status Summary -->
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px;">
            👁️ DETECTION STATUS
          </div>
          <div style="font-size: 13px;">
            ${statusHtml}
          </div>
        </div>

        <!-- Location Info -->
        <div style="
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 12px;
          border: 1px solid #dee2e6;
        ">
          <div style="font-size: 11px; color: #6c757d; font-weight: 600; margin-bottom: 4px;">
            📍 GPS COORDINATES
          </div>
          <div style="
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 13px;
            color: #212529;
            font-weight: 600;
            background: white;
            padding: 6px 8px;
            border-radius: 4px;
            border: 1px solid #ced4da;
          ">
            ${lat.toFixed(6)}, ${lng.toFixed(6)}
          </div>
        </div>

        <!-- Sample Observation Details -->
        ${observations.length > 0 ? `
          <div style="margin-bottom: 8px;">
            <div style="font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px;">
              📋 SAMPLE OBSERVATION
            </div>
            <div style="font-size: 12px; line-height: 1.4; color: #555;">
              <p style="margin: 4px 0;">
                <strong>ID:</strong> ${observations[0]["SHB individual ID (e.g. SHB1)"] || 'Unknown'}
              </p>
              <p style="margin: 4px 0;">
                <strong>Location:</strong> ${observations[0].Location || 'Unknown'}
              </p>
              <p style="margin: 4px 0;">
                <strong>Observer:</strong> ${observations[0]["Observer name"] || 'Unknown'}
              </p>
              ${observations[0]["Height of tree/m"] ? `
                <p style="margin: 4px 0;">
                  <strong>Tree Height:</strong> ${observations[0]["Height of tree/m"]}m
                </p>
              ` : ''}
              ${observations[0]["Height of bird/m"] ? `
                <p style="margin: 4px 0;">
                  <strong>Bird Height:</strong> ${observations[0]["Height of bird/m"]}m
                </p>
              ` : ''}
            </div>
          </div>
        ` : ''}

        ${count > 1 ? `
          <div style="
            text-align: center;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 6px;
            font-size: 11px;
            color: #666;
            border: 1px solid #e9ecef;
          ">
            Click marker for ${count} total observations at this location
          </div>
        ` : ''}
      </div>
    `;
  };

  // Update markers when data or visibility changes
  useEffect(() => {
    if (!map || !data || data.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    markersRef.current = [];

    if (!isVisible) return;

    // Group observations and create markers
    const locationGroups = groupObservationsByLocation(data);
    const newMarkers = createActivityMarkers(locationGroups);
    
    // Add markers to map
    newMarkers.forEach(marker => {
      marker.addTo(map);
    });
    
    markersRef.current = newMarkers;
    
    // Calculate activity statistics
    const stats = countObservationsByActivity(data);
    setActivityStats(stats);
    
    // Notify parent component
    if (onLayersReady) {
      onLayersReady({
        markerLayers: newMarkers,
        locationGroups: locationGroups,
        activityStats: stats,
        activityLegend: generateActivityLegend(Object.keys(stats))
      });
    }

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      });
      markersRef.current = [];
    };
  }, [map, data, isVisible, showAllActivities]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      });
    };
  }, [map]);

  return null; // This is a data layer, no visual component
};

export default ActivityMarkerLayer;
