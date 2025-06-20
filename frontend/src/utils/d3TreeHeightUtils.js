// D3TreeHeightChart utility functions
import * as d3 from 'd3';

export const filterValidData = (data) => {
  return data.filter(tree => 
    tree["Height of tree/m"] && 
    tree["Height of bird/m"] && 
    tree["Height of tree/m"] !== 'N/A' && 
    tree["Height of bird/m"] !== 'N/A' &&
    !isNaN(parseFloat(tree["Height of tree/m"])) &&
    !isNaN(parseFloat(tree["Height of bird/m"]))
  );
};

export const processTreeData = (data, viewMode = 'normal') => {
  const validData = filterValidData(data);
  
  return validData.map((tree, index) => {
    const treeHeight = parseFloat(tree["Height of tree/m"]);
    const birdHeight = parseFloat(tree["Height of bird/m"]);
    const birdPercentage = (birdHeight / treeHeight) * 100;
    
    return {
      ...tree,
      index,
      originalTreeHeight: treeHeight,
      originalBirdHeight: birdHeight,
      displayTreeHeight: viewMode === 'percentage' ? 100 : treeHeight,
      displayBirdHeight: viewMode === 'percentage' ? birdPercentage : birdHeight,
      birdPercentage: Math.round(birdPercentage)
    };
  });
};

export const calculateInsights = (validData) => {
  if (!validData || validData.length === 0) {
    return null;
  }

  const totalObservations = validData.length;
  const avgTreeHeight = validData.reduce((sum, tree) => sum + tree.originalTreeHeight, 0) / totalObservations;
  const avgBirdPosition = validData.reduce((sum, tree) => sum + tree.birdPercentage, 0) / totalObservations;
  
  // Height distribution analysis
  const highPositionBirds = validData.filter(tree => tree.birdPercentage > 66).length;
  const midPositionBirds = validData.filter(tree => tree.birdPercentage >= 33 && tree.birdPercentage <= 66).length;
  const lowPositionBirds = validData.filter(tree => tree.birdPercentage < 33).length;

  // Activity analysis
  const activityDistribution = {};
  validData.forEach(tree => {
    const activity = tree["Activity (foraging, preening, calling, perching, others)"] || 'Unknown';
    activityDistribution[activity] = (activityDistribution[activity] || 0) + 1;
  });

  // Location analysis
  const locationDistribution = {};
  validData.forEach(tree => {
    const location = tree.Location || 'Unknown';
    locationDistribution[location] = (locationDistribution[location] || 0) + 1;
  });

  return {
    totalObservations,
    avgTreeHeight,
    avgBirdPosition,
    highPositionBirds,
    midPositionBirds,
    lowPositionBirds,
    activityDistribution,
    locationDistribution
  };
};

export const createSVGContainer = (containerRef, width, height, margin) => {
  const svg = d3.select(containerRef.current)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("background", "linear-gradient(180deg, #87CEEB 0%, #98FB98 50%, #228B22 100%)")
    .style("border-radius", "12px")
    .style("box-shadow", "0 10px 25px rgba(0,0,0,0.1)")
    .style("border", "2px solid #228B22");

  return svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
};

export const createScales = (processedData, width, height, viewMode) => {
  const maxTreeHeight = Math.max(...processedData.map(d => d.displayTreeHeight));
  const maxBirdHeight = Math.max(...processedData.map(d => d.displayBirdHeight));
  
  const xScale = d3.scaleBand()
    .domain(processedData.map((d, i) => i))
    .range([0, width])
    .padding(0.1);
    
  const yScale = d3.scaleLinear()
    .domain([0, Math.max(maxTreeHeight, maxBirdHeight) * 1.1])
    .range([height, 0]);
    
  return { xScale, yScale };
};

export const createGradients = (svg) => {
  const defs = svg.append("defs");
  
  // Tree trunk gradient
  const trunkGradient = defs.append("linearGradient")
    .attr("id", "trunkGradient")
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
  trunkGradient.append("stop").attr("offset", "0%").attr("stop-color", "#8B4513");
  trunkGradient.append("stop").attr("offset", "50%").attr("stop-color", "#A0522D");
  trunkGradient.append("stop").attr("offset", "100%").attr("stop-color", "#8B4513");

  // Tree crown gradient
  const crownGradient = defs.append("radialGradient")
    .attr("id", "crownGradient")
    .attr("cx", "50%").attr("cy", "50%").attr("r", "50%");
  crownGradient.append("stop").attr("offset", "0%").attr("stop-color", "#90EE90");
  crownGradient.append("stop").attr("offset", "70%").attr("stop-color", "#228B22");
  crownGradient.append("stop").attr("offset", "100%").attr("stop-color", "#006400");

  // Bird gradient
  const birdGradient = defs.append("radialGradient")
    .attr("id", "birdGradient")
    .attr("cx", "50%").attr("cy", "30%").attr("r", "60%");
  birdGradient.append("stop").attr("offset", "0%").attr("stop-color", "#FFD700");
  birdGradient.append("stop").attr("offset", "70%").attr("stop-color", "#FFA500");
  birdGradient.append("stop").attr("offset", "100%").attr("stop-color", "#FF8C00");
};

