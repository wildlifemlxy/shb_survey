import React, { Component } from 'react';
import '../../../css/components/Charts/TreeChart/PercentageHeightChart.css';

class PercentageHeightChart extends Component {
  state = { hoveredTree: null, tooltipX: 0, tooltipY: 0 };

  // Helper: get percentage (0-100) for a value relative to max
  getPercentage = (value, max) => {
    if (!max || max === 0) return 0;
    return Math.round((value / max) * 100);
  };

  handleMouseEnter = (tree, evt) => {
    const svg = evt.target.ownerSVGElement;
    const svgRect = svg.getBoundingClientRect();
    // Get the SVG coordinates of the bird logo
    let svgX = 0, svgY = 0;
    if (evt.target.tagName === 'image') {
      svgX = parseFloat(evt.target.getAttribute('x')) + parseFloat(evt.target.getAttribute('width'));
      svgY = parseFloat(evt.target.getAttribute('y')) + parseFloat(evt.target.getAttribute('height')) / 2;
    } else {
      svgX = evt.clientX - svgRect.left;
      svgY = evt.clientY - svgRect.top;
    }
    // Find the scrollable container
    let scrollable = svg.parentElement;
    while (scrollable && !scrollable.classList.contains('percentage-height-chart-scrollable')) {
      scrollable = scrollable.parentElement;
    }
    if (!scrollable) return;
    const scrollableRect = scrollable.getBoundingClientRect();
    // Tooltip position relative to scrollable container, closer to the tree/bird
    let tooltipX = svgRect.left + svgX - scrollableRect.left + 8;
    let tooltipY = svgRect.top + svgY - scrollableRect.top - 8;
    // If tooltip would overflow right, show to the left
    if (tooltipX + 220 > scrollableRect.width) {
      tooltipX = svgRect.left + svgX - scrollableRect.left - 220;
    }
    if (tooltipY < 0) tooltipY = 0;
    this.setState({ hoveredTree: tree, tooltipX, tooltipY });
  };
  handleMouseLeave = () => {
    this.setState({ hoveredTree: null });
  };

