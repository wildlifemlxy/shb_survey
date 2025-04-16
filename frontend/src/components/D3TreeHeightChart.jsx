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

    // Parse data
    let treeData = extractTreeHeights(data);
    let birdData = extractBirdHeights(data);
    let seenHeardData = extractSeenHeard(data);
    let noBirdsData = extractNoBirds(data);

    // Clean and pair tree and bird data, but keep all tree data
    const pairedData = treeData.map((treeHeight, index) => {
      let birdHeight = birdData[index];
      let seenHeard = seenHeardData[index];
      let noBirds = noBirdsData[index];

      // Ensure birdHeight is null if there's no bird, and use a default null for missing bird data
      const hasBird = birdHeight !== null && birdHeight !== 'N/A' && !isNaN(birdHeight);

      if (!isNaN(treeHeight) && treeHeight !== null && treeHeight !== 'N/A') {
        return {
          treeHeight,
          birdHeight: hasBird ? birdHeight : null,  // Set birdHeight to null if no bird data
          hasBird,
          seenHeard,
          noBirds,
          index: index + 1 // Use 1-based indexing for display
        };
      }
      // Don't filter anything out – return null if tree height is invalid, but no need to filter after
      return {
        treeHeight: treeHeight, // Return tree height even if the bird data is missing
        birdHeight: null,       // No bird data
        hasBird: false,         // No bird associated
        seenHeard: seenHeard,
        noBirds,
        index: index + 1        // 1-based indexing
      };
    });

    // Setup dimensions - adjust margins for mobile
    const margin = isMobile 
      ? { top: 30, right: 15, bottom: 40, left: 35 }
      : { top: 30, right: 30, bottom: 50, left: 50 };
      
    const width = this.state.width - margin.left - margin.right;
    const height = this.state.height - margin.top - margin.bottom;

    // Create scales
    const x = d3.scaleBand()
      .domain(pairedData.map(d => d.index))
      .range([0, width])
      .padding(isMobile ? 0.2 : 0.3); // Less padding on mobile

    const y = d3.scaleLinear()
      .domain([0, d3.max(pairedData, d => d.treeHeight) * 1.1])
      .range([height, 0]);

    // Create chart group
    const chartGroup = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add Y axis
    chartGroup.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y)
        .ticks(isMobile ? 5 : 10) // Fewer ticks on mobile
        .tickFormat(d => isMobile && d % 1 !== 0 ? '' : d)) // Only show whole numbers on mobile
      .selectAll("text")
      .style("font-size", isMobile ? "10px" : "12px");

    // Add X axis
    chartGroup.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .tickValues(isMobile && pairedData.length > 10 
          ? pairedData.filter(d => d.index % 2 === 0).map(d => d.index) // Show every other tick on mobile if many data points
          : null))
      .selectAll("text")
      .style("text-anchor", "middle")
      .style("font-size", isMobile ? "10px" : "12px");

    // Remove existing tooltip if any
    d3.select('.chart-tooltip').remove();
    
    // Create tooltip div that stays within the component
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

    // Event handlers that work for both mouse and touch
    const showTooltip = (event, d) => {
      // Prevent tooltip from going off-screen
      const tooltipWidth = isMobile ? 150 : 200;
      const windowWidth = window.innerWidth;
      
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
      
      const tooltipContent = `<strong>Tree #${d.index}</strong><br/>Height: ${d.treeHeight}m<br/>${d.hasBird ? `<strong>Bird on Tree #${d.index}</strong><br/>Height: ${d.birdHeight}m<br/><strong>Seen/Heard:</strong><br/>${d.seenHeard}<br/><strong>No of Birds:</strong><br/>${d.noBirds}` : ''}`;
      
      tooltip.html(tooltipContent);
      
      // Get page coordinates
      const pageX = event.type.includes('touch') 
        ? event.touches[0].pageX 
        : event.pageX;
      const pageY = event.type.includes('touch') 
        ? event.touches[0].pageY 
        : event.pageY;
      
      // Adjust tooltip position to prevent going off-screen
      const leftPos = Math.min(pageX + 10, windowWidth - tooltipWidth - 10);
      
      tooltip
        .style("left", leftPos + "px")
        .style("top", (pageY - 28) + "px");
    };

    const hideTooltip = () => {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    };

    const moveTooltip = (event) => {
      // Get page coordinates for both touch and mouse
      const pageX = event.type.includes('touch') 
        ? event.touches[0].pageX 
        : event.pageX;
      const pageY = event.type.includes('touch') 
        ? event.touches[0].pageY 
        : event.pageY;
        
      const tooltipWidth = isMobile ? 150 : 200;
      const windowWidth = window.innerWidth;
      
      // Adjust tooltip position to prevent going off-screen
      const leftPos = Math.min(pageX + 10, windowWidth - tooltipWidth - 10);
      
      tooltip
        .style("left", leftPos + "px")
        .style("top", (pageY - 28) + "px");
    };

    // Add bars with touch and mouse events
    chartGroup.selectAll(".bar")
      .data(pairedData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.index))
      .attr("y", d => y(d.treeHeight))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.treeHeight))
      .attr("fill", "#82ca9d")
      .style("cursor", "pointer")
      // Mouse events
      .on("mouseover", showTooltip)
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip)
      // Touch events
      .on("touchstart", showTooltip)
      .on("touchmove", moveTooltip)
      .on("touchend", hideTooltip);

    // Add bird icons with same events
    pairedData.forEach(d => {
      if (d.hasBird) {
        // Adjust bird icon size for mobile
        const iconSize = isMobile ? 15 : 20;
        
        chartGroup.append("image")
          .attr("xlink:href", birdLogo)
          .attr("x", x(d.index) + x.bandwidth() / 2 - iconSize/2)
          .attr("y", y(d.birdHeight) - iconSize/2)
          .attr("width", iconSize)
          .attr("height", iconSize)
          .style("cursor", "pointer")
          // Mouse events
          .on("mouseover", (event) => showTooltip(event, d))
          .on("mousemove", moveTooltip)
          .on("mouseout", hideTooltip)
          // Touch events
          .on("touchstart", (event) => showTooltip(event, d))
          .on("touchmove", moveTooltip)
          .on("touchend", hideTooltip);
      }
    });

    // Add title - adjust font size for mobile
    svg.append("text")
      .attr("x", this.state.width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", isMobile ? "14px" : "18px")
      .text("Tree Heights and SHB Habitation");
      
    // Add axes labels with responsive font size
    // Y axis label
    chartGroup.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + (isMobile ? 15 : 20))
      .attr("x", 0 - height / 2)
      .attr("text-anchor", "middle")
      .style("font-size", isMobile ? "10px" : "12px")
      .text("Height (m)");
      
    // X axis label
    chartGroup.append("text")
      .attr("y", height + margin.bottom - (isMobile ? 5 : 10))
      .attr("x", width / 2)
      .attr("text-anchor", "middle")
      .style("font-size", isMobile ? "10px" : "12px")
      .text("Tree Number");
  }

  render() {
    return (
      <div 
        ref={this.chartContainer}
        className="chart-container" 
        style={{
          overflowX: 'auto',
          position: 'relative'
        }}
      >
        <svg
          ref={this.d3Container}
          width={this.state.width}
          height={this.state.height}
        />
      </div>
    );
  }
}

export default D3TreeHeightChart;
