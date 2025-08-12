import React, { Component } from 'react';
import chroma from 'chroma-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { countByMonthYear } from '../../utils/dataProcessing';
import * as tf from '@tensorflow/tfjs';
import '../../css/components/Charts/DateLineChart.css'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    const formatLabel = (label) => {
      if (!label || typeof label !== 'string' || !label.includes('-')) return label || '';
      const [month, year] = label.split('-');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    };

    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-title">{formatLabel(label)}</div>
        <div className="chart-tooltip-content">
          <div className="chart-tooltip-item">
            <span className="chart-tooltip-label">Total:</span>
            <span className="chart-tooltip-value total">{data.Total}</span>
          </div>
          <div className="chart-tooltip-item">
            <span className="chart-tooltip-label">Seen:</span>
            <span className="chart-tooltip-value seen">{data.Seen}</span>
          </div>
          <div className="chart-tooltip-item">
            <span className="chart-tooltip-label">Heard:</span>
            <span className="chart-tooltip-value heard">{data.Heard}</span>
          </div>
          <div className="chart-tooltip-item">
            <span className="chart-tooltip-label">Not Found:</span>
            <span className="chart-tooltip-value not-found">{data.NotFound}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

class DateLineChart extends Component {
  state = {
    expandedIndex: null,
    mlInsights: null,
    predictions: null,
    anomalies: [],
    isLoadingML: false,
    showMLPanel: false,
    showReportPanel: false,
    modelTrained: false,
    trainingProgress: 0,
    activeTab: 'population'  // 'population' or 'anomaly'
  };

  componentDidMount() {
    const data = this.props.data;
    // Initialize TensorFlow if ML panel is shown
    if (this.state.showMLPanel) {
      this.initTensorFlow();
    }
  }

  componentDidUpdate(prevProps, prevState) 
  {
    // Initialize TensorFlow when ML panel is first shown
    if (this.state.showMLPanel && !prevState.showMLPanel) 
    {
      this.initTensorFlow();
    }
    // If ML panel is hidden, do not run machine learning analysis
    if (this.props.data !== prevProps.data && this.state.modelTrained) {
      this.runMachineLearningAnalysis();
    }
  }  

  // Initialize TensorFlow and prepare for analysis
  initTensorFlow = async () => {
    this.setState({ isLoadingML: true, trainingProgress: 5 });
    
    try {
      // Wait for TF to be ready
      await tf.ready();
      this.setState({ trainingProgress: 10 });
      console.log("TensorFlow.js is ready");
      
      // Run ML analysis
      await this.runMachineLearningAnalysis();
      
    } catch (error) {
      console.error("TensorFlow initialization error:", error);
      this.setState({ 
        mlInsights: ["Error initializing TensorFlow. Please try again."],
        isLoadingML: false 
      });
    }
  };

  // Main function to run all ML analyses
  runMachineLearningAnalysis = async () => {
    const { data } = this.props;
    const dateData = countByMonthYear(data);
    console.log("Run Machine Language");
    
    if (!dateData || dateData.length < 3) {
      this.setState({ 
        mlInsights: ["Not enough data for meaningful machine learning analysis. Need at least 3 time periods."],
        isLoadingML: false
      });
      return;
    }
    
    try {
      this.setState({ isLoadingML: true, trainingProgress: 15 });
      
      // Run population trend analysis
      if(this.state.showMLPanel === true)
      {
        const populationInsights = await this.runPopulationAnalysis(dateData);
        this.setState({ trainingProgress: 50 });
        
        // Run anomaly detection
        const anomalyResults = await this.runAnomalyDetection(dateData);
        this.setState({ trainingProgress: 85 });
        
        // Combine insights
        const allInsights = [
          ...populationInsights,
          ...anomalyResults.insights
        ];
        
        this.setState({ 
          mlInsights: allInsights,
          anomalies: anomalyResults.anomalies,
          modelTrained: true,
          isLoadingML: false,
          trainingProgress: 100
        });
      }
      else
      {
        console.log("Hide Predictions");
        this.setState({ 
          expandedIndex: null,
          mlInsights: null,
          predictions: null,
          anomalies: [],
          isLoadingML: false,
          showMLPanel: false,
          modelTrained: false,
          trainingProgress: 0,
        });
      }
      
    } catch (error) {
      console.error("ML analysis error:", error);
      this.setState({ 
        mlInsights: ["Error during machine learning analysis. Please try again."],
        isLoadingML: false 
      });
    }
  };