  // --- Tree design from TreeHeightChart ---
  generateSVGTree = (height, treeWidth, treeHeight, treeId, birdHeightValue) => {
    const centerX = 0;
    const baseY = 0;
    const seed = treeId || 0;
    const random = (min, max, offset = 0) => {
      const value = Math.sin(seed * 9.7 + offset * 7.3) * 0.5 + 0.5;
      return min + value * (max - min);
    };
    const createBarkTexture = (x, y, width, height, trunkId) => {
      const barkLines = [];
      const numLines = Math.floor(height / 6);
      for (let i = 0; i < numLines; i++) {
        const lineY = y + (i * height / numLines);
        const lineWidth = width * random(0.5, 0.95, i + trunkId);
        const lineOffset = random(-width * 0.15, width * 0.15, i + trunkId + 10);
        const curvature1 = random(-3, 3, i + trunkId + 20);
        const curvature2 = random(-2, 2, i + trunkId + 30);
        barkLines.push(
          <path
            key={`bark-${trunkId}-${i}`}
            d={`M ${x - lineWidth/2 + lineOffset} ${lineY} Q ${x + lineOffset + curvature1} ${lineY + random(2, 5, i + trunkId + 20)} ${x + lineWidth/2 + lineOffset + curvature2} ${lineY + random(1, 3, i + trunkId + 40)}`}
            stroke={`hsl(${random(20, 40, i + trunkId + 50)}, ${random(30, 60, i + trunkId + 60)}%, ${random(15, 35, i + trunkId + 70)}%)`}
            strokeWidth={random(0.3, 2, i + trunkId + 80)}
            fill="none"
            opacity={random(0.4, 0.8, i + trunkId + 90)}
          />
        );
        if (random(0, 1, i + trunkId + 100) > 0.7) {
          barkLines.push(
            <line
              key={`crack-${trunkId}-${i}`}
              x1={x + random(-width * 0.3, width * 0.3, i + trunkId + 110)}
              y1={lineY}
              x2={x + random(-width * 0.2, width * 0.2, i + trunkId + 120)}
              y2={lineY + random(8, 15, i + trunkId + 130)}
              stroke="#3D2914"
              strokeWidth={random(0.5, 1.5, i + trunkId + 140)}
              opacity={random(0.3, 0.6, i + trunkId + 150)}
            />
          );
        }
      }
      return barkLines;
    };
    const createFoliageCluster = (cx, cy, size, clusterId, hueBase) => {
      const leaves = [];
      // Make much less dense: about 30% of original
      const numLeaves = Math.max(1, Math.floor(size / 10)); // was size / 5, now size / 10
      for (let i = 0; i < numLeaves; i++) {
        const angle = (i * 2 * Math.PI) / numLeaves + random(-0.3, 0.3, clusterId + i);
        const distance = random(0, size * 0.8, clusterId + i + 50);
        const leafX = cx + Math.cos(angle) * distance;
        const leafY = cy + Math.sin(angle) * distance;
        const leafSize = random(2, 6, clusterId + i + 100);
        leaves.push(
          <ellipse
            key={`leaf-${clusterId}-${i}`}
            cx={leafX}
            cy={leafY}
            rx={leafSize}
            ry={leafSize * random(0.7, 1.3, clusterId + i + 150)}
            fill={`hsl(${hueBase + random(-15, 15, clusterId + i + 200)}, ${random(60, 85, clusterId + i + 250)}%, ${random(25, 40, clusterId + i + 300)}%)`}
            opacity={random(0.8, 0.95, clusterId + i + 350)}
            transform={`rotate(${random(0, 360, clusterId + i + 400)} ${leafX} ${leafY})`}
          />
        );
      }
      return leaves;
    };
    const createBranch = (startX, startY, endX, endY, thickness, depth, branchId, uniqueIndex = 0) => {
      if (depth <= 0 || thickness < 0.5) return [];
      const branches = [];
      branches.push(
        <line
          key={`branch-${treeId}-${branchId}-${depth}-${uniqueIndex}-main`}
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={depth > 2 ? "url(#trunkGradient)" : `hsl(${random(25, 35, branchId + uniqueIndex)}, ${random(40, 60, branchId + uniqueIndex + 10)}%, ${random(15, 25, branchId + uniqueIndex + 20)}%)`}
          strokeWidth={thickness}
          strokeLinecap="round"
          opacity={0.9}
        />
      );
      if (depth > 1) {
        const numSubBranches = Math.floor(random(1, 3, branchId + depth + uniqueIndex));
        for (let i = 0; i < numSubBranches; i++) {
          const branchPoint = random(0.4, 0.8, branchId + depth + i + uniqueIndex);
          const branchStartX = startX + (endX - startX) * branchPoint;
          const branchStartY = startY + (endY - startY) * branchPoint;
          const branchAngle = Math.atan2(endY - startY, endX - startX) + random(-Math.PI/3, Math.PI/3, branchId + depth + i + 100 + uniqueIndex);
          const branchLength = random(0.3, 0.7, branchId + depth + i + 200 + uniqueIndex) * Math.sqrt((endX - startX)**2 + (endY - startY)**2);
          const subEndX = branchStartX + Math.cos(branchAngle) * branchLength;
          const subEndY = branchStartY + Math.sin(branchAngle) * branchLength;
          const subBranchId = branchId * 1000 + depth * 100 + i * 10 + uniqueIndex;
          branches.push(...createBranch(
            branchStartX, branchStartY, subEndX, subEndY, 
            thickness * random(0.5, 0.8, branchId + depth + i + 300 + uniqueIndex), 
            depth - 1, 
            subBranchId,
            uniqueIndex + i + 1
          ));
        }
      }
      return branches;
    };
    // Universal tree design with consistent minimum sizes for crown and branches
    // All trees will have the same minimum crown and branch visibility regardless of height
    const fixedBranchThickness = 3.5;
    const minTrunkWidth = 4;  // Minimum trunk width for visibility
    const minCrownRadius = treeWidth * 0.4; // Minimum crown radius for visibility
    const minBranchLength = 15; // Minimum branch length for visibility
    
    // Universal tree rendering - all trees get the same crown and branch treatment
    // Only the overall tree height scales, but crown/branch sizes remain consistent
    const universalTrunkWidth = Math.max(minTrunkWidth, random(4, 8, 1));
    const universalTrunkHeight = Math.max(treeHeight * 0.4, treeHeight * random(0.5, 0.6, 2));
    const universalCrownHeight = treeHeight - universalTrunkHeight;
    const universalCrownRadius = Math.max(minCrownRadius, treeWidth * random(0.5, 0.7, 3));
    
    // Render tree with universal sizing (all trees get same treatment)
    if (height >= 0.1) { // All trees use the same rendering logic
      const logoSize = 50;
      const birdY = -universalTrunkHeight + (universalTrunkHeight * (1 - birdHeightValue / 100)) - (logoSize / 2);
      return (
        <g>
          {/* Universal trunk - same proportions for all trees */}
          <rect
            x={centerX - universalTrunkWidth / 2}
            y={-universalTrunkHeight}
            width={universalTrunkWidth}
            height={universalTrunkHeight}
            fill="url(#understoryTrunkGradient)"
            stroke="#5D4037"
            strokeWidth={1.2}
            opacity={0.98}
          />
          {createBarkTexture(centerX, -universalTrunkHeight, universalTrunkWidth, universalTrunkHeight, treeId + 1)}
          
          {/* Universal root system - same for all trees */}
          {[0, 1, 2].map(rootIndex => {
            const rootAngle = (rootIndex * 120) + random(-30, 30, rootIndex + 50);
            const rootLength = random(8, 15, rootIndex + 60);
            const rootEndX = centerX + Math.cos(rootAngle * Math.PI / 180) * rootLength;
            return (
              <path
                key={`root-${rootIndex}`}
                d={`M ${centerX} ${baseY} Q ${centerX + Math.cos(rootAngle * Math.PI / 180) * rootLength * 0.5} ${-2} ${rootEndX} ${baseY + 1}`}
                stroke="#5D4037"
                strokeWidth={random(1, 2, rootIndex + 70)}
                fill="none"
                opacity={0.6}
              />
            );
          })}
          
          {/* Universal branches - same minimum size for all trees */}
          {[0, 1, 2, 3, 4].map(i => {
            const branchHeight = -universalTrunkHeight * random(0.6, 0.9, i + 100);
            const branchAngle = (i * 72) + random(-30, 30, i + 110); // 5 branches evenly spaced
            const branchLength = Math.max(minBranchLength, random(15, 35, i + 120));
            const branchEndX = centerX + Math.cos(branchAngle * Math.PI / 180) * branchLength;
            const branchEndY = branchHeight - Math.abs(Math.sin(branchAngle * Math.PI / 180)) * branchLength * 0.4;
            return (
              <g key={i}>
                {createBranch(centerX, branchHeight, branchEndX, branchEndY, fixedBranchThickness, 2, i + 500, i)}
              </g>
            );
          })}
          
          {/* Universal crown clusters - same prominent size for all trees */}
          {[0, 1, 2, 3, 4].map(layer => {
            const layerY = -universalTrunkHeight + (layer * -universalCrownHeight / 5);
            const layerRadius = universalCrownRadius * (1.0 - layer * 0.1);
            const numClusters = Math.max(3, Math.floor((4 + layer) * 0.5)); // Ensure at least 3 clusters
            return (
              <g key={layer}>
                {Array.from({length: numClusters}, (_, i) => {
                  const angle = (i * 2 * Math.PI) / numClusters + random(-0.3, 0.3, layer + i);
                  const distance = random(layerRadius * 0.6, layerRadius * 1.0, layer + i + 10);
                  const clusterX = centerX + Math.cos(angle) * distance;
                  const clusterY = layerY + Math.sin(angle) * distance * 0.4;
                  const clusterSize = Math.max(20, random(25, 40, layer + i + 20)); // Ensure minimum crown cluster size
                  return (
                    <g key={i}>
                      <path d={`M ${clusterX - clusterSize * 0.8} ${clusterY} Q ${clusterX - clusterSize * 0.3} ${clusterY - clusterSize * 1.0} ${clusterX + clusterSize * 0.2} ${clusterY - clusterSize * 0.7} Q ${clusterX + clusterSize * 0.8} ${clusterY - clusterSize * 0.4} ${clusterX + clusterSize * 0.5} ${clusterY + clusterSize * 0.3} Q ${clusterX} ${clusterY + clusterSize * 0.4} ${clusterX - clusterSize * 0.4} ${clusterY + clusterSize * 0.1} Z`} fill={`hsl(${random(90, 140, layer + i + 30)}, ${random(60, 80, layer + i + 40)}%, ${random(25, 35, layer + i + 50)}%)`} opacity={random(0.8, 0.95, layer + i + 60)} filter="url(#shadowBlur)" />
                      <ellipse cx={clusterX + random(-10, 10, layer + i + 70)} cy={clusterY + random(-8, 8, layer + i + 80)} rx={random(8, 15, layer + i + 90)} ry={random(6, 12, layer + i + 100)} fill={`hsl(${random(85, 125, layer + i + 110)}, ${random(55, 75, layer + i + 120)}%, ${random(20, 30, layer + i + 130)}%)`} opacity={random(0.7, 0.9, layer + i + 140)} />
                      {Array.from({length: random(5, 10, layer + i + 200)}, (_, mossIndex) => {
                        const mossX = clusterX + random(-clusterSize * 0.4, clusterSize * 0.4, mossIndex + layer + i + 300);
                        const mossY = clusterY + random(-clusterSize * 0.3, clusterSize * 0.3, mossIndex + layer + i + 400);
                        return (
                          <circle key={`moss-${layer}-${i}-${mossIndex}`} cx={mossX} cy={mossY} r={random(2, 5, mossIndex + layer + i + 500)} fill={`hsl(${random(80, 120, mossIndex + layer + i + 600)}, ${random(70, 90, mossIndex + layer + i + 700)}%, ${random(15, 25, mossIndex + layer + i + 800)}%)`} opacity={random(0.6, 0.9, mossIndex + layer + i + 900)} />
                        );
                      })}
                      {createFoliageCluster(clusterX, clusterY, clusterSize * 0.8, layer * 100 + i, random(100, 130, layer + i + 150))}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      );
    }
    return null;
  };
  // --- End tree design ---

  // Utility: check if a value is a valid positive number (not N/A, not empty, not negative, not NaN)
  // Handles both integer and decimal values, including very small trees (0.1m and above)
  isValidHeight = value => {
    if (typeof value === 'string' && value.trim().toLowerCase() === 'n/a') return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num) && num >= 0.1; // Changed from > 0 to >= 0.1 to allow small trees
  };

  render() {
    const rawData = this.props.data && this.props.data.length > 0 ? this.props.data : [];
    // Process trees with valid heights (both decimal and whole numbers)
    const validTreesData = [];
    rawData.forEach((tree, originalIndex) => {
      const heightRaw = tree["Height of tree/m"] ?? tree.height ?? 0;
      if (this.isValidHeight(heightRaw)) {
        // parseFloat handles both decimal (15.75) and whole number (20) values
        const numHeight = parseFloat(heightRaw);
        validTreesData.push({
          ...tree,
          originalIndex: originalIndex,
          displayIndex: originalIndex + 1,
          height: numHeight
        });
      }
    });
    const data = validTreesData;
    const chartHeight = 600;
    const chartWidth = 1350;
    const treeWidth = 40 // Bar width
    const treeEdgePadding = treeWidth * 0.4;
    // Increase left padding to prevent y-axis cutoff
    const chartPadding = 60 + treeEdgePadding; // was 20 + treeEdgePadding
    const rightPadding = 30 + treeEdgePadding;
    const xAxisStart = chartPadding;
    const xAxisEnd = chartWidth - rightPadding;
    const xAxisWidth = xAxisEnd - xAxisStart;
    const yBase = 500;
    const numTrees = data.length;
    // Remove previous minTreeSpacing declaration to avoid redeclaration error
    // For percentage chart, y always 0-100
    const axisHeight = 460;
    const yAxisTicks = [];
    for (let p = 0; p <= 100; p += 10) {
      yAxisTicks.push({ value: p, isMajor: p % 20 === 0 });
    }
    let xLabelFont = 12;
    let xLabelRotate = false;
    if (numTrees > 12 && numTrees <= 20) xLabelFont = 10;
    if (numTrees > 20) { xLabelFont = 9; xLabelRotate = true; }
    const xAxisLabelGap = 32;
    const yAxisLabelGap = 32;

    // Find max height for percentage calculation
    const maxHeight = data.reduce((max, t) => t.height > max ? t.height : max, 0);

    // Calculate treeX positions for all trees so both axis and tree rendering use the same array
    // Add a visible gap between the first tree and the y-axis (x-axis start)
    // Also, allow for horizontal scrolling if trees overflow the chart width
    const minFirstTreeGap = 20; // px gap between first tree and y-axis
    const minLastTreeGap = 50; // px gap between last tree and x-axis end
    const treeSpacing = treeWidth * 0.4; // 40% of tree width for more crown gap
    let dynamicChartWidth = chartWidth;
    let treeXPositions = [];
    if (numTrees > 1) {
      // Calculate required width for all trees + gaps
      const requiredWidth = minFirstTreeGap + minLastTreeGap + treeWidth * numTrees + treeSpacing * (numTrees - 1);
      if (requiredWidth > chartWidth) {
        dynamicChartWidth = requiredWidth;
      }
      const xStart = xAxisStart + minFirstTreeGap;
      treeXPositions = data.map((_, i) => xStart + i * (treeWidth + treeSpacing));
    } else if (numTrees === 1) {
      treeXPositions = [(xAxisStart + xAxisEnd) / 2];
    }

    // Calculate bird logo positions for all trees
    const birdLogos = data.map((tree, i) => {
      const heightRaw = tree["Height of tree/m"] ?? tree.height ?? 0;
      const birdHeightRaw = tree["Height of bird/m"];
      // Exclude if either tree height or bird height is N/A, invalid, or non-positive
      if (typeof heightRaw === 'string' && heightRaw.trim().toLowerCase() === 'n/a') return null;
      if (typeof birdHeightRaw === 'string' && birdHeightRaw.trim().toLowerCase() === 'n/a') return null;
      const treeHeightVal = parseFloat(heightRaw);
      const birdHeightVal = parseFloat(birdHeightRaw);
      if (isNaN(treeHeightVal) || treeHeightVal <= 0) return null;
      if (isNaN(birdHeightVal) || birdHeightVal <= 0) return null;
      // Always stretch tree to full axis height (top y-axis)
      const axisHeight = 460;
      const treeX = treeXPositions[i];
      const yBase = 500;
      const yAxisLabelGap = 32;
      const plotTopY = 30 + yAxisLabelGap;
      const birdYPercent = Math.min(100, (birdHeightVal / treeHeightVal) * 100); // Cap at 100%
      const birdY = yBase - (birdYPercent / 100) * (yBase - plotTopY);
      let logoSize = 60;
      return (
        <g key={`bird-logo-${i}`} style={{ pointerEvents: 'auto' }}>
          <image
            href="/shb.png"
            x={treeX - logoSize / 2}
            y={birdY - logoSize / 2}
            width={logoSize}
            height={logoSize}
            style={{ pointerEvents: 'auto', zIndex: 10, cursor: 'pointer' }}
            onMouseEnter={e => this.handleMouseEnter(tree, e)}
            onMouseMove={e => this.handleMouseEnter(tree, e)}
            onMouseLeave={this.handleMouseLeave}
          />
        </g>
      );
    });

    // Only show trees if both tree height and bird height are valid
    const validTreeForBird = tree => {
      const heightRaw = tree["Height of tree/m"] ?? tree.height ?? 0;
      const birdHeightRaw = tree["Height of bird/m"];
      if (typeof heightRaw === 'string' && heightRaw.trim().toLowerCase() === 'n/a') return false;
      if (typeof birdHeightRaw === 'string' && birdHeightRaw.trim().toLowerCase() === 'n/a') return false;
      const treeHeightVal = parseFloat(heightRaw);
      const birdHeightVal = parseFloat(birdHeightRaw);
      if (isNaN(treeHeightVal) || treeHeightVal <= 0) return false;
      if (isNaN(birdHeightVal) || birdHeightVal <= 0) return false;
      return true;
    };

    // Set x-axis to start at the y-axis (chartPadding) and end at the last tree's edge
    const xAxisStartDynamic = chartPadding;
    const xAxisEndDynamic = treeXPositions.length > 0 ? treeXPositions[treeXPositions.length - 1] + treeWidth / 2 : xAxisEnd;
    // Set plotting area to cover all trees, but not overlap y-axis
    const plottingAreaX = xAxisStartDynamic;
    const plottingAreaWidth = xAxisEndDynamic - xAxisStartDynamic;

    return (
      <>
        <div
          className="percentage-height-chart-outer"
          style={{
            minHeight: `${chartHeight + 100}px`,
            position: 'relative',
            width: `${chartWidth}px`,
            maxWidth: '100%',
            margin: '0 auto',
          }}
        >
          {/* Fixed y-axis and y labels */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', zIndex: 2, pointerEvents: 'none' }}>
            <svg width={chartWidth} height={chartHeight} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
              <g>
                {/* Y-axis now ends exactly at the x-axis (yBase) */}
                <line x1={chartPadding} y1={30 + yAxisLabelGap} x2={chartPadding} y2={yBase} stroke="#000" strokeWidth="3" />
                {yAxisTicks.map((tick, i) => {
                  const plotTopY = 30 + yAxisLabelGap;
                  const yTick = yBase - (tick.value / 100) * (yBase - plotTopY);
                  return (
                    <g key={i}>
                      <line 
                        x1={chartPadding - (tick.isMajor ? 10 : 6)} 
                        y1={yTick} 
                        x2={chartPadding} 
                        y2={yTick} 
                        stroke="#000" 
                        strokeWidth={tick.isMajor ? "2.5" : "1.5"}
                      />
                      <text 
                        x={chartPadding - 10} // was chartPadding - 32
                        y={yTick + 4}
                        fontSize={tick.isMajor ? "13" : "11"}
                        fill="#000"
                        textAnchor="end"
                        fontWeight={tick.isMajor ? "bold" : "normal"}
                        className="percentage-height-chart-y-axis-tick-label"
                      >
                        {tick.value}%
                      </text>
                    </g>
                  );
                })}
                <text 
                  x={chartPadding - 50} // moved further left to avoid overlap
                  y={(yBase + 30 + yAxisLabelGap) / 2 - 10} 
                  fontSize="15" 
                  fill="#000" 
                  textAnchor="middle" 
                  transform={`rotate(-90 ${chartPadding - 50},${(yBase + 30 + yAxisLabelGap) / 2 - 10})`} 
                  className="percentage-height-chart-y-axis-label"
                >
                  Height (%)
                </text>
              </g>
            </svg>
          </div>
          {/* Scrollable plotting area (SVG) and x-axis */}
          <div
            className="percentage-height-chart-scrollable"
            style={{
              overflowX: dynamicChartWidth > chartWidth ? 'auto' : 'visible',
              width: `${chartWidth}px`,
              maxWidth: '100%',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              className="percentage-height-chart-inner"
              style={{
                minWidth: dynamicChartWidth > chartWidth ? dynamicChartWidth*1.1 : '110%',
                width: dynamicChartWidth > chartWidth ? dynamicChartWidth*1.1 : '115%',
                position: 'relative',
              }}
            >
              <svg
                width={dynamicChartWidth}
                height={chartHeight}
                viewBox={`0 0 ${dynamicChartWidth} ${chartHeight}`}
                role="img"
                className="percentage-height-chart-svg"
              >
                {/* Background, grid, and annotation lines can be simplified for percentage */}
                <defs>
                  <linearGradient id="forest-bg-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e6f9c2" />
                    <stop offset="40%" stopColor="#b6e388" />
                    <stop offset="80%" stopColor="#388e3c" />
                    <stop offset="100%" stopColor="#145c1b" />
                  </linearGradient>
                  {/* Trunk gradients for tree trunks */}
                  <linearGradient id="understoryTrunkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a97c50" />
                    <stop offset="100%" stopColor="#5d4037" />
                  </linearGradient>
                  <linearGradient id="trunkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#bfa16b" />
                    <stop offset="100%" stopColor="#6d4c27" />
                  </linearGradient>
                  <linearGradient id="emergentTrunkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e0b97a" />
                    <stop offset="100%" stopColor="#7b5a36" />
                  </linearGradient>
                  {/* Optionally, shadow blur for foliage */}
                  <filter id="shadowBlur" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" />
                  </filter>
                </defs>
                <rect
                  x={65}
                  y={20 + yAxisLabelGap}
                  width={plottingAreaWidth}
                  height={yBase - (20 + yAxisLabelGap)}
                  fill="url(#forest-bg-gradient)"
                />
                {/* X Axis and labels at the base of the plotting area */}
                <g>
                  <line x1={0} y1={yBase} x2={xAxisEndDynamic} y2={yBase} stroke="#000" strokeWidth="3" />
                  {data.map((tree, i) => {
                    const treeX = treeXPositions[i];
                    // Use tree.displayIndex if available, else fallback to i+1
                    const treeLabel = tree.displayIndex !== undefined ? tree.displayIndex : (i + 1);
                    return (
                      <g key={`xaxis-${i}`}>
                        <line x1={treeX} y1={yBase} x2={treeX} y2={yBase + 8} stroke="#000" strokeWidth="2" />
                        <text
                          x={treeX}
                          y={yBase + 25 + xAxisLabelGap}
                          fontSize={xLabelFont}
                          fill="#000"
                          textAnchor="middle"
                          transform={xLabelRotate ? `rotate(-45 ${treeX} ${yBase + 25 + xAxisLabelGap})` : undefined}
                          className="percentage-height-chart-x-axis-tick-label"
                          aria-label={`Tree ${treeLabel}`}
                        >
                          {`Tree ${treeLabel}`}
                        </text>
                      </g>
                    );
                  })}
                  <text 
                    x={(xAxisStartDynamic + xAxisEndDynamic) / 2} 
                    y={yBase + 64 + xAxisLabelGap} 
                    fontSize="16" 
                    fill="#000" 
                    textAnchor="middle" 
                    className="percentage-height-chart-x-axis-label"
                  >
                    Trees
                  </text>
                </g>
                {/* Tree rendering using TreeHeightChart design */}
                {data.map((tree, i) => {
                  if (tree.height === undefined && tree["Height of bird/m"] === undefined) return null;
                  const height = tree.height; // Use the processed height value that supports both decimals and whole numbers
                  const birdHeightVal = tree["Height of bird/m"];
                  let birdHeightValue = 100;
                  if (height && birdHeightVal) {
                    birdHeightValue = Math.min(100, (birdHeightVal / height) * 100); // Cap at 100% if bird is higher than tree
                  }
                  const axisHeight = 460;
                  // All trees display at 100% height - no scaling based on actual height
                  const scaledTreeHeight = axisHeight; // Every tree gets full height
                  
                  const treeX = treeXPositions[i];
                  const treeBaseGap = 0;
                  const groundLevel = yBase - treeBaseGap;
                  const plotTopY = 30 + yAxisLabelGap;
                  const birdYPercent = !isNaN(birdHeightValue) ? 100 - birdHeightValue : 0;
                  const birdY = yBase - (birdYPercent / 100) * (yBase - plotTopY);
                  const isHovered = this.state.hoveredTree && this.state.hoveredTree.displayIndex === tree.displayIndex;
                  let birdMarker = null;
                  return (
                    <g key={`tree-${i}-svg`}>
                      <g
                        transform={`translate(${treeX}, ${groundLevel})`}
                        className={`tree-height-tree-group ${isHovered ? 'hovered' : ''}`}
                        onMouseEnter={e => this.handleMouseEnter(tree, e)}
                        onMouseLeave={this.handleMouseLeave}
                        aria-label={`Tree ${i + 1}, Height: ${height}m`}
                        tabIndex={0}
                      >
                        {birdMarker}
                        {this.generateSVGTree(height, treeWidth, scaledTreeHeight, i + 1, birdHeightValue)}
                      </g>
                    </g>
                  );
                })}
                {/* Bird logos rendered above all trees, overlapping crowns */}
                <g style={{ pointerEvents: 'auto' }}>
                  {birdLogos}
                </g>
              </svg>
            </div>
          </div>
          {/* Tooltip absolutely positioned in outer container, above everything */}
          {this.state.hoveredTree && (
            <div
              className="percentage-height-tooltip"
              role="tooltip"
              style={{
                left: this.state.tooltipX,
                top: this.state.tooltipY,
                position: 'absolute',
                zIndex: 9999,
                pointerEvents: 'auto',
                minWidth: 180,
                maxWidth: 240,
              }}
            >
              <div className="percentage-height-tooltip-item">
                <strong style={{ fontSize: '16px' }}>Tree {this.state.hoveredTree.displayIndex ?? this.state.hoveredTree.originalIndex + 1}</strong>
              </div>
              <div className="percentage-height-tooltip-item">
                <strong>Bird Height:</strong> {(() => {
                  const treeHeightVal = this.state.hoveredTree["Height of tree/m"];
                  const birdHeightVal = this.state.hoveredTree["Height of bird/m"];
                  if (typeof treeHeightVal === 'string' && treeHeightVal.trim().toLowerCase() === 'n/a') {
                    return 'N/A';
                  }
                  let birdHeightValue = Math.min(100, (birdHeightVal / treeHeightVal) * 100); // Cap at 100%
                  return birdHeightValue % 1 === 0 ? `${birdHeightValue}%` : `${birdHeightValue.toFixed(2)}%`;
                })()}
              </div>
              <div className="percentage-height-tooltip-item">
                <strong>Location:</strong> {this.state.hoveredTree.Location ?? this.state.hoveredTree.location ?? 'Unknown'}
              </div>
              <div className="percentage-height-tooltip-item">
                <strong>Observer:</strong> {this.state.hoveredTree["Observer name"] ?? this.state.hoveredTree.observer ?? 'Unknown'}
              </div>
              {this.state.hoveredTree.notes && (
                <div className="percentage-height-tooltip-notes">
                  {this.state.hoveredTree.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }
}

export default PercentageHeightChart;
