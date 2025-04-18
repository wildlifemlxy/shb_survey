import React, { Component } from 'react';
import chroma from 'chroma-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { countByMonthYear } from '../utils/dataProcessing';
import * as tf from '@tensorflow/tfjs';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    const tooltipStyles = {
      heard: { color: '#D1C4E9' },
      seen: { color: '#A8E6CF' },
      NotFound: { color: '#FFCDD2' },
      total: { color: '#8884d8' }
    };

    const formatLabel = (label) => {
      const [month, year] = label.split('-');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    };

    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
        <p><strong>{formatLabel(label)}</strong></p>
        <p><strong>Observation(s):</strong></p>
        <div style={tooltipStyles.total}><strong>Total:</strong> {data.Total}</div>
        <div style={tooltipStyles.seen}><strong>Seen:</strong> {data.Seen}</div>
        <div style={tooltipStyles.heard}><strong>Heard:</strong> {data.Heard}</div>
        <div style={tooltipStyles.NotFound}><strong>Not Found:</strong> {data.NotFound}</div>
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
      x: index,  // Use index as time step
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
            <span>{totalEntry.Total}</span>
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
          const isExpanded = expandedIndex === entry.monthYear;
          const labelColor = colorPalette[index % colorPalette.length];
          
          // Highlight anomalies
          const isAnomaly = this.state.anomalies.some(anomaly => anomaly.date === entry.monthYear);
          const rowStyle = {
            display: 'flex',
            flexDirection: 'column',
            padding: '0.5rem',
            borderBottom: '1px solid #ccc',
            cursor: 'pointer',
            backgroundColor: isExpanded ? '#f9f9f9' : 'transparent',
            ...(isAnomaly ? { border: '2px solid #FF6B6B', borderRadius: '4px' } : {})
          };
  
          return (
            <div
              key={index}
              onClick={() => this.setState({ expandedIndex: isExpanded ? null : entry.monthYear })}
              style={rowStyle}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: labelColor }}>
                  <strong>
                    {formatMonthYear(entry.monthYear)}
                    {isAnomaly && <span role="img" aria-label="warning" style={{marginLeft: '5px'}}>⚠️</span>}
                  </strong>
                </span>
                <span><strong style={{ color: labelColor }}>{entry.Total}</strong></span>
              </div>
              {isExpanded && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ color: labelColor }}><strong>Seen:</strong> {entry.Seen}</div>
                  <div style={{ color: labelColor }}><strong>Heard:</strong> {entry.Heard}</div>
                  <div style={{ color: labelColor }}><strong>Not Found:</strong> {entry.NotFound}</div>
                  {isAnomaly && (
                    <div style={{ color: '#FF6B6B', marginTop: '0.25rem' }}>
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
      <div className="ml-panel" style={{ 
        marginTop: '1.5rem', 
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#2d3748' }}>
            <span role="img" aria-label="AI">🧠</span> Smart Insights (AI-Powered)
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => this.setState({ activeTab: 'population' })}
              style={{
                background: activeTab === 'population' ? '#6366F1' : '#e2e8f0',
                color: activeTab === 'population' ? 'white' : '#4a5568',
                border: 'none',
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Population Analysis
            </button>
            <button
              onClick={() => this.setState({ activeTab: 'anomaly' })}
              style={{
                background: activeTab === 'anomaly' ? '#6366F1' : '#e2e8f0',
                color: activeTab === 'anomaly' ? 'white' : '#4a5568',
                border: 'none',
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Anomaly Detection
            </button>
          </div>
        </div>
        
        {isLoadingML ? (
          <div>
            <div style={{ marginBottom: '0.5rem' }}>Analyzing data with AI...</div>
            <div 
              style={{ 
                height: '8px', 
                width: '100%', 
                backgroundColor: '#e2e8f0',
                borderRadius: '4px',
                overflow: 'hidden'
              }}
            >
              <div 
                style={{ 
                  height: '100%', 
                  width: `${trainingProgress}%`, 
                  backgroundColor: '#6366F1',
                  transition: 'width 0.3s ease-in-out'
                }}
              />
            </div>
            <div style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: '#718096' }}>
              {trainingProgress}% complete
            </div>
          </div>
        ) : (
          <div>
            {activeTab === 'population' && (
              <div>
                <h4 style={{ marginTop: 0, color: '#4a5568' }}>Population Trend Analysis</h4>
                {mlInsights && mlInsights.filter(insight => insight.includes('ML Analysis') || insight.includes('Forecast')).length > 0 ? (
                  <>
                    <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                      {mlInsights
                        .filter(insight => insight.includes('ML Analysis') || insight.includes('Forecast'))
                        .map((insight, idx) => (
                          <li key={idx} style={{ marginBottom: '0.5rem' }}>{insight}</li>
                        ))}
                    </ul>
                    
                    {/* Display predictions as a small table */}
                    {predictions && predictions.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <h5 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#4a5568' }}>Forecasted Observations</h5>
                        <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          {predictions.map((pred, idx) => {
                            const [month, year] = pred.monthYear.split('-');
                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            
                            return (
                              <div 
                                key={idx} 
                                style={{ 
                                  flex: 1, 
                                  padding: '0.5rem', 
                                  textAlign: 'center',
                                  backgroundColor: idx % 2 === 0 ? '#f7fafc' : '#edf2f7',
                                  borderRight: idx < predictions.length - 1 ? '1px solid #e2e8f0' : 'none'
                                }}
                              >
                                <div style={{ fontWeight: 'bold', color: '#4a5568' }}>
                                  {monthNames[parseInt(month) - 1]} {year}
                                </div>
                                <div style={{ marginTop: '0.25rem', color: '#6366F1', fontWeight: 'bold' }}>
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
                <h4 style={{ marginTop: 0, color: '#4a5568' }}>Anomaly Detection Results</h4>
                {mlInsights && mlInsights.filter(insight => insight.includes('Anomaly')).length > 0 ? (
                  <>
                    <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                      {mlInsights
                        .filter(insight => insight.includes('Anomaly'))
                        .map((insight, idx) => (
                          <li key={idx} style={{ marginBottom: '0.5rem' }}>{insight}</li>
                        ))}
                    </ul>
                    
                    {/* Display anomalies information */}
                    {this.state.anomalies.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <h5 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#4a5568' }}>Detected Anomalies</h5>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                          {this.state.anomalies.map((anomaly, idx) => {
                            const [month, year] = anomaly.date.split('-');
                            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                            
                            return (
                              <div 
                                key={idx} 
                                style={{ 
                                  padding: '0.5rem', 
                                  borderBottom: idx < this.state.anomalies.length - 1 ? '1px solid #e2e8f0' : 'none',
                                  backgroundColor: idx % 2 === 0 ? '#f7fafc' : '#edf2f7',
                                }}
                              >
                                <div style={{ fontWeight: 'bold', color: '#e53e3e' }}>
                                  <span role="img" aria-label="warning" style={{marginRight: '5px'}}>⚠️</span>
                                  {monthNames[parseInt(month) - 1]} {year}
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.9rem' }}>
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
            
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <button 
                onClick={this.runMachineLearningAnalysis}
                style={{
                  background: '#6366F1',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
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
      const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
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
      <div className="report-container" style={{ 
        padding: '1rem',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        <h4 style={{ marginTop: 0, color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          Observation Data Report
        </h4>
        <div style={{ color: '#718096', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Generated on {new Date().toLocaleDateString()}
        </div>
        
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
        
        {/* Monthly Breakdown */}
        <h5 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>Monthly Breakdown</h5>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Month</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Seen</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Heard</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Not Found</th>
              </tr>
            </thead>
            <tbody>
              {dateData.map((entry, idx) => (
                <tr key={idx} style={{ 
                  borderBottom: '1px solid #e2e8f0',
                  backgroundColor: idx % 2 === 0 ? 'white' : '#f7fafc',
                  // Highlight anomalies with a subtle left border
                  ...(anomalies && anomalies.some(a => a.date === entry.monthYear) 
                    ? { borderLeft: '3px solid #FC8181' } 
                    : {})
                }}>
                  <td style={{ padding: '0.75rem' }}>
                    {formatMonthYear(entry.monthYear)}
                    {anomalies && anomalies.some(a => a.date === entry.monthYear) && (
                      <span role="img" aria-label="warning" style={{marginLeft: '5px', fontSize: '0.8rem'}}>⚠️</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>{entry.Total}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{entry.Seen}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{entry.Heard}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{entry.NotFound}</td>
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

    

    return (
      <div className="chart-container">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h2>Observations Over Time (Monthly)</h2>
          <button
            onClick={() => this.setState(prevState => ({ 
              showMLPanel: !prevState.showMLPanel,
              showReportPanel: false,
              // Initialize TensorFlow when panel is first shown
              isLoadingML: !prevState.showMLPanel && !prevState.modelTrained 
            }))}
            style={{
              background: showMLPanel ? '#EDF2F7' : '#6366F1',
              color: showMLPanel ? '#4A5568' : 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <span role="img" aria-label="AI">🧠</span>
            {showMLPanel ? 'Hide Insight' : 'Show Insight'}
          </button>
          <button
            onClick={() => this.setState(prevState => ({ 
              showMLPanel: false,     
              showReportPanel: !prevState.showReportPanel,
            }))}
            style={{
              background: showReportPanel ? '#EDF2F7' : '#6366F1',
              color: showReportPanel ? '#4A5568' : 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            Generate Report
          </button>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={dateData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="monthYear"
              tickFormatter={(tick) => {
                const [month, year] = tick.split('-');
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return `${monthNames[parseInt(month) - 1]} ${year}`; // "MMM YYYY"
              }}
              tick={({ x, y, payload, index }) => {
                const monthYear = payload.value; // Get the value of the tick (MM-YYYY)
                const [month, year] = monthYear.split('-'); // Split the month and year
            
                // Generate a color palette using Chroma.js
                const colorPalette = chroma.scale('Set1')
                                    .mode('hsl')
                                    .colors(dateData.length);
                                    
                // Find if this is a prediction point
                const dataPoint = dateData.find(item => item.monthYear === monthYear);
                const isPrediction = dataPoint && dataPoint.isPrediction;
                
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const month1 = `${monthNames[parseInt(month) - 1]} ${year}`; // "MMM YYYY"
                const labelColor = isPrediction ? '#6366F1' : colorPalette[index % colorPalette.length];

                return (
                  <text
                    x={x}
                    y={y + 10}
                    textAnchor="middle"
                    fill={labelColor}
                    fontSize="13"
                    fontWeight={isPrediction ? 'bold' : 'normal'}
                    fontStyle={isPrediction ? 'italic' : 'normal'}
                  >
                    {month1}{isPrediction ? '*' : ''}
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
            <Line type="monotone" dataKey="Seen" stroke="#A8E6CF" />
            <Line type="monotone" dataKey="Heard" stroke="#D1C4E9" />
            <Line type="monotone" dataKey="NotFound" stroke="#FFCDD2" />
            
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

        {/* Render ML Analysis Panel */}
        { this.state.showMLPanel === true && this.state.showReportPanel === false && this.renderMLPanel()}
        {this.state.showMLPanel === false && this.state.showReportPanel === true && this.renderReport()}

        {/* Render Statistics Below the Chart */}
        {/*this.state.showReportPanel === false &&*/ this.renderStatistics(dateData.filter(item => !item.isPrediction))} {/* Exclude predictions from statistics */}
      </div>
    );
  }
}

export default DateLineChart;