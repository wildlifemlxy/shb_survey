import React, { Component } from 'react';
import * as d3 from 'd3';
import { extractTreeHeights, extractBirdHeights, extractSeenHeard, extractNoBirds } from '../utils/dataProcessing';
import birdLogo from '../assets/bird-logo.png';

class D3TreeHeightChart extends Component {
  constructor(props) {
    super(props);
    this.d3Container = React.createRef();
    this.chartContainer = React.createRef();
    this.state = {
      width: 0,
      height: 0,
      isMobile: false,
      expandedIndex: null,
      showReport: false
    };
  }

  componentDidMount() {
    this.updateDimensions();
    this.renderChart();
    window.addEventListener('resize', this.updateDimensions);
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      prevProps.data !== this.props.data ||
      prevState.width !== this.state.width ||
      prevState.height !== this.state.height
    ) {
      this.renderChart();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateDimensions);
    // Remove any tooltips that might be left
    d3.select('.chart-tooltip').remove();
  }

  updateDimensions = () => {
    if (!this.chartContainer.current) return;
    
    const containerWidth = this.chartContainer.current.clientWidth;
    const windowWidth = window.innerWidth;
    
    // Determine if we're on mobile
    const isMobile = windowWidth < 768;
    
    // Set appropriate height based on screen size
    let height = 400; // Default height
    if (isMobile) {
      height = 300; // Smaller height for mobile
    } else if (windowWidth < 1024) {
      height = 350; // Medium height for tablets
    }
    
    this.setState({
      width: containerWidth,
      height: height,
      isMobile: isMobile
    });
  };

  generateReport = () => {
    this.setState({ showReport: true });
  };

  renderChart() {
    const { data } = this.props;
    const { isMobile } = this.state;
    const svg = d3.select(this.d3Container.current);
  
    // Clear existing content
    svg.selectAll("*").remove();
  
    // Parse and pair data
    const treeData = extractTreeHeights(data);
    const birdData = extractBirdHeights(data);
    const seenHeardData = extractSeenHeard(data);
    const noBirdsData = extractNoBirds(data);
  
    const pairedData = treeData.map((treeHeight, index) => {
      let birdHeight = birdData[index];
      let seenHeard = seenHeardData[index];
      let noBirds = noBirdsData[index];
      const hasBird = birdHeight !== null && birdHeight !== 'N/A' && !isNaN(birdHeight);
  
      return {
        treeHeight,
        birdHeight: hasBird ? birdHeight : null,
        hasBird,
        seenHeard,
        noBirds,
        index: index + 1
      };
    });
  
    // Setup dimensions
    const margin = isMobile ? { top: 30, right: 15, bottom: 40, left: 35 } : { top: 30, right: 30, bottom: 50, left: 50 };
    const width = this.state.width - margin.left - margin.right;
    const height = this.state.height - margin.top - margin.bottom;
  
    // Create scales
    const x = d3.scaleBand()
      .domain(pairedData.map(d => d.index))
      .range([0, width])
      .padding(isMobile ? 0.2 : 0.3);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(pairedData, d => d.treeHeight) * 1.1])
      .range([height, 0]);
  
    const chartGroup = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Add axes
    chartGroup.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y)
        .ticks(isMobile ? 5 : 10)
        .tickFormat(d => isMobile && d % 1 !== 0 ? '' : d))
      .selectAll("text")
      .style("font-size", isMobile ? "10px" : "12px");
  
    chartGroup.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .tickValues(isMobile && pairedData.length > 10
          ? pairedData.filter(d => d.index % 2 === 0).map(d => d.index)
          : null))
      .selectAll("text")
      .style("text-anchor", "middle")
      .style("font-size", isMobile ? "10px" : "12px");
  
    // Tooltip
    d3.select('.chart-tooltip').remove();
    const tooltip = d3.select("body").append("div")
      .attr("class", "chart-tooltip")
      .style("position", "absolute")
      .style("background-color", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000)
      .style("font-size", isMobile ? "12px" : "14px")
      .style("max-width", isMobile ? "150px" : "200px");
  
    const showTooltip = (event, d) => {
      const tooltipWidth = isMobile ? 150 : 200;
      const windowWidth = window.innerWidth;
  
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
  
      const content = `<strong>Tree #${d.index}</strong><br/>Height: ${d.treeHeight}m<br/>${d.hasBird ? `<strong>Bird(s):</strong><br/>Height: ${d.birdHeight}m` : ''}`;
      tooltip.html(content);
  
      const pageX = event.type.includes('touch') ? event.touches[0].pageX : event.pageX;
      const pageY = event.type.includes('touch') ? event.touches[0].pageY : event.pageY;
  
      const leftPos = Math.min(pageX + 10, windowWidth - tooltipWidth - 10);
      tooltip.style("left", leftPos + "px").style("top", (pageY - 28) + "px");
    };
  
    const hideTooltip = () => {
      tooltip.transition().duration(500).style("opacity", 0);
    };
  
    const moveTooltip = (event) => {
      const pageX = event.type.includes('touch') ? event.touches[0].pageX : event.pageX;
      const pageY = event.type.includes('touch') ? event.touches[0].pageY : event.pageY;
      const tooltipWidth = isMobile ? 150 : 200;
      const windowWidth = window.innerWidth;
      const leftPos = Math.min(pageX + 10, windowWidth - tooltipWidth - 10);
      tooltip.style("left", leftPos + "px").style("top", (pageY - 28) + "px");
    };
  
    // Bars
    chartGroup.selectAll(".bar")
      .data(pairedData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.index))
      .attr("y", d => y(d.treeHeight))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.treeHeight))
      .attr("fill", d => {
        if (d.seenHeard === "Heard") return "#D1C4E9";
        if (d.seenHeard === "Seen") return "#A8E6CF";
        if (d.seenHeard === "Not found") return "#FFCDD2";
        return "#ccc";
      })
      .style("cursor", "pointer")
      .on("mouseover", showTooltip)
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip)
      .on("touchstart", showTooltip)
      .on("touchmove", moveTooltip)
      .on("touchend", hideTooltip);
  
    // Bird icons and labels
    pairedData.forEach(d => {
      if (d.hasBird) {
        const iconSize = isMobile ? 15 : 20;
  
        chartGroup.append("image")
          .attr("xlink:href", birdLogo)
          .attr("x", x(d.index) + x.bandwidth() / 2 - iconSize / 2)
          .attr("y", y(d.birdHeight) - iconSize / 2)
          .attr("width", iconSize)
          .attr("height", iconSize)
          .style("cursor", "pointer")
          .on("mouseover", (event) => showTooltip(event, d))
          .on("mousemove", moveTooltip)
          .on("mouseout", hideTooltip)
          .on("touchstart", (event) => showTooltip(event, d))
          .on("touchmove", moveTooltip)
          .on("touchend", hideTooltip);
  
        chartGroup.append("text")
          .attr("x", x(d.index) + x.bandwidth() / 2)
          .attr("y", y(d.birdHeight))
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("dy", "1.5em")
          .text(d.noBirds)
          .style("fill", "black");
      }
    });

    const legendData = [
      { label: "Seen", color: "#A8E6CF" },
      { label: "Heard", color: "#D1C4E9" },
      { label: "Not found", color: "#FFCDD2" }
    ];
    
    const legendContainer = d3.select("#legend-container");
    legendContainer.html(""); // Clear existing legend
    
    legendData.forEach(item => {
      const legendItem = legendContainer.append("div")
        .attr("class", "legend-item")
        .style("display", "inline-flex")
        .style("align-items", "center")
        .style("margin-right", "1rem");
    
      legendItem.append("span")
        .style("display", "inline-block")
        .style("width", "12px")
        .style("height", "12px")
        .style("background-color", item.color)
        .style("margin-right", "0.5rem");
    
      legendItem.append("span")
        .style("font-size", isMobile ? "10px" : "12px")
        .text(item.label);
    });      
  }

  renderTreeStatistics = (treeStatsData) => {
    const { expandedIndex } = this.state;
  
    // Calculate total summary
    const totalEntry = treeStatsData.reduce(
      (acc, curr) => ({
        totalTrees: acc.totalTrees + 1,
        totalHeight: acc.totalHeight + (curr.treeHeight || 0),
        totalBirds: acc.totalBirds + (curr.noBirds || 0),
        totalBirdHeight: acc.totalBirdHeight + (curr.birdHeight || 0),
      }),
      { totalTrees: 0, totalHeight: 0, totalBirds: 0, totalBirdHeight: 0 }
    );
  
    const totalExpanded = expandedIndex === 'total';
  
    return (
      <div className="tree-statistics-container" style={{ marginTop: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
        {/* Sticky Total Row */}
        <div
          onClick={() => this.setState({ expandedIndex: totalExpanded ? null : 'total' })}
          style={{
            position: 'sticky',
            top: 0,
            backgroundColor: totalExpanded ? '#f0f0f0' : '#fff',
            zIndex: 1,
            padding: '0.5rem',
            borderBottom: '2px solid #000',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Trees: {totalEntry.totalTrees}</span>
            <span>Total Birds: {totalEntry.totalBirds}</span>
          </div>
        </div>
  
        {/* Individual Tree Stats */}
        {treeStatsData.map((tree, index) => {
          const isExpanded = expandedIndex === index;
          let backgroundColor = ''; // Default background color
  
          // Set background color based on seenHeard status
          switch (tree.seenHeard) {
            case 'Seen':
              backgroundColor = '#A8E6CF'; // Green color for Seen
              break;
            case 'Heard':
              backgroundColor = '#D1C4E9'; // Purple color for Heard
              break;
            case 'Not found':
              backgroundColor = '#FFCDD2'; // Red color for Not Found
              break;
          }
  
          return (
            <div
              key={index}
              onClick={() => this.setState({ expandedIndex: isExpanded ? null : index })}
              style={{
                cursor: 'pointer',
                padding: '0.5rem',
                borderBottom: '1px solid #ccc',
                backgroundColor: isExpanded ? '#f9f9f9' : backgroundColor, // Apply background color here
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Tree #{tree.index}</strong></span>
                <span>
                  {tree.seenHeard ?? 'Not recorded'}: {tree.noBirds ?? 0} Bird{(tree.noBirds ?? 0) > 1 ? 's' : ''}
                </span>
              </div>
              {isExpanded && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div><strong>Tree Height:</strong> {tree.treeHeight ?? 'N/A'} m</div>
                  <div><strong>Bird Height:</strong> {tree.birdHeight ?? '—'} m</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  renderInsightsPanel = () => {
    const { insights, insightsLoading } = this.state;
    
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
          onClick={() => this.setState({ activeTab1: 'population' })}
          style={{ 
            flex: 1,
            padding: '0.75rem 1rem',
            backgroundColor: this.state.activeTab1 === 'population' ? '#EBF4FF' : 'transparent',
            border: 'none',
            borderBottom: this.state.activeTab1 === 'population' ? '2px solid #4299E1' : '1px solid #E2E8F0',
            color: this.state.activeTab1 === 'population' ? '#3182CE' : '#4A5568',
            fontWeight: this.state.activeTab1 === 'population' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Population Analysis
        </button>
        <button 
          onClick={() => this.setState({ activeTab1: 'anomalyTrends' })}
          style={{ 
            flex: 1,
            padding: '0.75rem 1rem',
            backgroundColor: this.state.activeTab === 'anomalyTrends' ? '#EBF4FF' : 'transparent',
            border: 'none',
            borderBottom: this.state.activeTabq === 'anomalyTrends' ? '2px solid #4299E1' : '1px solid #E2E8F0',
            color: this.state.activeTab1 === 'anomalyTrends' ? '#3182CE' : '#4A5568',
            fontWeight: this.state.activeTab1 === 'anomalyTrends' ? 'bold' : 'normal',
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
          
          <div style={{ fontWeight: 'bold', color: '#4A5568', margin: '1rem 0 0.5rem' }}>
            Low Location Predictions:
          </div>

          {trendPredictions.lowLocations
            .filter(loc => loc.current.total < 10) // adjust threshold as needed
            .map((location, idx) => {
              const growthColor =
                location.prediction.growth === "High" ? "#38A169" :
                location.prediction.growth === "Moderate" ? "#DD6B20" :
                location.prediction.growth === "Low" ? "#E53E3E" :
                "#718096";

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
          AI Height Insights
        </h4>
        {renderTabsNavigation()}
        
        {this.state.activeTab1 === 'population' ? renderPopulationTab() : renderAnomalyTrendsTab()}
      </div>
    );
  };
  
  // Update the generateInsights method to work without countByLocation
generateInsights = async () => {
  const { data } = this.props;
  
  // Extract the data directly
  const treeData = extractTreeHeights(data);
  const birdData = extractBirdHeights(data);
  const noBirdsData = extractNoBirds(data);
  const seenHeardData = extractSeenHeard(data);
  
  // Create a structured dataset for our analysis
  const structuredData = treeData.map((treeHeight, index) => ({
    index: index + 1,
    treeHeight,
    birdHeight: birdData[index] !== undefined ? birdData[index] : null,
    noBirds: noBirdsData[index] !== undefined ? noBirdsData[index] : 0,
    seenHeard: seenHeardData[index] !== undefined ? seenHeardData[index] : 'Not found'
  }));
  
  this.setState({ insightsLoading: true });
  
  try {
    // Simulate a delay for processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Process data for insights without relying on location-based grouping
    const insights = {
      populationAnalysis: this.performDataAnalysis(structuredData),
      anomalyDetection: this.detectAnomalies(structuredData),
      trendPredictions: this.predictTrends(structuredData)
    };
    
    this.setState({ insights, insightsLoading: false, activeTab1: 'population' });
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

// Replace the previous TensorFlow-based methods with direct calculation methods

// Population analysis without TensorFlow
performDataAnalysis = (data) => {
  try {
    // Create categories based on seenHeard status
    const seen = data.filter(item => item.seenHeard === 'Seen');
    const heard = data.filter(item => item.seenHeard === 'Heard');
    const notFound = data.filter(item => item.seenHeard === 'Not found');
    
    // Calculate simple statistics
    const calculateStats = (items) => {
      if (items.length === 0) return { mean: '0.00', std: '0.00' };
      
      const sum = items.reduce((acc, item) => acc + (item.noBirds || 0), 0);
      const mean = sum / items.length;
      
      const variance = items.reduce((acc, item) => {
        const diff = (item.noBirds || 0) - mean;
        return acc + (diff * diff);
      }, 0) / Math.max(1, items.length);
      
      const std = Math.sqrt(variance);
      
      return {
        mean: mean.toFixed(2),
        std: std.toFixed(2)
      };
    };
    
    // Calculate stats for each category
    const seenStats = calculateStats(seen);
    const heardStats = calculateStats(heard);
    const notFoundStats = calculateStats(notFound);
    
    // Generate insights
    // Instead of location-based, we'll use tree height ranges as "locations"
    const heightRanges = [
      { name: '0-5m', trees: [], birds: 0 },
      { name: '5-10m', trees: [], birds: 0 },
      { name: '10-15m', trees: [], birds: 0 },
      { name: '15m+', trees: [], birds: 0 }
    ];
    
    // Categorize trees by height range
    data.forEach(tree => {
      if (tree.treeHeight < 5) {
        heightRanges[0].trees.push(tree);
        heightRanges[0].birds += tree.noBirds || 0;
      } else if (tree.treeHeight < 10) {
        heightRanges[1].trees.push(tree);
        heightRanges[1].birds += tree.noBirds || 0;
      } else if (tree.treeHeight < 15) {
        heightRanges[2].trees.push(tree);
        heightRanges[2].birds += tree.noBirds || 0;
      } else {
        heightRanges[3].trees.push(tree);
        heightRanges[3].birds += tree.noBirds || 0;
      }
    });
    
    // Find most and least active ranges
    const sortedRanges = [...heightRanges].sort((a, b) => b.birds - a.birds);
    
    // Convert to required format for display
    const mostActive = {
      location: sortedRanges[0].name,
      Total: sortedRanges[0].trees.length,
      Seen: sortedRanges[0].trees.filter(t => t.seenHeard === 'Seen').length,
      Heard: sortedRanges[0].trees.filter(t => t.seenHeard === 'Heard').length,
      NotFound: sortedRanges[0].trees.filter(t => t.seenHeard === 'Not found').length,
    };
    
    const leastActive = {
      location: sortedRanges[sortedRanges.length - 1].name,
      Total: sortedRanges[sortedRanges.length - 1].trees.length,
      Seen: sortedRanges[sortedRanges.length - 1].trees.filter(t => t.seenHeard === 'Seen').length,
      Heard: sortedRanges[sortedRanges.length - 1].trees.filter(t => t.seenHeard === 'Heard').length,
      NotFound: sortedRanges[sortedRanges.length - 1].trees.filter(t => t.seenHeard === 'Not found').length,
    };
    
    return {
      statistics: {
        seen: seenStats,
        heard: heardStats,
        notFound: notFoundStats
      },
      insights: {
        mostActive,
        leastActive,
        distributionType: seenStats.std > seenStats.mean ? "Highly Varied" : "Evenly Distributed"
      }
    };
  } catch (error) {
    console.error("Error in data analysis:", error);
    return { error: "Failed to analyze data" };
  }
};

// Anomaly detection without TensorFlow
detectAnomalies = (data) => {
  try {
    // Simple anomaly detection based on statistical outliers
    
    // Calculate bird density (birds per meter of tree height)
    const treeWithDensity = data.map(tree => ({
      ...tree,
      density: tree.treeHeight > 0 ? (tree.noBirds || 0) / tree.treeHeight : 0
    }));
    
    // Calculate mean and standard deviation of density
    const densities = treeWithDensity.map(t => t.density);
    const meanDensity = densities.reduce((sum, val) => sum + val, 0) / densities.length;
    
    const varianceDensity = densities.reduce((sum, val) => {
      const diff = val - meanDensity;
      return sum + (diff * diff);
    }, 0) / densities.length;
    
    const stdDensity = Math.sqrt(varianceDensity);
    
    // Define threshold for outliers (e.g., 2 standard deviations)
    const threshold = 2;
    
    // Find volume anomalies (unusually high or low bird counts)
    const volumeAnomalies = treeWithDensity
      .filter(tree => {
        const zScore = Math.abs((tree.density - meanDensity) / (stdDensity || 1));
        return zScore > threshold;
      })
      .map(tree => ({
        location: `Tree #${tree.index}`,
        Total: tree.noBirds || 0,
        treeHeight: tree.treeHeight
      }));
    
    // Find ratio anomalies (unusual patterns in seen/heard/not found)
    // For example, trees that have birds but were only heard, never seen
    const ratioAnomalies = data
      .filter(tree => {
        // Trees with birds that were only heard, never seen
        if (tree.noBirds > 2 && tree.seenHeard === 'Heard') return true;
        
        // Trees with very high positions of birds relative to tree height
        if (tree.birdHeight && tree.treeHeight && 
            tree.birdHeight > tree.treeHeight * 0.8) return true;
            
        return false;
      })
      .map(tree => ({
        location: `Tree #${tree.index}`,
        Total: tree.noBirds || 0
      }));
    
    return {
      volumeAnomalies,
      ratioAnomalies,
      anomalyThreshold: threshold,
      summary: {
        totalAnomalies: volumeAnomalies.length + ratioAnomalies.length,
        significance: volumeAnomalies.length > 0 ? "High" : "Low"
      }
    };
  } catch (error) {
    console.error("Error in anomaly detection:", error);
    return { error: "Failed to detect anomalies" };
  }
};

// Trend predictions without TensorFlow
predictTrends = (data) => {
  try {
    // Group trees by height ranges for analysis
    const ranges = [
      { name: '0-5m', trees: [] },
      { name: '5-10m', trees: [] },
      { name: '10-15m', trees: [] },
      { name: '15m+', trees: [] }
    ];
    
    // Categorize trees
    data.forEach(tree => {
      if (tree.treeHeight < 5) {
        ranges[0].trees.push(tree);
      } else if (tree.treeHeight < 10) {
        ranges[1].trees.push(tree);
      } else if (tree.treeHeight < 15) {
        ranges[2].trees.push(tree);
      } else {
        ranges[3].trees.push(tree);
      }
    });
    
    // Process each range
    const processedRanges = ranges.map(range => {
      const totalBirds = range.trees.reduce((sum, tree) => sum + (tree.noBirds || 0), 0);
      const seenCount = range.trees.filter(t => t.seenHeard === 'Seen').length;
      const heardCount = range.trees.filter(t => t.seenHeard === 'Heard').length;
      const notFoundCount = range.trees.filter(t => t.seenHeard === 'Not found').length;
      
      // Calculate percentages for prediction
      const seenRatio = range.trees.length > 0 ? seenCount / range.trees.length : 0;
      const heardRatio = range.trees.length > 0 ? heardCount / range.trees.length : 0;
      
      // Determine growth prediction
      let growth = "Low";
      if (seenRatio > 0.6) growth = "High";
      else if (seenRatio > 0.4) growth = "Moderate";
      
      // Determine trend prediction
      let trend = "Stable";
      if (seenRatio > heardRatio && seenRatio > 0.4) trend = "Increasing visibility";
      else if (heardRatio > seenRatio && heardRatio > 0.4) trend = "Increasing awareness";
      else if (notFoundCount > (seenCount + heardCount)) trend = "Decreasing presence";
      
      return {
        location: range.name,
        current: {
          total: totalBirds,
          trees: range.trees.length,
          seen: seenCount,
          heard: heardCount
        },
        prediction: {
          growth,
          trend,
          confidence: (Math.max(seenRatio, heardRatio) * 100).toFixed(1) + "%"
        }
      };
    });
    
    // Sort by bird count for top and low locations
    const sorted = [...processedRanges].sort((a, b) => b.current.total - a.current.total);
    const topLocations = sorted.slice(0, 2);
    const lowLocations = sorted.slice(-2);
    
    return {
      topLocations,
      lowLocations,
      overallTrend: topLocations.length > 0 && topLocations[0].prediction.growth === "High"
        ? "Positive"
        : "Stable"
    };
  } catch (error) {
    console.error("Error in trend predictions:", error);
    return { error: "Failed to generate trend predictions" };
  }
};

  renderReport = () => {
    const { data } = this.props;
    const treeData = extractTreeHeights(data);
    const birdData = extractBirdHeights(data);
    const seenHeardData = extractSeenHeard(data);
    const noBirdsData = extractNoBirds(data);
    
    const pairedData = treeData.map((treeHeight, index) => ({
      index: index + 1,
      treeHeight,
      birdHeight: birdData[index] ?? null,
      noBirds: noBirdsData[index] ?? 0, 
      seenHeard: seenHeardData[index] ?? null,
    }));
    
    // Summary statistics
    const seenCount = pairedData.filter(item => item.seenHeard === "Seen").length;
    const heardCount = pairedData.filter(item => item.seenHeard === "Heard").length;
    const notFoundCount = pairedData.filter(item => item.seenHeard === "Not found").length;
    const totalCount = pairedData.length;
    
    return (
      <div className="report-container" style={{ 
        padding: '1rem',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        maxHeight: '500px',
        overflowY: 'auto',
        marginTop: '1.5rem'
      }}>
        <h4 style={{ marginTop: 0, color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          Tree and Bird Observation Report
        </h4>
        
        {/* Summary Statistics */}
        <h5 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>Summary Statistics</h5>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '1rem', 
          marginBottom: '1.5rem',
          padding: '0.5rem',
          backgroundColor: '#f7fafc',
          borderRadius: '4px'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#6366F1' }}>{totalCount}</div>
            <div style={{ color: '#718096' }}>Total Trees</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#A8E6CF' }}>{seenCount}</div>
            <div style={{ color: '#718096' }}>Seen ({Math.round(seenCount / totalCount * 100)}%)</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#D1C4E9' }}>{heardCount}</div>
            <div style={{ color: '#718096' }}>Heard ({Math.round(heardCount / totalCount * 100)}%)</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#FFCDD2' }}>{notFoundCount}</div>
            <div style={{ color: '#718096' }}>Not Found ({Math.round(notFoundCount / totalCount * 100)}%)</div>
          </div>
        </div>

        <h5 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>Height Statistics</h5>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginBottom: '1.5rem',
          padding: '0.5rem',
          backgroundColor: '#f7fafc',
          borderRadius: '4px'
        }}>
        </div>
        
        {/* Tree Data Table */}
        <h5 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>Tree Data</h5>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tree #</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Height (m)</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Birds</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Bird Height (m)</th>
              </tr>
            </thead>
            <tbody>
              {pairedData.map((tree, idx) => (
                <tr key={idx} style={{ 
                  borderBottom: '1px solid #e2e8f0',
                  backgroundColor: idx % 2 === 0 ? 'white' : '#f7fafc',
                }}>
                  <td style={{ padding: '0.75rem' }}>{tree.index}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{tree.treeHeight}</td>
                  <td style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center',
                    color: tree.seenHeard === "Seen" ? "#38A169" : 
                           tree.seenHeard === "Heard" ? "#805AD5" : 
                           tree.seenHeard === "Not found" ? "#E53E3E" : "#718096"
                  }}>
                    {tree.seenHeard || "Not recorded"}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{tree.noBirds}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    {tree.birdHeight !== null ? tree.birdHeight : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  render() 
  {
    const { showInsightsPanel, showReportPanel } = this.state;
    let treeData = extractTreeHeights(this.props.data);
    let birdData = extractBirdHeights(this.props.data);
    let noBirdsData = extractNoBirds(this.props.data);
    let seenHeardData = extractSeenHeard(this.props.data);
    
    const pairedData = treeData.map((treeHeight, index) => ({
      index: index + 1,
      treeHeight,
      birdHeight: birdData[index] ?? null, // Use null if birdHeight is undefined
      noBirds: noBirdsData[index] ?? 0, // Use 0 if noBirdsData is undefined
      seenHeard: seenHeardData[index] ?? null, // Use the corresponding value from seenHeardData
    }));

    return (
      <>
      <div 
        ref={this.chartContainer}
        className="chart-container" 
        style={{
          overflowX: 'auto',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Tree Heights and SHB Habitation</h2>
          <div>
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

        {/* Chart is always displayed */}
        <svg
          ref={this.d3Container}
          width={this.state.width}
          height={this.state.height}
        />
        <div
          id="legend-container"
          className="legend-container"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: "1rem",
            marginBottom: "1rem",
          }}
        ></div>

        {/* Report is only displayed after clicking the Generate Report button */}
        {this.state.showInsightsPanel === true && this.state.showReportPanel === false && this.renderInsightsPanel()}
        {this.state.showInsightsPanel === false && this.state.showReportPanel === true && this.renderReport()}
        
        {/* Statistics are always displayed */}
        {this.renderTreeStatistics(pairedData)}
        
      </div>
      </>
    );
  }
}

export default D3TreeHeightChart;