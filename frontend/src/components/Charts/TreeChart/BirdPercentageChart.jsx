import React, { Component } from 'react';
import './PercentageHeightChart.css';

class BirdPercentageChart extends Component {
  state = { hoveredBird: null, tooltipX: 0, tooltipY: 0 };

  // Cache viewport dimensions to avoid repeated calculations
  getViewportDimensions = () => {
    if (typeof window === 'undefined') {
      return { width: 1400, height: 800 }; // Default for SSR
    }
    return {
      width: window.innerWidth || 1400,
      height: window.innerHeight || 800
    };
  };

  // Replace generateSVGTree with a simple tree SVG
  generateSimpleTree = (treeWidth, treeHeight) => {
    const trunkWidth = treeWidth * 0.18;
    const trunkHeight = treeHeight * 0.7;
    const crownRadius = treeWidth * 0.38;
    return (
      <g>
        {/* Trunk */}
        <rect
          x={-trunkWidth / 2}
          y={-trunkHeight}
          width={trunkWidth}
          height={trunkHeight}
          fill="#8B5E3C"
          rx={trunkWidth * 0.3}
        />
        {/* Crown */}
        <ellipse
          cx={0}
          cy={-trunkHeight}
          rx={crownRadius}
          ry={crownRadius * 0.7}
          fill="#4CAF50"
          stroke="#388E3C"
          strokeWidth={2}
        />
      </g>
    );
  };

  handleMouseEnter = (bird, evt) => {
    const svgRect = evt.target.ownerSVGElement.getBoundingClientRect();
    const x = evt.clientX - svgRect.left;
    const y = evt.clientY - svgRect.top;
    this.setState({ hoveredBird: bird, tooltipX: x, tooltipY: y });
  };

  handleMouseLeave = () => {
    this.setState({ hoveredBird: null });
  };