export const createAxes = (g, xScale, yScale, width, height, viewMode) => {
  // X-axis
  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d => `Tree ${parseInt(d) + 1}`))
    .selectAll("text")
    .style("fill", "#2D4A22")
    .style("font-size", "12px")
    .style("font-weight", "bold");

  // Y-axis
  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .style("fill", "#2D4A22")
    .style("font-size", "12px")
    .style("font-weight", "bold");

  // Style axis lines
  g.selectAll(".x-axis path, .y-axis path")
    .style("stroke", "#2D4A22")
    .style("stroke-width", "2px");

  g.selectAll(".x-axis line, .y-axis line")
    .style("stroke", "#2D4A22")
    .style("stroke-width", "1px");

  // Add axis labels
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - 70)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .style("fill", "#2D4A22")
    .text(viewMode === 'percentage' ? 'Height (%)' : 'Height (meters)');

  g.append("text")
    .attr("transform", `translate(${width / 2}, ${height + 50})`)
    .style("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .style("fill", "#2D4A22")
    .text('Bird Observation Points');
};

export const createTooltip = () => {
  return d3.select("body").append("div")
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
};

export const formatTooltipContent = (tree, viewMode) => {
  return `
    <div style="line-height: 1.5;">
      <div style="color: #FFD700; font-weight: bold; margin-bottom: 8px; text-align: center;">🌳 ${tree.Location || 'Observation ' + (tree.index + 1)}</div>
      <div style="margin-bottom: 4px;">🌲 Tree Height: <strong>${tree.originalTreeHeight}m</strong></div>
      <div style="margin-bottom: 4px;">🐦 Bird Height: <strong>${tree.originalBirdHeight}m</strong></div>
      ${viewMode === 'percentage' ? `<div style="margin-bottom: 4px;">📊 Position: <strong>${Math.round(tree.displayBirdHeight)}%</strong> of tree</div>` : ''}
      <div style="color: #90EE90;">📍 Activity: <strong>${tree["Activity (foraging, preening, calling, perching, others)"]}</strong></div>
    </div>
  `;
};

export const showTooltip = (tooltip, event, tree, viewMode) => {
  tooltip.transition()
    .duration(200)
    .style("opacity", 1);
    
  tooltip.html(formatTooltipContent(tree, viewMode))
    .style("left", (event.pageX + 15) + "px")
    .style("top", (event.pageY - 80) + "px");
};

export const hideTooltip = (tooltip) => {
  tooltip.transition()
    .duration(300)
    .style("opacity", 0);
};

export const cleanupTooltip = () => {
  d3.select("body").selectAll(".tree-tooltip-2d").remove();
};

export const getColorByActivity = (activity) => {
  const colorMap = {
    'foraging': '#10b981',
    'calling': '#f59e0b', 
    'perching': '#8b5cf6',
    'preening': '#06b6d4',
    'others': '#6b7280'
  };
  
  const lowerActivity = activity?.toLowerCase() || '';
  for (const [key, color] of Object.entries(colorMap)) {
    if (lowerActivity.includes(key)) {
      return color;
    }
  }
  return '#6b7280'; // default gray
};

export const drawTree = (g, tree, xScale, yScale, index, viewMode, tooltip, onTreeClick) => {
  const treeGroup = g.append("g")
    .attr("class", "tree-group")
    .attr("transform", `translate(${xScale(index) + xScale.bandwidth() / 2}, 0)`);

  const trunkWidth = 8;
  const trunkHeight = 30;
  const crownRadius = 25;
  const birdRadius = 6;

  // Tree trunk
  treeGroup.append("rect")
    .attr("class", "tree-trunk")
    .attr("x", -trunkWidth / 2)
    .attr("y", yScale(trunkHeight))
    .attr("width", trunkWidth)
    .attr("height", yScale(0) - yScale(trunkHeight))
    .style("fill", "url(#trunkGradient)")
    .style("stroke", "#654321")
    .style("stroke-width", "1px");

  // Tree crown
  treeGroup.append("circle")
    .attr("class", "tree-crown")
    .attr("cx", 0)
    .attr("cy", yScale(tree.displayTreeHeight))
    .attr("r", crownRadius)
    .style("fill", "url(#crownGradient)")
    .style("stroke", "#228B22")
    .style("stroke-width", "2px")
    .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))");

  // Bird
  const birdColor = getColorByActivity(tree["Activity (foraging, preening, calling, perching, others)"]);
  treeGroup.append("circle")
    .attr("class", "bird")
    .attr("cx", 0)
    .attr("cy", yScale(tree.displayBirdHeight))
    .attr("r", birdRadius)
    .style("fill", birdColor)
    .style("stroke", "#FF4500")
    .style("stroke-width", "2px")
    .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))")
    .style("clip-path", "circle(45%)");

  // Interactions
  treeGroup.style("cursor", "pointer")
    .on("mouseover", (event) => showTooltip(tooltip, event, tree, viewMode))
    .on("mouseout", () => hideTooltip(tooltip))
    .on("click", () => onTreeClick(index));

  return treeGroup;
};
