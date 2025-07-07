import React, { Component, createRef } from 'react';
import * as d3 from 'd3';
import '../../css/components/Charts/D3TreeHeightChart.css';
import { 
  filterValidData, 
  processTreeData, 
  calculateInsights, 
  createSVGContainer, 
  createScales, 
  createGradients, 
  createAxes, 
  createTooltip 
} from '../../utils/d3TreeHeightUtils';

class D3TreeHeightChart extends Component {
  constructor(props) {
    super(props);
    this.svgRef = createRef();
    this.containerRef = createRef();
    
    // No longer need state - everything is passed as props
    // All state management moved to Dashboard component
  }

  componentDidMount() {
    this.renderChart();
    // Add keyboard event listener for ESC key
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Setup global toggle functions for modal buttons
    window.toggleEcologicalAnalysis = (treeIndex) => {
      const element = document.getElementById(`ecological-analysis-${treeIndex || 0}`);
      const button = document.querySelector('.analysis-toggle-button');
      if (element) {
        const isHidden = element.style.display === 'none';
        element.style.display = isHidden ? 'block' : 'none';
        if (button) {
          button.textContent = isHidden ? '🔬 Hide Ecological Analysis' : '🔬 Show Ecological Analysis';
        }
      }
    };
    
    window.toggleConservationInsights = (treeIndex) => {
      const element = document.getElementById(`conservation-insights-${treeIndex || 0}`);
      const buttons = document.querySelectorAll('.analysis-toggle-button');
      const button = buttons[1]; // Second button is conservation insights
      if (element) {
        const isHidden = element.style.display === 'none';
        element.style.display = isHidden ? 'block' : 'none';
        if (button) {
          button.textContent = isHidden ? '🌱 Hide Conservation Insights' : '🌱 Show Conservation Insights';
        }
      }
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data || prevProps.viewMode !== this.props.viewMode) {
      this.renderChart();
    }
  }

  componentWillUnmount() {
    // Clean up tooltips and event listeners
    d3.select("body").selectAll(".tree-tooltip-2d, .tree-tooltip-group").remove();
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Clean up global functions
    delete window.toggleEcologicalAnalysis;
    delete window.toggleConservationInsights;
  }

  handleKeyDown = (event) => {
    // Close modal on Escape key
    if (event.key === 'Escape') {
      if (this.props.treeAnalysisModal.visible) {
        this.props.closeTreeAnalysisModal();
      }
    }
  }

  setViewMode(mode) {
    this.setState({ viewMode: mode });
  }

  toggleInsights() {
    this.props.toggleInsights();
  }

  toggleIndividualStats() {
    this.props.toggleIndividualStats();
  }

  toggleEcologicalAnalysis() {
    this.props.toggleEcologicalAnalysis();
  }

  toggleConservationInsights() {
    this.props.toggleConservationInsights();
  }

  selectTree(index) {
    this.props.selectTree(index);
  }

  showIndividualTreeAnalysis(tree, index) {
    this.props.showIndividualTreeAnalysis(tree, index);
  }

  showDetailedAnalysisPopup(content, title) {
    console.log('D3TreeHeightChart - showDetailedAnalysisPopup called, onDetailedAnalysis prop:', !!this.props.onDetailedAnalysis);
    
    // Always use Dashboard's detailed analysis popup (App.jsx level)
    if (this.props.onDetailedAnalysis) {
      console.log('D3TreeHeightChart - Using Dashboard popup via onDetailedAnalysis prop');
      this.props.onDetailedAnalysis();
    } else {
      console.log('D3TreeHeightChart - No onDetailedAnalysis prop available, cannot show popup');
      console.warn('D3TreeHeightChart: onDetailedAnalysis prop is required for modal functionality');
    }
  }

