// DateLineChart utility functions

export const processTimeSeriesData = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  const groupedData = {};
  
  data.forEach(obs => {
    if (!obs.Date) return;
    
    // Handle Excel date serial numbers
    let dateObj;
    if (typeof obs.Date === 'number') {
      // Excel date serial number (days since Jan 1, 1900)
      dateObj = new Date((obs.Date - 25569) * 86400 * 1000);
    } else {
      dateObj = new Date(obs.Date);
    }
    
    if (isNaN(dateObj.getTime())) return;
    
    const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!groupedData[dateKey]) {
      groupedData[dateKey] = {
        Date: dateKey,
        Total: 0,
        Seen: 0,
        Heard: 0,
        NotFound: 0
      };
    }
    
    groupedData[dateKey].Total++;
    
    const status = obs["Seen/Heard"] || 'Not found';
    if (status === 'Seen') {
      groupedData[dateKey].Seen++;
    } else if (status === 'Heard') {
      groupedData[dateKey].Heard++;
    } else {
      groupedData[dateKey].NotFound++;
    }
  });
  
  return Object.values(groupedData).sort((a, b) => new Date(a.Date) - new Date(b.Date));
};

export const generateMLInsights = (timeSeriesData) => {
  if (!timeSeriesData || timeSeriesData.length === 0) {
    return [];
  }
  
  const insights = [];
  const totalObservations = timeSeriesData.reduce((sum, d) => sum + d.Total, 0);
  const avgObservationsPerDay = totalObservations / timeSeriesData.length;
  
  // Trend analysis
  const firstHalf = timeSeriesData.slice(0, Math.floor(timeSeriesData.length / 2));
  const secondHalf = timeSeriesData.slice(Math.floor(timeSeriesData.length / 2));
  
  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.Total, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.Total, 0) / secondHalf.length;
  
  const trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100).toFixed(1);
  
  if (Math.abs(trendPercentage) > 10) {
    const trendDirection = trendPercentage > 0 ? 'increasing' : 'decreasing';
    insights.push(`ML Analysis: Observation frequency is ${trendDirection} by ${Math.abs(trendPercentage)}% over time`);
  }
  
  // Peak detection
  const maxObservations = Math.max(...timeSeriesData.map(d => d.Total));
  const peakDays = timeSeriesData.filter(d => d.Total === maxObservations);
  
  if (peakDays.length > 0 && maxObservations > avgObservationsPerDay * 1.5) {
    insights.push(`Peak activity detected on ${peakDays[0].Date} with ${maxObservations} observations`);
  }
  
  // Detection rate analysis
  const totalSeen = timeSeriesData.reduce((sum, d) => sum + d.Seen, 0);
  const totalHeard = timeSeriesData.reduce((sum, d) => sum + d.Heard, 0);
  const detectionRate = ((totalSeen + totalHeard) / totalObservations * 100).toFixed(1);
  
  insights.push(`Overall detection rate: ${detectionRate}% (${totalSeen} seen, ${totalHeard} heard)`);
  
  // Forecast next 3 months
  if (timeSeriesData.length >= 30) {
    const forecast = generateSimpleForecast(timeSeriesData, 3);
    insights.push(`Forecast: Expected ${forecast.toFixed(0)} observations in next 3 months based on current trends`);
  }
  
  return insights;
};

export const generateSimpleForecast = (timeSeriesData, monthsAhead = 3) => {
  if (!timeSeriesData || timeSeriesData.length < 7) {
    return 0;
  }
  
  // Simple moving average forecast
  const recentData = timeSeriesData.slice(-30); // Last 30 days
  const avgDaily = recentData.reduce((sum, d) => sum + d.Total, 0) / recentData.length;
  
  // Assume 30 days per month for simplicity
  return avgDaily * 30 * monthsAhead;
};

export const generatePredictions = (timeSeriesData, numberOfPredictions = 6) => {
  if (!timeSeriesData || timeSeriesData.length === 0) {
    return [];
  }
  
  const predictions = [];
  const lastDate = new Date(timeSeriesData[timeSeriesData.length - 1].Date);
  
  // Calculate trend
  const recentPeriod = Math.min(30, timeSeriesData.length);
  const recentData = timeSeriesData.slice(-recentPeriod);
  const avgRecent = recentData.reduce((sum, d) => sum + d.Total, 0) / recentData.length;
  
  // Add some seasonal variation and noise
  for (let i = 1; i <= numberOfPredictions; i++) {
    const predictDate = new Date(lastDate);
    predictDate.setMonth(predictDate.getMonth() + i);
    
    // Simple forecast with seasonal adjustment
    const seasonalFactor = 1 + 0.1 * Math.sin((predictDate.getMonth() / 12) * 2 * Math.PI);
    const predicted = Math.max(0, Math.round(avgRecent * seasonalFactor));
    
    predictions.push({
      Date: predictDate.toISOString().split('T')[0],
      Total: predicted,
      month: predictDate.getMonth() + 1,
      year: predictDate.getFullYear()
    });
  }
  
  return predictions;
};

