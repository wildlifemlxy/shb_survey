import React, { Component } from 'react';
import '../../../css/components/Charts/TreeChart/TreeHeightChart.css';
import '../../../css/components/Charts/TreeChart/TreeHeightChartScroll.css';

class TreeHeightChart extends Component {
  state = { hoveredTree: null, tooltipX: 0, tooltipY: 0 };

  // Generate hyper-realistic SVG trees based on height category
  generateSVGTree = (height, treeWidth, treeHeight, treeId) => {
    const centerX = 0; // Center relative to transform origin
    const baseY = 0;   // Base at transform origin
    
    // Use tree ID for consistent but varied randomness
    const seed = treeId || 0;
    const random = (min, max, offset = 0) => {
      const value = Math.sin(seed * 9.7 + offset * 7.3) * 0.5 + 0.5;
      return min + value * (max - min);
    };

    // Helper function to create natural bark texture with more detail
    const createBarkTexture = (x, y, width, height, trunkId) => {
      const barkLines = [];
      const numLines = Math.floor(height / 6); // More bark lines for detail
      for (let i = 0; i < numLines; i++) {
        const lineY = y + (i * height / numLines);
        const lineWidth = width * random(0.5, 0.95, i + trunkId);
        const lineOffset = random(-width * 0.15, width * 0.15, i + trunkId + 10);
        
        // Create more organic bark patterns
        const curvature1 = random(-3, 3, i + trunkId + 20);
        const curvature2 = random(-2, 2, i + trunkId + 30);
        
        barkLines.push(
          <path
            key={`bark-${trunkId}-${i}`}
            d={`M ${x - lineWidth/2 + lineOffset} ${lineY} 
                Q ${x + lineOffset + curvature1} ${lineY + random(2, 5, i + trunkId + 20)} 
                ${x + lineWidth/2 + lineOffset + curvature2} ${lineY + random(1, 3, i + trunkId + 40)}`}
            stroke={`hsl(${random(20, 40, i + trunkId + 50)}, ${random(30, 60, i + trunkId + 60)}%, ${random(15, 35, i + trunkId + 70)}%)`}
            strokeWidth={random(0.3, 2, i + trunkId + 80)}
            fill="none"
            opacity={random(0.4, 0.8, i + trunkId + 90)}
          />
        );
        
        // Add vertical bark cracks occasionally
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

    // Helper function to create natural foliage clusters
    const createFoliageCluster = (cx, cy, size, clusterId, hueBase) => {
      const leaves = [];
      const numLeaves = Math.floor(size / 3);
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

    // Helper function to create recursive branching
    const createBranch = (startX, startY, endX, endY, thickness, depth, branchId, uniqueIndex = 0) => {
      if (depth <= 0 || thickness < 0.5) return [];
      
      const branches = [];
      
      // Main branch with unique key using multiple identifiers
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

      // Add sub-branches
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
          
          // Create unique sub-branch ID to prevent duplicates
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

    if (height >= 1 && height <= 15) {
      // Understory trees: Small, bushy trees with visible branching structure
      const trunkWidth = random(4, 8, 1);
      const trunkHeight = treeHeight * random(0.6, 0.7, 2); // Increase trunk proportion
      const crownHeight = treeHeight - trunkHeight; // Crown takes remaining height
      const crownRadius = treeWidth * random(0.35, 0.55, 3);
      
      return (
        <g>
          {/* Realistic trunk with natural taper and irregularities */}
          <path
            d={`M ${centerX - trunkWidth/2} ${baseY}
                Q ${centerX - trunkWidth * 0.45} ${-trunkHeight * 0.3}
                ${centerX - trunkWidth * 0.35} ${-trunkHeight * 0.7}
                L ${centerX - trunkWidth * 0.25} ${-trunkHeight}
                L ${centerX + trunkWidth * 0.25} ${-trunkHeight}
                Q ${centerX + trunkWidth * 0.35} ${-trunkHeight * 0.7}
                ${centerX + trunkWidth * 0.45} ${-trunkHeight * 0.3}
                L ${centerX + trunkWidth/2} ${baseY}
                Z`}
            fill="url(#understoryTrunkGradient)"
          />
          {createBarkTexture(centerX, -trunkHeight, trunkWidth, trunkHeight, treeId + 1)}
          
          {/* Enhanced root flare with more natural shape */}
          <ellipse
            cx={centerX}
            cy={-2}
            rx={trunkWidth * 0.9}
            ry={5}
            fill="#654321"
            opacity={0.7}
          />
          
          {/* Small surface roots */}
          {[0, 1, 2].map(rootIndex => {
            const rootAngle = (rootIndex * 120) + random(-30, 30, rootIndex + 50);
            const rootLength = random(8, 15, rootIndex + 60);
            const rootEndX = centerX + Math.cos(rootAngle * Math.PI / 180) * rootLength;
            return (
              <path
                key={`root-${rootIndex}`}
                d={`M ${centerX} ${baseY}
                    Q ${centerX + Math.cos(rootAngle * Math.PI / 180) * rootLength * 0.5} ${-2}
                    ${rootEndX} ${baseY + 1}`}
                stroke="#5D4037"
                strokeWidth={random(1, 2, rootIndex + 70)}
                fill="none"
                opacity={0.6}
              />
            );
          })}
          
          {/* Visible branching system for understory trees */}
          {[0, 1, 2, 3].map(i => {
            const branchHeight = -trunkHeight * random(0.7, 0.95, i + 100);
            const branchAngle = (i * 90) + random(-45, 45, i + 110);
            const branchLength = random(15, 35, i + 120);
            const branchEndX = centerX + Math.cos(branchAngle * Math.PI / 180) * branchLength;
            const branchEndY = branchHeight - Math.abs(Math.sin(branchAngle * Math.PI / 180)) * branchLength * 0.4;
            
            return (
              <g key={i}>
                {createBranch(centerX, branchHeight, branchEndX, branchEndY, random(2, 4, i + 130), 2, i + 500, i)}
              </g>
            );
          })}
          
          {/* Layered foliage on branches - extending to full tree height */}
          {[0, 1, 2].map(layer => {
            const layerY = -trunkHeight + (layer * -crownHeight / 3); // Distribute crown over remaining height
            const layerRadius = crownRadius * (1.0 - layer * 0.15);
            const numClusters = 4 + layer; // Fewer clusters to show branch structure
            
            return (
              <g key={layer}>
                {Array.from({length: numClusters}, (_, i) => {
                  const angle = (i * 2 * Math.PI) / numClusters + random(-0.3, 0.3, layer + i);
                  const distance = random(layerRadius * 0.4, layerRadius * 0.9, layer + i + 10);
                  const clusterX = centerX + Math.cos(angle) * distance;
                  const clusterY = layerY + Math.sin(angle) * distance * 0.4;
                  const clusterSize = random(12, 25, layer + i + 20);
                  
                  return (
                    <g key={i}>
                      {/* Organic foliage clusters positioned at branch ends */}
                      <path
                        d={`M ${clusterX - clusterSize * 0.7} ${clusterY}
                            Q ${clusterX - clusterSize * 0.3} ${clusterY - clusterSize * 0.9}
                            ${clusterX + clusterSize * 0.1} ${clusterY - clusterSize * 0.7}
                            Q ${clusterX + clusterSize * 0.7} ${clusterY - clusterSize * 0.4}
                            ${clusterX + clusterSize * 0.5} ${clusterY + clusterSize * 0.3}
                            Q ${clusterX} ${clusterY + clusterSize * 0.4}
                            ${clusterX - clusterSize * 0.4} ${clusterY + clusterSize * 0.2}
                            Z`}
                        fill={`hsl(${random(100, 140, layer + i + 30)}, ${random(65, 85, layer + i + 40)}%, ${random(25, 35, layer + i + 50)}%)`}
                        opacity={random(0.75, 0.9, layer + i + 60)}
                        filter="url(#shadowBlur)"
                      />
                      
                      {/* Secondary smaller foliage clusters for depth */}
                      <ellipse
                        cx={clusterX + random(-8, 8, layer + i + 70)}
                        cy={clusterY + random(-6, 6, layer + i + 80)}
                        rx={random(6, 12, layer + i + 90)}
                        ry={random(4, 10, layer + i + 100)}
                        fill={`hsl(${random(95, 125, layer + i + 110)}, ${random(60, 80, layer + i + 120)}%, ${random(20, 30, layer + i + 130)}%)`}
                        opacity={random(0.7, 0.85, layer + i + 140)}
                      />
                      
                      {/* Moss and small vegetation on branches */}
                      {Array.from({length: random(2, 5, layer + i + 200)}, (_, mossIndex) => {
                        const mossX = clusterX + random(-clusterSize * 0.3, clusterSize * 0.3, mossIndex + layer + i + 300);
                        const mossY = clusterY + random(-clusterSize * 0.2, clusterSize * 0.2, mossIndex + layer + i + 400);
                        return (
                          <circle
                            key={`moss-${layer}-${i}-${mossIndex}`}
                            cx={mossX}
                            cy={mossY}
                            r={random(1, 3, mossIndex + layer + i + 500)}
                            fill={`hsl(${random(80, 120, mossIndex + layer + i + 600)}, ${random(70, 90, mossIndex + layer + i + 700)}%, ${random(15, 25, mossIndex + layer + i + 800)}%)`}
                            opacity={random(0.5, 0.8, mossIndex + layer + i + 900)}
                          />
                        );
                      })}
                      
                      {/* Detailed individual leaves */}
                      {createFoliageCluster(clusterX, clusterY, clusterSize * 0.5, layer * 100 + i, random(110, 140, layer + i + 150))}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      );
    } else if (height >= 16 && height <= 40) {
      // Canopy trees: Classic tree with complex branching
      const trunkWidth = random(8, 15, 1);
      const trunkHeight = treeHeight * random(0.5, 0.6, 2); // Increase trunk proportion
      const crownHeight = treeHeight - trunkHeight; // Crown takes remaining height
      const crownWidth = treeWidth * random(0.6, 0.8, 3);
      
      return (
        <g>
          {/* Realistic trunk with natural taper */}
          <path
            d={`M ${centerX - trunkWidth/2} ${baseY}
                L ${centerX - trunkWidth * 0.4} ${-trunkHeight * 0.8}
                L ${centerX - trunkWidth * 0.3} ${-trunkHeight}
                L ${centerX + trunkWidth * 0.3} ${-trunkHeight}
                L ${centerX + trunkWidth * 0.4} ${-trunkHeight * 0.8}
                L ${centerX + trunkWidth/2} ${baseY}
                Z`}
            fill="url(#trunkGradient)"
          />
          {createBarkTexture(centerX, -trunkHeight, trunkWidth, trunkHeight, treeId + 10)}
          
          {/* Root buttresses */}
          {[0, 1, 2, 3].map(i => {
            const angle = (i * Math.PI) / 2;
            const buttressLength = random(12, 20, i + 100);
            const buttressX = centerX + Math.cos(angle) * buttressLength;
            
            return (
              <path
                key={i}
                d={`M ${centerX} ${baseY}
                    Q ${buttressX * 0.7} ${-5}
                    ${buttressX} ${baseY}`}
                stroke="#654321"
                strokeWidth={random(3, 6, i + 110)}
                fill="none"
                opacity={0.6}
              />
            );
          })}
          
          {/* Complex natural branching system */}
          {[0, 1, 2, 3, 4, 5].map(i => {
            const branchHeight = -trunkHeight * random(0.6, 0.95, i + 200);
            const branchAngle = (i * 60) + random(-30, 30, i + 210);
            const branchLength = random(30, 60, i + 220);
            const branchEndX = centerX + Math.cos(branchAngle * Math.PI / 180) * branchLength;
            const branchEndY = branchHeight - Math.abs(Math.sin(branchAngle * Math.PI / 180)) * branchLength * 0.5;
            
            return (
              <g key={i}>
                {createBranch(centerX, branchHeight, branchEndX, branchEndY, random(4, 8, i + 230), 3, i + 1000, i)}
              </g>
            );
          })}
          
          {/* Layered organic crown - extending to full tree height */}
          {[0, 1, 2, 3].map(layer => {
            const layerY = -trunkHeight + (layer * -crownHeight / 4); // Distribute crown over remaining height
            const layerRadius = crownWidth * (0.9 - layer * 0.1);
            const numSegments = 8;
            
            return (
              <g key={layer}>
                {/* Organic crown shape */}
                <path
                  d={Array.from({length: numSegments}, (_, i) => {
                    const angle = (i * 2 * Math.PI) / numSegments;
                    const radius = layerRadius * random(0.7, 1.0, layer + i + 300);
                    const x = centerX + Math.cos(angle) * radius;
                    const y = layerY + Math.sin(angle) * radius * 0.6;
                    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                  }).join(' ') + ' Z'}
                  fill={`hsl(${random(110, 140, layer + 400)}, ${random(65, 80, layer + 410)}%, ${random(20, 30, layer + 420)}%)`}
                  opacity={random(0.7, 0.9, layer + 430)}
                  filter="url(#shadowBlur)"
                />
                
                {/* Hanging vines and epiphytes for forest realism */}
                {Array.from({length: random(2, 4, layer + 500)}, (_, vineIndex) => {
                  const vineX = centerX + random(-layerRadius * 0.6, layerRadius * 0.6, vineIndex + layer + 600);
                  const vineLength = random(20, 50, vineIndex + layer + 700);
                  return (
                    <g key={`vine-${layer}-${vineIndex}`}>
                      <path
                        d={`M ${vineX} ${layerY} Q ${vineX + random(-5, 5, vineIndex + layer + 800)} ${layerY + vineLength * 0.5} ${vineX + random(-3, 3, vineIndex + layer + 900)} ${layerY + vineLength}`}
                        stroke={`hsl(${random(90, 130, vineIndex + layer + 1000)}, ${random(50, 70, vineIndex + layer + 1100)}%, ${random(15, 25, vineIndex + layer + 1200)}%)`}
                        strokeWidth={random(1, 3, vineIndex + layer + 1300)}
                        fill="none"
                        opacity={random(0.6, 0.8, vineIndex + layer + 1400)}
                      />
                      {/* Small leaves on vines */}
                      {Array.from({length: Math.floor(vineLength / 10)}, (_, leafIndex) => (
                        <ellipse
                          key={`vine-leaf-${layer}-${vineIndex}-${leafIndex}`}
                          cx={vineX + random(-2, 2, leafIndex + vineIndex + layer + 1500)}
                          cy={layerY + (leafIndex * vineLength / Math.floor(vineLength / 10))}
                          rx={random(2, 4, leafIndex + vineIndex + layer + 1600)}
                          ry={random(1, 2, leafIndex + vineIndex + layer + 1700)}
                          fill={`hsl(${random(100, 140, leafIndex + vineIndex + layer + 1800)}, ${random(60, 80, leafIndex + vineIndex + layer + 1900)}%, ${random(20, 30, leafIndex + vineIndex + layer + 2000)}%)`}
                          opacity={random(0.7, 0.9, leafIndex + vineIndex + layer + 2100)}
                        />
                      ))}
                    </g>
                  );
                })}
                
                {/* Detailed foliage clusters */}
                {createFoliageCluster(centerX, layerY, layerRadius * 0.8, layer * 1000, random(115, 140, layer + 440))}
              </g>
            );
          })}
        </g>
      );
    } else if (height >= 41 && height <= 65) {
      // Emergent trees: Massive, complex with exposed roots and sparse crown
      const trunkWidth = random(12, 25, 1);
      const trunkHeight = treeHeight * random(0.6, 0.7, 2); // Increase trunk proportion
      const crownHeight = treeHeight - trunkHeight; // Crown takes remaining height
      const crownWidth = treeWidth * random(0.4, 0.6, 3);
      
      return (
        <g>
          {/* Massive trunk with natural irregularities */}
          <path
            d={`M ${centerX - trunkWidth/2} ${baseY}
                Q ${centerX - trunkWidth * 0.6} ${-trunkHeight * 0.3}
                ${centerX - trunkWidth * 0.4} ${-trunkHeight * 0.7}
                L ${centerX - trunkWidth * 0.3} ${-trunkHeight}
                L ${centerX + trunkWidth * 0.3} ${-trunkHeight}
                Q ${centerX + trunkWidth * 0.4} ${-trunkHeight * 0.7}
                ${centerX + trunkWidth * 0.6} ${-trunkHeight * 0.3}
                L ${centerX + trunkWidth/2} ${baseY}
                Z`}
            fill="url(#emergentTrunkGradient)"
          />
          
          {/* Detailed bark texture for massive trunk */}
          {createBarkTexture(centerX, -trunkHeight, trunkWidth, trunkHeight, treeId + 20)}
          
          {/* Large buttress root system */}
          {[0, 1, 2, 3, 4, 5].map(i => {
            const angle = (i * 60) + random(-15, 15, i + 500);
            const rootLength = random(25, 40, i + 510);
            const rootEndX = centerX + Math.cos(angle * Math.PI / 180) * rootLength;
            const rootWidth = random(6, 12, i + 520);
            
            return (
              <g key={i}>
                {/* Main buttress */}
                <path
                  d={`M ${centerX} ${baseY}
                      L ${centerX + Math.cos(angle * Math.PI / 180) * rootLength * 0.3} ${-rootWidth}
                      Q ${rootEndX * 0.8} ${-rootWidth * 0.5}
                      ${rootEndX} ${baseY}
                      L ${centerX} ${baseY}
                      Z`}
                  fill="#654321"
                  opacity={0.8}
                />
                {/* Root surface details */}
                <path
                  d={`M ${centerX} ${baseY}
                      Q ${rootEndX * 0.6} ${-rootWidth * 0.3}
                      ${rootEndX} ${baseY}`}
                  stroke="#5D4037"
                  strokeWidth={2}
                  fill="none"
                  opacity={0.6}
                />
              </g>
            );
          })}
          
          {/* Complex branching network */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
            const branchHeight = -trunkHeight * random(0.4, 0.9, i + 600);
            const branchAngle = (i * 45) + random(-20, 20, i + 610);
            const branchLength = random(40, 80, i + 620);
            const branchEndX = centerX + Math.cos(branchAngle * Math.PI / 180) * branchLength;
            const branchEndY = branchHeight - Math.abs(Math.sin(branchAngle * Math.PI / 180)) * branchLength * 0.3;
            
            return (
              <g key={i}>
                {createBranch(centerX, branchHeight, branchEndX, branchEndY, random(6, 12, i + 630), 4, i + 2000, i)}
              </g>
            );
          })}
          
          {/* Sparse emergent crown clusters - extending to full tree height */}
          {[0, 1, 2, 3, 4].map(i => {
            const clusterAngle = random(0, 360, i + 700);
            const clusterDistance = random(crownWidth * 0.3, crownWidth * 0.8, i + 710);
            const clusterX = centerX + Math.cos(clusterAngle * Math.PI / 180) * clusterDistance;
            const clusterY = -trunkHeight + (i * -crownHeight / 5); // Distribute crown over remaining height
            const clusterSize = random(20, 40, i + 730);
            
            return (
              <g key={i}>
                {/* Irregular foliage patches */}
                <path
                  d={`M ${clusterX - clusterSize * 0.8} ${clusterY}
                      Q ${clusterX - clusterSize * 0.3} ${clusterY - clusterSize}
                      ${clusterX + clusterSize * 0.2} ${clusterY - clusterSize * 0.7}
                      Q ${clusterX + clusterSize * 0.8} ${clusterY - clusterSize * 0.3}
                      ${clusterX + clusterSize * 0.5} ${clusterY + clusterSize * 0.2}
                      Q ${clusterX} ${clusterY + clusterSize * 0.5}
                      ${clusterX - clusterSize * 0.5} ${clusterY + clusterSize * 0.1}
                      Z`}
                  fill={`hsl(${random(120, 150, i + 740)}, ${random(55, 75, i + 750)}%, ${random(20, 30, i + 760)}%)`}
                  opacity={random(0.7, 0.9, i + 770)}
                />
                
                {/* Sparse individual leaves */}
                {createFoliageCluster(clusterX, clusterY, clusterSize * 0.5, i * 2000, random(120, 150, i + 780))}
              </g>
            );
          })}
        </g>
      );
    }
    
    return null;
  };

  handleMouseEnter = (tree, evt) => {
    const svgRect = evt.target.ownerSVGElement.getBoundingClientRect();
    const x = evt.clientX - svgRect.left;
    const y = evt.clientY - svgRect.top;
    this.setState({ hoveredTree: tree, tooltipX: x, tooltipY: y });
  };
  handleMouseLeave = () => {
    this.setState({ hoveredTree: null });
  };

  render() {
    const rawData = this.props.data && this.props.data.length > 0 ? this.props.data : [];
    
    // Filter data to only include trees with valid heights, but keep track of original indices
    const validTreesData = [];
    rawData.forEach((tree, originalIndex) => {
      const height = tree["Height of tree/m"] ?? tree.height ?? 0;
      const numHeight = parseFloat(height);
      if (!isNaN(numHeight) && numHeight > 0 && isFinite(numHeight)) {
        validTreesData.push({
          ...tree,
          originalIndex: originalIndex, // Keep track of original position (0-based)
          displayIndex: originalIndex + 1 // Use original position for display (1-based)
        });
      }
    });
    
    const data = validTreesData; // Use filtered data for rendering
    const chartHeight = 600;
    const chartWidth = 2000; // Increased from 1600 to 2000 for more width
    const treeWidth = 120; // Fixed width for all trees
    const treeEdgePadding = treeWidth * 0.4; // Reduced from 0.6 to 0.4 for less edge padding
    const chartPadding = 20 + treeEdgePadding; // Reduced left padding from 40 to 20 to move chart further left
    const rightPadding = 30 + treeEdgePadding; // Reduced right padding from 40 to 30
    const xAxisStart = chartPadding;
    const xAxisEnd = chartWidth - rightPadding;
    const xAxisWidth = xAxisEnd - xAxisStart;
    const yBase = 500;
    const numTrees = data.length;
    // Increase spacing between trees - more gap
    const minTreeSpacing = 3;  // Set minimum gap between trees to 30
    const xStep = numTrees > 1
      ? Math.max((xAxisWidth - treeWidth) / (numTrees - 1), minTreeSpacing)
      : 0;

    // Calculate dynamic y-axis range based on tallest tree, rounded up to next 2m interval
    const dataMaxHeight = data.length > 0 
      ? Math.max(...data.map(tree => tree["Height of tree/m"] ?? tree.height ?? 0))
      : 20; // Default minimum if no data
    // Round up to the next 2m interval
    const desiredMax = 26;
    const maxHeight = Math.max(Math.ceil(dataMaxHeight / 2) * 2, desiredMax);

    // Add vertical top padding so tallest tree is never clipped
    const axisHeight = 460;
    const chartTopY = yBase - axisHeight;
    const topPadding = 40; // px extra space above tallest tree
    const yAxisTicks = [];
    for (let h = 0; h <= maxHeight; h += 2) {
      yAxisTicks.push({ 
        value: h, 
        isMajor: h % 10 === 0  // Major ticks every 10m, minor every 2m
      });
    }
    const tileCount = Math.round(xAxisWidth * 0.15);
    let xLabelFont = 12;
    let xLabelRotate = false;
    if (numTrees > 12 && numTrees <= 20) xLabelFont = 10;
    if (numTrees > 20) { xLabelFont = 9; xLabelRotate = true; }

    // Add axis label gaps
    const xAxisLabelGap = 32;
    const yAxisLabelGap = 32;

    // Helper function for consistent randomness across forest floor elements
    const random = (min, max, seed = 0) => {
      const value = Math.sin(seed * 9.7 + 7.3) * 0.5 + 0.5;
      return min + value * (max - min);
    };

    return (
      <div className="tree-height-chart-scroll-x">
        <div className="tree-height-chart-container" style={{ minHeight: `${chartHeight + 100}px` }}>
          <div className="tree-height-chart-inner">
            <svg
              width="100%"
              height={chartHeight}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              className="tree-height-chart-svg"
            >
              {/* Gradient background for chart area only */}
              <defs>
                <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  {/* Calculate gradient stops based on actual y-axis values - Pastel Colors */}
                  {/* Sky/Above Emergent (65m+) - Pastel blues at top */}
                  <stop offset="0%" stopColor="#f0f8ff" />    {/* Very light blue */}
                  <stop offset={`${Math.max(0, (maxHeight - 65) / maxHeight * 100)}%`} stopColor="#e6f3ff" />   {/* Pastel blue */}
                  
                  {/* Emergent Layer (35-65m) - Pastel greens */}
                  <stop offset={`${Math.max(0, (maxHeight - 65) / maxHeight * 100)}%`} stopColor="#f0fdf4" />   {/* Very light green */}
                  <stop offset={`${Math.max(0, (maxHeight - 35) / maxHeight * 100)}%`} stopColor="#dcfce7" />   {/* Pastel mint green */}
                  
                  {/* Canopy Layer (20-40m) - Soft greens */}
                  <stop offset={`${Math.max(0, (maxHeight - 40) / maxHeight * 100)}%`} stopColor="#bbf7d0" />   {/* Soft light green */}
                  <stop offset={`${Math.max(0, (maxHeight - 30) / maxHeight * 100)}%`} stopColor="#86efac" />   {/* Pastel green */}
                  <stop offset={`${Math.max(0, (maxHeight - 20) / maxHeight * 100)}%`} stopColor="#6ee7b7" />   {/* Soft medium green */}
                  
                  {/* Understory Layer (5-15m) - Muted greens */}
                  <stop offset={`${Math.max(0, (maxHeight - 15) / maxHeight * 100)}%`} stopColor="#a7f3d0" />   {/* Muted light green */}
                  <stop offset={`${Math.max(0, (maxHeight - 5) / maxHeight * 100)}%`} stopColor="#6ee7b7" />   {/* Muted green */}
                  
                  {/* Shrub Layer (1-5m) - Pastel earth tones */}
                  <stop offset={`${Math.max(0, (maxHeight - 5) / maxHeight * 100)}%`} stopColor="#fde68a" />   {/* Pastel yellow-green */}
                  <stop offset={`${Math.max(0, (maxHeight - 1) / maxHeight * 100)}%`} stopColor="#fed7aa" />   {/* Soft peach */}
                  
                  {/* Forest Floor (0-1m) - Soft browns */}
                  <stop offset={`${Math.max(0, (maxHeight - 1) / maxHeight * 100)}%`} stopColor="#fbbf24" />   {/* Soft amber */}
                  <stop offset="100%" stopColor="#f59e0b" />  {/* Warm golden brown */}
                </linearGradient>
              </defs>
              <rect
                x={chartPadding}
                y={chartTopY}
                width={xAxisEnd - chartPadding}
                height={axisHeight}
                fill="url(#chartAreaGradient)"
              />
              
              {/* Forest structure annotation lines and labels */}
              <g>
                {/* Emergent Layer (35-65m) */}
                <line x1={xAxisStart} x2={xAxisEnd} y1={yBase - (65 / maxHeight) * 460} y2={yBase - (65 / maxHeight) * 460} stroke="#FFD700" strokeDasharray="4 4" strokeWidth="2" opacity="0.5" />
                <text x={xAxisEnd - 10} y={yBase - (65 / maxHeight) * 460 - 6} fontSize="13" fill="#FFD700" textAnchor="end" opacity="0.8">Emergent (35-65m)</text>
                <line x1={xAxisStart} x2={xAxisEnd} y1={yBase - (35 / maxHeight) * 460} y2={yBase - (35 / maxHeight) * 460} stroke="#FFD700" strokeDasharray="4 4" strokeWidth="1.5" opacity="0.4" />
                
                {/* Canopy Layer (20-40m) */}
                <line x1={xAxisStart} x2={xAxisEnd} y1={yBase - (40 / maxHeight) * 460} y2={yBase - (40 / maxHeight) * 460} stroke="#66BB6A" strokeDasharray="4 4" strokeWidth="2" opacity="0.5" />
                <text x={xAxisEnd - 10} y={yBase - (40 / maxHeight) * 460 - 6} fontSize="13" fill="#388E3C" textAnchor="end" opacity="0.8">Canopy (20-40m)</text>
                <line x1={xAxisStart} x2={xAxisEnd} y1={yBase - (20 / maxHeight) * 460} y2={yBase - (20 / maxHeight) * 460} stroke="#66BB6A" strokeDasharray="4 4" strokeWidth="1.5" opacity="0.4" />
                
                {/* Understory Layer (5-15m) */}
                <line x1={xAxisStart} x2={xAxisEnd} y1={yBase - (15 / maxHeight) * 460} y2={yBase - (15 / maxHeight) * 460} stroke="#8D6E63" strokeDasharray="4 4" strokeWidth="2" opacity="0.5" />
                <text x={xAxisEnd - 10} y={yBase - (15 / maxHeight) * 460 - 6} fontSize="13" fill="#795548" textAnchor="end" opacity="0.8">Understory (5-15m)</text>
                <line x1={xAxisStart} x2={xAxisEnd} y1={yBase - (5 / maxHeight) * 460} y2={yBase - (5 / maxHeight) * 460} stroke="#8D6E63" strokeDasharray="4 4" strokeWidth="1.5" opacity="0.4" />
                
                {/* Shrub Layer (1-5m) */}
                <line x1={xAxisStart} x2={xAxisEnd} y1={yBase - (5 / maxHeight) * 460} y2={yBase - (5 / maxHeight) * 460} stroke="#A0522D" strokeDasharray="4 4" strokeWidth="2" opacity="0.5" />
                <text x={xAxisEnd - 10} y={yBase - (5 / maxHeight) * 460 - 6} fontSize="13" fill="#8D6E63" textAnchor="end" opacity="0.8">Shrub Layer (1-5m)</text>
                <line x1={xAxisStart} x2={xAxisEnd} y1={yBase - (1 / maxHeight) * 460} y2={yBase - (1 / maxHeight) * 460} stroke="#A0522D" strokeDasharray="4 4" strokeWidth="1.5" opacity="0.4" />
                
                {/* Forest Floor (0-1m) */}
                <line x1={xAxisStart} x2={xAxisEnd} y1={yBase - (1 / maxHeight) * 460} y2={yBase - (1 / maxHeight) * 460} stroke="#4E342E" strokeDasharray="4 4" strokeWidth="2" opacity="0.5" />
                <text x={xAxisEnd - 10} y={yBase - (1 / maxHeight) * 460 - 6} fontSize="13" fill="#4E342E" textAnchor="end" opacity="0.8">Forest Floor (0-1m)</text>
              </g>
              
              {/* Definitions for gradients */}
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
                
                {/* Shadow filter for trees */}
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
                
                {/* Atmospheric filters */}
                <filter id="shadowBlur" x="-50%" y="-50%" width="200%" height="200%">
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
                
                {/* Forest gradients for more realism */}
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
              
              {/* Clean white background for clear axis visibility */}
          
              
              {/* X Axis - with black styling for better visibility */}
              <g filter="url(#forestShadow)">
                <line x1={chartPadding} y1={yBase} x2={xAxisEnd} y2={yBase} stroke="#000000" strokeWidth="4" opacity="1" />
                {/* Connect x-axis line through all intervals (vertical grid lines) */}
                {data.map((tree, i) => {
                  const treeWidth = 120;
                  const edgePadding = chartPadding + treeWidth / 2;
                  const availableWidth = xAxisWidth - treeWidth;
                  const treeSpacing = numTrees > 1 ? availableWidth / (numTrees - 1) : 0;
                 const treeX = numTrees === 1
                  ? (xAxisStart + xAxisEnd) / 2
                  : edgePadding + (i * xStep);
                  return (
                    <line
                      key={`xgrid-${tree.id ?? i}`}
                      x1={treeX}
                      y1={yBase}
                      x2={treeX}
                      y2={30 + yAxisLabelGap}
                      stroke="rgba(0,0,0,0.15)"
                      strokeDasharray={"2 6"}
                      strokeWidth={"1"}
                    />
                  );
                })}
                {/* Enhanced forest floor vegetation */}
                {Array.from({length: Math.floor(xAxisWidth / 6)}, (_, i) => {
                  const grassX = chartPadding + (i * 6) + random(-3, 3, i);
                  const grassHeight = random(3, 12, i + 100);
                  const vegetationType = random(0, 1, i + 1000);
                  
                  return (
                    <g key={`vegetation-${i}`}>
                      {/* Main grass blade */}
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
                
                {data.map((tree, i) => {
                  // Use the same spacing logic as the trees for perfect alignment
                  const treeWidth = 120;
                  const edgePadding = chartPadding + treeWidth / 2;
                  const availableWidth = xAxisWidth - treeWidth;
                  const treeSpacing = numTrees > 1 ? Math.max(availableWidth / (numTrees - 1), minTreeSpacing) : 0;
                  const treeX = numTrees === 1
                    ? (xAxisStart + xAxisEnd) / 2
                    : edgePadding + (i * treeSpacing);
                  return (
                    <g key={`xaxis-${tree.id ?? i}`}> 
                      {/* X-axis tick mark with black styling */}
                      <line x1={treeX} y1={yBase} x2={treeX} y2={yBase + 8} stroke="#000000" strokeWidth="3" opacity="1" />
                      <text
                        x={treeX}
                        y={yBase + 25 + xAxisLabelGap}
                        fontSize={xLabelFont}
                        fill="#000000"
                        textAnchor="middle"
                        transform={xLabelRotate ? `rotate(-45 ${treeX} ${yBase + 25 + xAxisLabelGap})` : undefined}
                        className="tree-height-x-axis-tick-label"
                        aria-label={`Tree ${tree.displayIndex}`}
                      >
                        {`Tree ${tree.displayIndex}`}
                      </text>
                    </g>
                  );
                })}
                {/* Move x-axis label closer to tick labels */}
                <text 
                  x={(xAxisStart + xAxisEnd) / 2} 
                  y={yBase + 64 + xAxisLabelGap} 
                  fontSize="16" 
                  fill="#000000" 
                  textAnchor="middle" 
                  className="tree-height-x-axis-label"
                >
                  Trees
                </text>
              </g>
              
              {/* Y Axis & Grid - with black styling for better visibility */}
              <g filter="url(#forestShadow)">
                <line x1={chartPadding} y1={yBase - axisHeight} x2={chartPadding} y2={yBase} stroke="#000000" strokeWidth="3" opacity="1" />
                {yAxisTicks.map((tick, i) => (
                  <g key={i}>
                    {/* Major ticks (10m) are longer, minor ticks (5m) are shorter */}
                    <line 
                      x1={chartPadding - (tick.isMajor ? 10 : 6)} 
                      y1={yBase - (tick.value / maxHeight) * 460} 
                      x2={chartPadding} 
                      y2={yBase - (tick.value / maxHeight) * 460} 
                      stroke="#000000" 
                      strokeWidth={tick.isMajor ? "3" : "2"}
                      opacity="1"
                    />
                    {/* Connect y-axis line through all intervals */}
                    <line
                      x1={chartPadding}
                      y1={yBase - (tick.value / maxHeight) * 460}
                      x2={xAxisEnd}
                      y2={yBase - (tick.value / maxHeight) * 460}
                      stroke="rgba(0,0,0,0.15)"
                      strokeDasharray={tick.isMajor ? "6 4" : "2 6"}
                      strokeWidth={tick.isMajor ? "1.5" : "1"}
                    />
                    {/* Show labels on all ticks, but different styling */}
                    <text 
                      x={chartPadding - 24} 
                      y={yBase + 4 - (tick.value / maxHeight) * 460} 
                      fontSize={tick.isMajor ? "13" : "11"} 
                      fill="#000000" 
                      textAnchor="end"
                      fontWeight={tick.isMajor ? "bold" : "normal"}
                      className="tree-height-y-axis-tick-label"
                    >
                      {tick.value}
                    </text>
                  </g>
                ))}
                {/* Move y-axis label closer to tick labels */}
                <text 
                  x={chartPadding - 48} 
                  y={yBase / 2 + yAxisLabelGap - 10} 
                  fontSize="15" 
                  fill="#000000" 
                  textAnchor="middle" 
                  transform={`rotate(-90 ${chartPadding - 48},${yBase / 2 + yAxisLabelGap - 10})`} 
                  className="tree-height-y-axis-label"
                >
                  Height (m)
                </text>
              </g>
              
              {/* Tree shadows at the base - render first for proper layering */}
              {data.map((tree, i) => {
                const height = tree["Height of tree/m"] ?? tree.height ?? 0;
                if (height <= 0) return null;
                // Calculate same positioning as trees
                const axisHeight = 460;
                const treeWidth = 120;
                const edgePadding = chartPadding + treeWidth / 2;
                const availableWidth = xAxisWidth - treeWidth;
                const treeSpacing = numTrees > 1 ? availableWidth / (numTrees - 1) : 0;
                const treeX = numTrees === 1
                  ? (xAxisStart + xAxisEnd) / 2
                  : edgePadding + (i * treeSpacing);
                const groundLevel = yBase;
                // Shadow properties based on tree height
                const shadowWidth = Math.min(treeWidth * 1.2, treeWidth * (0.8 + height / maxHeight * 0.4));
                const shadowHeight = Math.min(25, height * 0.8);
                const shadowOpacity = Math.min(0.4, 0.15 + height / maxHeight * 0.25);
                return (
                  <g key={`tree-shadow-${tree.displayIndex}`}>
                    {/* Elliptical shadow at base of tree */}
                    <ellipse
                      cx={treeX}
                      cy={groundLevel + 8}
                      rx={shadowWidth / 2}
                      ry={shadowHeight / 2}
                      fill="#2D5016"
                      opacity={shadowOpacity}
                      filter="url(#shadowBlur)"
                    />
                    {/* Secondary lighter shadow for depth */}
                    <ellipse
                      cx={treeX + 2}
                      cy={groundLevel + 6}
                      rx={shadowWidth * 0.8 / 2}
                      ry={shadowHeight * 0.6 / 2}
                      fill="#1a2e0c"
                      opacity={shadowOpacity * 0.6}
                    />
                  </g>
                );
              })}

              {/* Realistic SVG Trees with rainforest atmosphere - render all trees first */}
              {data.map((tree, i) => {
                const height = tree["Height of tree/m"] ?? tree.height ?? 0;
                const birdHeightValue = tree["Height of bird/m"];
                // Only render tree if both tree height and bird height are valid
                if (
                  height === undefined ||
                  height === null ||
                  height === "" ||
                  isNaN(Number(height)) ||
                  Number(height) <= 0 ||
                  birdHeightValue === undefined ||
                  birdHeightValue === null ||
                  birdHeightValue === "" ||
                  isNaN(Number(birdHeightValue))
                ) return null;
                // Calculate proportional tree height so the top aligns with the correct Y position
                const axisHeight = 460;
                const treeWidth = 120;
                const edgePadding = chartPadding + treeWidth / 2;
                const availableWidth = xAxisWidth - treeWidth;
                const treeSpacing = numTrees > 1 ? availableWidth / (numTrees - 1) : 0;
                const treeX = numTrees === 1
                  ? (xAxisStart + xAxisEnd) / 2
                  : edgePadding + (i * treeSpacing);
                const groundLevel = yBase;
                // The Y position where the top of the tree should be (aligns with Y axis value)
                const treeTopY = yBase - (height / maxHeight) * axisHeight;
                // The height of the SVG tree so its top aligns with treeTopY
                const relHeight = groundLevel - treeTopY;
                return (
                  <g key={`tree-${tree.displayIndex}-svg`}>
                    {/* Tree SVG only - birds will be rendered separately after all trees */}
                    <g
                      transform={`translate(${treeX}, ${groundLevel})`}
                      className={`tree-height-tree-group ${this.state.hoveredTree === tree ? 'hovered' : ''}`}
                      onMouseEnter={e => this.handleMouseEnter(tree, e)}
                      onMouseLeave={this.handleMouseLeave}
                      aria-label={`Tree ${tree.displayIndex}, Height: ${height}m`}
                      tabIndex={0}
                    >
                      {this.generateSVGTree(height, treeWidth, relHeight, tree.displayIndex)}
                    </g>
                  </g>
                );
              })}
              
              {/* Bird images rendered AFTER all trees to ensure highest z-index */}
              {data.map((tree, i) => {
               const birdHeightValue = tree["Height of bird/m"];
                const height = tree["Height of tree/m"];
                if (
                  birdHeightValue === undefined ||
                  birdHeightValue === null ||
                  birdHeightValue === "" ||
                  isNaN(Number(birdHeightValue)) ||
                  height === undefined ||
                  height === null ||
                  height === "" ||
                  isNaN(Number(height))
                ) return null;
                // Calculate same positioning as trees
                const axisHeight = 460;
                const treeWidth = 120;
                const edgePadding = chartPadding + treeWidth / 2;
                const availableWidth = xAxisWidth - treeWidth;
                const treeSpacing = numTrees > 1 ? availableWidth / (numTrees - 1) : 0;
                const treeX = numTrees === 1
                  ? (xAxisStart + xAxisEnd) / 2
                  : edgePadding + (i * treeSpacing);
                const groundLevel = yBase;
                // Clamp birdHeightValue to [0, height]
                const clampedBirdHeight = Math.max(0, Math.min(birdHeightValue, height));
                // Calculate Y position for bird
                const birdY = yBase - (clampedBirdHeight / maxHeight) * axisHeight;
                const birdWidth = 90;
                const birdHeight = 80;
                return (
                  <image
                    key={`bird-${tree.displayIndex}`}
                    href={'/shb.png'}
                    x={treeX - (birdWidth / 2)}
                    y={birdY - (birdHeight / 2)}
                    width={birdWidth}
                    height={birdHeight}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    alt={`Bird on Tree ${tree.displayIndex}`}
                    onMouseEnter={e => this.handleMouseEnter(tree, e)}
                    onMouseLeave={this.handleMouseLeave}
                  />
                );
              })}
              
              {/* Multi-layered canopy atmosphere for rainforest depth */}
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
            {/* Tooltip and overlays */}
            {this.state.hoveredTree && (
              <div
                className="tree-height-tooltip"
                style={{
                  left: Math.max(20, this.state.tooltipX + 30),
                  top: Math.max(10, this.state.tooltipY - 80)
                }}
                role="tooltip"
              >
                <div className="tree-height-tooltip-title">
                  Tree {this.state.hoveredTree?.originalIndex + 1}
                </div>
                <div className="tree-height-tooltip-item">
                  <strong>Tree Height:</strong> {this.state.hoveredTree["Height of tree/m"]} m
                </div>
                <div className="tree-height-tooltip-item">
                  <strong>Bird Height:</strong> {this.state.hoveredTree["Height of bird/m"]} m
                </div>
                <div className="tree-height-tooltip-item">
                  <strong>Location:</strong> {this.state.hoveredTree.Location}
                </div>
                <div className="tree-height-tooltip-item">
                  <strong>Observer:</strong> {this.state.hoveredTree["Observer name"]}
                </div>
                {this.state.hoveredTree.notes && (
                  <div className="tree-height-tooltip-notes">
                    {this.state.hoveredTree.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default TreeHeightChart;