  formatTime24h = (timeStr) => {
    if (!timeStr || timeStr === 'Not recorded') return timeStr;
    
    // Ensure timeStr is a string
    if (typeof timeStr !== 'string') {
      return String(timeStr);
    }
    
    // If already in 24-hour format, return as is
    if (timeStr.includes(':') && !timeStr.toLowerCase().includes('am') && !timeStr.toLowerCase().includes('pm')) {
      return timeStr;
    }
    
    // Convert 12-hour to 24-hour format
    try {
      const time12h = timeStr.toLowerCase().trim();
      const pmMatch = time12h.includes('pm');
      const amMatch = time12h.includes('am');
      
      if (!pmMatch && !amMatch) return timeStr;
      
      let timeOnly = time12h.replace(/\s*(am|pm)/g, '');
      let [hours, minutes] = timeOnly.split(':');
      
      hours = parseInt(hours, 10);
      minutes = minutes || '00';
      
      if (amMatch && hours === 12) {
        hours = 0;
      } else if (pmMatch && hours !== 12) {
        hours += 12;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    } catch (e) {
      return timeStr; // Return original if conversion fails
    }
  }

  generateTreeAnalysisContent = (treeData, treeIndex, treeHeight, birdHeight) => {
    const observationDate = treeData['Date'] || 'Not recorded';
    const observationTime = this.formatTime24h(treeData['Time'] || treeData['Time '] || '') || 'Not recorded';
    const observerName = treeData['Observer name'] || 'Unknown observer';
    
    // Extract activity with multiple field name support and format handling
    let activity = treeData["Activity (foraging, preening, calling, perching, others)"] || 
                  treeData['What was the Straw-headed bulbul doing? (Activity)'] || 
                  treeData['Activity'] || 
                  'Activity not specified';
    
    // Handle array format for activity (from fallback data)
    if (Array.isArray(activity)) {
      activity = activity.join(', ');
    }
    
    const location = treeData['Location'] || 'Location not specified';
    const weather = treeData['Weather'] || 'Weather not recorded';
    const habitat = treeData['Habitat type'] || treeData['Habitat'] || 'Habitat type not specified';
    const treeSpecies = treeData['Tree species'] || 'Tree species not identified';
    
    // Calculate additional metrics
    const birdPositionPercent = Math.round((birdHeight / treeHeight) * 100);
    const heightCategory = treeHeight > 20 ? 'Tall' : treeHeight > 10 ? 'Medium' : 'Short';
    const positionCategory = birdPositionPercent > 75 ? 'Upper canopy' : 
                           birdPositionPercent > 50 ? 'Mid canopy' : 
                           birdPositionPercent > 25 ? 'Lower canopy' : 'Understory';
    
    // Generate conservation insights based on data
    const conservationInsights = this.generateConservationInsights(treeHeight, birdHeight, birdPositionPercent, activity);
    
    return `
      <div class="tree-analysis-content">
        
        <!-- Observation Summary -->
        <div class="tree-analysis-header">
          <h3 class="tree-analysis-title">
            <span class="emoji">🌳</span>Tree ${treeIndex + 1} - Detailed Analysis
          </h3>
          <div class="tree-metrics-grid">
            <div class="tree-metrics-card">
              <span class="tree-metrics-label">🌲 Tree Metrics</span><br>
              Height: <span class="tree-metric-value">${treeHeight.toFixed(1)}m</span><br>
              Category: <span class="tree-metric-value">${heightCategory}</span><br>
              Species: <span class="tree-metric-value">${treeSpecies}</span>
            </div>
            <div class="tree-metrics-card">
              <span class="tree-metrics-label">🐦 Bird Position</span><br>
              Height: <span class="bird-metric-value">${birdHeight.toFixed(1)}m</span><br>
              Position: <span class="bird-metric-value">${birdPositionPercent}% up tree</span><br>
              Zone: <span class="bird-metric-value">${positionCategory}</span>
            </div>
          </div>
        </div>

        <!-- Observation Details -->
        <div class="observation-details">
          <h4 class="observation-details-title">
            <span class="emoji">📋</span>Observation Details
          </h4>
          <div class="observation-details-grid">
            <div><strong>📅 Date:</strong> ${observationDate}</div>
            <div><strong>🕐 Time:</strong> ${observationTime}</div>
            <div><strong>🌍 Location:</strong> ${location}</div>
            <div><strong>🎭 Activity:</strong> ${activity}</div>
          </div>
        </div>

        <!-- Ecological Analysis Toggle Button -->
        <div class="analysis-toggle-section">
          <button onclick="window.toggleEcologicalAnalysis?.()" class="analysis-toggle-button">
            <span class="emoji">🔬</span>Show Ecological Analysis
          </button>
        </div>

        <!-- Ecological Analysis (Hidden by default) -->
        <div class="ecological-analysis" style="display: none;" id="ecological-analysis-${treeIndex}">
          <h4 class="ecological-analysis-title">
            <span class="emoji">🔬</span>Ecological Analysis
          </h4>
          <div class="ecological-analysis-section">
            <span class="ecological-analysis-label">Behavior Context:</span>
            <p class="ecological-analysis-content">
              The Straw-headed Bulbul was observed engaging in <strong>${typeof activity === 'string' ? activity.toLowerCase() : String(activity || '').toLowerCase()}</strong> at ${birdPositionPercent}% of the tree height (${typeof positionCategory === 'string' ? positionCategory.toLowerCase() : String(positionCategory || '').toLowerCase()}). This positioning suggests ${this.getBehaviorInsight(activity, positionCategory)}.
            </p>
          </div>
          <div>
            <span class="ecological-analysis-label">Habitat Significance:</span>
            <p class="ecological-analysis-content">
              This ${heightCategory.toLowerCase()} tree (${treeHeight.toFixed(1)}m) represents ${this.getHabitatSignificance(treeHeight, habitat)} in the local ecosystem. The bird's preference for this specific height zone indicates ${this.getHeightPreferenceInsight(birdPositionPercent)}.
            </p>
          </div>
        </div>

        <!-- Conservation Insights Toggle Button -->
        <div class="analysis-toggle-section">
          <button onclick="window.toggleConservationInsights?.()" class="analysis-toggle-button">
            <span class="emoji">🌱</span>Show Conservation Insights
          </button>
        </div>

        <!-- Conservation Insights (Hidden by default) -->
        <div class="conservation-insights" style="display: none;" id="conservation-insights-${treeIndex}">
          <h4 class="conservation-insights-title">
            <span class="emoji">🌱</span>Conservation Insights
          </h4>
          ${conservationInsights}
        </div>

      </div>
    `;
  }

  getBehaviorInsight = (activity, positionCategory) => {
    // Ensure parameters are strings
    const activityStr = typeof activity === 'string' ? activity : String(activity || '');
    const positionStr = typeof positionCategory === 'string' ? positionCategory : String(positionCategory || '');
    
    const insights = {
      'feeding': 'active foraging behavior, likely searching for insects, fruits, or nectar',
      'resting': 'energy conservation, potentially during midday heat or between feeding sessions',
      'preening': 'maintenance behavior essential for feather health and flight capability',
      'singing': 'territorial marking or mate communication, indicating breeding season activity',
      'calling': 'social communication or alarm behavior, possibly alerting to threats',
      'flying': 'movement between feeding sites or territory patrol',
      'perching': 'observation behavior, scanning for food sources or monitoring territory'
    };
    
    const positionInsights = {
      'Upper canopy': 'preference for exposed perches with good visibility and access to fruits',
      'Mid canopy': 'balanced access to food sources and protection from predators',
      'Lower canopy': 'foraging in understory vegetation or seeking shelter',
      'Understory': 'ground-level foraging or movement between territory boundaries'
    };
    
    const activityInsight = insights[activityStr.toLowerCase()] || 'typical bulbul behavior';
    const positionInsight = positionInsights[positionStr] || 'strategic positioning';
    
    return `${activityInsight}, with ${positionInsight}`;
  }

  getHabitatSignificance = (treeHeight, habitat) => {
    if (treeHeight > 20) return 'a significant canopy component providing essential nesting sites and food resources';
    if (treeHeight > 10) return 'an important mid-story element supporting diverse bird communities';
    return 'a valuable understory component contributing to habitat complexity';
  }

  getHeightPreferenceInsight = (birdPositionPercent) => {
    if (birdPositionPercent > 75) return 'a preference for exposed perches with maximum visibility and territorial advantages';
    if (birdPositionPercent > 50) return 'optimal positioning balancing visibility with protection from predators';
    if (birdPositionPercent > 25) return 'utilization of protected lower canopy areas for foraging and shelter';
    return 'ground-level or low vegetation usage, possibly for specific feeding opportunities';
  }

  generateConservationInsights = (treeHeight, birdHeight, birdPositionPercent, activity) => {
    // Ensure activity is a string
    const activityStr = typeof activity === 'string' ? activity : String(activity || '');
    
    let insights = [];
    
    // Tree height based insights
    if (treeHeight > 20) {
      insights.push(`
        <div class="conservation-insight-item">
          <span class="conservation-insight-label">🌳 Mature Tree Conservation:</span> This tall tree (${treeHeight.toFixed(1)}m) is a critical habitat component. Mature trees like this take decades to grow and provide irreplaceable ecosystem services. Priority protection is essential.
        </div>
      `);
    }
    
    // Activity based insights
    if (activityStr.toLowerCase().includes('feeding')) {
      insights.push(`
        <div class="conservation-insight-item feeding">
          <span class="conservation-insight-label">🍃 Feeding Habitat:</span> Active feeding behavior indicates this tree provides important food resources. Protecting fruit-bearing and insect-hosting trees is crucial for sustaining bulbul populations.
        </div>
      `);
    }
    
    // Position based insights
    if (birdPositionPercent > 70) {
      insights.push(`
        <div class="conservation-insight-item habitat">
          <span class="conservation-insight-label">🏔️ Canopy Utilization:</span> High canopy usage (${birdPositionPercent}%) highlights the importance of maintaining vertical forest structure. Tall trees with full canopy development are essential.
        </div>
      `);
    }
    
    // General conservation action
    insights.push(`
      <div class="conservation-insight-item protection">
        <span class="conservation-insight-label">🔄 Action Items:</span> Monitor this location for habitat changes, support local conservation initiatives, and report any threats to tree health or bird disturbance to local authorities.
      </div>
    `);
    
    return insights.join('');
  }

  closeTreeAnalysisModal() {
    this.props.closeTreeAnalysisModal();
  }

  renderChart() {
    const { data, viewMode } = this.props;

    if (!data || data.length === 0) return;

    // Clear previous chart
    d3.select(this.svgRef.current).selectAll("*").remove();

    // Use utility functions for data processing
    const validData = filterValidData(data);
    if (validData.length === 0) return;

    const processedData = processTreeData(validData, viewMode);
    const containerWidth = this.containerRef.current?.offsetWidth || window.innerWidth - 40;

    if (viewMode === 'group') {
      // GROUP VIEW: Show all trees grouped by height ranges - no axes
      this.renderGroupView(validData, containerWidth);
    } else {
      // NORMAL/PERCENTAGE VIEW: Individual trees with axes
      this.renderNormalView(processedData, containerWidth);
    }
  }

  renderGroupView(validData, containerWidth) {
    // Chart Configuration - larger canvas for natural forest layout
    const margin = { top: 80, right: 60, bottom: 100, left: 60 };
    const width = containerWidth - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(this.svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("background", "transparent");

    // Add forest background gradient and tree gradients
    const defs = svg.append("defs");
    
    // Forest background gradient
    const forestGradient = defs.append("linearGradient")
      .attr("id", "forestBackground")
      .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
    forestGradient.append("stop").attr("offset", "0%").attr("stop-color", "#87CEEB");
    forestGradient.append("stop").attr("offset", "20%").attr("stop-color", "#98D8E8");
    forestGradient.append("stop").attr("offset", "40%").attr("stop-color", "#B8E994");
    forestGradient.append("stop").attr("offset", "70%").attr("stop-color", "#78C850");
    forestGradient.append("stop").attr("offset", "100%").attr("stop-color", "#228B22");

    // Tree trunk gradient
    const trunkGradient = defs.append("linearGradient")
      .attr("id", "groupTrunkGradient")
      .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
    trunkGradient.append("stop").attr("offset", "0%").attr("stop-color", "#8B4513");
    trunkGradient.append("stop").attr("offset", "50%").attr("stop-color", "#A0522D");
    trunkGradient.append("stop").attr("offset", "100%").attr("stop-color", "#654321");

    // Multiple crown gradients for variety
    const crownColors = ['#90EE90', '#32CD32', '#228B22', '#006400', '#4A7C59', '#2E7D32'];
    crownColors.forEach((color, idx) => {
      const crownGradient = defs.append("radialGradient")
        .attr("id", `groupCrown${idx}`)
        .attr("cx", "30%").attr("cy", "30%");
      crownGradient.append("stop").attr("offset", "0%").attr("stop-color", d3.rgb(color).brighter(0.8));
      crownGradient.append("stop").attr("offset", "50%").attr("stop-color", color);
      crownGradient.append("stop").attr("offset", "100%").attr("stop-color", d3.rgb(color).darker(1.2));
    });

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add forest background
    g.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#forestBackground)")
      .attr("opacity", 0.3);

    // Create tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tree-tooltip-group")
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
      .style("max-width", "280px")
      .style("z-index", "9999");

    // Create realistic tropical rainforest with all trees as individual entities
    const totalTrees = Math.min(validData.length, 25); // Show up to 25 trees for performance
    
    // Create natural distribution across the forest floor
    for (let i = 0; i < totalTrees; i++) {
      const treeData = validData[i];
      const treeHeight = parseFloat(treeData['Height of tree/m']);
      const birdHeight = parseFloat(treeData['Height of bird/m']);

      // Natural positioning with some clustering like real forests
      const clusterCenterX = (i / totalTrees) * width + (Math.random() - 0.5) * (width / totalTrees);
      const treeX = Math.max(30, Math.min(width - 30, clusterCenterX));
      
      // Vary Y position to create natural depth
      const baseY = height - 80;
      const treeY = baseY - Math.random() * 60;

      // Size based on actual tree height with some variation
      const normalizedHeight = Math.min(Math.max(treeHeight / 30, 0.3), 1.5); // Normalize to 0.3-1.5 scale
      const sizeScale = normalizedHeight + (Math.random() - 0.5) * 0.3;

      // Determine layer based on position and size
      let layer, opacity;
      const positionFactor = treeX / width;
      const sizeFactor = sizeScale;
      
      if (positionFactor < 0.3 || sizeFactor < 0.6) {
        layer = "background";
        opacity = 0.5;
      } else if (positionFactor < 0.7 || sizeFactor < 0.9) {
        layer = "middle";
        opacity = 0.75;
      } else {
        layer = "foreground";
        opacity = 1.0;
      }

      // Create the tropical tree
      this.createRealisticTropicalTreeGroup(g, treeX, treeY, treeData, i, sizeScale, opacity, layer, tooltip, crownColors);
    }

    // Add title and statistics
    g.append("text")
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .style("font-size", "24px")
      .style("font-weight", "bold")
      .style("fill", "#2D4A22")
      .text(`🌳 Tropical Rainforest Visualization`);

    g.append("text")
      .attr("x", width / 2)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#666")
      .text(`${totalTrees} trees • Heights: ${d3.min(validData, d => parseFloat(d['Height of tree/m'])).toFixed(1)}m - ${d3.max(validData, d => parseFloat(d['Height of tree/m'])).toFixed(1)}m`);

    // Cleanup old tooltips
    d3.select("body").selectAll(".tree-tooltip-2d").remove();
  }

  // Method to create realistic tropical trees for individual tree data
  createRealisticTropicalTreeGroup(parentGroup, treeX, treeY, treeData, treeIndex, sizeScale, opacity, layer, tooltip, crownColors) {
    const treeHeight = parseFloat(treeData['Height of tree/m']);
    const birdHeight = parseFloat(treeData['Height of bird/m']);
    
    const baseTreeSize = Math.max(20, Math.min(60, treeHeight * 1.8));
    const adjustedTreeHeight = baseTreeSize * sizeScale;
    const trunkWidth = (baseTreeSize * 0.15) * sizeScale;
    const mainCrownRadius = (baseTreeSize * 0.4) * sizeScale;

    const treeGroup = parentGroup.append("g")
      .attr("class", `tropical-tree-${layer}`)
      .style("cursor", "pointer")
      .attr("opacity", opacity);

    // Realistic tropical tree trunk with texture
    const trunkHeight = adjustedTreeHeight * 0.6;
    
    // Buttress roots for large tropical trees
    if (treeHeight > 15) {
      const buttressCount = 4;
      for (let i = 0; i < buttressCount; i++) {
        const angle = (i / buttressCount) * Math.PI * 2;
        const buttressLength = trunkWidth * 1.5;
        const buttressX = treeX + Math.cos(angle) * buttressLength;
        const buttressY = treeY;
        
        treeGroup.append("polygon")
          .attr("points", `${treeX},${treeY} ${buttressX},${buttressY} ${treeX + Math.cos(angle) * trunkWidth/2},${treeY - trunkWidth}`)
          .attr("fill", "url(#groupTrunkGradient)")
          .attr("opacity", 0.7)
          .attr("stroke", "#654321")
          .attr("stroke-width", 0.5);
      }
    }
    
    // Main trunk
    treeGroup.append("rect")
      .attr("x", treeX - trunkWidth / 2)
      .attr("y", treeY - trunkHeight)
      .attr("width", trunkWidth)
      .attr("height", trunkHeight)
      .attr("fill", "url(#groupTrunkGradient)")
      .attr("stroke", "#654321")
      .attr("stroke-width", 1)
      .attr("rx", trunkWidth / 4);

    // Trunk texture lines for realism
    const textureLines = Math.floor(trunkHeight / 15) + 2;
    for (let i = 0; i < textureLines; i++) {
      const yPos = treeY - (trunkHeight * (0.2 + (i * 0.6) / textureLines));
      treeGroup.append("line")
        .attr("x1", treeX - trunkWidth / 3)
        .attr("y1", yPos)
        .attr("x2", treeX + trunkWidth / 3)
        .attr("y2", yPos)
        .attr("stroke", "#5D4037")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.6);
    }

    // Tropical tree crown - multiple layered circles for dense foliage
    const crownY = treeY - trunkHeight - mainCrownRadius * 0.3;
    const crownColorIndex = treeIndex % crownColors.length;
    
    // Main crown
    treeGroup.append("circle")
      .attr("cx", treeX)
      .attr("cy", crownY)
      .attr("r", mainCrownRadius)
      .attr("fill", `url(#groupCrown${crownColorIndex})`)
      .attr("stroke", d3.rgb(crownColors[crownColorIndex]).darker(2))
      .attr("stroke-width", 1);

    // Secondary crowns for tropical density
    const secondaryPositions = [
      { x: -0.4, y: 0.2, scale: 0.7 },
      { x: 0.4, y: 0.3, scale: 0.6 },
      { x: -0.2, y: -0.3, scale: 0.5 },
      { x: 0.3, y: -0.2, scale: 0.55 },
      { x: 0, y: 0.4, scale: 0.8 }
    ];

    secondaryPositions.forEach((pos, idx) => {
      if (mainCrownRadius > 15) { // Only for larger trees
        treeGroup.append("circle")
          .attr("cx", treeX + pos.x * mainCrownRadius)
          .attr("cy", crownY + pos.y * mainCrownRadius)
          .attr("r", mainCrownRadius * pos.scale)
          .attr("fill", `url(#groupCrown${(crownColorIndex + idx + 1) % crownColors.length})`)
          .attr("opacity", 0.7 - idx * 0.1)
          .attr("stroke", d3.rgb(crownColors[crownColorIndex]).darker(1.5))
          .attr("stroke-width", 0.5);
      }
    });

    // Add some hanging vines or branches for tropical feel
    if (sizeScale > 0.8 && Math.random() > 0.6) {
      const vineCount = Math.floor(Math.random() * 3) + 1;
      for (let v = 0; v < vineCount; v++) {
        const vineX = treeX + (Math.random() - 0.5) * mainCrownRadius;
        const vineLength = Math.random() * mainCrownRadius * 0.8;
        
        treeGroup.append("line")
          .attr("x1", vineX)
          .attr("y1", crownY + mainCrownRadius * 0.8)
          .attr("x2", vineX + (Math.random() - 0.5) * 5)
          .attr("y2", crownY + mainCrownRadius * 0.8 + vineLength)
          .attr("stroke", "#4A5D23")
          .attr("stroke-width", 1)
          .attr("opacity", 0.6);
      }
    }

    // Bird position indicator
    const birdX = treeX + (Math.random() - 0.5) * mainCrownRadius * 1.2;
    const birdY = crownY - (birdHeight / treeHeight) * adjustedTreeHeight * 0.8;
    
    // Use the unified bird rendering function
    const birdImageSize = Math.max(trunkWidth * 1.5, 20);
    this.renderBird(treeGroup, birdX, birdY, birdImageSize);

    // Enhanced tooltip interactions
    treeGroup
      .on("mouseover", (event) => {
        d3.select(treeGroup.node()).selectAll("circle, rect, polygon")
          .transition()
          .duration(200)
          .style("filter", "drop-shadow(4px 4px 8px rgba(255,215,0,0.6)) brightness(1.2)");
        
        tooltip.transition()
          .duration(200)
          .style("opacity", 1);

        const observationDate = treeData['Date'] || 'Not recorded';
        const observationTime = this.formatTime24h(treeData['Time'] || treeData['Time '] || '') || 'Not recorded';
        const observerName = treeData['Observer name'] || 'Unknown observer';
        
        // Extract activity with multiple field name support and format handling
        let activity = treeData["Activity (foraging, preening, calling, perching, others)"] || 
                      treeData['What was the Straw-headed bulbul doing? (Activity)'] || 
                      treeData['Activity'] || 
                      'Not specified';
        
        // Handle array format for activity (from fallback data)
        if (Array.isArray(activity)) {
          activity = activity.join(', ');
        }
        
        const location = treeData['Location'] || 'Not specified';
        const habitat = treeData['Habitat type'] || treeData['Habitat'] || 'Not specified';
        const weather = treeData['Weather'] || 'Not recorded';
        const birdPositionPercent = (birdHeight/treeHeight*100).toFixed(1);
        const heightCategory = treeHeight > 20 ? 'Tall' : treeHeight > 10 ? 'Medium' : 'Short';
        const positionCategory = birdPositionPercent > 75 ? 'Upper canopy' : 
                               birdPositionPercent > 50 ? 'Mid canopy' : 
                               birdPositionPercent > 25 ? 'Lower canopy' : 'Understory';

        tooltip.html(`
          <div class="tree-tooltip-content">
            <div class="tree-tooltip-header">
              🐦 Straw-headed Bulbul Observation
            </div>
            
            <!-- Primary Metrics -->
            <div class="tree-tooltip-section">
              <div class="tree-tooltip-row">
                <span>🐦 Bird Height:</span> <span class="bird-height-value">${birdHeight.toFixed(1)}m</span>
              </div>
              <div class="tree-tooltip-row">
                <span>📍 Position:</span> <span class="position-value">${birdPositionPercent}% (${positionCategory})</span>
              </div>
            </div>
            
            <!-- Observation Context -->
            <div class="tree-tooltip-section">
              <div class="tree-tooltip-row simple">🎭 <strong>Activity:</strong> ${activity}</div>
            </div>
            
            <!-- Observation Details -->
            <div class="tree-tooltip-section">
              <div class="tree-tooltip-row simple">📅 <strong>Date:</strong> ${observationDate}</div>
              <div class="tree-tooltip-row simple">🕐 <strong>Time:</strong> ${observationTime}</div>
              <div class="tree-tooltip-row simple">🌍 <strong>Location:</strong> ${location}</div>
            </div>
            
            <div class="tree-tooltip-footer">
              <div>Layer: ${layer.charAt(0).toUpperCase() + layer.slice(1)} • Tree ${treeIndex + 1}</div>
              <div class="tree-tooltip-click-hint">🖱️ Click for detailed analysis</div>
            </div>
          </div>
        `)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", () => {
        d3.select(treeGroup.node()).selectAll("circle, rect, polygon")
          .transition()
          .duration(200)
          .style("filter", "none");
        
        tooltip.transition()
          .duration(200)
          .style("opacity", 0);
      })
      .on("click", () => {
        console.log('D3TreeHeightChart - Tree clicked, onDetailedAnalysis prop:', !!this.props.onDetailedAnalysis);
        // Use Dashboard's detailed analysis modal if available
        if (this.props.onDetailedAnalysis) {
          console.log('D3TreeHeightChart - Calling onDetailedAnalysis prop');
          this.props.onDetailedAnalysis();
        } else {
          console.log('D3TreeHeightChart - Using fallback internal modal');
          // Fallback to internal modal
          const detailedContent = this.generateTreeAnalysisContent(treeData, treeIndex, treeHeight, birdHeight);
          this.showDetailedAnalysisPopup(detailedContent, `🌳 Tree ${treeIndex + 1} Analysis`);
        }
      });
  }

  renderNormalView = (validData, containerWidth) => {
    // Use viewMode from props
    const viewMode = this.props.viewMode || 'normal';

    // Clean up any old tooltips before creating a new one
    d3.select("body").selectAll(".tree-tooltip-2d").remove();
    d3.select("body").selectAll(".tree-tooltip-group").remove();

    // Create tooltip for this view
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
      .style("max-width", "280px")
      .style("z-index", "9999");

    // Process data for normal/percentage view
    const processedData = validData.map((d, index) => {
      const originalTreeHeight = parseFloat(d['Height of tree/m']);
      const originalBirdHeight = parseFloat(d['Height of bird/m']);
      
      if (viewMode === 'percentage') {
        return {
          ...d,
          displayTreeHeight: 100,
          displayBirdHeight: Math.min((originalBirdHeight / originalTreeHeight) * 100, 100),
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

    // Chart Configuration with axes
    const margin = { top: 80, right: 80, bottom: 120, left: 80 };
    const width = containerWidth - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(this.svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("background", "transparent");

    // Add gradients
    const defs = svg.append("defs");
    
    // Forest background gradient
    const forestGradient = defs.append("linearGradient")
      .attr("id", "forestBackground")
      .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
    forestGradient.append("stop").attr("offset", "0%").attr("stop-color", "#87CEEB");
    forestGradient.append("stop").attr("offset", "40%").attr("stop-color", "#B8E994");
    forestGradient.append("stop").attr("offset", "100%").attr("stop-color", "#228B22");
    
    // Tree gradients
    const trunkGradient = defs.append("linearGradient")
      .attr("id", "trunkGradient")
      .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
    trunkGradient.append("stop").attr("offset", "0%").attr("stop-color", "#8B4513");
    trunkGradient.append("stop").attr("offset", "50%").attr("stop-color", "#A0522D");
    trunkGradient.append("stop").attr("offset", "100%").attr("stop-color", "#654321");

    const crownGradient = defs.append("radialGradient")
      .attr("id", "crownGradient")
      .attr("cx", "30%").attr("cy", "30%");
    crownGradient.append("stop").attr("offset", "0%").attr("stop-color", "#90EE90");
    crownGradient.append("stop").attr("offset", "50%").attr("stop-color", "#32CD32");
    crownGradient.append("stop").attr("offset", "100%").attr("stop-color", "#228B22");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add forest background
    g.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#forestBackground)")
      .attr("opacity", 0.3);

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

    // Add axes
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
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom + 30})`)
      .style("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#2D4A22")
      .text('Trees');

    // Deterministic seeded random function for consistent jitter
    function seededRandom(min = 0, max = 1, seed = 1) {
      // Simple LCG (Linear Congruential Generator)
      let x = Math.sin(seed * 9999) * 10000;
      return min + (x - Math.floor(x)) * (max - min);
    }

    // Assign rainforest layer and species for each tree
    function assignLayerAndSpecies(treeHeight) {
      if (treeHeight > 25) return { layer: 'canopy', color: '#228B22', species: '' };
      if (treeHeight > 12) return { layer: 'understory', color: '#32CD32', species: '' };
      return { layer: 'shrub', color: '#A3E635', species: '' };
    }

    // D3 rendering loop
    processedData.forEach((tree, index) => {
      // Use seededRandom with index as seed
      // Example: seededRandom(-10, 10, index)
      const barX = xScale(index);
      const barWidth = xScale.bandwidth();
      const treeHeight = tree.displayTreeHeight;
      const birdHeight = tree.displayBirdHeight;
      // Assign layer/species/color
      const { layer, color, species } = assignLayerAndSpecies(tree.originalTreeHeight);
      // Add vertical jitter for realism
      const verticalJitter = (layer === 'canopy' ? -seededRandom(-10, 10) : layer === 'understory' ? seededRandom(-5, 5) : seededRandom(0, 10));
      // Add horizontal jitter for realism
      const horizontalJitter = seededRandom(-10, 10);
      // Create tree group
      const treeGroup = g.append('g')
        .attr('class', 'tree-group')
        .attr('transform', `translate(${horizontalJitter},${verticalJitter})`)
        .style('filter', 'url(#treeShadow)');
      // Tree trunk
      const trunkWidth = Math.max(barWidth * 0.3, 8);
      const trunkHeight = height - yScale(treeHeight);
      
      treeGroup.append("rect")
        .attr("x", barX + barWidth / 2 - trunkWidth / 2)
        .attr("y", yScale(treeHeight))
        .attr("width", trunkWidth)
        .attr("height", trunkHeight)
        .attr("fill", "url(#trunkGradient)")
        .attr("stroke", "#654321")
        .attr("stroke-width", 1)
        .attr("rx", trunkWidth / 4);

      // Main crown circle - color by layer/species
      if (layer === 'shrub') {
        // Draw a realistic bush/shrub: several overlapping ellipses/circles, short trunk
        // Short trunk
        treeGroup.append('rect')
          .attr('x', barX + barWidth / 2 - trunkWidth / 3)
          .attr('y', yScale(treeHeight) + trunkHeight * 0.85)
          .attr('width', trunkWidth * 0.66)
          .attr('height', trunkHeight * 0.15)
          .attr('fill', '#8B5E3C')
          .attr('stroke', '#654321')
          .attr('stroke-width', 1)
          .attr('rx', trunkWidth / 6);
        // Bushy foliage: 3-5 overlapping ellipses/circles
        const bushColors = ['#A3E635', '#65A30D', '#B6F399', '#4ADE80'];
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          const cx = barX + barWidth / 2 + Math.cos(angle) * 10;
          const cy = yScale(treeHeight) + trunkHeight * 0.85 + Math.sin(angle) * 8;
          treeGroup.append('ellipse')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('rx', Math.max(barWidth * 0.22, 8) * (0.9 + Math.random() * 0.3))
            .attr('ry', Math.max(barWidth * 0.16, 6) * (0.9 + Math.random() * 0.3))
            .attr('fill', bushColors[i % bushColors.length])
            .attr('opacity', 0.85)
            .attr('stroke', bushColors[(i+1)%bushColors.length])
            .attr('stroke-width', 1.2);
        }
        // Optionally, add a few small dots for leaf texture
        for (let i = 0; i < 6; i++) {
          treeGroup.append('circle')
            .attr('cx', barX + barWidth / 2 + (Math.random() - 0.5) * 18)
            .attr('cy', yScale(treeHeight) + trunkHeight * 0.85 + (Math.random() - 0.5) * 12)
            .attr('r', 1.5 + Math.random() * 1.2)
            .attr('fill', '#65A30D')
            .attr('opacity', 0.7);
        }
      } else {
        treeGroup.append('circle')
          .attr('cx', barX + barWidth / 2)
          .attr('cy', yScale(treeHeight) + (layer === 'canopy' ? -10 : layer === 'understory' ? 0 : 10))
          .attr('r', Math.max(barWidth * 0.6, 15) * (layer === 'canopy' ? 1.1 : layer === 'understory' ? 0.9 : 0.7))
          .attr('fill', color)
          .attr('stroke', d3.rgb(color).darker(1))
          .attr('stroke-width', 2)
          .attr('opacity', 0.92);
      }

      // Bird positioning (added AFTER interactions to prevent blocking)
      const birdPositionY = yScale(treeHeight) + (trunkHeight * (1 - birdHeight / treeHeight));
      const birdX = barX + barWidth / 2;

      // Bird image with pointer-events: none to prevent blocking
      const birdImageSize = Math.max(trunkWidth * 1.5, 60);
      treeGroup.append("image")
        .attr("href", "/shb.png")
        .attr("x", birdX - birdImageSize / 2)
        .attr("y", birdPositionY - birdImageSize / 2)
        .attr("width", birdImageSize)
        .attr("height", birdImageSize)
        .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.4))")
        .style("clip-path", "circle(45%)")
        .style("pointer-events", "none"); // Prevent bird from blocking mouse events
    });

    // Cleanup old tooltips
    d3.select("body").selectAll(".tree-tooltip-group").remove();
  }

  // Assign rainforest layer and species for each tree
  assignLayerAndSpecies = (treeHeight) => {
    if (treeHeight > 25) return { layer: 'canopy', color: '#228B22', species: 'Dipterocarp' };
    if (treeHeight > 12) return { layer: 'understory', color: '#32CD32', species: 'Shorea' };
    return { layer: 'shrub', color: '#A3E635', species: 'Macaranga' };
  };

  // Unified function to render birds consistently across all views
  renderBird = (parentGroup, x, y, size) => {
    const birdGroup = parentGroup.append("g")
      .attr("class", "bird-element")
      .style("pointer-events", "none"); // Prevent bird from blocking mouse events
      
    // Add the bird image
    birdGroup.append("image")
      .attr("class", "bird-image")
      .attr("href", "/shb.png")
      .attr("x", x - size/2)
      .attr("y", y - size/2)
      .attr("width", size)
      .attr("height", size)
      .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.4))")
      .style("clip-path", "circle(45%)")
      .style("pointer-events", "none");

    // Add a small perch branch
    birdGroup.append("line")
      .attr("class", "bird-perch")
      .attr("x1", x - size/3)
      .attr("y1", y + size/3)
      .attr("x2", x + size/3)
      .attr("y2", y + size/3)
      .attr("stroke", "#8B4513")
      .attr("stroke-width", Math.max(1, size/15))
      .attr("opacity", 0.8)
      .style("pointer-events", "none");
  }

  // Forest placeholder tooltip handlers
  showForestTooltip(event, content) {
    this.props.showForestTooltip(event, content);
  }

  hideForestTooltip() {
    this.props.hideForestTooltip();
  }

  render() {
    const { data } = this.props;
    // Defensive: ensure state is always an object
    const state = this.state || { viewMode: 'normal' };
    const viewMode = state.viewMode || 'normal';
    const { showInsights, showIndividualStats, treeAnalysisModal = { visible: false } } = state;
    
    console.log('D3TreeHeightChart render - props received:', {
      hasData: !!this.props.data,
      viewMode: state.viewMode,
      showInsights,
      propsKeys: Object.keys(this.props)
    });
    
    // Sample test data for development
    const testData = [
      {
        "Observer name": "Test Observer",
        "Location": "Test Location 1", 
        "Height of tree/m": 15,
        "Height of bird/m": 12,
        "What was the Straw-headed bulbul doing? (Activity)": "Foraging",
        "Date": "2024-01-15",
        "Time": "08:30",
        "Weather": "Sunny",
        "Habitat type": "Secondary forest"
      },
      {
        "Observer name": "Test Observer 2",
        "Location": "Test Location 2",
        "Height of tree/m": 20,
        "Height of bird/m": 18,
        "What was the Straw-headed bulbul doing? (Activity)": "Perching", 
        "Date": "2024-01-16",
        "Time": "09:15",
        "Weather": "Cloudy",
        "Habitat type": "Primary forest"
      },
      {
        "Observer name": "Test Observer 3",
        "Location": "Test Location 3",
        "Height of tree/m": 8,
        "Height of bird/m": 6,
        "What was the Straw-headed bulbul doing? (Activity)": "Calling",
        "Date": "2024-01-17", 
        "Time": "07:45",
        "Weather": "Partly cloudy",
        "Habitat type": "Mangrove"
      }
    ];

    // Use test data if no real data is provided
    const chartData = data && data.length > 0 ? data : testData;

    if (!chartData || chartData.length === 0) {
      return (
        <div className="chart-container empty-state">
          <h3 className="empty-state-title">
            🌲 Straw-headed Bulbul Survey Tree Distribution 🐦
          </h3>
          <p className="empty-state-description">
            Interactive visualization of bird observations with realistic tree representations and habitat analysis.
          </p>
          
          {/* Forest SVG Background - Only show for group view to avoid conflicts with data visualization */}
          {viewMode === 'group' && (
            <svg 
              width="100%" 
              height="300" 
              className="forest-svg-background"
            >
            {/* Forest background gradient */}
            <defs>
              <linearGradient id="forestBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#87CEEB" stopOpacity="0.3" />
                <stop offset="30%" stopColor="#B8E994" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#228B22" stopOpacity="0.5" />
              </linearGradient>
              
              <radialGradient id="trunkGrad" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#A0522D" />
                <stop offset="100%" stopColor="#8B4513" />
              </radialGradient>
              
              <radialGradient id="crown1" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#90EE90" />
                <stop offset="70%" stopColor="#32CD32" />
                <stop offset="100%" stopColor="#228B22" />
              </radialGradient>
              
              <radialGradient id="crown2" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#98FB98" />
                <stop offset="70%" stopColor="#00FF32" />
                <stop offset="100%" stopColor="#006400" />
              </radialGradient>
              
              <radialGradient id="crown3" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#ADFF2F" />
                <stop offset="70%" stopColor="#32CD32" />
                <stop offset="100%" stopColor="#228B22" />
              </radialGradient>
              
              <filter id="treeShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="1" dy="2" stdDeviation="1" floodOpacity="0.2"/>
              </filter>
            </defs>
            
            {/* Background forest area */}
            <rect width="100%" height="100%" fill="url(#forestBg)" />
            
            {/* Back row trees (smaller, faded) */}
            <g opacity="0.6" style={{filter: 'url(#treeShadow)'}}>
              {/* Tree 1 - Back left */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🌲 Small Oak Tree\n📏 Height: 8m\n📊 Canopy Coverage: 15%\n🐦 Bird Capacity: 2-3 birds')}
                onMouseLeave={this.hideForestTooltip}
              >
                <rect x="50" y="180" width="8" height="60" fill="url(#trunkGrad)" rx="4" />
                <circle cx="54" cy="170" r="25" fill="url(#crown1)" opacity="0.8" />
              </g>
              
              {/* Tree 2 - Back center-left */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🌳 Medium Maple Tree\n📏 Height: 12m\n📊 Canopy Coverage: 25%\n🐦 Bird Capacity: 4-5 birds')}
                onMouseLeave={this.hideForestTooltip}
              >
                <rect x="150" y="190" width="10" height="50" fill="url(#trunkGrad)" rx="5" />
                <circle cx="155" cy="180" r="30" fill="url(#crown2)" opacity="0.8" />
              </g>
              
              {/* Tree 3 - Back center-right */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🌲 Medium Pine Tree\n📏 Height: 11m\n📊 Canopy Coverage: 22%\n🐦 Bird Capacity: 3-4 birds')}
                onMouseLeave={this.hideForestTooltip}
              >
                <rect x="280" y="185" width="9" height="55" fill="url(#trunkGrad)" rx="4" />
                <circle cx="285" cy="175" r="28" fill="url(#crown3)" opacity="0.8" />
              </g>
              
              {/* Tree 4 - Back right */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🌱 Young Birch Tree\n📏 Height: 7m\n📊 Canopy Coverage: 12%\n🐦 Bird Capacity: 1-2 birds')}
                onMouseLeave={this.hideForestTooltip}
              >
                <rect x="380" y="195" width="7" height="45" fill="url(#trunkGrad)" rx="3" />
                <circle cx="384" cy="185" r="22" fill="url(#crown1)" opacity="0.8" />
              </g>
            </g>
            
            {/* Middle row trees (overlapping) */}
            <g opacity="0.8" style={{filter: 'url(#treeShadow)'}}>
              {/* Tree 5 - Medium tree left */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🌳 Large Willow Tree\n📏 Height: 15m\n📊 Canopy Coverage: 35%\n🐦 Bird Capacity: 6-8 birds')}
                onMouseLeave={this.hideForestTooltip}
              >
                <rect x="80" y="160" width="12" height="80" fill="url(#trunkGrad)" rx="6" />
                <circle cx="86" cy="145" r="35" fill="url(#crown2)" />
                <circle cx="82" cy="150" r="25" fill="url(#crown1)" opacity="0.7" />
              </g>
              
              {/* Tree 6 - Large center tree */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🌲 Magnificent Cedar Tree\n📏 Height: 22m\n📊 Canopy Coverage: 55%\n🐦 Bird Capacity: 12-15 birds')}
                onMouseLeave={this.hideForestTooltip}
              >
                <rect x="200" y="140" width="15" height="100" fill="url(#trunkGrad)" rx="7" />
                <circle cx="208" cy="125" r="45" fill="url(#crown3)" />
                <circle cx="195" cy="135" r="30" fill="url(#crown2)" opacity="0.8" />
                <circle cx="220" cy="140" r="25" fill="url(#crown1)" opacity="0.6" />
              </g>
              
              {/* Tree 7 - Medium tree right */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🌳 Strong Eucalyptus Tree\n📏 Height: 16m\n📊 Canopy Coverage: 32%\n🐦 Bird Capacity: 5-7 birds')}
                onMouseLeave={this.hideForestTooltip}
              >
                <rect x="320" y="155" width="11" height="85" fill="url(#trunkGrad)" rx="5" />
                <circle cx="326" cy="140" r="32" fill="url(#crown1)" />
                <circle cx="335" cy="145" r="28" fill="url(#crown3)" opacity="0.7" />
              </g>
            </g>
            
            {/* Front row trees (largest, most prominent) */}
            <g style={{filter: 'url(#treeShadow)'}}>
              {/* Tree 8 - Tall tree left front */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🌲 Ancient Banyan Tree\n📏 Height: 25m\n📊 Canopy Coverage: 65%\n🐦 Bird Capacity: 18-22 birds')}
                onMouseLeave={this.hideForestTooltip}
              >
                <rect x="30" y="120" width="16" height="120" fill="url(#trunkGrad)" rx="8" />
                <circle cx="38" cy="100" r="40" fill="url(#crown2)" />
                <circle cx="45" cy="110" r="35" fill="url(#crown3)" opacity="0.8" />
                <circle cx="25" cy="115" r="30" fill="url(#crown1)" opacity="0.6" />
              </g>
              
              {/* Tree 9 - Giant center-front tree */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🏛️ Majestic Heritage Oak\n📏 Height: 30m\n📊 Canopy Coverage: 80%\n🐦 Bird Capacity: 25-30 birds')}
                onMouseLeave={this.hideForestTooltip}
              >
                <rect x="170" y="100" width="20" height="140" fill="url(#trunkGrad)" rx="10" />
                <circle cx="180" cy="80" r="50" fill="url(#crown1)" />
                <circle cx="165" cy="90" r="40" fill="url(#crown2)" opacity="0.9" />
                <circle cx="195" cy="95" r="35" fill="url(#crown3)" opacity="0.7" />
                <circle cx="180" cy="105" r="30" fill="url(#crown2)" opacity="0.5" />
              </g>
              
              {/* Tree 10 - Right front tree */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🌳 Robust Mahogany Tree\n📏 Height: 20m\n📊 Canopy Coverage: 45%\n🐦 Bird Capacity: 10-12 birds')}
                onMouseLeave={this.hideForestTooltip}
              >
                <rect x="350" y="130" width="14" height="110" fill="url(#trunkGrad)" rx="7" />
                <circle cx="357" cy="115" r="38" fill="url(#crown3)" />
                <circle cx="345" cy="125" r="32" fill="url(#crown1)" opacity="0.8" />
              </g>
              
              {/* Tree 11 - Far right small tree */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🌱 Growing Teak Sapling\n📏 Height: 10m\n📊 Canopy Coverage: 18%\n🐦 Bird Capacity: 3-4 birds')}
                onMouseLeave={this.hideForestTooltip}
              >
                <rect x="420" y="170" width="10" height="70" fill="url(#trunkGrad)" rx="5" />
                <circle cx="425" cy="160" r="25" fill="url(#crown2)" />
              </g>
            </g>
            
            {/* Sample birds on trees */}
            <g>
              {/* Bird on giant center tree */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🐦 Straw-headed Bulbul\n📍 Position: 26m height (87% of tree)\n🎵 Activity: Singing\n⏰ Time: 7:30 AM')}
                onMouseLeave={this.hideForestTooltip}
              >
                <circle cx="185" cy="90" r="4" fill="#FFD700" stroke="#DC143C" strokeWidth="1" />
                <text x="185" y="94" textAnchor="middle" fontSize="8" fill="#DC143C">🐦</text>
              </g>
              
              {/* Bird on left tall tree */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🐦 Straw-headed Bulbul\n📍 Position: 20m height (80% of tree)\n🍃 Activity: Foraging\n⏰ Time: 8:15 AM')}
                onMouseLeave={this.hideForestTooltip}
              >
                <circle cx="40" cy="115" r="3" fill="#FFD700" stroke="#DC143C" strokeWidth="1" />
                <text x="40" y="118" textAnchor="middle" fontSize="6" fill="#DC143C">🐦</text>
              </g>
              
              {/* Bird on right tree */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🐦 Straw-headed Bulbul\n📍 Position: 16m height (80% of tree)\n🪶 Activity: Preening\n⏰ Time: 9:00 AM')}
                onMouseLeave={this.hideForestTooltip}
              >
                <circle cx="360" cy="130" r="3" fill="#FFD700" stroke="#DC143C" strokeWidth="1" />
                <text x="360" y="133" textAnchor="middle" fontSize="6" fill="#DC143C">🐦</text>
              </g>
              
              {/* Flying birds */}
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🐦 Straw-headed Bulbul\n✈️ Status: Flying\n📍 Height: 15m above canopy\n🎯 Direction: Southeast')}
                onMouseLeave={this.hideForestTooltip}
              >
                <text x="250" y="60" textAnchor="middle" fontSize="12" fill="#DC143C" opacity="0.8">🐦</text>
              </g>
              <g 
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => this.showForestTooltip(e, '🐦 Straw-headed Bulbul\n✈️ Status: Flying\n📍 Height: 12m above canopy\n🎯 Direction: Northwest')}
                onMouseLeave={this.hideForestTooltip}
              >
                <text x="300" y="70" textAnchor="middle" fontSize="10" fill="#DC143C" opacity="0.6">🐦</text>
              </g>
            </g>
            
            {/* Ground/forest floor elements */}
            <g opacity="0.4">
              <ellipse cx="100" cy="240" rx="30" ry="8" fill="#654321" />
              <ellipse cx="200" cy="240" rx="40" ry="10" fill="#654321" />
              <ellipse cx="320" cy="240" rx="25" ry="6" fill="#654321" />
              <ellipse cx="380" cy="240" rx="35" ry="9" fill="#654321" />
            </g>
          </svg>
          )}
          
          <div style={{ 
            position: 'relative', 
            zIndex: 10, 
            marginTop: '20px',
            color: '#2D4A22',
            fontSize: '12px',
            fontStyle: 'italic',
            textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
          }}>
            Load your survey data to explore the forest canopy and bird positioning patterns
          </div>
          
          {/* Forest Tooltip */}
          {forestTooltip.visible && (
            <div style={{
              position: 'fixed',
              left: forestTooltip.x + 10,
              top: forestTooltip.y - 10,
              background: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #FFD700',
              fontSize: '12px',
              lineHeight: '1.5',
              whiteSpace: 'pre-line',
              zIndex: 1000,
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
              maxWidth: '220px',
              pointerEvents: 'none'
            }}>
              {forestTooltip.content}
            </div>
          )}
        </div>
      );
    }

    // Generate insights and statistics
    const validData = chartData.filter(d => {
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
      <div ref={this.containerRef} className="chart-container">
        {/* View Mode Buttons */}
        <div className="view-mode-controls">
          <button
            onClick={() => this.setViewMode('normal')}
            className={`view-mode-button ${viewMode === 'normal' ? 'active' : ''}`}
          >
            📏 Height View
          </button>
          <button
            onClick={() => this.setViewMode('percentage')}
            className={`view-mode-button ${viewMode === 'percentage' ? 'active' : ''}`}
          >
            📊 Percentage View
          </button>
          <button
            onClick={() => this.setViewMode('group')}
            className={`view-mode-button ${viewMode === 'group' ? 'active' : ''}`}
          >
            🌳 Group View
          </button>
        </div>

        {/* View Mode Instructions */}
        <div style={{
          backgroundColor: '#f8f9ff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
                   {viewMode === 'normal' && (
                       <div style={{ color: '#4A5568' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#2D4A22', fontSize: '16px' }}>📏 Height View Instructions</h4>
              <p style={{ margin: '0', fontSize: '14px' }}>
                This view shows individual trees with their exact heights.
              </p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                <strong>Hover over trees and birds</strong> to see detailed information including location, time, observer details, and measurements.
              </p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                <strong>Click on any tree</strong> to open a comprehensive analysis with tropical habitat assessment and conservation insights.
              </p>
            </div>
          )}
          {viewMode === 'percentage' && (
            <div style={{ color: '#4A5568' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#2D4A22', fontSize: '16px' }}>📊 Percentage View Instructions</h4>
              <p style={{ margin: '0', fontSize: '14px' }}>
                This view normalizes all trees to show bird positioning as percentages of tree height. 
              </p>
               <p style={{ margin: '0', fontSize: '14px' }}>
                Perfect for comparing <strong>relative bird behavior patterns</strong> across different tree sizes.
              </p>
               <p style={{ margin: '0', fontSize: '14px' }}>
                <strong>Hover over elements</strong> for detailed information and <strong>click trees</strong> for full analysis reports.
              </p>
            </div>
          )}
          {viewMode === 'group' && (
            <div style={{ color: '#4A5568' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#2D4A22', fontSize: '16px' }}>🌳 Group View Instructions</h4>
              <p style={{ margin: '0', fontSize: '14px' }}>
                Experience a <strong>realistic 3D tropical forest visualization</strong> with layered depth perception.
              </p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                Trees are positioned with natural overlapping in foreground, middle, and background layers.
              </p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                 <strong>Click on the forest scene</strong> to access detailed habitat analysis and conservation assessments for the entire observation area.
              </p>
            </div>
          )}
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

        {/* Additional Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '25px',
          gap: '15px'
        }}>
          <button
            onClick={this.toggleIndividualStats}
            style={{
              background: showIndividualStats ? '#EDF2F7' : '#6366F1',
              color: showIndividualStats ? '#4A5568' : 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            🌳 Tree Summary
          </button>
          <button
            onClick={this.toggleInsights}
            style={{
              background: showInsights ? '#EDF2F7' : '#6366F1',
              color: showInsights ? '#4A5568' : 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            📊 Insights
          </button>
        </div>

        {/* Statistics Panel */}
        {showIndividualStats && (
          <div style={{
            marginTop: '25px',
            padding: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ color: '#2d3748', fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
              🌳 Survey Summary
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
              padding: '15px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af' }}>
                  {insights.totalObservations}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Total Observations</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
                  {insights.avgBirdPosition.toFixed(0)}%
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Avg. Bird Position</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c2d12' }}>
                  {insights.avgTreeHeight.toFixed(1)}m
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Avg. Tree Height</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
                  {insights.highPositionBirds}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>High Position Birds</div>
              </div>
            </div>
          </div>
        )}

        {/* Insights Panel */}
        {showInsights && (
          <div style={{
            marginTop: '25px',
            padding: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ color: '#2d3748', fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
              📊 Survey Analysis & Insights
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                padding: '20px',
                backgroundColor: '#f0f9ff',
                borderRadius: '12px',
                border: '2px solid #e2e8f0'
              }}>
                <h5 style={{ color: '#2D4A22', marginBottom: '15px', fontSize: '18px' }}>🌲 Tree Height Distribution</h5>
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
                </div>
              </div>
              <div style={{
                padding: '20px',
                backgroundColor: '#fef3c7',
                borderRadius: '12px',
                border: '2px solid #e2e8f0'
              }}>
                <h5 style={{ color: '#2D4A22', marginBottom: '15px', fontSize: '18px' }}>🐦 Bird Positioning Patterns</h5>
                <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#4a5568' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>High Position Birds:</strong> {insights.highPositionBirds} ({((insights.highPositionBirds / insights.totalObservations) * 100).toFixed(1)}%)
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Preferred Height:</strong> {insights.avgBirdPosition < 50 ? 'Lower canopy' : insights.avgBirdPosition < 75 ? 'Mid canopy' : 'Upper canopy'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tree Analysis Modal */}
        {treeAnalysisModal.visible && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 3000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              border: '3px solid #228B22',
              position: 'relative'
            }}>
              {/* Close button */}
              <button
                onClick={this.closeTreeAnalysisModal}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '15px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                ×
              </button>

              {/* Modal content */}
              {treeAnalysisModal.tree && (() => {
                const tree = treeAnalysisModal.tree;
                const index = treeAnalysisModal.index;
                const birdPositionPercent = Math.round((tree.originalBirdHeight ? tree.originalBirdHeight : tree['Height of bird/m']) / (tree.originalTreeHeight ? tree.originalTreeHeight : tree['Height of tree/m']) * 100);
                
                const timeInfo = tree.Time || tree['Time '] || '';
                const formattedTime = this.formatTime24h(timeInfo);
                const treeHeightValue = tree.originalTreeHeight || tree['Height of tree/m'] || 'N/A';
                const birdHeightValue = tree.originalBirdHeight || tree['Height of bird/m'] || 'N/A';
                
                return (
                  <div>
                    <h2 style={{ 
                      color: '#2D4A22', 
                      marginBottom: '25px', 
                      borderBottom: '3px solid #228B22', 
                      paddingBottom: '15px',
                      textAlign: 'center',
                      fontSize: '24px'
                    }}>
                      🌴 Tropical Tree Analysis - Tree #{index + 1}
                    </h2>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '25px', 
                      marginBottom: '25px' 
                    }}>
                      <div style={{ 
                        padding: '20px', 
                        backgroundColor: '#f0f9ff', 
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                      }}>
                        <h3 style={{ color: '#2D4A22', marginBottom: '15px', fontSize: '18px' }}>📍 Location & Observation Time</h3>
                        <p style={{ marginBottom: '10px' }}><strong>Location:</strong> {tree.Location || 'Not specified'}</p>
                        <p style={{ marginBottom: '10px' }}><strong>Date:</strong> {tree.Date || 'Not recorded'}</p>
                        <p style={{ marginBottom: '10px' }}><strong>Time (24h):</strong> <span style={{ color: '#1e40af', fontWeight: 'bold' }}>{formattedTime}</span></p>
                        <p style={{ marginBottom: '10px' }}><strong>Observer:</strong> {tree['Observer name'] || tree.Observer || 'Anonymous'}</p>
                        {tree["Weather"] && tree["Weather"] !== 'Not recorded' && (
                          <p style={{ marginBottom: '10px' }}><strong>Weather:</strong> {tree["Weather"]}</p>
                        )}
                      </div>
                      
                      <div style={{ 
                        padding: '20px', 
                        backgroundColor: '#fef3c7', 
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                      }}>
                        <h3 style={{ color: '#2D4A22', marginBottom: '15px', fontSize: '18px' }}>📏 Physical Measurements</h3>
                        <p style={{ marginBottom: '10px' }}><strong>Tree Height:</strong> {treeHeightValue} m</p>
                        <p style={{ marginBottom: '10px' }}><strong>Bird Height:</strong> {birdHeightValue} m</p>
                        <p style={{ marginBottom: '10px' }}><strong>Position in Tree:</strong> {birdPositionPercent}%</p>
                      </div>
                    </div>
                    
                    {/* Detailed analysis content */}
                    <div style={{ 
                      padding: '20px', 
                      backgroundColor: '#ffffff', 
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                      marginTop: '15px'
                    }}>
                      <h3 style={{ color: '#2D4A22', marginBottom: '15px', fontSize: '18px', borderBottom: '2px solid #228B22', paddingBottom: '10px' }}>
                        🌱 Tree and Habitat Analysis
                      </h3>
                      <p style={{ marginBottom: '10px', lineHeight: '1.6' }}>
                        This tree is part of the tropical rainforest ecosystem, providing essential habitat and resources for the Straw-headed Bulbul and other species. The tree's height and the bird's position indicate a healthy, mature tree that supports avian life.
                      </p>
                      <p style={{ marginBottom: '10px', lineHeight: '1.6' }}>
                        <strong>Conservation Notes:</strong> Protecting such trees is crucial for maintaining biodiversity. Consider measures like habitat preservation, pollution reduction, and climate action to support these ecosystems.
                      </p>
                      <p style={{ marginBottom: '10px', lineHeight: '1.6' }}>
                        <strong>Further Research:</strong> Ongoing monitoring of tree health and bird populations will provide data for adaptive management. Engage in or support local conservation efforts to contribute to habitat protection.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default D3TreeHeightChart;