  render() {
    const rawData = this.props.data && this.props.data.length > 0 ? this.props.data : [];
    
    // Filter data to only include birds with valid heights
    const validBirdsData = [];
    rawData.forEach((bird, originalIndex) => {
      const height = bird["Height of tree/m"] ?? bird.height ?? 0;
      const numHeight = parseFloat(height);
      if (!isNaN(numHeight) && numHeight > 0 && isFinite(numHeight)) {
        validBirdsData.push({
          ...bird,
          originalIndex: originalIndex,
          displayIndex: originalIndex + 1,
          heightValue: numHeight
        });
      }
    });
    
    const data = validBirdsData;
    
    // Enhanced responsive chart dimensions - scale based on screen size and data
    const { width: viewportWidth, height: viewportHeight } = this.getViewportDimensions();
    
    // Significantly increased base height calculation for better visibility
    const baseChartHeight = Math.max(
      1200, // Increased minimum height to 1200px for much better visibility
      viewportHeight * 0.8, // 80% of viewport height for maximum space usage
      data.length > 8 ? 1400 : 1200 // Extra height for many trees
    );
    const chartHeight = baseChartHeight;
    
    // Calculate responsive scaling factor based on viewport
    const baseViewportWidth = 1400; // Reference viewport width
    const scaleFactor = Math.max(
      0.7, // Minimum scale factor
      Math.min(2.0, viewportWidth / baseViewportWidth) // Maximum scale factor
    );
    
    // Enhanced tree dimensions with better scaling
    const baseTreeWidth = 150;
    const baseTreeSpacing = 350;
    const basePadding = 80;
    
    const treeWidth = Math.floor(baseTreeWidth * scaleFactor);
    const treeSpacing = Math.floor(baseTreeSpacing * scaleFactor);
    
    // Smart width calculation for better responsiveness
    const contentBasedWidth = data.length * treeSpacing + basePadding * 2;
    const minWidthForViewport = Math.max(
      viewportWidth * 0.98, // Use almost full viewport width
      1400 // Absolute minimum for readability
    );
    
    // Choose the larger of content-based or viewport-based width
    const chartWidth = Math.max(contentBasedWidth, minWidthForViewport);
    
    // Responsive padding calculations
    const treeEdgePadding = treeWidth * 0.3;
    const chartPadding = Math.max(basePadding + treeEdgePadding, 100); // Ensure minimum padding
    const rightPadding = Math.max(basePadding + treeEdgePadding, 100);
    
    const xAxisStart = chartPadding;
    const xAxisEnd = chartWidth - rightPadding;
    const xAxisWidth = xAxisEnd - xAxisStart;
    const yBase = chartHeight - 200; // Increased spacing from bottom for larger chart area
    const numTrees = data.length;
    
    // Adaptive tree spacing based on available space and number of trees
    const availableSpace = xAxisWidth - treeWidth;
    const optimalSpacing = numTrees > 1 ? availableSpace / (numTrees - 1) : availableSpace / 2;
    const minSpacingForTrees = Math.max(250, treeWidth * 1.5); // Minimum spacing relative to tree width
    
    const xStep = numTrees > 1 ? Math.max(optimalSpacing, minSpacingForTrees) : availableSpace / 2;

    // Calculate height range for percentage calculation
    const heights = data.map(bird => bird.heightValue);
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const heightRange = maxHeight - minHeight;

    // Debug logging
    console.log('BirdPercentageChart Debug:', {
      heights,
      minHeight,
      maxHeight,
      heightRange,
      dataLength: data.length
    });

    // All trees will be uniform height (using average tree height for visual consistency)
    const uniformTreeHeight = 30; // Fixed height for all trees in meters
    const axisHeight = 460;
    const topPadding = 40;
    
    // Y-axis for percentage scale (0-100%)
    const yAxisTicks = [];
    for (let p = 0; p <= 100; p += 10) {
      yAxisTicks.push({ 
        value: p, 
        isMajor: p % 20 === 0
      });
    }

    // Font size logic based on number of trees
    let xLabelFont = 12;
    let xLabelRotate = false;
    if (numTrees > 12 && numTrees <= 20) xLabelFont = 10;
    if (numTrees > 20) { xLabelFont = 9; xLabelRotate = true; }

    const xAxisLabelGap = 32;
    const yAxisLabelGap = 32;

    // Helper function for consistent randomness
    const random = (min, max, seed = 0) => {
      const value = Math.sin(seed * 9.7 + 7.3) * 0.5 + 0.5;
      return min + value * (max - min);
    };

    return (
      <div className="percentage-height-chart-container" style={{ 
        minHeight: `${chartHeight + 200}px`,
        height: `${chartHeight + 200}px`
      }}>
        <div className="percentage-height-chart-inner" style={{
          height: `${chartHeight + 200}px`
        }}>
          <svg
            width="100%"
            height={chartHeight}
            style={{ minHeight: `${chartHeight}px` }}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            role="img"
            className="percentage-height-chart-svg"
          >
            {/* Definitions */}
            <defs>
              {/* Tree trunk gradients */}
              <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6D4C41" />
                <stop offset="30%" stopColor="#8D6E63" />
                <stop offset="70%" stopColor="#A0522D" />
                <stop offset="100%" stopColor="#5D4037" />
              </linearGradient>
              
              <linearGradient id="understoryTrunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#795548" />
                <stop offset="30%" stopColor="#8D6E63" />
                <stop offset="70%" stopColor="#A0522D" />
                <stop offset="100%" stopColor="#6D4C41" />
              </linearGradient>
              
              <linearGradient id="emergentTrunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5D4037" />
                <stop offset="25%" stopColor="#6D4C41" />
                <stop offset="50%" stopColor="#8D6E63" />
                <stop offset="75%" stopColor="#A0522D" />
                <stop offset="100%" stopColor="#4E342E" />
              </linearGradient>

              <linearGradient id="forestBackground" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e6f3ff" />
                <stop offset="30%" stopColor="#dcfce7" />
                <stop offset="60%" stopColor="#bbf7d0" />
                <stop offset="100%" stopColor="#fed7aa" />
              </linearGradient>

              {/* Filters */}
              <filter id="treeShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                <feOffset dx="2" dy="2" result="offset"/>
                <feFlood floodColor="#000000" floodOpacity="0.3"/>
                <feComposite in2="offset" operator="in"/>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              <filter id="shadowBlur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2"/>
              </filter>
              
              <filter id="birdShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2"/>
              </filter>

              <filter id="canopyGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4"/>
                <feComponentTransfer>
                  <feFuncA type="discrete" tableValues="0.3"/>
                </feComponentTransfer>
              </filter>
              
              <filter id="forestShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="1" dy="1" stdDeviation="2" floodOpacity="0.3"/>
              </filter>

              <linearGradient id="canopyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(76, 175, 80, 0.15)"/>
                <stop offset="50%" stopColor="rgba(129, 199, 132, 0.1)"/>
                <stop offset="100%" stopColor="rgba(165, 214, 167, 0.05)"/>
              </linearGradient>
              
              <radialGradient id="fogGradient" cx="50%" cy="100%" r="60%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.1)"/>
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)"/>
              </radialGradient>
            </defs>

            {/* Background gradient */}
            <rect
              x={chartPadding}
              y={50}
              width={xAxisEnd - chartPadding}
              height={yBase - 50}
              fill="url(#forestBackground)"
              opacity={0.3}
            />

            {/* Y-axis for percentage scale */}
            <g filter="url(#forestShadow)">
              <line 
                x1={chartPadding} 
                y1={50}
                x2={chartPadding} 
                y2={yBase} 
                stroke="#000000" 
                strokeWidth="3" 
                opacity="1" 
              />
              {yAxisTicks.map((tick, i) => (
                <g key={i}>
                  <line 
                    x1={chartPadding - (tick.isMajor ? 10 : 6)} 
                    y1={yBase - (tick.value / 100) * (yBase - 80)} 
                    x2={chartPadding} 
                    y2={yBase - (tick.value / 100) * (yBase - 80)} 
                    stroke="#000000" 
                    strokeWidth={tick.isMajor ? "3" : "2"}
                    opacity="1"
                  />
                  <line
                    x1={chartPadding}
                    y1={yBase - (tick.value / 100) * (yBase - 80)}
                    x2={xAxisEnd}
                    y2={yBase - (tick.value / 100) * (yBase - 80)}
                    stroke="rgba(0,0,0,0.15)"
                    strokeDasharray={tick.isMajor ? "6 4" : "2 6"}
                    strokeWidth={tick.isMajor ? "1.5" : "1"}
                  />
                  <text 
                    x={chartPadding - 24} 
                    y={yBase + 4 - (tick.value / 100) * (yBase - 80)} 
                    fontSize={tick.isMajor ? "13" : "11"} 
                    fill="#000000" 
                    textAnchor="end"
                    fontWeight={tick.isMajor ? "bold" : "normal"}
                    className="percentage-height-y-axis-tick-label"
                  >
                    {tick.value}%
                  </text>
                </g>
              ))}
              <text 
                x={chartPadding - 48} 
                y={yBase / 2 + yAxisLabelGap - 10} 
                fontSize="15" 
                fill="#000000" 
                textAnchor="middle" 
                transform={`rotate(-90 ${chartPadding - 48},${yBase / 2 + yAxisLabelGap - 10})`} 
                className="percentage-height-y-axis-label"
              >
                Height Percentage (%)
              </text>
            </g>

            {/* X Axis */}
            <g filter="url(#forestShadow)">
              <line x1={chartPadding} y1={yBase} x2={xAxisEnd} y2={yBase} stroke="#000000" strokeWidth="4" opacity="1" />
              {data.map((bird, i) => {
                const treeX = numTrees === 1
                  ? (xAxisStart + xAxisEnd) / 2
                  : chartPadding + treeWidth / 2 + (i * xStep);
                return (
                  <g key={`xaxis-${bird.displayIndex}`}>
                    <line 
                      x1={treeX} 
                      y1={yBase} 
                      x2={treeX} 
                      y2={50} 
                      stroke="rgba(0,0,0,0.15)" 
                      strokeDasharray="2 6" 
                      strokeWidth="1" 
                    />
                    <line x1={treeX} y1={yBase} x2={treeX} y2={yBase + 8} stroke="#000000" strokeWidth="3" opacity="1" />
                    <text
                      x={treeX}
                      y={yBase + 25 + xAxisLabelGap}
                      fontSize={xLabelFont}
                      fill="#000000"
                      textAnchor="middle"
                      transform={xLabelRotate ? `rotate(-45 ${treeX} ${yBase + 25 + xAxisLabelGap})` : undefined}
                      className="percentage-height-x-axis-tick-label"
                    >
                      {`Tree ${bird.displayIndex}`}
                    </text>
                  </g>
                );
              })}
              <text 
                x={(xAxisStart + xAxisEnd) / 2} 
                y={yBase + 64 + xAxisLabelGap} 
                fontSize="16" 
                fill="#000000" 
                textAnchor="middle" 
                className="percentage-height-x-axis-label"
              >
                Trees
              </text>
            </g>

            {/* Enhanced forest floor vegetation */}
            {Array.from({length: Math.floor(xAxisWidth / 6)}, (_, i) => {
              const grassX = chartPadding + (i * 6) + random(-3, 3, i);
              const grassHeight = random(3, 12, i + 100);
              const vegetationType = random(0, 1, i + 1000);
              
              return (
                <g key={`vegetation-${i}`}>
                  <line 
                    x1={grassX} 
                    y1={yBase} 
                    x2={grassX + random(-2, 2, i + 200)} 
                    y2={yBase - grassHeight} 
                    stroke={`hsl(${random(90, 140, i + 300)}, ${random(60, 90, i + 400)}%, ${random(15, 35, i + 500)}%)`}
                    strokeWidth={random(0.5, 2, i + 600)}
                    opacity={random(0.4, 0.8, i + 700)}
                  />
                  
                  {/* Add ferns occasionally */}
                  {vegetationType > 0.7 && (
                    <g>
                      {Array.from({length: random(3, 6, i + 800)}, (_, fernIndex) => {
                        const fernAngle = (fernIndex * 60) + random(-20, 20, fernIndex + i + 900);
                        const fernLength = random(4, 8, fernIndex + i + 1000);
                        const fernEndX = grassX + Math.cos(fernAngle * Math.PI / 180) * fernLength;
                        const fernEndY = yBase - fernLength * 0.8;
                        return (
                          <line
                            key={`fern-${i}-${fernIndex}`}
                            x1={grassX}
                            y1={yBase - 2}
                            x2={fernEndX}
                            y2={fernEndY}
                            stroke={`hsl(${random(110, 150, fernIndex + i + 1100)}, ${random(70, 90, fernIndex + i + 1200)}%, ${random(20, 30, fernIndex + i + 1300)}%)`}
                            strokeWidth={random(0.3, 1, fernIndex + i + 1400)}
                            opacity={random(0.5, 0.7, fernIndex + i + 1500)}
                          />
                        );
                      })}
                    </g>
                  )}
                  
                  {/* Add mushrooms occasionally */}
                  {vegetationType > 0.85 && (
                    <g>
                      <line
                        x1={grassX + random(-2, 2, i + 1600)}
                        y1={yBase}
                        x2={grassX + random(-2, 2, i + 1700)}
                        y2={yBase - random(2, 4, i + 1800)}
                        stroke="#8B4513"
                        strokeWidth={random(1, 2, i + 1900)}
                        opacity={0.6}
                      />
                      <ellipse
                        cx={grassX + random(-2, 2, i + 2000)}
                        cy={yBase - random(2, 4, i + 2100)}
                        rx={random(2, 4, i + 2200)}
                        ry={random(1, 2, i + 2300)}
                        fill={`hsl(${random(15, 35, i + 2400)}, ${random(40, 70, i + 2500)}%, ${random(25, 45, i + 2600)}%)`}
                        opacity={random(0.5, 0.8, i + 2700)}
                      />
                    </g>
                  )}
                  
                  {/* Small rocks and debris */}
                  {vegetationType > 0.9 && (
                    <ellipse
                      cx={grassX + random(-3, 3, i + 2800)}
                      cy={yBase + 1}
                      rx={random(1, 3, i + 2900)}
                      ry={random(0.5, 1.5, i + 3000)}
                      fill={`hsl(${random(20, 40, i + 3100)}, ${random(20, 40, i + 3200)}%, ${random(30, 50, i + 3300)}%)`}
                      opacity={random(0.3, 0.6, i + 3400)}
                    />
                  )}
                </g>
              );
            })}

            {/* Tree shadows at the base */}
            {data.map((bird, i) => {
              const treeX = numTrees === 1
                ? (xAxisStart + xAxisEnd) / 2
                : chartPadding + treeWidth / 2 + (i * xStep);
              const shadowWidth = treeWidth * 1.2;
              const shadowHeight = 25;
              const shadowOpacity = 0.4;
              
              return (
                <g key={`tree-shadow-${bird.displayIndex}`}>
                  <ellipse
                    cx={treeX}
                    cy={yBase + 8}
                    rx={shadowWidth / 2}
                    ry={shadowHeight / 2}
                    fill="#2D5016"
                    opacity={shadowOpacity}
                    filter="url(#shadowBlur)"
                  />
                  <ellipse
                    cx={treeX + 2}
                    cy={yBase + 6}
                    rx={shadowWidth * 0.8 / 2}
                    ry={shadowHeight * 0.6 / 2}
                    fill="#1a2e0c"
                    opacity={shadowOpacity * 0.6}
                  />
                </g>
              );
            })}

            {/* Trees with simple design, always 100% height */}
            {data.map((bird, i) => {
              const treeX = numTrees === 1
                ? (xAxisStart + xAxisEnd) / 2
                : chartPadding + treeWidth / 2 + (i * xStep);
              const groundLevel = yBase;
              const fullTreeHeight = yBase - 80; // Always use full available height
              return (
                <g key={`tree-${bird.displayIndex}-svg`}>
                  <g
                    transform={`translate(${treeX}, ${groundLevel})`}
                    className={`percentage-height-tree-group ${this.state.hoveredBird === bird ? 'hovered' : ''}`}
                    onMouseEnter={e => this.handleMouseEnter(bird, e)}
                    onMouseLeave={this.handleMouseLeave}
                    aria-label={`Tree ${bird.displayIndex}`}
                    tabIndex={0}
                  >
                    {this.generateSimpleTree(treeWidth, fullTreeHeight)}
                  </g>
                </g>
              );
            })}

            {/* Birds positioned at the top of their respective trees */}
            {data.map((bird, i) => {
              const treeX = numTrees === 1
                ? (xAxisStart + xAxisEnd) / 2
                : chartPadding + treeWidth / 2 + (i * xStep);
              // Calculate bird height percentage (capped 0-100)
              const treeHeight = bird["Height of tree/m"] ?? bird.height ?? 1;
              const birdHeight = bird["Height of bird/m"] ?? bird.birdHeight ?? 0;
              let birdPercent = (parseFloat(birdHeight) / parseFloat(treeHeight)) * 100;
              if (isNaN(birdPercent)) birdPercent = 0;
              birdPercent = Math.max(0, Math.min(100, birdPercent));
              // Place bird according to percentage
              const birdY = yBase - (birdPercent / 100) * (yBase - 80);
              const baseBirdWidth = 90;
              const baseBirdHeight = 80;
              const birdSizeScale = Math.max(0.6, Math.min(1.2, scaleFactor));
              const birdWidth = baseBirdWidth * birdSizeScale;
              const birdHeightPx = baseBirdHeight * birdSizeScale;
              const birdX = treeX;
              return (
                <g key={`bird-${bird.displayIndex}`}>
                  <image
                    href="/shb.png"
                    x={birdX - (birdWidth / 2)}
                    y={birdY - (birdHeightPx / 2)}
                    width={birdWidth}
                    height={birdHeightPx}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    alt={`Bird ${bird.displayIndex}`}
                    onMouseEnter={e => this.handleMouseEnter(bird, e)}
                    onMouseLeave={this.handleMouseLeave}
                    filter="url(#birdShadow)"
                  />
                  <circle
                    cx={birdX}
                    cy={birdY}
                    r="15"
                    fill="#FFD700"
                    stroke="#FF6B35"
                    strokeWidth="2"
                    opacity="0.8"
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onMouseEnter={e => this.handleMouseEnter(bird, e)}
                    onMouseLeave={this.handleMouseLeave}
                  />
                  <text
                    x={birdX}
                    y={birdY + 5}
                    fontSize="20"
                    textAnchor="middle"
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onMouseEnter={e => this.handleMouseEnter(bird, e)}
                    onMouseLeave={this.handleMouseLeave}
                  >
                    🐦
                  </text>
                </g>
              );
            })}

            {/* Height reference lines */}
            <g opacity="0.3">
              {[25, 50, 75].map(percentage => {
                const y = yBase - (percentage / 100) * (yBase - 80);
                return (
                  <line
                    key={percentage}
                    x1={chartPadding}
                    y1={y}
                    x2={xAxisEnd}
                    y2={y}
                    stroke="#666666"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                );
              })}
            </g>

            {/* Multi-layered canopy atmosphere */}
            <rect 
              x={xAxisStart} 
              y={30} 
              width={xAxisWidth} 
              height={120} 
              fill="url(#canopyGradient)" 
              opacity="0.4" 
              pointerEvents="none"
              filter="url(#canopyGlow)"
            />
            
            {/* Additional atmospheric layers */}
            <g opacity="0.3" pointerEvents="none">
              {/* Floating leaves and forest particles */}
              {Array.from({length: 15}, (_, i) => {
                const leafX = xAxisStart + random(0, xAxisWidth, i + 800);
                const leafY = 50 + random(0, 200, i + 900);
                const leafSize = random(2, 6, i + 1000);
                return (
                  <ellipse
                    key={`leaf-${i}`}
                    cx={leafX}
                    cy={leafY}
                    rx={leafSize}
                    ry={leafSize * 0.6}
                    fill={`hsl(${random(110, 150, i + 1100)}, ${random(70, 90, i + 1200)}%, ${random(25, 35, i + 1300)}%)`}
                    opacity={random(0.2, 0.5, i + 1400)}
                    transform={`rotate(${random(0, 360, i + 1500)} ${leafX} ${leafY})`}
                  />
                );
              })}
              
              {/* Light rays filtering through canopy */}
              {Array.from({length: 8}, (_, i) => {
                const rayX = xAxisStart + (i * xAxisWidth / 7) + random(-30, 30, i + 1600);
                const rayWidth = random(15, 30, i + 1700);
                return (
                  <rect
                    key={`ray-${i}`}
                    x={rayX}
                    y={30}
                    width={rayWidth}
                    height={200}
                    fill="rgba(255,255,153,0.15)"
                    opacity={random(0.1, 0.3, i + 1800)}
                    transform={`skewX(${random(-5, 5, i + 1900)})`}
                  />
                );
              })}
              
              {/* Flying insects and small birds for forest life */}
              {Array.from({length: 6}, (_, i) => {
                const insectX = xAxisStart + random(0, xAxisWidth, i + 2000);
                const insectY = 100 + random(0, 300, i + 2100);
                const insectType = random(0, 1, i + 2200);
                
                if (insectType > 0.7) {
                  // Small flying birds
                  return (
                    <g key={`bird-${i}`}>
                      <path
                        d={`M ${insectX - 3} ${insectY} Q ${insectX} ${insectY - 2} ${insectX + 3} ${insectY} Q ${insectX} ${insectY + 1} ${insectX - 3} ${insectY}`}
                        fill={`hsl(${random(200, 240, i + 2300)}, ${random(30, 50, i + 2400)}%, ${random(20, 40, i + 2500)}%)`}
                        opacity={random(0.3, 0.6, i + 2600)}
                      />
                    </g>
                  );
                } else {
                  // Flying insects
                  return (
                    <circle
                      key={`insect-${i}`}
                      cx={insectX}
                      cy={insectY}
                      r={random(0.5, 1.5, i + 2700)}
                      fill={`hsl(${random(40, 60, i + 2800)}, ${random(50, 70, i + 2900)}%, ${random(30, 50, i + 3000)}%)`}
                      opacity={random(0.2, 0.4, i + 3100)}
                    />
                  );
                }
              })}
              
              {/* Forest mist/fog effect */}
              {Array.from({length: 4}, (_, i) => {
                const mistX = xAxisStart + (i * xAxisWidth / 3) + random(-50, 50, i + 3200);
                const mistY = 200 + random(0, 100, i + 3300);
                const mistWidth = random(80, 150, i + 3400);
                const mistHeight = random(30, 60, i + 3500);
                
                return (
                  <ellipse
                    key={`mist-${i}`}
                    cx={mistX}
                    cy={mistY}
                    rx={mistWidth}
                    ry={mistHeight}
                    fill="rgba(255, 255, 255, 0.1)"
                    opacity={random(0.1, 0.2, i + 3600)}
                    filter="url(#canopyGlow)"
                  />
                );
              })}
            </g>
          </svg>

          {/* Tooltip */}
          {this.state.hoveredBird && (
            <div
              className="percentage-height-tooltip"
              style={{
                left: Math.max(10, Math.min(this.state.tooltipX - 100, chartWidth - 220)),
                top: Math.max(10, this.state.tooltipY - 80)
              }}
              role="tooltip"
            >
              <div className="percentage-height-tooltip-title">
                🐦 Bird {this.state.hoveredBird["SHB individual ID"] ?? `ID${this.state.hoveredBird.displayIndex}`}
              </div>
              <div className="percentage-height-tooltip-item">
                <strong>Tree Height:</strong> {this.state.hoveredBird.heightValue} m
              </div>
              <div className="percentage-height-tooltip-item">
                <strong>Height Percentage:</strong> {(((this.state.hoveredBird.heightValue - minHeight) / (maxHeight - minHeight)) * 100).toFixed(1)}%
              </div>
              <div className="percentage-height-tooltip-item">
                <strong>Location:</strong> {this.state.hoveredBird.Location ?? this.state.hoveredBird.location ?? 'Unknown'}
              </div>
              <div className="percentage-height-tooltip-item">
                <strong>Observer:</strong> {this.state.hoveredBird["Observer name"] ?? this.state.hoveredBird.observer ?? 'Unknown'}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default BirdPercentageChart;
