import React, { Component } from 'react';
import chroma from 'chroma-js';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from 'recharts';
import { countByLocation } from '../utils/dataProcessing';
import * as tf from '@tensorflow/tfjs';

class LocationStats extends Component {
  state = {
    showLegend: false,
    activeIndex: null,
    tooltipVisible: false,
    expandedIndex: null,
    showReportPanel: false,
    showInsightsPanel: false,
    insightsLoading: false,
    insights: null,
  };

  toggleLegend = () => {
    this.setState((prevState) => ({ showLegend: !prevState.showLegend }));
  };

  handleLegendClick = (index) => {
    this.setState({
      showLegend: false,
    });
  };

  renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const {
      cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload,
    } = props;

    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + (this.state.activeIndex !== null ? 15 : 0)}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}`} stroke={fill} fill="none" />
      </g>
    );
  };

  renderCustomTooltip = ({ active, payload }) => {
    const { tooltipVisible } = this.state;
    if ((active || tooltipVisible) && payload && payload.length) {
      const { location, Seen, Heard, NotFound, Total } = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: '#fff',
            padding: '10px',
            borderRadius: '8px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}
        >
          <div><strong>{location}</strong></div>
          <div style={{ color: '#A8E6CF' }}><strong>Seen:</strong> {Seen}</div>
          <div style={{ color: '#D1C4E9' }}><strong>Heard:</strong> {Heard}</div>
          <div style={{ color: '#FFCDD2' }}><strong>Not Found:</strong> {NotFound}</div>
          <div style={{ color: '#8884d8' }}><strong>Total:</strong> {Total}</div>
        </div>
      );
    }
    return null;
  };

  renderStatistics = (locationData) => {
    const { expandedIndex } = this.state;

    const totalEntry = locationData.reduce(
      (acc, curr) => ({
        Total: acc.Total + curr.Total,
        Seen: acc.Seen + curr.Seen,
        Heard: acc.Heard + curr.Heard,
        NotFound: acc.NotFound + curr.NotFound,
      }),
      { Total: 0, Seen: 0, Heard: 0, NotFound: 0 }
    );

    const totalExpanded = expandedIndex === 'total';
    const totalPercentage = totalEntry.Total
      ? ((totalEntry.Total / totalEntry.Total) * 100).toFixed(2)
      : '0.00';

    // Generate a color palette using Chroma.js
    const colorPalette = chroma.scale('Set1')
      .mode('hsl')
      .colors(locationData.length);

    return (
      <div className="statistics-container" style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '1rem' }}>
        {/* Sticky Total Row */}
        <div
          onClick={() => this.setState({ expandedIndex: totalExpanded ? null : 'total' })}
          style={{
            position: 'sticky',
            top: 0,
            backgroundColor: totalExpanded ? '#f9f9f9' : '#fff',
            zIndex: 1,
            padding: '0.5rem',
            borderBottom: '2px solid #000',
            fontWeight: 'bold',
            display: 'flex',
            flexDirection: 'column',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total</span>
            <span>{totalEntry.Total} ({totalPercentage}%)</span>
          </div>
          {totalExpanded && (
            <div style={{ marginTop: '0.5rem', fontWeight: 'normal' }}>
              <div style={{ color: '#A8E6CF' }}><strong>Seen:</strong> {totalEntry.Seen}</div>
              <div style={{ color: '#D1C4E9' }}><strong>Heard:</strong> {totalEntry.Heard}</div>
              <div style={{ color: '#FFCDD2' }}><strong>Not Found:</strong> {totalEntry.NotFound}</div>
            </div>
          )}
        </div>

        {/* Render for each locationData */}
        {locationData.map((entry, index) => {
          const percentage = ((entry.Total / totalEntry.Total) * 100).toFixed(2);
          const isExpanded = expandedIndex === index;
          const labelColor = colorPalette[index % colorPalette.length];

          return (
            <div
              key={index}
              onClick={() => this.setState({ expandedIndex: isExpanded ? null : index })}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '0.5rem',
                borderBottom: '1px solid #ccc',
                cursor: 'pointer',
                backgroundColor: isExpanded ? '#f9f9f9' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: labelColor }}>
                  <strong>{entry.location}</strong>
                </span>
                <span><strong style={{ color: labelColor }}>{entry.Total} ({percentage}%)</strong></span>
              </div>
              {isExpanded && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ color: labelColor }}><strong>Seen:</strong> {entry.Seen}</div>
                  <div style={{ color: labelColor }}><strong>Heard:</strong> {entry.Heard}</div>
                  <div style={{ color: labelColor }}><strong>Not Found:</strong> {entry.NotFound}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  getColorForIndex = (index) => {
    // Generate a scale of distinct colors using HSL (Hue, Saturation, Lightness)
    // The hue will be spaced out by a fixed interval to ensure distinctiveness
    const hue = (index * 137.5) % 360; // 137.5 is a golden angle, ensuring a good spread of colors
    const color = chroma.hsl(hue, 0.75, 0.5).hex(); // Saturation = 0.75, Lightness = 0.5, adjust as needed
  
    return color;
  };
  
  // Generate report similar to DateLineChart
  renderReport = () => {
    const { data } = this.props;
    const locationData = countByLocation(data);
    
    // Summary statistics
    const totalEntry = locationData.reduce(
      (acc, curr) => ({
        Total: acc.Total + curr.Total,
        Seen: acc.Seen + curr.Seen,
        Heard: acc.Heard + curr.Heard,
        NotFound: acc.NotFound + curr.NotFound,
      }),
      { Total: 0, Seen: 0, Heard: 0, NotFound: 0 }
    );
    
    return (
      <div className="report-container" style={{ 
        padding: '1rem',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        <h4 style={{ marginTop: 0, color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          Location Observations Report
        </h4>
        
        {/* Summary Statistics */}
        <h5 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>Summary Statistics</h5>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '1rem', 
          marginBottom: '1.5rem',
          padding: '0.5rem',
          backgroundColor: '#f7fafc',
          borderRadius: '4px'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#6366F1' }}>{totalEntry.Total}</div>
            <div style={{ color: '#718096' }}>Total Observations</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#A8E6CF' }}>{totalEntry.Seen}</div>
            <div style={{ color: '#718096' }}>Seen ({Math.round(totalEntry.Seen / totalEntry.Total * 100)}%)</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#D1C4E9' }}>{totalEntry.Heard}</div>
            <div style={{ color: '#718096' }}>Heard ({Math.round(totalEntry.Heard / totalEntry.Total * 100)}%)</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#FFCDD2' }}>{totalEntry.NotFound}</div>
            <div style={{ color: '#718096' }}>Not Found ({Math.round(totalEntry.NotFound / totalEntry.Total * 100)}%)</div>
          </div>
        </div>
        
        {/* Location Breakdown */}
        <h5 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>Location Breakdown</h5>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Location</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Seen</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Heard</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Not Found</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {locationData.map((entry, idx) => {
                const percentage = ((entry.Total / totalEntry.Total) * 100).toFixed(1);
                return (
                  <tr key={idx} style={{ 
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: idx % 2 === 0 ? 'white' : '#f7fafc'
                  }}>
                    <td style={{ padding: '0.75rem' }}>{entry.location}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>{entry.Total}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{entry.Seen}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{entry.Heard}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{entry.NotFound}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{percentage}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // New methods for TensorFlow insights
  generateInsights = async () => {
    const { data } = this.props;
    const locationData = countByLocation(data);
    
    this.setState({ insightsLoading: true });
    
    try {
      // Simulate a delay for processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Process data for insights
      const insights = {
        populationAnalysis: this.performPopulationAnalysis(locationData),
        anomalyDetection: this.performAnomalyDetection(locationData),
        trendPredictions: this.performTrendPredictions(locationData)
      };
      
      this.setState({ insights, insightsLoading: false });
    } catch (error) {
      console.error("Error generating insights:", error);
      this.setState({ 
        insightsLoading: false,
        insights: {
          error: "Failed to generate insights. Please try again later."
        }
      });
    }
  };
  
  performPopulationAnalysis = (locationData) => {
    // Use TensorFlow for population statistics and analysis
    try {
      // Create tensors from location data
      const seenValues = tf.tensor1d(locationData.map(entry => entry.Seen));
      const heardValues = tf.tensor1d(locationData.map(entry => entry.Heard));
      const notFoundValues = tf.tensor1d(locationData.map(entry => entry.NotFound));
      
      // Calculate statistics
      const seenMean = seenValues.mean().dataSync()[0].toFixed(2);
      const seenStd = tf.moments(seenValues).variance.sqrt().dataSync()[0].toFixed(2);
      const heardMean = heardValues.mean().dataSync()[0].toFixed(2);
      const heardStd = tf.moments(heardValues).variance.sqrt().dataSync()[0].toFixed(2);
      const notFoundMean = notFoundValues.mean().dataSync()[0].toFixed(2);
      const notFoundStd = tf.moments(notFoundValues).variance.sqrt().dataSync()[0].toFixed(2);
      
      // Generate insights based on calculations
      const mostActiveLocation = [...locationData].sort((a, b) => b.Total - a.Total)[0];
      const leastActiveLocation = [...locationData].sort((a, b) => a.Total - b.Total)[0];
      
      // Clean up tensors
      seenValues.dispose();
      heardValues.dispose();
      notFoundValues.dispose();
      
      return {
        statistics: {
          seen: { mean: seenMean, std: seenStd },
          heard: { mean: heardMean, std: heardStd },
          notFound: { mean: notFoundMean, std: notFoundStd }
        },
        insights: {
          mostActive: mostActiveLocation,
          leastActive: leastActiveLocation,
          distributionType: Number(seenStd) > Number(seenMean) ? "Highly Varied" : "Evenly Distributed"
        }
      };
    } catch (error) {
      console.error("Error in population analysis:", error);
      return { error: "Failed to analyze population data" };
    }
  };
  
  performAnomalyDetection = (locationData) => {
    try {
      // Prepare data for anomaly detection
      const totalValues = locationData.map(entry => entry.Total);
      const seenValues = locationData.map(entry => entry.Seen);
      const heardValues = locationData.map(entry => entry.Heard);
      const notFoundValues = locationData.map(entry => entry.NotFound);
      
      // Create tensors
      const totalTensor = tf.tensor1d(totalValues);
      
      // Calculate mean and standard deviation
      const mean = totalTensor.mean().dataSync()[0];
      const std = tf.moments(totalTensor).variance.sqrt().dataSync()[0];
      
      // Set threshold for anomaly detection (e.g., 2 standard deviations)
      const threshold = 2;
      
      // Detect anomalies
      const anomalies = locationData.filter((entry, index) => {
        const zScore = Math.abs((entry.Total - mean) / std);
        return zScore > threshold;
      });
      
      // Detection of unusual ratios (e.g., very high "Heard" but low "Seen")
      const ratioAnomalies = locationData.filter(entry => {
        if (entry.Total < 5) return false; // Ignore locations with very few data points
        
        const seenRatio = entry.Seen / entry.Total;
        const heardRatio = entry.Heard / entry.Total;
        const notFoundRatio = entry.NotFound / entry.Total;
        
        // Check for unusual distribution compared to overall average
        return (seenRatio > 0.8 && heardRatio < 0.1) || 
               (heardRatio > 0.8 && seenRatio < 0.1) || 
               (notFoundRatio > 0.7);
      });
      
      // Clean up tensor
      totalTensor.dispose();
      
      return {
        volumeAnomalies: anomalies,
        ratioAnomalies: ratioAnomalies,
        anomalyThreshold: threshold,
        summary: {
          totalAnomalies: anomalies.length + ratioAnomalies.length,
          significance: anomalies.length > 0 ? "High" : "Low"
        }
      };
    } catch (error) {
      console.error("Error in anomaly detection:", error);
      return { error: "Failed to detect anomalies" };
    }
  };
  
  performTrendPredictions = (locationData) => {
    try {
      // For demonstration purposes, we'll create simple trend predictions
      // In a real implementation, you would use historical data and proper TensorFlow models
      
      // Sort locations by total observations
      const sortedLocations = [...locationData].sort((a, b) => b.Total - a.Total);
      
      // Generate simple trend predictions
      const predictions = sortedLocations.slice(0, 3).map(location => {
        // Calculate ratios
        const seenRatio = location.Seen / location.Total;
        const heardRatio = location.Heard / location.Total;
        const notFoundRatio = location.NotFound / location.Total;
        
        // Make simple predictions based on current ratios
        // In a real app, this would use proper TensorFlow models
        const predictedGrowth = 
          seenRatio > 0.6 ? "High" : 
          seenRatio > 0.4 ? "Moderate" : "Low";
        
        const predictedTrend = 
          seenRatio > heardRatio && seenRatio > notFoundRatio ? "Increasing visibility" :
          heardRatio > seenRatio && heardRatio > notFoundRatio ? "Increasing awareness" :
          "Decreasing presence";
        
        return {
          location: location.location,
          current: {
            total: location.Total,
            seen: location.Seen,
            heard: location.Heard,
            notFound: location.NotFound
          },
          prediction: {
            growth: predictedGrowth,
            trend: predictedTrend,
            confidence: (seenRatio * 100).toFixed(1) + "%"
          }
        };
      });
      
      return {
        topLocations: predictions,
        overallTrend: predictions.length > 0 && 
                     predictions[0].prediction.growth === "High" ? 
                     "Positive" : "Stable"
      };
    } catch (error) {
      console.error("Error in trend predictions:", error);
      return { error: "Failed to generate trend predictions" };
    }
  };
  renderInsightsPanel = () => {
    const { insights, insightsLoading, activeTab } = this.state;
    
    if (insightsLoading) {
      return (
        <div className="insights-loading" style={{ 
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '6px'
        }}>
          <div style={{ 
            color: '#6366F1', 
            fontWeight: 'bold', 
            marginBottom: '1rem' 
          }}>
            Generating AI Insights...
          </div>
          <div style={{ width: '100%', backgroundColor: '#EDF2F7', height: '8px', borderRadius: '4px' }}>
            <div 
              style={{ 
                width: '40%', 
                backgroundColor: '#6366F1', 
                height: '100%', 
                borderRadius: '4px',
                animation: 'loading 1.5s infinite ease-in-out',
              }}
            />
          </div>
          <style>{`
            @keyframes loading {
              0% { width: 10%; }
              50% { width: 70%; }
              100% { width: 10%; }
            }
          `}</style>
        </div>
      );
    }
    
    if (!insights) {
      return null;
    }
    
    if (insights.error) {
      return (
        <div className="insights-error" style={{ 
          padding: '1rem',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '6px',
          color: '#B91C1C'
        }}>
          <h4 style={{ marginTop: 0 }}>Error</h4>
          <p>{insights.error}</p>
        </div>
      );
    }
  
    const { populationAnalysis, anomalyDetection, trendPredictions } = insights;
  
    // Tabs navigation
    const renderTabsNavigation = () => (
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '1rem'
      }}>
        <button 
          onClick={() => this.setState({ activeTab: 'population' })}
          style={{ 
            flex: 1,
            padding: '0.75rem 1rem',
            backgroundColor: this.state.activeTab === 'population' ? '#EBF4FF' : 'transparent',
            border: 'none',
            borderBottom: this.state.activeTab === 'population' ? '2px solid #4299E1' : '1px solid #E2E8F0',
            color: this.state.activeTab === 'population' ? '#3182CE' : '#4A5568',
            fontWeight: this.state.activeTab === 'population' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Population Analysis
        </button>
        <button 
          onClick={() => this.setState({ activeTab: 'anomalyTrends' })}
          style={{ 
            flex: 1,
            padding: '0.75rem 1rem',
            backgroundColor: this.state.activeTab === 'anomalyTrends' ? '#EBF4FF' : 'transparent',
            border: 'none',
            borderBottom: this.state.activeTab === 'anomalyTrends' ? '2px solid #4299E1' : '1px solid #E2E8F0',
            color: this.state.activeTab === 'anomalyTrends' ? '#3182CE' : '#4A5568',
            fontWeight: this.state.activeTab === 'anomalyTrends' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Anomalies & Trends
        </button>
      </div>
    );
  
    // Population Analysis Tab Content
    const renderPopulationTab = () => (
      <div style={{ marginBottom: '2rem' }}>
        <h5 style={{ 
          color: '#4a5568', 
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#805AD5" strokeWidth="2" style={{ marginRight: '8px' }}>
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
            <line x1="6" y1="1" x2="6" y2="4"></line>
            <line x1="10" y1="1" x2="10" y2="4"></line>
            <line x1="14" y1="1" x2="14" y2="4"></line>
          </svg>
          Population Analysis
        </h5>
        
        <div style={{ padding: '0.75rem', backgroundColor: '#F7FAFC', borderRadius: '4px', marginBottom: '1rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 'bold', color: '#4A5568' }}>Distribution Type:</span> {populationAnalysis.insights.distributionType}
          </div>
          <div style={{ fontWeight: 'bold', color: '#4A5568', marginBottom: '0.5rem' }}>Location Statistics:</div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '0.5rem'
          }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '0.5rem', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#A8E6CF', fontWeight: 'bold' }}>Seen</div>
              <div>Mean: {populationAnalysis.statistics.seen.mean}</div>
              <div>Std Dev: {populationAnalysis.statistics.seen.std}</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '0.5rem', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#D1C4E9', fontWeight: 'bold' }}>Heard</div>
              <div>Mean: {populationAnalysis.statistics.heard.mean}</div>
              <div>Std Dev: {populationAnalysis.statistics.heard.std}</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '0.5rem', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#FFCDD2', fontWeight: 'bold' }}>Not Found</div>
              <div>Mean: {populationAnalysis.statistics.notFound.mean}</div>
              <div>Std Dev: {populationAnalysis.statistics.notFound.std}</div>
            </div>
          </div>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '1rem'
        }}>
          <div style={{ 
            backgroundColor: '#F0FFF4', 
            padding: '0.75rem', 
            borderRadius: '4px',
            border: '1px solid #C6F6D5'
          }}>
            <div style={{ fontWeight: 'bold', color: '#2F855A', marginBottom: '0.25rem' }}>Most Active Location</div>
            <div style={{ fontWeight: 'bold' }}>{populationAnalysis.insights.mostActive.location}</div>
            <div>Total: {populationAnalysis.insights.mostActive.Total} observations</div>
            <div>Seen: {populationAnalysis.insights.mostActive.Seen}</div>
            <div>Heard: {populationAnalysis.insights.mostActive.Heard}</div>
          </div>
          <div style={{ 
            backgroundColor: '#EBF8FF', 
            padding: '0.75rem', 
            borderRadius: '4px',
            border: '1px solid #BEE3F8'
          }}>
            <div style={{ fontWeight: 'bold', color: '#2C5282', marginBottom: '0.25rem' }}>Least Active Location</div>
            <div style={{ fontWeight: 'bold' }}>{populationAnalysis.insights.leastActive.location}</div>
            <div>Total: {populationAnalysis.insights.leastActive.Total} observations</div>
            <div>Seen: {populationAnalysis.insights.leastActive.Seen}</div>
            <div>Heard: {populationAnalysis.insights.leastActive.Heard}</div>
          </div>
        </div>
      </div>
    );
  
    // Anomalies & Trends Tab Content
    const renderAnomalyTrendsTab = () => (
      <>
        {/* Anomaly Detection Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h5 style={{ 
            color: '#4a5568', 
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E53E3E" strokeWidth="2" style={{ marginRight: '8px' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Anomaly Detection
          </h5>
          
          <div style={{ 
            backgroundColor: anomalyDetection.summary.significance === "High" ? "#FFF5F5" : "#F7FAFC", 
            padding: '0.75rem', 
            borderRadius: '4px',
            marginBottom: '1rem',
            border: anomalyDetection.summary.significance === "High" ? "1px solid #FED7D7" : "1px solid #E2E8F0"
          }}>
            <div style={{ fontWeight: 'bold', color: '#4A5568', marginBottom: '0.5rem' }}>
              Anomaly Summary: <span style={{ 
                color: anomalyDetection.summary.significance === "High" ? "#C53030" : "#4A5568"
              }}>
                {anomalyDetection.summary.totalAnomalies} anomalies detected ({anomalyDetection.summary.significance} significance)
              </span>
            </div>
            
            {anomalyDetection.volumeAnomalies.length > 0 && (
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Volume Anomalies:</div>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  {anomalyDetection.volumeAnomalies.map((anomaly, idx) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}>
                      <strong>{anomaly.location}</strong>: {anomaly.Total} observations 
                      (unusually {anomaly.Total > anomalyDetection.anomalyThreshold ? "high" : "low"})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {anomalyDetection.ratioAnomalies.length > 0 && (
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Distribution Anomalies:</div>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  {anomalyDetection.ratioAnomalies.map((anomaly, idx) => (
                    <li key={idx}>
                      <strong>{anomaly.location}</strong>: Unusual ratio of Seen/Heard/NotFound
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {anomalyDetection.volumeAnomalies.length === 0 && anomalyDetection.ratioAnomalies.length === 0 && (
              <div style={{ color: '#718096' }}>No significant anomalies detected in the data.</div>
            )}
          </div>
        </div>
        
        {/* Trend Predictions Section */}
        <div>
          <h5 style={{ 
            color: '#4a5568', 
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3182CE" strokeWidth="2" style={{ marginRight: '8px' }}>
              <path d="M23 6l-9.5 9.5-5-5L1 18"></path>
              <path d="M17 6h6v6"></path>
            </svg>
            Trend Predictions
          </h5>
          
          <div style={{ 
            backgroundColor: "#F7FAFC", 
            padding: '0.75rem', 
            borderRadius: '4px',
            marginBottom: '1rem',
            border: "1px solid #E2E8F0"
          }}>
            <div style={{ 
              fontWeight: 'bold', 
              color: '#4A5568', 
              marginBottom: '0.75rem'
            }}>
              Overall Trend: <span style={{
                color: trendPredictions.overallTrend === "Positive" ? "#38A169" : "#718096"
              }}>
                {trendPredictions.overallTrend}
              </span>
            </div>
            
            <div style={{ fontWeight: 'bold', color: '#4A5568', marginBottom: '0.5rem' }}>Top Location Predictions:</div>
            
            {trendPredictions.topLocations.map((location, idx) => {
              const growthColor = 
                location.prediction.growth === "High" ? "#38A169" : 
                location.prediction.growth === "Moderate" ? "#DD6B20" : "#718096";
                
              return (
                <div key={idx} style={{ 
                  backgroundColor: "#FFFFFF", 
                  padding: '0.75rem', 
                  borderRadius: '4px',
                  marginBottom: '0.5rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{location.location}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Current Total: {location.current.total}</span>
                    <span style={{ color: growthColor }}>Growth: {location.prediction.growth}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Prediction: {location.prediction.trend}</span>
                    <span>Confidence: {location.prediction.confidence}</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={{ backgroundColor: '#FFFAF0', padding: '0.75rem', borderRadius: '4px', border: '1px solid #FEEBC8' }}>
            <div style={{ display: 'flex', alignItems: 'start' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DD6B20" strokeWidth="2" style={{ marginRight: '8px', marginTop: '2px' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>
                <div style={{ fontWeight: 'bold', color: '#DD6B20', marginBottom: '0.25rem' }}>Note on Predictions</div>
                <div style={{ color: '#744210', fontSize: '0.9rem' }}>
                  These predictions are based on current patterns and may change as more data becomes available. For more accurate predictions, consider collecting historical data over longer time periods.
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  
    return (
      <div className="insights-container" style={{ 
        padding: '1rem',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        maxHeight: '600px',
        overflowY: 'auto'
      }}>
        <h4 style={{ 
          marginTop: 0, 
          color: '#2d3748', 
          borderBottom: '1px solid #e2e8f0', 
          paddingBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" style={{ marginRight: '8px' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4M12 8h.01"></path>
          </svg>
          AI Location Insights
        </h4>
        
        <div style={{ color: '#718096', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Generated on {new Date().toLocaleDateString()} using TensorFlow
        </div>
        
        {renderTabsNavigation()}
        
        {this.state.activeTab === 'population' ? renderPopulationTab() : renderAnomalyTrendsTab()}
      </div>
    );
  };
  render() {
    const { data } = this.props;
    const locationData = countByLocation(data);
    const { showLegend, activeIndex, showReportPanel, showInsightsPanel, insightsLoading } = this.state;

    return (
      <div className="chart-container">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h2>Observations by Location</h2>
          <div>
            <button
              onClick={this.toggleLegend}
              style={{
                background: showLegend ? '#EDF2F7' : '#6366F1',
                color: showLegend ? '#4A5568' : 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                marginRight: '0.5rem'
              }}
            >
              {showLegend ? 'Hide Legend' : 'Show Legend'}
            </button>
            <button
              onClick={() => this.setState(prevState => ({ 
                showReportPanel: !prevState.showReportPanel,
                showInsightsPanel: false,
                showLegend: false
              }))}
              style={{
                background: showReportPanel ? '#EDF2F7' : '#6366F1',
                color: showReportPanel ? '#4A5568' : 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                marginRight: '0.5rem'
              }}
            >
              {showReportPanel ? 'Hide Report' : 'Generate Report'}
            </button>
            <button
              onClick={() => {
                const newShowInsights = !this.state.showInsightsPanel;
                this.setState({ 
                  showInsightsPanel: newShowInsights,
                  showReportPanel: false,
                  showLegend: false
                });
                
                if (newShowInsights && !this.state.insights) {
                  this.generateInsights();
                }
              }}
              style={{
                background: showInsightsPanel ? '#EDF2F7' : '#6366F1',
                color: showInsightsPanel ? '#4A5568' : 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                marginTop: "0.5rem"
              }}
            >
              <span role="img" aria-label="AI">🧠</span>
              {showInsightsPanel ? 'Hide Insights' : (
                <>      
                  AI Insights
                </>
              )}
            </button>
          </div>
        </div>

        {showLegend && (
          <div
            className="legend-popup"
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              padding: '1rem',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              marginBottom: '1rem'
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Location Legend</div>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '0.5rem'
            }}>
              {locationData.map((entry, index) => {
                const color = this.getColorForIndex(index);
                return (
                  <div
                    key={index}
                    onClick={() => this.setState({ expandedIndex: index })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      padding: '0.25rem'
                    }}
                  >
                    <div style={{ 
                      width: '12px',
                      height: '12px',
                      backgroundColor: color,
                      marginRight: '8px',
                      borderRadius: '2px'
                    }}></div>
                    <span style={{ color }}>{entry.location}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ width: '100%', height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={locationData}
                    dataKey="Total"
                    nameKey="location"
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    activeIndex={activeIndex}
                    activeShape={this.renderActiveShape}
                    label={({ name, percent, x, y, index }) => {
                      const label = `${name}: ${(percent * 100).toFixed(1)}%`;
                      const fontSize = 10;
                      const fontWeight = 'bold';
                      
                      // Measure the width of the text dynamically. Adjust this based on the text length.
                      const textWidth = label.length * fontSize * 0.55; // Adjust the multiplier to fit the text properly
                      const textHeight = fontSize * 1.4; // Height of the text with padding
                    
                      return (
                        <g>
                          {/* Background white rectangle */}
                          <rect
                            x={x - textWidth / 2 - 5}  // Center the rectangle around the text horizontally with padding
                            y={y - textHeight / 2 - 3}  // Center the rectangle around the text vertically with padding
                            width={textWidth + 10}      // Add some padding around the text for legibility
                            height={textHeight + 6}     // Add padding above and below the text for clarity
                            fill="white"                // Set the background color to white
                            opacity="0.85"              // Optional: Adjust opacity for the background
                            rx="3"                      // Optional: Rounded corners for the rectangle
                          />
                    
                          {/* Text Label */}
                          <text
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={fontSize}
                            fontWeight={fontWeight}
                            fill={this.getColorForIndex(index)} // Use respective color
                          >
                            {label}
                          </text>
                        </g>
                      );
                    }}                                                           
                  >
                    {locationData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={this.getColorForIndex(index)}
                        onMouseEnter={() =>
                          this.setState({ activeIndex: index, tooltipVisible: true })
                        }
                        onMouseLeave={() =>
                          this.setState({ activeIndex: null, tooltipVisible: false })
                        }
                        onClick={() => this.setState({ expandedIndex: index === this.state.expandedIndex ? null : index })}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={this.renderCustomTooltip}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

        {showReportPanel && (
          this.renderReport()
        )}
        
        {showInsightsPanel && (
          this.renderInsightsPanel()
        )}
        
        {this.renderStatistics(locationData)}
      </div>
    );
  }
}

export default LocationStats;