export const detectAnomalies = (timeSeriesData) => {
  if (!timeSeriesData || timeSeriesData.length < 7) {
    return [];
  }
  
  const anomalies = [];
  const values = timeSeriesData.map(d => d.Total);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const threshold = 2; // 2 standard deviations
  
  timeSeriesData.forEach((d, index) => {
    const zScore = Math.abs((d.Total - mean) / stdDev);
    if (zScore > threshold) {
      anomalies.push({
        date: d.Date,
        value: d.Total,
        zScore: zScore.toFixed(2),
        type: d.Total > mean ? 'spike' : 'drop'
      });
    }
  });
  
  return anomalies;
};

export const calculateMovingAverage = (data, windowSize = 7) => {
  if (!data || data.length < windowSize) {
    return data;
  }
  
  return data.map((item, index) => {
    if (index < windowSize - 1) {
      return { ...item, movingAverage: null };
    }
    
    const window = data.slice(index - windowSize + 1, index + 1);
    const average = window.reduce((sum, d) => sum + d.Total, 0) / windowSize;
    
    return { ...item, movingAverage: average };
  });
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

export const formatDateFull = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
};

export const getDateRange = (timeSeriesData) => {
  if (!timeSeriesData || timeSeriesData.length === 0) {
    return { start: null, end: null };
  }
  
  const dates = timeSeriesData.map(d => new Date(d.Date));
  return {
    start: new Date(Math.min(...dates)),
    end: new Date(Math.max(...dates))
  };
};

export const calculateStatistics = (timeSeriesData) => {
  if (!timeSeriesData || timeSeriesData.length === 0) {
    return {
      totalObservations: 0,
      totalSeen: 0,
      totalHeard: 0,
      totalNotFound: 0,
      averagePerDay: 0,
      successRate: 0
    };
  }
  
  const stats = timeSeriesData.reduce((acc, d) => ({
    totalObservations: acc.totalObservations + d.Total,
    totalSeen: acc.totalSeen + d.Seen,
    totalHeard: acc.totalHeard + d.Heard,
    totalNotFound: acc.totalNotFound + d.NotFound
  }), { totalObservations: 0, totalSeen: 0, totalHeard: 0, totalNotFound: 0 });
  
  const averagePerDay = stats.totalObservations / timeSeriesData.length;
  const successRate = ((stats.totalSeen + stats.totalHeard) / stats.totalObservations) * 100;
  
  return {
    ...stats,
    averagePerDay: parseFloat(averagePerDay.toFixed(2)),
    successRate: parseFloat(successRate.toFixed(1))
  };
};

export const generateRecommendations = (timeSeriesData, insights) => {
  const recommendations = [];
  
  if (!timeSeriesData || timeSeriesData.length === 0) {
    return recommendations;
  }
  
  const stats = calculateStatistics(timeSeriesData);
  
  // Success rate recommendations
  if (stats.successRate < 70) {
    recommendations.push('Consider increasing survey duration or using acoustic equipment to improve detection rates');
  }
  
  // Frequency recommendations
  if (stats.averagePerDay < 2) {
    recommendations.push('Survey frequency could be increased to gather more comprehensive data');
  }
  
  // Seasonal recommendations
  const monthlyData = groupByMonth(timeSeriesData);
  const bestMonth = Object.entries(monthlyData).reduce((best, [month, data]) => 
    data.total > best.total ? { month, total: data.total } : best
  , { month: null, total: 0 });
  
  if (bestMonth.month) {
    recommendations.push(`Peak activity observed in ${getMonthName(bestMonth.month)} - consider intensifying surveys during this period`);
  }
  
  return recommendations;
};

export const groupByMonth = (timeSeriesData) => {
  const grouped = {};
  
  timeSeriesData.forEach(d => {
    const date = new Date(d.Date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = { total: 0, seen: 0, heard: 0 };
    }
    
    grouped[monthKey].total += d.Total;
    grouped[monthKey].seen += d.Seen;
    grouped[monthKey].heard += d.Heard;
  });
  
  return grouped;
};

export const getMonthName = (monthString) => {
  const [year, month] = monthString.split('-');
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