  // Population trend analysis using time series forecasting
  runPopulationAnalysis = async (dateData) => {
    // Prepare time series data for TensorFlow
    const timeSeriesData = dateData.map((entry, index) => ({
      x: index  // Use index as time step
      ,
      y: entry.Total  // Total observations as target value
    }));
    
    // Progress update
    this.setState({ trainingProgress: 20 });
    
    // Convert to tensors
    const xs = tf.tensor2d(timeSeriesData.map(d => [d.x]), [timeSeriesData.length, 1]);
    const ys = tf.tensor2d(timeSeriesData.map(d => [d.y]), [timeSeriesData.length, 1]);
    
    // Normalize data
    const xMin = xs.min();
    const xMax = xs.max();
    const yMin = ys.min();
    const yMax = ys.max();
    
    const xsNorm = xs.sub(xMin).div(xMax.sub(xMin));
    const ysNorm = ys.sub(yMin).div(yMax.sub(yMin));
    
    // Progress update
    this.setState({ trainingProgress: 25 });
    
    // Create and train the model
    const model = tf.sequential();
    
    model.add(tf.layers.dense({
      inputShape: [1],
      units: 10,
      activation: 'relu'
    }));
    
    model.add(tf.layers.dense({
      units: 1
    }));
    
    model.compile({
      optimizer: tf.train.adam(0.1),
      loss: 'meanSquaredError'
    });
    
    // Progress update
    this.setState({ trainingProgress: 30 });
    
    // Train the model
    await model.fit(xsNorm, ysNorm, {
      epochs: 100,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          // Update progress every 10 epochs
          if (epoch % 10 === 0) {
            const progress = 30 + Math.floor((epoch / 100) * 10);
            this.setState({ trainingProgress: progress });
          }
        }
      }
    });
    
    // Progress update
    this.setState({ trainingProgress: 40 });
    
    // Generate predictions for the next 3 time periods
    const lastX = timeSeriesData.length - 1;
    const predictionInputs = tf.tensor2d([[lastX + 1], [lastX + 2], [lastX + 3]]);
    
    // Normalize prediction inputs
    const predInputsNorm = predictionInputs.sub(xMin).div(xMax.sub(xMin));
    
    // Get predictions
    const predictionsNorm = model.predict(predInputsNorm);
    
    // Denormalize predictions
    const predictions = predictionsNorm.mul(yMax.sub(yMin)).add(yMin);
    const predictionValues = await predictions.array();
    
    // Extract prediction values and create forecast data
    const forecastData = predictionValues.map((val, index) => {
      // Create date labels for forecasted months
      const lastDate = dateData[dateData.length - 1].monthYear;
      const [lastMonth, lastYear] = lastDate.split('-').map(Number);
      
      let forecastMonth = lastMonth + index + 1;
      let forecastYear = lastYear;
      
      // Handle year rollover
      while (forecastMonth > 12) {
        forecastMonth -= 12;
        forecastYear += 1;
      }
      
      return {
        monthYear: `${forecastMonth}-${forecastYear}`, 
        Total: Math.round(val[0]),
        isPrediction: true
      };
    });
    
    // Store predictions in state
    this.setState({ predictions: forecastData });
    
    // Generate insights
    const insights = [];
    
    // Calculate trend
    const firstHalf = dateData.slice(0, Math.floor(dateData.length / 2));
    const secondHalf = dateData.slice(Math.floor(dateData.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.Total, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.Total, 0) / secondHalf.length;
    
    // Predict future trend based on ML forecast
    const currentAvg = dateData.slice(-3).reduce((sum, item) => sum + item.Total, 0) / 3;
    const forecastAvg = forecastData.reduce((sum, item) => sum + item.Total, 0) / forecastData.length;
    
    const trendPercent = ((forecastAvg - currentAvg) / currentAvg * 100).toFixed(1);
    
    if (Math.abs(trendPercent) < 5) {
      insights.push("ML Analysis: Population is predicted to remain stable over the next 3 months.");
    } else if (trendPercent > 0) {
      insights.push(`ML Analysis: Population is predicted to increase by approximately ${trendPercent}% over the next 3 months.`);
    } else {
      insights.push(`ML Analysis: Population is predicted to decrease by approximately ${Math.abs(trendPercent)}% over the next 3 months.`);
    }
    
    // Add specific month predictions
    insights.push(`ML Forecast: Next 3 months predicted observation counts: ${forecastData.map(d => Math.round(d.Total)).join(', ')}`);
    
    // Cleanup tensors to prevent memory leaks
    xs.dispose();
    ys.dispose();
    xsNorm.dispose();
    ysNorm.dispose();
    predInputsNorm.dispose();
    predictionsNorm.dispose();
    model.dispose();
    
    return insights;
  };

  // Anomaly detection using Isolation Forest approach (simplified for TF.js)
  runAnomalyDetection = async (dateData) => {
    // Progress update
    this.setState({ trainingProgress: 60 });
    
    const insights = [];
    const anomalies = [];
    
    // Extract features for anomaly detection
    const features = dateData.map(entry => [
      entry.Total,
      entry.Seen / (entry.Total || 1),  // Prevent division by zero
      entry.Heard / (entry.Total || 1),
      entry.NotFound / (entry.Total || 1)
    ]);
    
    // Convert to tensor
    const featureTensor = tf.tensor2d(features);
    
    // Progress update
    this.setState({ trainingProgress: 65 });
    
    // Normalize features
    const featureMean = featureTensor.mean(0);
    const featureStd = featureTensor.std(0);
    const normalizedFeatures = featureTensor.sub(featureMean).div(featureStd);
    
    // Progress update
    this.setState({ trainingProgress: 70 });
    
    // Create a simple autoencoder for anomaly detection
    const inputDim = features[0].length;
    
    const encoder = tf.sequential();
    encoder.add(tf.layers.dense({
      inputShape: [inputDim],
      units: 2,
      activation: 'relu'
    }));
    
    const decoder = tf.sequential();
    decoder.add(tf.layers.dense({
      inputShape: [2],
      units: inputDim,
      activation: 'sigmoid'
    }));
    
    const autoencoder = tf.sequential();
    autoencoder.add(encoder);
    autoencoder.add(decoder);
    
    autoencoder.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError'
    });
    
    // Progress update
    this.setState({ trainingProgress: 75 });
    
    // Train autoencoder
    await autoencoder.fit(normalizedFeatures, normalizedFeatures, {
      epochs: 50,
      batchSize: 4,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            const progress = 75 + Math.floor((epoch / 50) * 5);
            this.setState({ trainingProgress: progress });
          }
        }
      }
    });
    
    // Progress update
    this.setState({ trainingProgress: 80 });
    
    // Predict and calculate reconstruction error
    const predictions = autoencoder.predict(normalizedFeatures);
    const reconstructionErrors = tf.losses.meanSquaredError(
      normalizedFeatures, 
      predictions
    );
    
    const errors = await reconstructionErrors.array();
    
    // Find anomalies (points with high reconstruction error)
    const meanError = errors.reduce((sum, val) => sum + val, 0) / errors.length;
    const stdError = Math.sqrt(
      errors.reduce((sum, val) => sum + Math.pow(val - meanError, 2), 0) / errors.length
    );
    
    // Threshold for anomaly (2 standard deviations from mean)
    const anomalyThreshold = meanError + (2 * stdError);
    
    // Identify anomalies
    errors.forEach((error, index) => {
      if (error > anomalyThreshold) {
        anomalies.push({
          index,
          date: dateData[index].monthYear,
          score: error,
          data: dateData[index]
        });
      }
    });
    
    // Generate insights
    if (anomalies.length === 0) {
      insights.push("ML Anomaly Detection: No significant anomalies detected in the observation patterns.");
    } else {
      // Format the anomaly insights
      const formatMonthYear = (monthYear) => {
        const [month, year] = monthYear.split('-');
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
      };
      
      insights.push(`ML Anomaly Detection: ${anomalies.length} unusual observation pattern${anomalies.length > 1 ? 's' : ''} detected.`);
      
      // Add details about the most significant anomaly
      if (anomalies.length > 0) {
        // Sort anomalies by score (highest first)
        anomalies.sort((a, b) => b.score - a.score);
        
        const topAnomaly = anomalies[0];
        insights.push(`Most significant anomaly: ${formatMonthYear(topAnomaly.date)} with unusual distribution of observation types.`);
      }
    }
    
    // Cleanup tensors
    featureTensor.dispose();
    normalizedFeatures.dispose();
    predictions.dispose();
    reconstructionErrors.dispose();
    featureMean.dispose();
    featureStd.dispose();
    autoencoder.dispose();
    
    return { insights, anomalies };
  };

  renderStatistics = (locationData) => {
    const { expandedIndex } = this.state;
  
    // Aggregating totals
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
  
    // Helper function to format month-year as "MMM YYYY"
    const formatMonthYear = (monthYear) => {
      const [month, year] = monthYear.split('-');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    };
  
    // Dynamically generate a color palette based on the length of data
    const colorPalette = chroma.scale('Set1')
                                    .mode('hsl')
                                    .colors(locationData.length);
  
    return (
      <div className="statistics-container">
        {/* Sticky Total Row */}
        <div
          onClick={() => this.setState({ expandedIndex: totalExpanded ? null : 'total' })}
          className={`total-row ${totalExpanded ? 'expanded' : ''}`}
        >
          <div className="total-row-header">
            <span>Total</span>
            <span>{totalEntry.Total}</span>
          </div>
          {totalExpanded && (
            <div className="total-row-details">
              <div className="total-seen"><strong>Seen:</strong> {totalEntry.Seen}</div>
              <div className="total-heard"><strong>Heard:</strong> {totalEntry.Heard}</div>
              <div className="total-not-found"><strong>Not Found:</strong> {totalEntry.NotFound}</div>
            </div>
          )}
        </div>
  
        {/* Render for each locationData */}
        {locationData.map((entry, index) => {
          const isExpanded = expandedIndex === entry.monthYear;
          const labelColor = colorPalette[index % colorPalette.length];
          
          // Highlight anomalies
          const isAnomaly = this.state.anomalies.some(anomaly => anomaly.date === entry.monthYear);
          const rowStyle = `statistics-entry ${isExpanded ? 'expanded' : ''} ${isAnomaly ? 'anomaly' : ''}`;
          
          return (
            <div
              key={index}
              onClick={() => this.setState({ expandedIndex: isExpanded ? null : entry.monthYear })}
              className={rowStyle}
            >
              <div className="statistics-entry-header">
                <span style={{ color: labelColor }}>
                  <strong>
                    {formatMonthYear(entry.monthYear)}
                    {isAnomaly && <span role="img" aria-label="warning" className="warning-icon">⚠️</span>}
                  </strong>
                </span>
                <span><strong style={{ color: labelColor }}>{entry.Total}</strong></span>
              </div>
              {isExpanded && (
                <div className="statistics-entry-details">
                  <div style={{ color: labelColor }}><strong>Seen:</strong> {entry.Seen}</div>
                  <div style={{ color: labelColor }}><strong>Heard:</strong> {entry.Heard}</div>
                  <div style={{ color: labelColor }}><strong>Not Found:</strong> {entry.NotFound}</div>
                  {isAnomaly && (
                    <div className="anomaly-warning">
                      <strong>⚠️ Anomaly detected by ML</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render ML panel with insights and controls
  renderMLPanel = () => {
    const { mlInsights, isLoadingML, trainingProgress, activeTab, predictions } = this.state;
    
    if (!this.state.showMLPanel) return null;
    
    return (
      <div className="ml-insights-panel">
        <div className="ml-panel-header">
          <h3 className="ml-panel-title">
            <span role="img" aria-label="AI">🧠</span> Smart Insights (AI-Powered)
          </h3>
          <div className="ml-tabs">
            <button
              onClick={() => this.setState({ activeTab: 'population' })}
              className={`ml-tab ${activeTab === 'population' ? 'active' : 'inactive'}`}
            >
              Population Analysis
            </button>
            <button
              onClick={() => this.setState({ activeTab: 'anomaly' })}
              className={`ml-tab ${activeTab === 'anomaly' ? 'active' : 'inactive'}`}
            >
              Anomaly Detection
            </button>
          </div>
        </div>
        
        {isLoadingML ? (
          <div className="ml-loading">
            <div className="ml-loading-text">Analyzing data with AI...</div>            
              <div className="ml-progress-bar">
              <div
                className="ml-progress-fill"
                style={{ width: `${trainingProgress}%` }}
              />
            </div>
            <div className="ml-progress-text">
              {trainingProgress}% complete
            </div>
          </div>
        ) : (
          <div className="ml-content">
            {activeTab === 'population' && (
              <div>
                <h4 className="ml-section-title">Population Trend Analysis</h4>
                {mlInsights && mlInsights.filter(insight => insight.includes('ML Analysis') || insight.includes('Forecast')).length > 0 ? (
                  <>
                    <ul className="ml-insights-list">
                      {mlInsights
                        .filter(insight => insight.includes('ML Analysis') || insight.includes('Forecast'))
                        .map((insight, idx) => (
                          <li key={idx}>{insight}</li>
                        ))}
                    </ul>
                    
                    {/* Display predictions as a small table */}
                    {predictions && predictions.length > 0 && (
                      <div className="ml-predictions-table">
                        <h5 className="ml-predictions-title">Forecasted Observations</h5>
                        <div className="predictions-grid">
                          {predictions.map((pred, idx) => {
                            const [month, year] = pred.monthYear.split('-');
                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            
                            return (
                              <div key={idx} className="prediction-card">
                                <div className="prediction-date">
                                  {monthNames[parseInt(month) - 1]} {year}
                                </div>
                                <div className="prediction-value">
                                  {Math.round(pred.Total)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p>No population insights available for the current data.</p>
                )}
              </div>
            )}
            
            {activeTab === 'anomaly' && (
              <div>
                <h4 className="ml-section-header">Anomaly Detection Results</h4>
                {mlInsights && mlInsights.filter(insight => insight.includes('Anomaly')).length > 0 ? (
                  <>
                    <ul className="ml-insights-list">
                      {mlInsights
                        .filter(insight => insight.includes('Anomaly'))
                        .map((insight, idx) => (
                          <li key={idx}>{insight}</li>
                        ))}
                    </ul>
                    
                    {/* Display anomalies information */}
                    {this.state.anomalies.length > 0 && (
                      <div className="anomaly-section">
                        <h5 className="anomaly-title">Detected Anomalies</h5>
                        <div className="anomaly-list">
                          {this.state.anomalies.map((anomaly, idx) => {
                            const [month, year] = anomaly.date.split('-');
                            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                            
                            return (
                              <div key={idx} className="anomaly-item">
                                <div className="anomaly-date">
                                  <span role="img" aria-label="warning" className="anomaly-warning-icon">⚠️</span>
                                  {monthNames[parseInt(month) - 1]} {year}
                                </div>
                                <div className="anomaly-stats">
                                  <div><strong>Total:</strong> {anomaly.data.Total}</div>
                                  <div><strong>Seen:</strong> {anomaly.data.Seen}</div>
                                  <div><strong>Heard:</strong> {anomaly.data.Heard}</div>
                                  <div><strong>Not Found:</strong> {anomaly.data.NotFound}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p>No anomalies detected in the current dataset.</p>
                )}
              </div>
            )}
            
            <div className="ml-controls">
              <button 
                onClick={this.runMachineLearningAnalysis}
                className="ml-refresh-button"
              >
                <span role="img" aria-label="refresh">🔄</span>
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Add these methods to the DateLineChart class
  generateReport = () => {
    const { data } = this.props;
    const dateData = countByMonthYear(data);
    const { mlInsights, anomalies } = this.state;
  };

  renderReport = () => {
    const { data } = this.props;
    const dateData = countByMonthYear(data);
    const { mlInsights, anomalies } = this.state;
    
    // Format month-year as "Month YYYY"
    const formatMonthYear = (monthYear) => {
      const [month, year] = monthYear.split('-');
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    };
    
    // Summary statistics
    const totalEntry = dateData.reduce(
      (acc, curr) => ({
        Total: acc.Total + curr.Total,
        Seen: acc.Seen + curr.Seen,
        Heard: acc.Heard + curr.Heard,
        NotFound: acc.NotFound + curr.NotFound,
      }),
      { Total: 0, Seen: 0, Heard: 0, NotFound: 0 }
    );
    
    return (
      <div className="report-container">
        <h4 className="report-header">
          Observation Data Report
        </h4>
        <div className="report-timestamp">
          Generated on {new Date().toLocaleDateString()}
        </div>
        
        {/* Summary Statistics */}
        <h5 className="report-section-title">Summary Statistics</h5>
        <div className="report-summary-grid">
          <div>
            <div className="report-stat-value total">{totalEntry.Total}</div>
            <div className="report-stat-label">Total Observations</div>
          </div>
          <div>
            <div className="report-stat-value seen">{totalEntry.Seen}</div>
            <div className="report-stat-label">Seen ({Math.round(totalEntry.Seen / totalEntry.Total * 100)}%)</div>
          </div>
          <div>
            <div className="report-stat-value heard">{totalEntry.Heard}</div>
            <div className="report-stat-label">Heard ({Math.round(totalEntry.Heard / totalEntry.Total * 100)}%)</div>
          </div>
          <div>
            <div className="report-stat-value not-found">{totalEntry.NotFound}</div>
            <div className="report-stat-label">Not Found ({Math.round(totalEntry.NotFound / totalEntry.Total * 100)}%)</div>
          </div>
        </div>
        
        {/* Monthly Breakdown */}
        <h5 className="monthly-breakdown-title">Monthly Breakdown</h5>
        <div className="monthly-table-container" style={{overflowX: 'auto', maxHeight: '320px'}}>
          <table className="monthly-table">
            <thead style={{position: 'sticky', top: 0, zIndex: 2, background: '#e0e7ff'}}>
              <tr className="monthly-table-header">
                <th className="left">Month</th>
                <th className="right">Total</th>
                <th className="right">Seen</th>
                <th className="right">Heard</th>
                <th className="right">Not Found</th>
              </tr>
            </thead>
            <tbody>
              {dateData.map((entry, idx) => (
                <tr 
                  key={idx} 
                  className={`monthly-table-row ${anomalies && anomalies.some(a => a.date === entry.monthYear) ? 'anomaly' : ''}`}
                >
                  <td className="monthly-table-cell">
                    {formatMonthYear(entry.monthYear)}
                    {anomalies && anomalies.some(a => a.date === entry.monthYear) && (
                      <span role="img" aria-label="warning" className="anomaly-indicator">⚠️</span>
                    )}
                  </td>
                  <td className="monthly-table-cell right bold">{entry.Total}</td>
                  <td className="monthly-table-cell right">{entry.Seen}</td>
                  <td className="monthly-table-cell right">{entry.Heard}</td>
                  <td className="monthly-table-cell right">{entry.NotFound}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  render() {
    const { data } = this.props;
    const { showMLPanel, predictions, anomalies, showReportPanel } = this.state;
    let dateData = countByMonthYear(data);
    console.log("Date Data:", dateData);
    
    // If we have predictions, append them to the chart data
    if(showMLPanel === true)
    {
      if (predictions && predictions.length > 0) {
        // Create a copy of the original data
        const combinedData = [...dateData];
        
        // Add predictions with visual distinction
        predictions.forEach(pred => {
          combinedData.push({
            ...pred,
            Seen: Math.round(pred.Total * 0.6),  // Estimate based on typical distribution
            Heard: Math.round(pred.Total * 0.3),
            NotFound: Math.round(pred.Total * 0.1),
            isPrediction: true  // Flag for styling
          });
        });
        
        dateData = combinedData;
      }
    }
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthlyData = dateData.map(row => ({
      month: monthNames[parseInt(row.monthYear.split('-')[0], 10) - 1] + ' ' + row.monthYear.split('-')[1],
      total: row.Total,
      seen: row.Seen,
      heard: row.Heard,
      notFound: row.NotFound
    }));
    console.log("Monthly Data:", monthlyData);
    const total = dateData.reduce((sum, r) => sum + r.Total, 0);
    const seen = dateData.reduce((sum, r) => sum + r.Seen, 0);
    const heard = dateData.reduce((sum, r) => sum + r.Heard, 0);
    const notFound = dateData.reduce((sum, r) => sum + r.NotFound, 0);
    const seenPercent = total ? Math.round((seen / total) * 100) : 0;
    const heardPercent = total ? Math.round((heard / total) * 100) : 0;
    const notFoundPercent = total ? Math.round((notFound / total) * 100) : 0;
    const reportDate = new Date().toLocaleDateString();

    return (
      <div className="date-line-chart">
        <div className="chart-header">
          <div className="chart-controls">
           {/* <button
              className={`chart-button ${showMLPanel ? 'active' : 'primary'}`}
              onClick={() => this.setState(prevState => ({ 
                showMLPanel: !prevState.showMLPanel,
                showReportPanel: false,
                isLoadingML: !prevState.showMLPanel && !prevState.modelTrained 
              }))}
            >
              <span role="img" aria-label="AI">🧠</span>
              {showMLPanel ? 'Hide Insights' : 'AI Insights'}
            </button>*/}
            <button
              className={`chart-button ${showReportPanel ? 'active' : 'primary'}`}
              onClick={() => this.setState(prevState => ({ 
                showMLPanel: false,     
                showReportPanel: !prevState.showReportPanel,
              }))}
            >
              {showReportPanel ? 'Hide Report' : 'Generate Report'}
            </button>
          </div>
        </div>

        <div className="line-chart-container">
          <ResponsiveContainer width="100%" height={450}>
          <LineChart data={dateData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="monthYear"
              tickFormatter={(tick) => {
                const [month, year] = tick.split('-');
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return `${monthNames[parseInt(month) - 1]} ${year}`; // "MMM YYYY"
              }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={({ x, y, payload, index }) => {
                const monthYear = payload.value;
                const [month, year] = monthYear.split('-');
                
                // Color palette for different months
                const colors = [
                  '#FF6B6B', // Red
                  '#4ECDC4', // Teal
                  '#45B7D1', // Blue
                  '#96CEB4', // Green
                  '#FFEAA7', // Yellow
                  '#DDA0DD', // Plum
                  '#98D8C8', // Mint
                  '#F7DC6F', // Light Yellow
                  '#BB8FCE', // Light Purple
                  '#85C1E9', // Light Blue
                  '#F8C471', // Orange
                  '#82E0AA'  // Light Green
                ];
                
                const monthIndex = parseInt(month) - 1;
                const color = colors[monthIndex % colors.length];
                
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const monthLabel = `${monthNames[monthIndex]} ${year}`;
                
                // Check if this is a prediction point
                const dataPoint = dateData.find(item => item.monthYear === monthYear);
                const isPrediction = dataPoint && dataPoint.isPrediction;
                
                return (
                  <text
                    x={x}
                    y={y + 10}
                    textAnchor="end"
                    fill={color}
                    fontSize="12"
                    fontWeight={isPrediction ? 'bold' : 'normal'}
                    fontStyle={isPrediction ? 'italic' : 'normal'}
                    transform={`rotate(-45 ${x} ${y + 10})`}
                  >
                    {monthLabel}{isPrediction ? ' *' : ''}
                  </text>
                );
              }}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Render regular data points */}
            <Line 
              type="monotone" 
              dataKey="Total" 
              stroke="#8884d8"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                // Check if this is an anomaly point
                const isAnomaly = anomalies && anomalies.some(anomaly => anomaly.date === payload.monthYear);
                // Check if this is a prediction point
                const isPrediction = payload.isPrediction;
                
                if (isAnomaly) {
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={6} 
                      fill="#FF6B6B" 
                      stroke="#FF6B6B" 
                      strokeWidth={2} 
                    />
                  );
                } else if (isPrediction) {
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={5} 
                      fill="#6366F1" 
                      stroke="#6366F1" 
                      strokeWidth={2}
                      strokeDasharray="2 2"
                    />
                  );
                }
                return (
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={4} 
                    fill="#8884d8" 
                    stroke="#8884d8" 
                  />
                );
              }}
            />
            <Line key="seen-line" type="monotone" dataKey="Seen" stroke="#A8E6CF" />
            <Line key="heard-line" type="monotone" dataKey="Heard" stroke="#D1C4E9" />
            <Line key="notfound-line" type="monotone" dataKey="NotFound" stroke="#FFCDD2" />
            
            <Legend 
              layout="horizontal" 
              align="center" 
              verticalAlign="bottom"
              formatter={(value, entry, index) => {
                // Check if showMLPanel is true
                if (this.state.showMLPanel === true) {
                  // Add prediction and anomaly to the legend when showMLPanel is true
                  if (value === 'Total' && predictions && predictions.length > 0) {
                    return <span>Total (Solid) / Prediction (Dashed)</span>;
                  }
                }
                return value;
              }}              
            />
          </LineChart>
        </ResponsiveContainer>
        </div>

        {/* Render ML Analysis Panel */}
        {showMLPanel && this.renderMLPanel()}
        
        {/* Render Report Panel */}
        {showReportPanel && this.renderReport()}

        {/* Render Statistics Below the Chart */}
        {this.renderStatistics(dateData.filter(item => !item.isPrediction))} {/* Exclude predictions from statistics */}
      </div>
    );
  }
}

export default DateLineChart;