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
      isMobile: false
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
  
    // Chart title
    /*svg.append("text")
      .attr("x", this.state.width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", isMobile ? "14px" : "18px")
      .text("Tree Heights and SHB Habitation");*/

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
                  {tree.seenHeard ?? 0}: {tree.noBirds ?? 0} Bird{(tree.noBirds ?? 0) > 1 ? 's' : ''}
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
  
  render() 
  {
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
        <h2>Tree Heights and SHB Habitation</h2>
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
              marginTop: "auto",
              marginBottom: "auto",
            }}
          ></div>
        {this.renderTreeStatistics(pairedData)}
      </div>
      </>
    );
  }
}

export default D3TreeHeightChart;
