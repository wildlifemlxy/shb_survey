// DetailedAnalysisPopup utility functions
export const calculateDetailedStatistics = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {};
  }

  // Basic counts
  const totalObservations = data.length;
  const uniqueLocations = new Set(data.map(obs => obs.Location)).size;
  const uniqueObservers = new Set(data.map(obs => obs["Observer name"])).size;
  const uniqueIndividuals = new Set(data.map(obs => obs["SHB individual ID (e.g. SHB1)"])).size;

  // Activity analysis
  const activities = {};
  data.forEach(obs => {
    const activity = obs["Activity (foraging, preening, calling, perching, others)"] || 'Unknown';
    activities[activity] = (activities[activity] || 0) + 1;
  });

  // Time analysis
  const timeDistribution = {};
  data.forEach(obs => {
    if (obs.Time) {
      const hour = Math.floor(obs.Time * 24);
      const timeSlot = hour < 6 ? 'Dawn (5-6 AM)' :
                     hour < 12 ? 'Morning (6 AM-12 PM)' :
                     hour < 18 ? 'Afternoon (12-6 PM)' :
                     'Evening (6 PM-8 PM)';
      timeDistribution[timeSlot] = (timeDistribution[timeSlot] || 0) + 1;
    }
  });

  // Detection analysis
  const detectionTypes = { 'Seen': 0, 'Heard': 0, 'Not found': 0 };
  data.forEach(obs => {
    const seenHeard = obs["Seen/Heard"] || 'Not found';
    detectionTypes[seenHeard] = (detectionTypes[seenHeard] || 0) + 1;
  });

  // Bird count analysis
  const birdCounts = data.map(obs => parseInt(obs["Number of Birds"]) || 0);
  const totalBirds = birdCounts.reduce((sum, count) => sum + count, 0);
  const avgBirdsPerObservation = totalBirds / totalObservations;

  // Location analysis
  const locationStats = {};
  data.forEach(obs => {
    const location = obs.Location || 'Unknown';
    if (!locationStats[location]) {
      locationStats[location] = { total: 0, seen: 0, heard: 0, notFound: 0 };
    }
    locationStats[location].total++;
    const detectionType = obs["Seen/Heard"] || 'Not found';
    if (detectionType === 'Seen') locationStats[location].seen++;
    else if (detectionType === 'Heard') locationStats[location].heard++;
    else locationStats[location].notFound++;
  });

  // Date analysis
  const dateStats = {};
  data.forEach(obs => {
    if (obs.Date) {
      const date = new Date(obs.Date);
      if (!isNaN(date.getTime())) {
        const month = date.getMonth();
        const season = month < 3 ? 'Winter' :
                      month < 6 ? 'Spring' :
                      month < 9 ? 'Summer' : 'Autumn';
        dateStats[season] = (dateStats[season] || 0) + 1;
      }
    }
  });

  return {
    overview: {
      totalObservations,
      uniqueLocations,
      uniqueObservers,
      uniqueIndividuals,
      totalBirds,
      avgBirdsPerObservation: parseFloat(avgBirdsPerObservation.toFixed(2)),
      successRate: parseFloat(((detectionTypes['Seen'] + detectionTypes['Heard']) / totalObservations * 100).toFixed(1))
    },
    activities,
    timeDistribution,
    detectionTypes,
    locationStats,
    dateStats
  };
};

export const exportToCSV = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shb_observation_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportToJSON = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error('No data to export');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shb_observation_data_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const formatPercentage = (value, total) => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

export const formatDate = (date) => {
  if (!date) return 'Unknown';
  const d = new Date(date);
  return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString();
};

export const getTopActivities = (activities, limit = 5) => {
  return Object.entries(activities)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit);
};

export const getTopLocations = (locationStats, limit = 5) => {
  return Object.entries(locationStats)
    .sort(([,a], [,b]) => b.total - a.total)
    .slice(0, limit);
};
