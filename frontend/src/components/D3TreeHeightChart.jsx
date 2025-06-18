import React, { Component, createRef } from 'react';
import * as d3 from 'd3';

class D3TreeHeightChart extends Component {
  constructor(props) {
    super(props);
    this.svgRef = createRef();
    this.containerRef = createRef();
    this.state = {
      viewMode: 'normal', // 'normal' or 'percentage'
      showInsights: false, // toggle insights visibility
      selectedTreeIndex: null, // for individual tree statistics
      showIndividualStats: false // hide by default
    };
  }

  componentDidMount() {
    this.renderChart();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.data !== this.props.data || prevState.viewMode !== this.state.viewMode) {
      this.renderChart();
    }
  }

  setViewMode = (mode) => {
    this.setState({ viewMode: mode });
  }

  toggleInsights = () => {
    this.setState(prevState => ({ showInsights: !prevState.showInsights }));
  }

  toggleIndividualStats = () => {
    this.setState(prevState => ({ showIndividualStats: !prevState.showIndividualStats }));
  }

  selectTree = (index) => {
    this.setState({ selectedTreeIndex: index });
  }

  renderChart = () => {
    const { data } = this.props;
    const { viewMode } = this.state;

    if (!data || data.length === 0) return;

    // Clear previous chart
    d3.select(this.svgRef.current).selectAll("*").remove();

    // Filter data to only include records with valid tree height data
    const validData = data.filter(d => {
      const treeHeight = parseFloat(d['Height of tree/m']);
      const birdHeight = parseFloat(d['Height of bird/m']);
      return !isNaN(treeHeight) && !isNaN(birdHeight) && treeHeight > 0 && birdHeight > 0;
    });

    if (validData.length === 0) return;

    // Process data based on view mode - ONE TREE PER DATA POINT
    const processedData = validData.map((d, index) => {
      const originalTreeHeight = parseFloat(d['Height of tree/m']);
      const originalBirdHeight = parseFloat(d['Height of bird/m']);
      
      if (viewMode === 'percentage') {
        return {
          ...d,
          displayTreeHeight: 100, // Normalize tree height to 100%
          displayBirdHeight: Math.min((originalBirdHeight / originalTreeHeight) * 100, 100), // Cap at 100%
          originalTreeHeight,
          originalBirdHeight,
          index
        };
      } else {
        return {
          ...d,
          displayTreeHeight: originalTreeHeight,
          displayBirdHeight: originalBirdHeight,
          originalTreeHeight,
          originalBirdHeight,
          index
        };
      }
    });

    // Get container width for full-width visualization (100% page width)
    const containerWidth = this.containerRef.current?.offsetWidth || window.innerWidth - 40;
    
    // 2D Chart Configuration - Full Page Width with proper margins for axes
    const margin = { top: 80, right: 80, bottom: 120, left: 80 };
    const width = containerWidth - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Create SVG with clean 2D styling
    const svg = d3.select(this.svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("background", "linear-gradient(180deg, #87CEEB 0%, #98FB98 50%, #228B22 100%)")
      .style("border-radius", "12px")
      .style("box-shadow", "0 10px 25px rgba(0,0,0,0.1)")
      .style("border", "2px solid #228B22");

    // Add definitions for gradients and patterns
    const defs = svg.append("defs");
    
    // Tree trunk gradient
    const trunkGradient = defs.append("linearGradient")
      .attr("id", "trunkGradient")
      .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
    trunkGradient.append("stop").attr("offset", "0%").attr("stop-color", "#8B4513");
    trunkGradient.append("stop").attr("offset", "50%").attr("stop-color", "#A0522D");
    trunkGradient.append("stop").attr("offset", "100%").attr("stop-color", "#654321");

    // Tree crown gradient
    const crownGradient = defs.append("radialGradient")
      .attr("id", "crownGradient")
      .attr("cx", "30%").attr("cy", "30%");
    crownGradient.append("stop").attr("offset", "0%").attr("stop-color", "#90EE90");
    crownGradient.append("stop").attr("offset", "50%").attr("stop-color", "#32CD32");
    crownGradient.append("stop").attr("offset", "100%").attr("stop-color", "#228B22");

    // Bird gradient
    const birdGradient = defs.append("radialGradient")
      .attr("id", "birdGradient")
      .attr("cx", "30%").attr("cy", "30%");
    birdGradient.append("stop").attr("offset", "0%").attr("stop-color", "#FF6B6B");
    birdGradient.append("stop").attr("offset", "100%").attr("stop-color", "#DC143C");

    // Tree shadow filter
    const shadow = defs.append("filter")
      .attr("id", "treeShadow")
      .attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    shadow.append("feGaussianBlur").attr("in", "SourceAlpha").attr("stdDeviation", "3");
    shadow.append("feOffset").attr("dx", "2").attr("dy", "4").attr("result", "offset");
    shadow.append("feFlood").attr("flood-color", "#000000").attr("flood-opacity", "0.3");
    shadow.append("feComposite").attr("in2", "offset").attr("operator", "in");
    const merge = shadow.append("feMerge");
    merge.append("feMergeNode");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
      .domain(processedData.map((d, i) => i))
      .range([0, width])
      .padding(0.3);

    const maxHeight = d3.max(processedData, d => d.displayTreeHeight);
    const yScale = d3.scaleLinear()
      .domain([0, maxHeight * 1.1])
      .range([height, 0]);

    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(i => `Tree ${parseInt(i) + 1}`);

    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => viewMode === 'percentage' ? `${d}%` : `${d}m`);

    // Add X axis
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#2D4A22")
      .style("font-weight", "bold")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    // Add Y axis
    g.append("g")
      .attr("class", "y-axis")
      .call(yAxis)
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#2D4A22")
      .style("font-weight", "bold");

    // Style axes
    g.selectAll(".x-axis path, .y-axis path")
      .style("stroke", "#2D4A22")
      .style("stroke-width", "2px");

    g.selectAll(".x-axis line, .y-axis line")
      .style("stroke", "#2D4A22")
      .style("stroke-width", "1px");

    // Add axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 20)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#2D4A22")
      .text(viewMode === 'percentage' ? 'Height (%)' : 'Height (meters)');

    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 30})`)
      .style("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#2D4A22")
      .text('Bird Observation Points');

    // Create tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tree-tooltip-2d")
      .style("position", "absolute")
      .style("padding", "12px")
      .style("background", "rgba(0,0,0,0.9)")
      .style("color", "white")
      .style("border-radius", "8px")
      .style("border", "2px solid #FFD700")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("font-size", "12px")
      .style("box-shadow", "0 8px 20px rgba(0,0,0,0.4)")
      .style("max-width", "220px");

    // Add grid lines
    g.selectAll(".grid-line")
      .data(yScale.ticks(8))
      .enter()
      .append("line")
      .attr("class", "grid-line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "#e5e7eb")
      .attr("stroke-dasharray", "2,2")
      .attr("opacity", 0.3);

    // Render realistic trees and birds
    processedData.forEach((tree, index) => {
      const barX = xScale(index);
      const barWidth = xScale.bandwidth();
      const treeHeight = tree.displayTreeHeight;
      const birdHeight = tree.displayBirdHeight;

      // Create tree group
      const treeGroup = g.append("g")
        .attr("class", "tree-group")
        .style("filter", "url(#treeShadow)");

      // Tree base/roots
      const rootWidth = barWidth * 1.2;
      treeGroup.append("ellipse")
        .attr("cx", barX + barWidth / 2)
        .attr("cy", height + 5)
        .attr("rx", rootWidth / 2)
        .attr("ry", 8)
        .attr("fill", "#8B4513")
        .attr("opacity", 0.6);

      // Tree trunk with texture
      const trunkWidth = Math.max(barWidth * 0.3, 8);
      const trunkHeight = (height - yScale(treeHeight)) * 0.92; // Adjusted to 92% for 90-95% range
      
      // Main trunk
      treeGroup.append("rect")
        .attr("x", barX + barWidth / 2 - trunkWidth / 2)
        .attr("y", height - trunkHeight)
        .attr("width", trunkWidth)
        .attr("height", trunkHeight)
        .attr("fill", "url(#trunkGradient)")
        .attr("stroke", "#654321")
        .attr("stroke-width", 1)
        .attr("rx", trunkWidth / 4);

      // Trunk texture lines
      for (let i = 0; i < 3; i++) {
        treeGroup.append("line")
          .attr("x1", barX + barWidth / 2 - trunkWidth / 3)
          .attr("x2", barX + barWidth / 2 + trunkWidth / 3)
          .attr("y1", height - trunkHeight * 0.2 - (i * trunkHeight * 0.2))
          .attr("y2", height - trunkHeight * 0.2 - (i * trunkHeight * 0.2))
          .attr("stroke", "#654321")
          .attr("stroke-width", 1)
          .attr("opacity", 0.5);
      }

      // Tree crown - multiple layers for realism with proper branch coverage
      const crownCenterX = barX + barWidth / 2;
      const crownCenterY = yScale(treeHeight);
      const crownRadius = Math.max(barWidth * 0.6, 15);

      // Use tree index as seed for consistent randomness across renders
      const seed = index;
      const seededRandom = (min = 0, max = 1) => {
        const x = Math.sin(seed * 9999) * 10000;
        return min + (x - Math.floor(x)) * (max - min);
      };

      // Tree branches - draw BEFORE crown so leaves overlap branches
      const numBranches = 8;
      const branchPositions = []; // Store branch endpoints for leaf placement
      
      for (let i = 0; i < numBranches; i++) {
        const angle = (i * 2 * Math.PI) / numBranches;
        
        // Start branches from the top of the trunk
        const trunkTopY = height - trunkHeight;
        const startX = crownCenterX + (Math.cos(angle) * trunkWidth * 0.4);
        const startY = trunkTopY + seededRandom(0, crownRadius * 0.2);
        
        // End branches inside the crown area (shorter for realism)
        const endX = crownCenterX + Math.cos(angle) * (crownRadius * 0.5); // Reduced from 0.7 to 0.5
        const endY = crownCenterY + Math.sin(angle) * (crownRadius * 0.3); // Reduced from 0.5 to 0.3
        
        // Store branch endpoint for consistent leaf placement
        branchPositions.push({ x: endX, y: endY, angle });
        
        // Only draw branches that go outward and upward
        if (endY <= startY + crownRadius * 0.3) {
          // Main branch
          treeGroup.append("line")
            .attr("x1", startX)
            .attr("y1", startY)
            .attr("x2", endX)
            .attr("y2", endY)
            .attr("stroke", "#8B4513")
            .attr("stroke-width", Math.max(2, barWidth * 0.06))
            .attr("opacity", 0.8)
            .attr("stroke-linecap", "round");
          
          // Add smaller twigs - also using seeded random
          const numTwigs = 2;
          for (let j = 0; j < numTwigs; j++) {
            const twigAngle = angle + (j === 0 ? -0.3 : 0.3);
            const twigLength = crownRadius * 0.2;
            const twigStartX = startX + Math.cos(angle) * (crownRadius * 0.4);
            const twigStartY = startY + Math.sin(angle) * (crownRadius * 0.2);
            const twigEndX = twigStartX + Math.cos(twigAngle) * twigLength;
            const twigEndY = twigStartY + Math.sin(twigAngle) * twigLength * 0.5;
            
            treeGroup.append("line")
              .attr("x1", twigStartX)
              .attr("y1", twigStartY)
              .attr("x2", twigEndX)
              .attr("y2", twigEndY)
              .attr("stroke", "#654321")
              .attr("stroke-width", 1)
              .attr("opacity", 0.6)
              .attr("stroke-linecap", "round");
          }
        }
      }

      // Crown layers - draw AFTER branches so leaves cover branches
      for (let layer = 0; layer < 3; layer++) {
        const layerRadius = crownRadius * (1 - layer * 0.1);
        const layerY = crownCenterY - (layer * layerRadius * 0.05);
        
        // Main crown circle - larger to ensure branch coverage
        treeGroup.append("circle")
          .attr("cx", crownCenterX)
          .attr("cy", layerY)
          .attr("r", layerRadius)
          .attr("fill", layer === 0 ? "url(#crownGradient)" : 
                       layer === 1 ? "#32CD32" : "#228B22")
          .attr("stroke", "#228B22")
          .attr("stroke-width", 1)
          .attr("opacity", 0.9);
        
        // Add leaf clusters positioned exactly at branch endpoints for consistent coverage
        if (layer === 0) {
          // First, add clusters at exact branch endpoints
          branchPositions.forEach((branch, i) => {
            treeGroup.append("circle")
              .attr("cx", branch.x)
              .attr("cy", branch.y)
              .attr("r", layerRadius * 0.35) // Slightly larger to ensure coverage
              .attr("fill", "#32CD32")
              .attr("stroke", "#228B22")
              .attr("stroke-width", 0.5)
              .attr("opacity", 0.9);
          });
          
          // Then add additional random clusters for fullness (but using seeded random)
          for (let i = 0; i < 6; i++) {
            const angle = (i * 2 * Math.PI) / 6;
            const clusterDistance = layerRadius * (0.5 + seededRandom(0, 0.4));
            const clusterX = crownCenterX + Math.cos(angle) * clusterDistance;
            const clusterY = layerY + Math.sin(angle) * clusterDistance * 0.7;
            
            treeGroup.append("circle")
              .attr("cx", clusterX)
              .attr("cy", clusterY)
              .attr("r", layerRadius * (0.2 + seededRandom(0, 0.15)))
              .attr("fill", "#32CD32")
              .attr("stroke", "#228B22")
              .attr("stroke-width", 0.5)
              .attr("opacity", 0.85);
          }
        }
      }

      // Bird positioning - position bird image at trunk indicator location
      const birdPositionY = height - (trunkHeight * (tree.displayBirdHeight / tree.displayTreeHeight));
      const birdX = barX + barWidth / 2; // Center on trunk
      const birdY = birdPositionY; // Same Y position as trunk indicator

      // Add bird position indicator on tree trunk (behind the bird image)
      treeGroup.append("circle")
        .attr("cx", birdX)
        .attr("cy", birdY)
        .attr("r", 3)
        .attr("fill", "#FFD700")
        .attr("stroke", "#FF6B6B")
        .attr("stroke-width", 2)
        .style("opacity", 0.8);

      // Bird group - using shb.png image scaled to trunk size
      const birdGroup = g.append("g")
        .attr("class", "bird-group")
        .style("cursor", "pointer");

      // Calculate bird image size based on trunk width - made larger and more prominent
      const birdImageSize = Math.max(trunkWidth * 1.5, 60); // Increased scale and minimum size

      // Straw-headed Bulbul image - positioned exactly over trunk indicator
      birdGroup.append("image")
        .attr("href", "/shb.png")
        .attr("x", birdX - birdImageSize / 2)
        .attr("y", birdY - birdImageSize / 2)
        .attr("width", birdImageSize)
        .attr("height", birdImageSize)
        .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.4)) brightness(1.1) contrast(1.2)")
        .style("background", "transparent")
        .style("border-radius", "50%")
        .style("clip-path", "circle(45%)");

      // Interactions
      const showTooltip = (event) => {
        tooltip.transition()
          .duration(200)
          .style("opacity", 1);

          console.log("Selected Tree:", tree);
        
        tooltip.html(`
          <div style="line-height: 1.5;">
            <div style="color: #FFD700; font-weight: bold; margin-bottom: 8px; text-align: center;">🌳 ${tree.Location || 'Observation ' + (index + 1)}</div>
            <div style="margin-bottom: 4px;">🌲 Tree Height: <strong>${tree.originalTreeHeight}m</strong></div>
            <div style="margin-bottom: 4px;">🐦 Bird Height: <strong>${tree.originalBirdHeight}m</strong></div>
            ${viewMode === 'percentage' ? `<div style="margin-bottom: 4px;">📊 Position: <strong>${Math.round(tree.displayBirdHeight)}%</strong> of tree</div>` : ''}
            <div style="color: #90EE90;">📍 Activity: <strong>${tree["Activity (foraging, preening, calling, perching, others)"]}</strong></div>
          </div>
        `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 80) + "px");
      };

      const hideTooltip = () => {
        tooltip.transition()
          .duration(300)
          .style("opacity", 0);
      };

      // Tree interactions
      treeGroup.style("cursor", "pointer")
        .on("mouseover", showTooltip)
        .on("mouseout", hideTooltip)
        .on("click", () => {
          this.selectTree(index);
          this.setState({ showIndividualStats: true });
        });

      // Bird interactions
      birdGroup.on("mouseover", function(event) {
        d3.select(this)
          .transition()
          .duration(200)
        showTooltip(event);
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
        hideTooltip();
      })
      .on("click", () => {
        this.selectTree(index);
        this.setState({ showIndividualStats: true });
      });
    });

    // Add chart title
    g.append("text")
      .attr("x", width / 2)
      .attr("y", -40)
      .attr("text-anchor", "middle")
      .style("font-size", "24px")
      .style("font-weight", "bold")
      .style("fill", "#2D4A22")
      .style("text-shadow", "2px 2px 4px rgba(0,0,0,0.2)");

    // Cleanup function
    this.cleanupTooltip = () => {
      d3.select("body").selectAll(".tree-tooltip-2d").remove();
    };
  }

  componentWillUnmount() {
    if (this.cleanupTooltip) {
      this.cleanupTooltip();
    }
  }

  render() {
    const { data } = this.props;
    const { viewMode, showInsights } = this.state;

    if (!data || data.length === 0) {
      return (
        <div className="chart-container" style={{ 
          padding: '40px', 
          textAlign: 'center', 
          border: '2px solid #228B22', 
          borderRadius: '12px', 
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#2D4A22', marginBottom: '15px', fontSize: '18px' }}>
            🌲 Bird Survey Chart 🐦
          </h3>
          <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '14px' }}>
            No data available for visualization
          </p>
        </div>
      );
    }

    const validDataCount = data.filter(d => {
      const treeHeight = parseFloat(d['Height of tree/m']);
      const birdHeight = parseFloat(d['Height of bird/m']);
      return !isNaN(treeHeight) && !isNaN(birdHeight) && treeHeight > 0 && birdHeight > 0;
    }).length;

    // Generate insights and statistics
    const validData = data.filter(d => {
      const treeHeight = parseFloat(d['Height of tree/m']);
      const birdHeight = parseFloat(d['Height of bird/m']);
      return !isNaN(treeHeight) && !isNaN(birdHeight) && treeHeight > 0 && birdHeight > 0;
    });

    const insights = {
      totalObservations: validData.length,
      avgTreeHeight: validData.reduce((sum, d) => sum + parseFloat(d['Height of tree/m']), 0) / validData.length,
      avgBirdHeight: validData.reduce((sum, d) => sum + parseFloat(d['Height of bird/m']), 0) / validData.length,
      maxTreeHeight: Math.max(...validData.map(d => parseFloat(d['Height of tree/m']))),
      minTreeHeight: Math.min(...validData.map(d => parseFloat(d['Height of tree/m']))),
      avgBirdPosition: validData.reduce((sum, d) => {
        const treeHeight = parseFloat(d['Height of tree/m']);
        const birdHeight = parseFloat(d['Height of bird/m']);
        return sum + (birdHeight / treeHeight) * 100;
      }, 0) / validData.length,
      highPositionBirds: validData.filter(d => {
        const treeHeight = parseFloat(d['Height of tree/m']);
        const birdHeight = parseFloat(d['Height of bird/m']);
        return (birdHeight / treeHeight) > 0.8;
      }).length
    };

    return (
      <div ref={this.containerRef} className="chart-container" style={{ 
        width: '100%',
        maxWidth: '100vw',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '3px solid #228B22',
        boxShadow: '0 15px 30px rgba(0,0,0,0.15)',
        fontFamily: 'Arial, sans-serif'
      }}>
        {/* Header without Logo */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '20px'
        }}>
          <h3 style={{ 
            color: '#2D4A22', 
            fontSize: '24px', 
            margin: '0 0 5px 0',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
          }}>
            🌲 Straw-headed Bulbul Survey Tree Distribution
          </h3>
          <p style={{ 
            color: '#4A5D23', 
            fontSize: '16px', 
            margin: '0',
            fontWeight: '500'
          }}>
            Detailed visualization of all {validDataCount} bird observations with realistic tree representations
          </p>
        </div>

        {/* Chart Container */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          overflowX: 'auto',
          position: 'relative',
          padding: '10px'
        }}>
          <svg ref={this.svgRef}></svg>
        </div>

        {/* Tab System Below Chart */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '25px',
          gap: '15px'
        }}>
          <button
            onClick={() => this.setViewMode('normal')}
            style={{
              background: viewMode === 'normal' ? '#6366F1' : '#f8f9fa',
              color: viewMode === 'normal' ? 'white' : '#4A5568',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            📏 Height View
          </button>
          <button
            onClick={() => this.setViewMode('percentage')}
            style={{
              background: viewMode === 'percentage' ? '#6366F1' : '#f8f9fa',
              color: viewMode === 'percentage' ? 'white' : '#4A5568',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            📊 Percentage View
          </button>
          <button
            onClick={this.toggleIndividualStats}
            style={{
              background: this.state.showIndividualStats ? '#EDF2F7' : '#6366F1',
              color: this.state.showIndividualStats ? '#4A5568' : 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            🌳 Tree Summary
          </button>
        </div>

        {/* Individual Tree Statistics Panel */}
        {this.state.showIndividualStats && (
          <div style={{
            marginTop: '25px',
            padding: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '10px'
            }}>
              <h4 style={{
                color: '#2d3748',
                fontSize: '18px',
                fontWeight: 'bold',
                margin: '0'
              }}>
                🌳 Tree Analysis Summary
              </h4>
              <button
                onClick={() => this.setState({ showIndividualStats: false, selectedTreeIndex: null })}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#4A5568',
                  border: '1px solid #e2e8f0',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                ✕ Close
              </button>
            </div>
            
            {/* Summary Section - Two Tree Representations */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px',
              marginBottom: '20px'
            }}>
              {/* Tree 1: Number of Birds by Layer */}
              <div style={{
                padding: '20px',
                backgroundColor: '#f0f9ff',
                borderRadius: '12px',
                border: '2px solid #3b82f6',
                textAlign: 'center'
              }}>
                <h5 style={{
                  color: '#1e40af',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginBottom: '15px'
                }}>
                  🌳 Birds by Tree Layer (Count)
                </h5>
                
                {/* Tree visualization showing bird counts */}
                <div style={{
                  position: 'relative',
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  {/* Tree Crown - Upper Layer */}
                  <div style={{
                    width: '80px',
                    height: '60px',
                    backgroundColor: '#22c55e',
                    borderRadius: '50%',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '5px',
                    border: '2px solid #16a34a'
                  }}>
                    <span style={{
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      {validData.filter(d => {
                        const treeHeight = parseFloat(d['Height of tree/m']);
                        const birdHeight = parseFloat(d['Height of bird/m']);
                        return (birdHeight / treeHeight) > 0.7;
                      }).length} 🐦
                    </span>
                  </div>
                  
                  {/* Tree Crown - Middle Layer */}
                  <div style={{
                    width: '90px',
                    height: '60px',
                    backgroundColor: '#16a34a',
                    borderRadius: '50%',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '5px',
                    border: '2px solid #15803d'
                  }}>
                    <span style={{
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      {validData.filter(d => {
                        const treeHeight = parseFloat(d['Height of tree/m']);
                        const birdHeight = parseFloat(d['Height of bird/m']);
                        const position = birdHeight / treeHeight;
                        return position > 0.4 && position <= 0.7;
                      }).length} 🐦
                    </span>
                  </div>
                  
                  {/* Tree Trunk */}
                  <div style={{
                    width: '25px',
                    height: '80px',
                    backgroundColor: '#92400e',
                    borderRadius: '8px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #78350f'
                  }}>
                    <span style={{
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      writingMode: 'vertical-lr',
                      textOrientation: 'mixed'
                    }}>
                      {validData.filter(d => {
                        const treeHeight = parseFloat(d['Height of tree/m']);
                        const birdHeight = parseFloat(d['Height of bird/m']);
                        return (birdHeight / treeHeight) <= 0.4;
                      }).length}🐦
                    </span>
                  </div>
                </div>
                
                {/* Legend */}
                <div style={{ fontSize: '12px', color: '#4a5568' }}>
                  <div>Upper: 70-100% height</div>
                  <div>Middle: 40-70% height</div>
                  <div>Lower: 0-40% height</div>
                </div>
              </div>

              {/* Tree 2: Percentage of Birds by Layer */}
              <div style={{
                padding: '20px',
                backgroundColor: '#fef3c7',
                borderRadius: '12px',
                border: '2px solid #f59e0b',
                textAlign: 'center'
              }}>
                <h5 style={{
                  color: '#92400e',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginBottom: '15px'
                }}>
                  🌳 Birds by Tree Layer (%)
                </h5>
                
                {/* Tree visualization showing bird percentages */}
                <div style={{
                  position: 'relative',
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  {(() => {
                    const upperCount = validData.filter(d => {
                      const treeHeight = parseFloat(d['Height of tree/m']);
                      const birdHeight = parseFloat(d['Height of bird/m']);
                      return (birdHeight / treeHeight) > 0.7;
                    }).length;
                    
                    const middleCount = validData.filter(d => {
                      const treeHeight = parseFloat(d['Height of tree/m']);
                      const birdHeight = parseFloat(d['Height of bird/m']);
                      const position = birdHeight / treeHeight;
                      return position > 0.4 && position <= 0.7;
                    }).length;
                    
                    const lowerCount = validData.filter(d => {
                      const treeHeight = parseFloat(d['Height of tree/m']);
                      const birdHeight = parseFloat(d['Height of bird/m']);
                      return (birdHeight / treeHeight) <= 0.4;
                    }).length;
                    
                    const total = validData.length;
                    const upperPercent = total > 0 ? ((upperCount / total) * 100).toFixed(1) : '0.0';
                    const middlePercent = total > 0 ? ((middleCount / total) * 100).toFixed(1) : '0.0';
                    const lowerPercent = total > 0 ? ((lowerCount / total) * 100).toFixed(1) : '0.0';
                    
                    return (
                      <React.Fragment>
                        {/* Tree Crown - Upper Layer */}
                        <div style={{
                          width: '80px',
                          height: '60px',
                          backgroundColor: '#fbbf24',
                          borderRadius: '50%',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '5px',
                          border: '2px solid #f59e0b'
                        }}>
                          <span style={{
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}>
                            {upperPercent}%
                          </span>
                        </div>
                        
                        {/* Tree Crown - Middle Layer */}
                        <div style={{
                          width: '90px',
                          height: '60px',
                          backgroundColor: '#f59e0b',
                          borderRadius: '50%',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '5px',
                          border: '2px solid #d97706'
                        }}>
                          <span style={{
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}>
                            {middlePercent}%
                          </span>
                        </div>
                        
                        {/* Tree Trunk */}
                        <div style={{
                          width: '25px',
                          height: '80px',
                          backgroundColor: '#92400e',
                          borderRadius: '8px',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #78350f'
                        }}>
                          <span style={{
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            writingMode: 'vertical-lr',
                            textOrientation: 'mixed'
                          }}>
                            {lowerPercent}%
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })()}
                </div>
                
                {/* Legend */}
                <div style={{ fontSize: '12px', color: '#4a5568' }}>
                  <div>Distribution of birds across tree layers</div>
                  <div>Total: {validData.length} observations</div>
                </div>
              </div>
            </div>

            {/* Overall Statistics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af' }}>
                  {validData.length}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Total Trees</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
                  {validData.length}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Birds Observed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
                  {insights.avgBirdPosition.toFixed(0)}%
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Avg. Position</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c2d12' }}>
                  {insights.avgTreeHeight.toFixed(1)}m
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Avg. Height</div>
              </div>
            </div>
            
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              padding: '10px 0'
            }}>
              {validData.map((tree, index) => {
                const isSelected = this.state.selectedTreeIndex === index;
                const treeHeight = parseFloat(tree['Height of tree/m']);
                const birdHeight = parseFloat(tree['Height of bird/m']);
                const birdPosition = ((birdHeight / treeHeight) * 100).toFixed(1);
                
                return (
                  <div
                    key={index}
                    onClick={() => this.selectTree(index)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: isSelected ? '#f0f9ff' : '#f8f9fa',
                      border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      ...(isSelected ? { boxShadow: '0 4px 12px rgba(59,130,246,0.15)' } : {})
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: isSelected ? '#1e40af' : '#2d3748',
                        fontSize: '14px'
                      }}>
                        🌲 Tree {index + 1} - {tree.Location || 'Unknown Location'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '12px', 
                          color: '#6b7280',
                          backgroundColor: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0'
                        }}>
                          {birdPosition}% height
                        </span>
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#9ca3af',
                          fontStyle: 'italic'
                        }}>
                          {Array.isArray(tree.Activity) ? tree.Activity.join(', ') : tree.Activity || 'Observation'}
                        </span>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#4a5568',
                        lineHeight: '1.5',
                        marginTop: '10px',
                        padding: '10px',
                        backgroundColor: 'white',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                          <div><strong>🌳 Tree Height:</strong> {treeHeight}m</div>
                          <div><strong>🐦 Bird Height:</strong> {birdHeight}m</div>
                          <div><strong>📍 Location:</strong> {tree.Location || 'Not specified'}</div>
                          <div><strong>🎯 Activity:</strong> {Array.isArray(tree.Activity) ? tree.Activity.join(', ') : tree.Activity || 'Observation'}</div>
                          <div><strong>📅 Date:</strong> {tree.Date || 'Not recorded'}</div>
                          <div><strong>⏰ Time:</strong> {tree.Time || 'Not recorded'}</div>
                        </div>
                        
                        <div style={{
                          marginTop: '10px',
                          padding: '8px',
                          backgroundColor: birdPosition > 80 ? '#fef3c7' : birdPosition > 50 ? '#ecfdf5' : '#fef2f2',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          <strong>🔍 Analysis:</strong> {
                            birdPosition > 80 ? 'High canopy position - likely foraging or territorial behavior' :
                            birdPosition > 50 ? 'Mid canopy position - typical feeding or nesting area' :
                            'Lower canopy position - possible cautious or protective behavior'
                          }
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Insights Report Section - Togglable */}
        <div style={{
          marginTop: '30px',
          padding: '25px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            padding: '1rem',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            borderRadius: '8px',
            color: 'white'
          }}>
            <h4 style={{
              color: 'white',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0'
            }}>
              📊 Survey Analysis & Insights
            </h4>
            <button
              onClick={this.toggleInsights}
              style={{
                background: showInsights ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '12px',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span role="img" aria-label="insights">📊</span>
              {showInsights ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          
          {showInsights && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div style={{
                  backgroundColor: 'white',
                  padding: '18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🌳</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#228B22' }}>
                    {insights.totalObservations}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Total Observations</div>
                </div>

                <div style={{
                  backgroundColor: 'white',
                  padding: '18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📏</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                    {insights.avgTreeHeight.toFixed(1)}m
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Average Tree Height</div>
                </div>

                <div style={{
                  backgroundColor: 'white',
                  padding: '18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🐦</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>
                    {insights.avgBirdHeight.toFixed(1)}m
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Average Bird Height</div>
                </div>

                <div style={{
                  backgroundColor: 'white',
                  padding: '18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>
                    {insights.avgBirdPosition.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Avg. Position in Tree</div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <h5 style={{ color: '#2D4A22', fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>
                    🌲 Tree Height Distribution
                  </h5>
                  <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#4a5568' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Tallest Tree:</strong> {insights.maxTreeHeight}m
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Shortest Tree:</strong> {insights.minTreeHeight}m
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Height Range:</strong> {(insights.maxTreeHeight - insights.minTreeHeight).toFixed(1)}m
                    </div>
                    <div style={{ 
                      padding: '10px', 
                      backgroundColor: '#f0f9ff', 
                      borderRadius: '8px', 
                      borderLeft: '4px solid #3b82f6',
                      marginTop: '12px'
                    }}>
                      <strong>Insight:</strong> Trees show a height variation of {((insights.maxTreeHeight - insights.minTreeHeight) / insights.avgTreeHeight * 100).toFixed(1)}% from the average.
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <h5 style={{ color: '#2D4A22', fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>
                    🐦 Bird Positioning Patterns
                  </h5>
                  <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#4a5568' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>High Position Birds:</strong> {insights.highPositionBirds} ({((insights.highPositionBirds / insights.totalObservations) * 100).toFixed(1)}%)
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Preferred Height:</strong> {insights.avgBirdPosition < 50 ? 'Lower canopy' : insights.avgBirdPosition < 75 ? 'Mid canopy' : 'Upper canopy'}
                    </div>
                    <div style={{ 
                      padding: '10px', 
                      backgroundColor: insights.avgBirdPosition > 60 ? '#fef3c7' : '#ecfdf5', 
                      borderRadius: '8px', 
                      borderLeft: `4px solid ${insights.avgBirdPosition > 60 ? '#f59e0b' : '#10b981'}`,
                      marginTop: '12px'
                    }}>
                      <strong>Behavior:</strong> {insights.avgBirdPosition > 60 
                        ? 'Straw-headed Bulbuls prefer upper canopy positions, indicating active foraging behavior.' 
                        : 'Birds show preference for lower-mid canopy, suggesting cautious or nesting behavior.'}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    );
  }
}

export default D3TreeHeightChart;