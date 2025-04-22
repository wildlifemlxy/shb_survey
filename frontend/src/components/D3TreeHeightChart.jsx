import React, { Component } from 'react';
import * as d3 from 'd3';
import { extractTreeHeights, extractBirdHeights, extractSeenHeard, extractNoBirds } from '../utils/dataProcessing';
import birdLogo from '../assets/bird-logo.png';

//OK

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
      showReport: false,
      showPercentageView: false
    };
  }

  togglePercentageView = () => {
    this.setState(prevState => ({
      showPercentageView: !prevState.showPercentageView
    }), () => {
      // Re-render the chart with the new view mode
      this.renderChart();
    });
  };


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
    const { isMobile, showPercentageView } = this.state;
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
        index: index + 1,
        // Pre-calculate percentage for consistent use
        birdPercentage: hasBird && treeHeight > 0 ? (birdHeight / treeHeight) * 100 : 0
      };
    });

    const seenOnlyData = pairedData.filter(item => item.seenHeard === "Seen");
  
    // Setup dimensions
    const margin = isMobile ? { top: 30, right: 15, bottom: 40, left: 35 } : { top: 30, right: 30, bottom: 50, left: 50 };
    const width = this.state.width - margin.left - margin.right;
    const height = this.state.height - margin.top - margin.bottom;
  
    // Create scales
    const x = d3.scaleBand()
      .domain(seenOnlyData.map(d => d.index))
      .range([0, width])
      .padding(isMobile ? 0.2 : 0.3);
  
    // Modify y scale based on view mode
    const y = d3.scaleLinear()
      .domain(showPercentageView ? [0, 100] : [0, d3.max(seenOnlyData, d => d.treeHeight) * 1.1])
      .range([height, 0]);
      
    const chartGroup = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Add axes
    chartGroup.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y)
        .ticks(isMobile ? 5 : 10)
        .tickFormat(d => {
          if (isMobile && d % 1 !== 0) return '';
          return showPercentageView ? `${d}%` : d;
        }))
      .selectAll("text")
      .style("font-size", isMobile ? "10px" : "12px");
  
    // Tooltip setup
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
  
    // Tooltip handlers
    const moveTooltip = (event) => {
      const pageX = event.type.includes('touch') ? event.touches[0].pageX : event.pageX;
      const pageY = event.type.includes('touch') ? event.touches[0].pageY : event.pageY;
      const tooltipWidth = isMobile ? 150 : 200;
      const windowWidth = window.innerWidth;
      const leftPos = Math.min(pageX + 10, windowWidth - tooltipWidth - 10);
      tooltip.style("left", leftPos + "px").style("top", (pageY - 28) + "px");
    };
  
    const hideTooltip = () => {
      tooltip.transition().duration(500).style("opacity", 0);
    };
  
    // Show tooltip function
    const showTooltip = (event, d) => {
      const tooltipWidth = isMobile ? 150 : 200;
      const windowWidth = window.innerWidth;
  
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
  
      let content = '';
      if (showPercentageView) {
        const percentage = d.birdPercentage.toFixed(1);
        content = `<strong>Tree #${d.index}</strong><br/>
                    Bird Position: ${percentage}%`;
      } else {
        content = `<strong>Tree #${d.index}</strong><br/>
                Height: ${d.treeHeight}m<br/>
                ${d.hasBird ? `<strong>Bird(s):</strong><br/>Height: ${d.birdHeight}m` : ''}`;
      }
      tooltip.html(content);
  
      const pageX = event.type.includes('touch') ? event.touches[0].pageX : event.pageX;
      const pageY = event.type.includes('touch') ? event.touches[0].pageY : event.pageY;
  
      const leftPos = Math.min(pageX + 10, windowWidth - tooltipWidth - 10);
      tooltip.style("left", leftPos + "px").style("top", (pageY - 28) + "px");
    };
  
    // Render bars
    chartGroup.selectAll(".bar")
      .data(seenOnlyData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.index))
      .attr("y", d => {
        if (showPercentageView) {
          // In percentage view, all bars start from 0% (bottom)
          return y(100);
        }
        return y(d.treeHeight);
      })
      .attr("width", x.bandwidth())
      .attr("height", d => {
        if (showPercentageView) {
          // In percentage view, all bars are 100% height
          return height - y(100);
        }
        return height - y(d.treeHeight);
      })
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
  
    // X-axis
    chartGroup.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .tickValues(isMobile && seenOnlyData.length > 10
          ? seenOnlyData.filter(d => d.index % 2 === 0).map(d => d.index)
          : null))
      .selectAll("text")
      .style("text-anchor", "middle")
      .style("font-size", isMobile ? "10px" : "12px");
  
    // Bird icons and labels
    seenOnlyData.forEach(d => {
      if (d.hasBird) {
        const iconSize = isMobile ? 15 : 20;
        
        // Calculate bird position correctly for percentage view
        let yPosition;
        if (showPercentageView) {
          // Bird position should be at its percentage height from the bottom
          // Map the percentage value (0-100) to the y-scale
          yPosition = y(d.birdPercentage);
        } else {
          // In normal view, just use the absolute bird height
          yPosition = y(d.birdHeight);
        }
  
        chartGroup.append("image")
          .attr("xlink:href", birdLogo)
          .attr("x", x(d.index) + x.bandwidth() / 2 - iconSize / 2)
          .attr("y", yPosition - iconSize / 2)
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
          .attr("y", yPosition)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("dy", "1.5em")
          .text(d.noBirds)
          .style("fill", "black");
      }
    });
  
    // Legend
    const legendData = [
      { label: "Seen", color: "#A8E6CF" },
      //{ label: "Heard", color: "#D1C4E9" },
      //{ label: "Not found", color: "#FFCDD2" }
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
    const { expandedIndex, showPercentageView } = this.state;
  
    // Calculate total summary
    const totalEntry = treeStatsData.reduce(
      (acc, curr) => ({
        totalTrees: acc.totalTrees + 1,
        totalHeight: acc.totalHeight + (curr.treeHeight || 0),
        totalBirds: acc.totalBirds + (curr.noBirds || 0),
      }),
      { totalTrees: 0, totalHeight: 0, totalBirds: 0}
    );
  
    const totalExpanded = expandedIndex === 'total';
  
    return (
      <div
        className="tree-statistics-container"
        style={{ marginTop: '1rem', maxHeight: '200px', overflowY: 'auto' }}
      >
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
          let backgroundColor = '';
  
          switch (tree.seenHeard) {
            case 'Seen':
              backgroundColor = '#A8E6CF';
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
                backgroundColor: isExpanded ? '#f9f9f9' : backgroundColor,
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
                  {showPercentageView === true ? (
                    <div>
                      <strong>Bird Height Position:</strong>{' '}
                      {`${(tree.birdHeight/tree.treeHeight)*100}%`}
                    </div>
                  ) : (
                    <>
                      <div><strong>Tree Height:</strong> {tree.treeHeight ?? 'N/A'} m</div>
                      <div><strong>Bird Height:</strong> {tree.birdHeight ?? '—'} m</div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };  

  renderInsightsPanel = () => {
    const { insights, insightsLoading, showPercentageView } = this.state;
    
    if (insightsLoading) {
      return (
        <div className="insights-loading" style={{ 
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          marginTop: '1rem'
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
        marginBottom: '1rem',
        marginTop: '1rem',
        width: '100%'
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
            backgroundColor: this.state.activeTab1 === 'anomalyTrends' ? '#EBF4FF' : 'transparent',
            border: 'none',
            borderBottom: this.state.activeTab1 === 'anomalyTrends' ? '2px solid #4299E1' : '1px solid #E2E8F0',
            color: this.state.activeTab1 === 'anomalyTrends' ? '#3182CE' : '#4A5568',
            fontWeight: this.state.activeTab1 === 'anomalyTrends' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Anomalies & Trends
        </button>
      </div>
    );
  
    // Standard Population Analysis Tab Content
    const renderStandardPopulationTab = () => (
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
          </div>
        </div>
      </div>
    );
  
    const renderPercentagePopulationTab = () => {
      const positionStats = populationAnalysis.insights.positionStats || [];
      return (
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
            Population Analysis (Percentage View by Tree Position)
          </h5>

          {positionStats.length === 0 ? (
            <div style={{ color: '#718096' }}>No positional data available.</div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              padding: '0.75rem',
              backgroundColor: '#F7FAFC',
              borderRadius: '4px',
              marginBottom: '1rem'
            }}>
              {positionStats.map((pos, index) => {
                const total = pos.Total || 1;
                const seenPercent = ((pos.Seen / total) * 100).toFixed(1);

                return (
                  <div key={index} style={{
                    backgroundColor: '#FFFFFF',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    border: '1px solid #E2E8F0'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#4A5568' }}>
                      Position: {pos.position}
                    </div>
                    <div>Total Observations: {pos.Total}</div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <div style={{ width: '10px', height: '10px', backgroundColor: '#A8E6CF', marginRight: '8px' }}></div>
                        <div>Seen: <strong>{seenPercent}%</strong></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    };

    const renderAnomalyTrendsTab = () => {
      const totalBirds = Object.values(anomalyDetection.birdPositionDistribution).reduce((total, count) => total + count, 0);
      return (
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
            {console.log("Anomaly Detection:", anomalyDetection)}
            
            {/* Commented out anomaly summary section
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
                        <strong>{anomaly.location}</strong>: Unusual ratio of Seen
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {anomalyDetection.volumeAnomalies.length === 0 && anomalyDetection.ratioAnomalies.length === 0 && (
                <div style={{ color: '#718096' }}>No significant anomalies detected in the data.</div>
              )}
            </div>
            */}
          </div>
          {console.log("Trend Prediction:", trendPredictions)}
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
              {/* Bird Tree Visualization Toggle */}
              <div style={{ fontWeight: 'bold', color: '#4A5568', marginBottom: '0.5rem' }}>
                {this.state.showPercentageView ? "Bird Height Positions (percentage):" : "Bird Height Positions:"}
              </div>
              
              {/* Toggle between percentage view and original view */}
              {this.state.showPercentageView ? (
                // Bird height percentage view
                <div style={{ 
                  backgroundColor: "#FFFFFF", 
                  padding: '0.75rem', 
                  borderRadius: '4px',
                  marginBottom: '0.5rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                    <svg width="100" height="150" viewBox="0 0 100 150" style={{ marginRight: '1rem' }}>
                      {/* Tree visualization with height markers */}
                      <path d="M50,130 L50,50" stroke="#8B4513" strokeWidth="6" /> {/* Tree trunk */}
                      <ellipse cx="50" cy="40" rx="30" ry="35" fill="#2F855A" /> {/* Tree crown */}
                      
                      {/* Height marker lines */}
                      <line x1="15" y1="130" x2="85" y2="130" stroke="#718096" strokeWidth="1" strokeDasharray="2" />
                      <text x="5" y="134" fontSize="8" fill="#718096">0%</text>
                      
                      <line x1="15" y1="85" x2="85" y2="85" stroke="#718096" strokeWidth="1" strokeDasharray="2" />
                      <text x="5" y="89" fontSize="8" fill="#718096">50%</text>
                      
                      <line x1="15" y1="40" x2="85" y2="40" stroke="#718096" strokeWidth="1" strokeDasharray="2" />
                      <text x="5" y="44" fontSize="8" fill="#718096">100%</text>
                      
                      {/* Bird positions */}
                      {console.log("trendPredictions1111:", trendPredictions)}
                      {trendPredictions.topLocations.map((location, idx) => {
                        // Calculate bird position based on height percentage
                        const heightPercentage = (location.tree && location.tree.birdHeight && location.tree.treeHeight) 
                          ? (location.tree.birdHeight / location.tree.treeHeight) * 100 
                          : 50; // Default to middle if data missing
                        
                        // Position the bird vertically based on height percentage (130 = bottom, 40 = top)
                        const birdY = 130 - (heightPercentage * 0.9); // Scale to fit SVG
                        const birdX = 50 + ((idx % 5) * 6 - 12); // Distribute horizontally
                        
                        return (
                          <g key={idx}>
                            <circle cx={birdX} cy={birdY} r="3" fill="#C53030" />
                            <text x={birdX + 5} y={birdY} fontSize="8" fill="#000000">
                              {Math.round(heightPercentage)}%
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                    
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Bird Height Analysis</div>
                      {console.log("Remder123:", anomalyDetection)}
                      
                      <div style={{ marginBottom: '0.25rem' }}>
                      <strong>Crown (75-100%):</strong>{' '}
                      {anomalyDetection.birdPositionDistribution ? 
                          `${((anomalyDetection.birdPositionDistribution["Crown (75-100%)"] / totalBirds) * 100).toFixed(1)}%` : 
                          '0%'}
                      </div>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Crown (75-100%):</strong>{' '}
                        {anomalyDetection.birdPositionDistribution ? 
                          `${((anomalyDetection.birdPositionDistribution["Crown (75-100%)"] / totalBirds) * 100).toFixed(1)}%` : 
                          '0%'}
                      </div>

                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Upper (50-75%):</strong>{' '}
                        {anomalyDetection.birdPositionDistribution ? 
                          `${((anomalyDetection.birdPositionDistribution["Upper (50-75%)"] / totalBirds) * 100).toFixed(1)}%` : 
                          '0%'}
                      </div>

                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Lower (25-50%):</strong>{' '}
                        {anomalyDetection.birdPositionDistribution ? 
                          `${((anomalyDetection.birdPositionDistribution["Lower (25-50%)"] / totalBirds) * 100).toFixed(1)}%` : 
                          '0%'} 
                      </div>

                      <div>
                        <strong>Base (0-25%):</strong>{' '}
                        {anomalyDetection.birdPositionDistribution ? 
                          `${((anomalyDetection.birdPositionDistribution["Base (0-25%)"] / totalBirds) * 100).toFixed(1)}%` : 
                          '0%'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  backgroundColor: "#FFFFFF", 
                  padding: '0.75rem', 
                  borderRadius: '4px',
                  marginBottom: '0.5rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                    <svg width="100" height="150" viewBox="0 0 100 150" style={{ marginRight: '1rem' }}>
                      {/* Tree visualization with height markers */}
                      <path d="M50,130 L50,50" stroke="#8B4513" strokeWidth="6" /> {/* Tree trunk */}
                      <ellipse cx="50" cy="40" rx="30" ry="35" fill="#2F855A" /> {/* Tree crown */}
                      
                      {/* Height marker lines */}
                      <line x1="15" y1="130" x2="85" y2="130" stroke="#718096" strokeWidth="1" strokeDasharray="2" />
                      <text x="5" y="134" fontSize="8" fill="#718096">0%</text>
                      
                      <line x1="15" y1="85" x2="85" y2="85" stroke="#718096" strokeWidth="1" strokeDasharray="2" />
                      <text x="5" y="89" fontSize="8" fill="#718096">50%</text>
                      
                      <line x1="15" y1="40" x2="85" y2="40" stroke="#718096" strokeWidth="1" strokeDasharray="2" />
                      <text x="5" y="44" fontSize="8" fill="#718096">100%</text>
                      
                      {/* Bird positions */}
                      {console.log("trendPredictions1111:", trendPredictions)}
                      {trendPredictions.topLocations.map((location, idx) => {
                        // Calculate bird position based on height percentage
                        const heightPercentage = (location.tree && location.tree.birdHeight && location.tree.treeHeight) 
                          ? (location.tree.birdHeight / location.tree.treeHeight) * 100 
                          : 50; // Default to middle if data missing
                        
                        // Position the bird vertically based on height percentage (130 = bottom, 40 = top)
                        const birdY = 130 - (heightPercentage * 0.9); // Scale to fit SVG
                        const birdX = 50 + ((idx % 5) * 6 - 12); // Distribute horizontally
                        
                        return (
                          <g key={idx}>
                            <circle cx={birdX} cy={birdY} r="3" fill="#C53030" />
                            <text x={birdX + 5} y={birdY} fontSize="8" fill="#000000">
                              {Math.round(heightPercentage)}%
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                    
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Bird Height Analysis</div>
                      {console.log("Remder123:", anomalyDetection)}
                      {/* Calculate the total dynamically */}
                      
                      {console.log("Total Birds:", totalBirds)}
                      
                      <div style={{ marginBottom: '0.25rem' }}>
                      <strong>Crown (75-100%):</strong>{' '}
                        {anomalyDetection.birdPositionDistribution ? anomalyDetection.birdPositionDistribution["Crown (75-100%)"] : 0} birds
                      </div>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Upper (50-75%):</strong>{' '}
                        {anomalyDetection.birdPositionDistribution ? anomalyDetection.birdPositionDistribution["Upper (50-75%)"] : 0} birds
                      </div>
                      
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Lower (25-50%):</strong>{' '}
                        {anomalyDetection.birdPositionDistribution ? anomalyDetection.birdPositionDistribution["Lower (25-50%)"] : 0} birds
                      </div>
                      
                      <div>
                        <strong>Base (0-25%):</strong>{' '}
                        {anomalyDetection.birdPositionDistribution ? anomalyDetection.birdPositionDistribution["Base (0-25%)"] : 0} birds
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                    {this.state.showPercentageView ? 
                      "Bird height percentages indicate relative position on trees. Higher percentages suggest preference for tree canopies and crowns." :
                      "These predictions are based on current patterns and may change as more data becomes available. For more accurate predictions, consider collecting historical data over longer time periods."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    };
  
    // Toggle button for switching between standard and percentage views
    const renderViewToggle = () => (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
      </div>
    );
  
    return (
      <>
        {renderTabsNavigation()}
        
        {this.state.activeTab1 === 'population' && renderViewToggle()}
        
        {this.state.activeTab1 === 'population' 
          ? (showPercentageView ? renderPercentagePopulationTab() : renderStandardPopulationTab())
          : renderAnomalyTrendsTab()}
      </>
    );
  };
    
  generateInsights = async () => {
    const { data } = this.props;
    console.log("showPercentageView in generateInsights:", this.state.showPercentageView); // Log the value here
    
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
        populationAnalysis: this.performDataAnalysis(structuredData, this.state.showPercentageView),
        anomalyDetection: this.detectAnomalies(structuredData, this.state.showPercentageView),
        trendPredictions: this.predictTrends(structuredData, this.state.showPercentageView)
      };

      console.log("Insights1111:", insights);
      
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

    performDataAnalysis = (data, showPercentageView) => {
      try {
        const seen = data.filter(item => item.seenHeard === 'Seen');
    
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
    
        const seenStats = calculateStats(seen);
    
        const heightRanges = [
          { name: '0-5m', trees: [], birds: 0 },
          { name: '5-10m', trees: [], birds: 0 },
          { name: '10-15m', trees: [], birds: 0 },
          { name: '15m+', trees: [], birds: 0 }
        ];
    
        // Categorize trees by height range
        data.forEach(tree => {
          const height = tree.treeHeight || 0;
          const birds = tree.noBirds || 0;
    
          if (height < 5) {
            heightRanges[0].trees.push(tree);
            heightRanges[0].birds += birds;
          } else if (height < 10) {
            heightRanges[1].trees.push(tree);
            heightRanges[1].birds += birds;
          } else if (height < 15) {
            heightRanges[2].trees.push(tree);
            heightRanges[2].birds += birds;
          } else {
            heightRanges[3].trees.push(tree);
            heightRanges[3].birds += birds;
          }
        });
    
        const totalBirds = heightRanges.reduce((acc, range) => acc + range.birds, 0);
    
        // Prepare height range data with optional percentage view
        const processedRanges = heightRanges.map(range => {
          const birdCount = range.birds;
          const percentage = totalBirds > 0 ? ((birdCount / totalBirds) * 100).toFixed(2) + '%' : '0.00%';
          return {
            ...range,
            birds: showPercentageView ? percentage : birdCount
          };
        });
    
        // Choose sorting method based on view type
        const sortedRanges = showPercentageView
          ? [...heightRanges]
              .map(r => ({
                ...r,
                birdPercentage: totalBirds > 0 ? (r.birds / totalBirds) * 100 : 0
              }))
              .sort((a, b) => b.birdPercentage - a.birdPercentage)
          : [...heightRanges].sort((a, b) => b.birds - a.birds);
    
        const mostActive = {
          location: sortedRanges[0].name,
          Total: sortedRanges[0].trees.length,
          Seen: sortedRanges[0].trees.filter(t => t.seenHeard === 'Seen').length,
          Percentage: showPercentageView
            ? sortedRanges[0].birdPercentage.toFixed(2) + '%'
            : undefined
        };
    
        const leastActive = {
          location: sortedRanges[sortedRanges.length - 1].name,
          Total: sortedRanges[sortedRanges.length - 1].trees.length,
          Seen: sortedRanges[sortedRanges.length - 1].trees.filter(t => t.seenHeard === 'Seen').length,
          Percentage: showPercentageView
            ? sortedRanges[sortedRanges.length - 1].birdPercentage.toFixed(2) + '%'
            : undefined
        };
    
        return {
          statistics: {
            seen: seenStats
          },
          insights: {
            mostActive,
            leastActive,
            distributionType: seenStats.std > seenStats.mean ? "Highly Varied" : "Evenly Distributed"
          },
          heightRangeData: processedRanges
        };
      } catch (error) {
        console.error("Error in data analysis:", error);
        return { error: "Failed to analyze data" };
      }
    };
    
    // Anomaly detection with bird position in tree
    // Anomaly detection with bird position in tree (with showPercentageView flag)
    detectAnomalies = (data, showPercentageView) => {
      console.log("Show Percentage View:", showPercentageView);
      try {
        // Function to categorize bird position with your specific zones
        const categorizeBirdPosition = (birdPositionRatio) => {
          if (birdPositionRatio === null || birdPositionRatio === undefined) {
            return "Unknown";
          }
          
          if (birdPositionRatio >= 0.75) {
            return "Crown (75-100%)";
          } else if (birdPositionRatio >= 0.5) {
            return "Upper (50-75%)";
          } else if (birdPositionRatio >= 0.25) {
            return "Lower (25-50%)";
          } else {
            return "Base (0-25%)";
          }
        };
    
        // Step 1: Calculate bird density (birds per meter of tree height)
        const treeWithDensity = data.map(tree => {
          const density = tree.treeHeight > 0 ? (tree.noBirds || 0) / tree.treeHeight : 0;
          const birdPositionRatio = (tree.birdHeight && tree.treeHeight > 0)
            ? tree.birdHeight / tree.treeHeight
            : null; // If no birdHeight or treeHeight, set to null or 0
          
          // Add position category
          const positionCategory = categorizeBirdPosition(birdPositionRatio)
    
          return {
            ...tree,
            density,
            birdPositionRatio,
            positionCategory
          };
        }).filter(tree => tree.seenHeard === "Seen");
    
        // Step 2: Calculate mean and standard deviation of density
        const densities = treeWithDensity.map(t => t.density);
        const meanDensity = densities.reduce((sum, val) => sum + val, 0) / densities.length;
    
        const varianceDensity = densities.reduce((sum, val) => {
          const diff = val - meanDensity;
          return sum + (diff * diff);
        }, 0) / densities.length;
    
        const stdDensity = Math.sqrt(varianceDensity);
    
        // Step 3: Define threshold for outliers (e.g., 2 standard deviations)
        const threshold = 2;
    
        // Step 4: Find volume anomalies (unusually high or low bird counts)
        const volumeAnomalies = treeWithDensity
          .filter(tree => {
            const zScore = Math.abs((tree.density - meanDensity) / (stdDensity || 1));
            return zScore > threshold;
          })
          .map(tree => ({
            location: `Tree #${tree.index}`,
            Total: tree.noBirds || 0,
            treeHeight: tree.treeHeight,
            birdPosition: showPercentageView
              ? (tree.birdPositionRatio ? (tree.birdPositionRatio * 100).toFixed(2) + "%" : "N/A") // Show as percentage
              : (tree.birdPositionRatio ? `${(tree.birdPositionRatio * tree.treeHeight).toFixed(2)} meters` : "N/A"), // Show as location (in meters)
            positionCategory: tree.positionCategory || "Unknown"
          }));
    
        console.log("Tree with Density:", treeWithDensity);
        
        // Step 5: Find ratio anomalies (unusual patterns in seen/heard/not found)
        // For example, trees that have birds but were only heard, never seen
        const ratioAnomalies = data
          .filter(tree => {
            // Trees with birds that were only heard, never seen
            if (tree.noBirds > 2 && tree.seenHeard === 'Heard') return true;
    
            // Trees with very high positions of birds relative to tree height
            if (tree.birdHeight && tree.treeHeight && tree.birdHeight > tree.treeHeight * 0.8) return true;
    
            return false;
          })
          .map(tree => {
            const birdPositionRatio = (tree.birdHeight && tree.treeHeight > 0)
              ? tree.birdHeight / tree.treeHeight
              : null;
            
            const positionCategory = categorizeBirdPosition(birdPositionRatio);
            
            return {
              location: `Tree #${tree.index}`,
              Total: tree.noBirds || 0,
              birdPosition: showPercentageView
                ? (birdPositionRatio ? (birdPositionRatio * 100).toFixed(2) + "%" : "N/A") // Show as percentage
              : (birdPositionRatio ? `${(birdPositionRatio * tree.treeHeight).toFixed(2)} meters` : "N/A"), // Show as location (in meters)
              positionCategory: positionCategory
            };
          });
    
          console.log("Ratio:", ratioAnomalies);
        // Count birds by position category
        const positionCounts = {
          "Crown (75-100%)": 0,
          "Upper (50-75%)": 0,
          "Lower (25-50%)": 0,
          "Base (0-25%)": 0,
          "Unknown": 0
        };
    
        // Make sure to properly count all birds in each category
        treeWithDensity.forEach(tree => {
          if (tree.noBirds && tree.positionCategory) {
            positionCounts[tree.positionCategory] += parseInt(tree.noBirds);
          }
        });
    
        // Generate bird height analysis text
        const birdHeightAnalysis = `**Bird Height Analysis**
    **Crown (75-100%):** ${positionCounts["Crown (75-100%)"]} birds
    **Upper (50-75%):** ${positionCounts["Upper (50-75%)"]} birds
    **Lower (25-50%):** ${positionCounts["Lower (25-50%)"]} birds
    **Base (0-25%):** ${positionCounts["Base (0-25%)"]} birds`

        console.log("Bird Height Analysis:", birdHeightAnalysis);
    
        // Step 6: Return anomalies and summary
        return {
          volumeAnomalies,
          ratioAnomalies,
          anomalyThreshold: threshold,
          birdPositionDistribution: positionCounts,
          birdHeightAnalysis,
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

    predictTrends = (data, showPercentageView) => {
      console.log("Data111:", data);
      try {
        // Initialize bird position distribution
        const birdPositionDistribution = { base: 0, lower: 0, upper: 0, crown: 0 };
    
        // Process each tree data
        const processedRanges = data.map(tree => {
          const totalBirds = tree.noBirds || 0;
    
          // Bird height distribution
          let weightedSum = 0;
          let birdCountForPosition = 0;
    
          if (tree.treeHeight && tree.birdHeight) {
            const ratio = tree.birdHeight / tree.treeHeight;
    
            // Distribute birds by height ratio
            if (ratio <= 0.25) birdPositionDistribution.base += tree.noBirds;
            else if (ratio <= 0.5) birdPositionDistribution.lower += tree.noBirds;
            else if (ratio <= 0.75) birdPositionDistribution.upper += tree.noBirds;
            else birdPositionDistribution.crown += tree.noBirds;
    
            // Weight the bird positions
            let weight = 0;
            if (ratio <= 0.25) weight = 12.5;
            else if (ratio <= 0.5) weight = 37.5;
            else if (ratio <= 0.75) weight = 62.5;
            else weight = 87.5;
            weightedSum += weight;
            birdCountForPosition += 1;
          }
    
          // Calculate weighted average for bird positions
          const weightedPositionAverage = birdCountForPosition > 0
            ? (weightedSum / birdCountForPosition)
            : 0;
    
          const seenCount = tree.seenHeard === 'Seen' ? 1 : 0;
          const seenRatio = totalBirds > 0 ? seenCount / totalBirds : 0;
    
          // Calculate growth prediction based on the seen ratio
          let growth = "Low";
          if (seenRatio > 0.6) growth = "High";
          else if (seenRatio > 0.4) growth = "Moderate";
    
          let trend = "Stable";
          if (seenRatio > 0.5) trend = "Increasing visibility";
          else if (seenRatio < 0.2) trend = "Decreasing presence";
    
          // Prepare data for prediction
          return {
            current: {
              total: totalBirds,
              seen: seenCount,
            },
            prediction: {
              growth,
              trend,
              confidence: (seenRatio * 100).toFixed(1) + "%",
            },
            tree: {
              treeHeight: tree.treeHeight || 0,
              birdHeight: tree.birdHeight || 0,
            },
            birdPositionDistribution,
            weightedPositionAverage: parseFloat(weightedPositionAverage.toFixed(1)),
          };
        });
    
        // Sorting data by total birds seen
        const sorted = [...processedRanges].sort((a, b) => b.current.total - a.current.total);
        const topLocations = sorted.slice(0, 2);
        const lowLocations = sorted.slice(-2);
    
        // If showPercentageView is true, calculate position percentage
        if (showPercentageView) {
          const addPositionPercentage = (location) => {
            if (location.tree && location.tree.treeHeight && location.tree.birdHeight) {
              location.positionPercentage = (location.tree.birdHeight / location.tree.treeHeight) * 100;
            }
          };
          topLocations.forEach(addPositionPercentage);
          lowLocations.forEach(addPositionPercentage);
        }
    
        // Tree parts trend calculation for top and low locations
        const calculateTreePartsTrend = (location) => {
          const totalBirdsPosition = Object.values(location.birdPositionDistribution).reduce((a, b) => a + b, 0);
    
          let treePartsTrend = "Balanced";
          let treePartsDistribution = { base: 0, lower: 0, upper: 0, crown: 0 };
    
          if (totalBirdsPosition > 0) {
            const crownPerc = (location.birdPositionDistribution.crown / totalBirdsPosition) * 100;
            const upperPerc = (location.birdPositionDistribution.upper / totalBirdsPosition) * 100;
            const lowerPerc = (location.birdPositionDistribution.lower / totalBirdsPosition) * 100;
            const basePerc = (location.birdPositionDistribution.base / totalBirdsPosition) * 100;
    
            treePartsDistribution = {
              base: location.birdPositionDistribution.base,
              lower: location.birdPositionDistribution.lower,
              upper: location.birdPositionDistribution.upper,
              crown: location.birdPositionDistribution.crown
            };
    
            if (crownPerc >= 70) {
              treePartsTrend = "Crown-dominant activity";
            } else if (upperPerc >= 50) {
              treePartsTrend = "Upper tree parts activity";
            } else if (lowerPerc >= 40) {
              treePartsTrend = "Lower tree parts presence";
            } else if (basePerc > 0) {
              treePartsTrend = "Base-level activity";
            } else {
              treePartsTrend = "Mixed presence across tree parts";
            }
          }
    
          return { treePartsTrend, treePartsDistribution };
        };
    
        const topLocationTreeParts = calculateTreePartsTrend(topLocations[0]);
        const lowLocationTreeParts = calculateTreePartsTrend(lowLocations[0]);
    
        return {
          topLocations,
          lowLocations,
          topLocationTreeParts,
          lowLocationTreeParts,
          overallTrend: topLocations.length > 0 && topLocations[0].prediction.growth === "High"
            ? "Positive"
            : "Stable",
          processedRanges,
        };
      } catch (error) {
        console.error("Error in trend predictions:", error);
        return { error: "Failed to generate trend predictions" };
      }
    };
    

    // Helper method to calculate bird positions
    calculateBirdPositions = (trees) => {
      const positions = {
        crown: 0,   // 75-100%
        upper: 0,   // 50-75%
        lower: 0,   // 25-50%
        base: 0     // 0-25%
      };
  
  trees.forEach(tree => {
    if (tree.birdHeight && tree.treeHeight && tree.treeHeight > 0 && tree.noBirds > 0) {
      const heightPercentage = (tree.birdHeight / tree.treeHeight) * 100;
      
      // Count birds in each position category
      if (heightPercentage >= 75) {
        positions.crown += tree.noBirds;
      } else if (heightPercentage >= 50) {
        positions.upper += tree.noBirds;
      } else if (heightPercentage >= 25) {
        positions.lower += tree.noBirds;
      } else {
        positions.base += tree.noBirds;
      }
    }
  });
  
  return positions;
};

// Calculate overall position statistics
calculatePositionStats = (data) => {
  const positions = {
    crown: 0,   // 75-100%
    upper: 0,   // 50-75%
    lower: 0,   // 25-50%
    base: 0     // 0-25%
  };
  
  let totalBirdsWithPosition = 0;
  
  data.forEach(tree => {
    if (tree.birdHeight && tree.treeHeight && tree.treeHeight > 0 && tree.noBirds > 0) {
      const heightPercentage = (tree.birdHeight / tree.treeHeight) * 100;
      totalBirdsWithPosition += tree.noBirds;
      console.log("Height Percentage:", heightPercentage);
      console.log("Total Birds:", totalBirdsWithPosition);
      
      // Count birds in each position category
      if (heightPercentage >= 75) {
        positions.crown += tree.noBirds;
      } else if (heightPercentage >= 50) {
        positions.upper += tree.noBirds;
      } else if (heightPercentage >= 25) {
        positions.lower += tree.noBirds;
      } else {
        positions.base += tree.noBirds;
      }
    }
  });
  
  // Calculate percentages
  const positionPercentages = {
    crown: totalBirdsWithPosition > 0 ? (positions.crown / totalBirdsWithPosition * 100).toFixed(1) : 0,
    upper: totalBirdsWithPosition > 0 ? (positions.upper / totalBirdsWithPosition * 100).toFixed(1) : 0,
    lower: totalBirdsWithPosition > 0 ? (positions.lower / totalBirdsWithPosition * 100).toFixed(1) : 0,
    base: totalBirdsWithPosition > 0 ? (positions.base / totalBirdsWithPosition * 100).toFixed(1) : 0,
    total: totalBirdsWithPosition
  };

  console.log("Position Percentage:", positions);
  
  return positions;
};

  renderReport = () => {
    const { data } = this.props;
    const {showPercentageView} = this.state;
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

    const seenOnlyData = pairedData.filter(item => item.seenHeard === "Seen");

    // Summary statistics
    const seenCount = seenOnlyData.filter(item => item.seenHeard === "Seen").length;
    const totalCount = seenOnlyData.length;

    const calcPercent = (count) => totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

    return (
      <div className="report-container" style={{ 
        padding: '1rem',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        maxHeight: '200px',
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
        </div>

        {/* Tree Data Table */}
        <h5 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>Tree Data</h5>
        <div style={{ overflowX: 'auto' }}>
         {/* Conditional Rendering Based on showPercentageView */}
            {showPercentageView ? (
              <>
                {/* Table with Percentage View (Show Percentage) */}
                <div style={{ marginTop: '1.5rem' }}>
                  <h5 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>Tree Data with Percentages</h5>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tree #</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Birds Position</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seenOnlyData.map((tree, idx) => (
                        <tr key={idx} style={{ 
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: idx % 2 === 0 ? 'white' : '#f7fafc',
                        }}>
                          <td style={{ padding: '0.75rem' }}>{tree.index}</td>

                          
                          {/* Bird Position */}
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            {tree.treeHeight && tree.birdHeight !== null
                              ? isNaN(tree.birdHeight / tree.treeHeight)
                                ? "NaN"
                                : ((tree.birdHeight / tree.treeHeight) * 100).toFixed(1) + "%"
                              : "—"}
                          </td>

                          {/* Seen/Heard Status */}
                          <td style={{ padding: '0.75rem', textAlign: 'center', color: "#38A169" 
                          }}>
                            {tree.seenHeard || "Seen"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                {/* Original Tree Data Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tree #</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Birds</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Height (m)</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Bird Height (m)</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seenOnlyData.map((tree, idx) => (
                      <tr key={idx} style={{ 
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: idx % 2 === 0 ? 'white' : '#f7fafc',
                      }}>
                        <td style={{ padding: '0.75rem' }}>{tree.index}</td>

                        {/* Number of Birds */}
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {tree.noBirds}
                        </td>

                        {/* Tree Height */}
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {tree.treeHeight}
                        </td>

                        {/* Bird Height */}
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {tree.birdHeight !== null ? tree.birdHeight : "—"}
                        </td>

                        {/* Seen/Heard Status */}
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: tree.seenHeard === "Seen" ? "#38A169" : 
                            tree.seenHeard === "Heard" ? "#805AD5" : 
                            tree.seenHeard === "Not found" ? "#E53E3E" : "#718096"
                        }}>
                          {tree.seenHeard || "Not recorded"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
        </div>
      </div>
    );
  };
    
  render() 
  {
    const { showInsightsPanel, showReportPanel, showPercentageView} = this.state;
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

    const seenOnlyData = pairedData.filter(item => item.seenHeard === "Seen");

    return (
      <>
      <div 
        ref={this.chartContainer}
        className="chart-container" 
        style={{
          overflowX: 'auto',
          position: 'relative', 
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
        <div className="chart-container" >
      {/* Button should be outside SVG */}
        <button
          onClick={this.togglePercentageView}
          style={{
            background: showPercentageView ? '#EDF2F7' : '#6366F1',
            color: showPercentageView ? '#4A5568' : 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer', 
            fontWeight: '500',
            marginRight: '0.5rem',
          }}
        >
          {showPercentageView ? 'Normal View' : 'Percentage View'}
        </button>
      
        {/* SVG element separate from button */}
        <svg
          ref={this.d3Container}
          width={this.state.width}
          height={this.state.height}
        />
        
        {/* Legend container */}
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
      </div>

        {/* Report is only displayed after clicking the Generate Report button */}
        {this.state.showInsightsPanel === true && this.state.showReportPanel === false && this.renderInsightsPanel()}
        {this.state.showInsightsPanel === false && this.state.showReportPanel === true && this.renderReport()}
        
        {/* Statistics are always displayed */}
        {this.renderTreeStatistics(seenOnlyData)}
        
      </div>
      </>
    );
  }
}

export default D3TreeHeightChart;