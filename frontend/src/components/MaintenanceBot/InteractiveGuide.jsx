import React, { Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../css/components/MaintenanceBot/InteractiveGuide.css';

// Guide steps configuration for different pages/sections
const guideStepsConfig = {
  home: [
    {
      target: '.hero-cta',
      title: 'Navigation Buttons',
      content: 'Use these buttons to quickly navigate to the Dashboard, Survey Events, Settings, or Logout.',
      position: 'bottom'
    },
    {
      target: '.features-section',
      title: 'Feature Cards',
      content: 'These cards provide quick access to the main features: Interactive Dashboard, Survey System, and Telegram Settings.',
      position: 'top'
    },
    {
      target: '.gallery-wrapper',
      title: 'Media Gallery',
      content: 'Browse uploaded images and videos from surveys here. Click on any media card to open the options popup with "View Full Screen" to see the media in full size, or "Delete" to remove it.',
      position: 'top'
    },
    {
      target: '.gallery-filter-buttons',
      title: 'Media Filter',
      content: 'Filter the gallery by media type. Click "All" to see everything, "Photos" for images only, or "Videos" for video files only.',
      position: 'bottom'
    },
    {
      target: '.gallery-action-buttons',
      title: 'Gallery Controls',
      content: 'Use these buttons to select, deselect, and manage your gallery items.',
      position: 'bottom'
    },
    {
      target: '.info-section',
      title: 'About the Project',
      content: 'Learn more about the Straw-headed Bulbul conservation efforts and view platform statistics.',
      position: 'top'
    }
  ],
  dashboard: {
    overview: [
      {
        target: '.filters-section',
        title: 'Filter Data',
        content: 'Use these filters to narrow down the data:\n\n• Location - Filter by specific survey location\n• Activity - Filter by Seen, Heard, or Not Found\n• Search - Find specific records by keyword\n\n💡 Tip: Filters apply to all tabs and update data in real-time.',
        position: 'bottom'
      },
      {
        target: '.dashboard-tabs',
        title: 'Dashboard Tabs',
        content: 'Switch between four different views:\n\n📊 Overview - Key statistics and summary cards\n📈 Data Visualizations - Charts and analytics\n🗺️ Map View - Geographic observation map\n📋 Data Table - Detailed survey records',
        position: 'bottom'
      },
      {
        target: '.section-header',
        title: 'Key Statistics Overview',
        content: 'This section shows key statistics at a glance.\n\n💡 Tip: Click "View All" to expand and see more detailed statistics.',
        position: 'bottom'
      },
      {
        target: '.stats-grid',
        title: 'Statistics Cards',
        content: 'Each card shows important metrics:\n\n📋 Number of Surveys - Total data points and success rate\n🐦 Total Birds Counted - Breakdown of seen vs heard\n📍 Location Coverage - Unique locations surveyed\n\n💡 Tip: Click on any card to expand and see detailed breakdown with insights.',
        position: 'top'
      },
      {
        target: '.view-all-btn',
        title: 'View All Statistics',
        content: 'Click this button to expand the statistics section and see additional metrics like:\n\n• Most Active Location\n• Average Birds per Day\n• Survey Period dates',
        position: 'left'
      }
    ],
    visualization: [
      {
        target: '.filters-section',
        title: 'Filter Your Visualizations',
        content: 'Apply filters to customize the chart data. Select a specific location, activity type, or search for specific records. The charts will update in real-time.',
        position: 'bottom'
      },
      {
        target: '.dashboard-tabs',
        title: 'Dashboard Tabs',
        content: 'You are currently on Data Visualizations. Switch tabs to see Overview (statistics), Map View (geographic data), or Data Table (records).',
        position: 'bottom'
      },
      {
        target: '.charts-subtabs, .subtabs-container',
        title: 'Analytics Sub-tabs',
        content: 'Switch between two analytics views using these buttons:\n\n📊 Population Analytics - Shows observation trends over time (line chart) and distribution by location (pie chart).\n\n🌲 Habitat Analytics - Displays tree distribution analysis with height and species data.\n\n💡 Tip: Click on either button to switch views. The current active tab is highlighted.',
        position: 'bottom'
      },
      // Population Analytics steps
      {
        target: '[aria-label="Observations Over Time Chart"]',
        title: '📊 Observations Over Time (Monthly)',
        content: 'This section shows a line chart tracking bird observations over time, with a detailed statistics table below.',
        position: 'bottom'
      },
      {
        target: '.date-line-chart .chart-button.primary',
        title: 'Generate Report - Line Chart',
        content: 'Click "Generate Report" to create a downloadable summary of observation trends over time.\n\nThe report includes:\n• Monthly observation counts\n• Trend analysis\n• Date range covered\n\n💡 Tip: Great for presentations and record-keeping.',
        position: 'bottom'
      },
      {
        target: '.date-line-chart .line-chart-container',
        title: '📈 Line Chart Graph',
        content: 'This interactive line chart visualizes observation trends:\n\n📊 X-Axis - Shows months/dates\n📊 Y-Axis - Shows observation count\n📈 Line - Tracks bird observations over time\n\n🎯 Key Features:\n• Data points show exact counts for each period\n• Trend line helps identify patterns\n• Colors match the legend\n\n💡 Tip: Hover over any data point to see the exact count and date.',
        position: 'top'
      },
      {
        target: '.date-line-chart .statistics-container',
        title: 'Monthly Statistics Table',
        content: 'Detailed breakdown of observations by month:\n\n• Total row shows the aggregate count (107 total)\n• Each month row shows individual counts (e.g., Dec 2024: 12, Jan 2025: 5, Feb 2025: 18)\n• Color-coded entries match the chart colors\n\n💡 Tip: Hover over any row to see more details. Click on any row to expand and see the full Seen/Heard/Not Found breakdown for that month.',
        position: 'top'
      },
      {
        target: '[aria-label="Bird Distribution Analysis Chart"]',
        title: '🐦 Observation Distribution',
        content: 'This section shows a pie chart displaying how observations are distributed across survey locations, with a detailed statistics table below.',
        position: 'bottom'
      },
      {
        target: '.location-stats .chart-button.primary',
        title: 'Generate Report - Pie Chart',
        content: 'Click "Generate Report" to create a downloadable summary of location distribution data. The report includes location breakdowns and percentages.',
        position: 'bottom'
      },
      {
        target: '.location-stats .pie-chart-container',
        title: 'Pie Chart Graph',
        content: 'This pie chart shows observation distribution by location:\n\n🥧 Each slice represents a different survey location\n📏 Slice size is proportional to observation count\n🏷️ Labels show location name and percentage\n\nTop locations visible:\n• 🔴 Bukit Batok Nature Park - 24.30% (largest)\n• 🔵 Various parks and reserves\n\n💡 Tip: Hover over any slice to see detailed breakdown (Seen, Heard, Not Found) for that location.',
        position: 'left'
      },
      {
        target: '.location-stats .statistics-container',
        title: 'Location Statistics Table',
        content: 'Detailed breakdown of observations by location:\n\n• Total row shows 107 (100.00%)\n• Bukit Batok Nature Park: 26 (24.30%) - highest\n• SBG: 1 (0.93%)\n• Rifles Range Nature Park: 5 (4.67%)\n• Sungei Buloh Wetland Reserve: 4 (3.74%)\n\n💡 Tip: Click on any location row to expand and see the Seen/Heard/Not Found breakdown.',
        position: 'top'
      },
      // Habitat Analytics steps
      {
        target: '.tree-distribution-subtab',
        title: '🌲 Habitat Analytics',
        content: 'This section visualizes tree distribution and bird habitat patterns. It shows where Straw-headed Bulbuls are observed relative to tree heights.',
        position: 'bottom'
      },
      {
        target: '.view-mode-controls',
        title: 'View Mode Buttons',
        content: 'Switch between two visualization modes:\n\n📏 Height View - Shows individual trees with exact heights in meters (0-26m). Birds are positioned at their observed heights.\n\n📊 Percentage View - Normalizes all trees to show bird positioning as percentages (0-100%). Great for comparing relative positions.\n\n💡 Tip: Click any button to switch views. The active view is highlighted.',
        position: 'bottom'
      },
      {
        target: '.tree-height-chart-svg',
        title: '📏 Height View Chart',
        content: 'Currently showing Height View:\n\n🌳 Trees - Each tree displays at its actual recorded height in meters (0-26m).\n\n🐦 Birds - Positioned at the exact height where they were observed.\n\n📊 Y-Axis - Shows height in meters (m)\n📍 X-Axis - Individual trees (Tree 1, Tree 2, etc.)\n\n🎨 Background layers:\n• Floor (0-1m) - Ground level\n• Shrub (1-5m) - Low vegetation\n• Understory (5-15m) - Mid canopy\n• Canopy (15m+) - Upper forest\n\n💡 Tip: Hover over any tree to see location, date, time, observer name, and measurements. Click on a tree for full analysis.',
        position: 'top'
      },
      {
        target: '.percentage-height-chart-svg',
        title: '📊 Percentage View Chart',
        content: 'Currently showing Percentage View:\n\n🌳 Trees - All trees normalized to the same height for easy comparison.\n\n🐦 Birds - Positioned as a percentage (0-100%) of tree height.\n\n📊 Y-Axis - Shows height as percentage (%)\n📍 X-Axis - Individual trees (Tree 1, Tree 2, etc.)\n\nThis view helps compare bird positioning patterns across different tree sizes - birds at 80% are always in the upper canopy regardless of actual tree height.\n\n💡 Tip: Hover over any tree to see location, date, time, observer name, and measurements. Click on a tree for full analysis.',
        position: 'top'
      }
    ],
    mapView: [
      {
        target: '.filters-section',
        title: 'Filter Map Data',
        content: 'Use these filters to narrow down the locations shown on the map. Filter by location, activity type, or search for specific records.',
        position: 'bottom'
      },
      {
        target: '.dashboard-tabs',
        title: 'Dashboard Tabs',
        content: 'You are currently on Map View. Switch tabs to see Overview (statistics), Data Visualizations (charts), or Data Table (records).',
        position: 'bottom'
      },
      {
        target: '.map-header',
        title: '🗺️ Live Observation Map',
        content: 'This is the interactive map showing all survey observation locations in real-time.',
        position: 'bottom'
      },
      {
        target: '.map-sections',
        title: 'Map Information Panels',
        content: 'Three information panels showing:\n\n🗺️ Map Overview - Current map type and zoom level\n📊 Data Overview - Total observations with percentage breakdown\n🎨 Legend - Color coding for Seen (green), Heard (orange), Not Found (red)',
        position: 'bottom'
      },
      {
        target: '.map-overview',
        title: 'Map Overview',
        content: 'Shows the current map settings:\n\n• Map Type (Satellite, Hybrid, Terrain)\n• Current Zoom Level\n\n💡 Tip: Use map controls to change these settings.',
        position: 'bottom'
      },
      {
        target: '.data-overview',
        title: 'Data Overview',
        content: 'Summary of observation statistics:\n\n• Total Observations\n• Total Seen with percentage\n• Total Heard with percentage\n• Not Found with percentage',
        position: 'bottom'
      },
      {
        target: '.map-legend',
        title: 'Map Legend',
        content: 'Marker colors on the map:\n\n🟢 Green - Birds were Seen\n🟠 Orange - Birds were Heard\n🔴 Red - Not Found\n\n💡 Tip: Click on any marker to see detailed observation info.',
        position: 'bottom'
      },
      {
        target: '.single-layer-map',
        title: 'Interactive Map',
        content: 'The Google Maps view showing all survey locations:\n\n• Zoom in/out using scroll or +/- buttons\n• Click markers to see observation details\n• Pan by clicking and dragging\n• Switch map type using map controls\n\n💡 Tip: Markers are color-coded based on the legend above.',
        position: 'top'
      }
    ],
    dataTable: [
      {
        target: '.filters-section',
        title: 'Filter Table Data',
        content: 'Use these filters to narrow down the records shown in the data table. All columns will reflect the filtered data.',
        position: 'bottom'
      },
      {
        target: '.dashboard-tabs',
        title: 'Dashboard Tabs',
        content: 'You are currently on Data Table. Switch tabs to see Overview (statistics), Data Visualizations (charts), or Map View (geographic data).',
        position: 'bottom'
      },
      {
        target: '.section-header',
        title: '📊 Observation Data',
        content: 'This section displays all survey observation records in a tabular format for easy browsing and analysis.',
        position: 'bottom'
      },
      {
        target: '.view-toggle-container',
        title: 'View Toggle',
        content: 'Switch between two table views:\n\n📋 Table View - Standard row-by-row data display\n📊 Pivot View - Aggregated data with grouping and summaries\n\n💡 Tip: Pivot view is great for analyzing patterns across locations or time periods.',
        position: 'bottom'
      },
      {
        target: '.table-container',
        title: 'Data Table',
        content: 'Browse all survey records:\n\n• Click column headers to sort data\n• Scroll horizontally to see all columns\n• Scroll vertically to browse all records\n• Each row represents one observation\n\n✏️ Edit & Delete:\n• Click on any cell to edit its value directly\n• Each row has a Delete button on the right to remove the record\n\n💡 Tip: Use filters above to narrow down the displayed data.',
        position: 'top'
      },
      {
        target: '.pivot-table-container',
        title: 'Interactive Pivot Table',
        content: 'Powerful data analysis with drag-and-drop grouping:\n\n🔧 How to Use:\n• Drag fields from the top area into "Rows" or "Columns"\n• Data automatically groups and aggregates\n• Use the dropdown to change aggregation (Count, Sum, Average)\n\n📊 Analysis Tips:\n• Drag "Location" to Rows to see counts by area\n• Drag "Species" to Columns for cross-tabulation\n• Combine multiple fields for deeper analysis\n\n🔄 Renderers:\n• Table - Standard pivot table\n• Table Heatmap - Color-coded values\n• Charts - Visual representations\n\n💡 Tip: Click on any aggregated value to see underlying records.',
        position: 'top'
      }
    ]
  },
  surveyEvents: {
    upcoming: [
      {
        target: '.upcoming-organizer-sections',
        conditionalTarget: '.upcoming-event-card',
        title: '🏢 Event Sections',
        content: 'Events are organized into sections based on organizer:\n\n🟢 WWF-led - Official WWF-organized survey walks\n🔵 Volunteer-led - Community-organized survey events\n\nEach section displays its events in a grid layout.\n\n💡 Tip: Scroll down to see all sections.',
        position: 'top'
      },
      {
        target: '.organizer-section',
        conditionalTarget: '.upcoming-event-card',
        title: '📊 Organizer Section',
        content: 'Each organizer section contains:\n\n• Section Title - Shows organizer type (WWF-led or Volunteer-led)\n• Event Grid - Cards for each scheduled event\n\n💡 Tip: If no events are scheduled, the section will show empty.',
        position: 'top'
      },
      {
        target: '.upcoming-organizer-sections',
        title: '🏷️ Section Headers',
        content: 'Events are organized by organizer type with color-coded headers:\n\n🟢 Green header - WWF-led events (official WWF-organized survey walks)\n🔵 Blue header - Volunteer-led events (community-organized surveys)\n\nBoth sections are displayed side by side for easy comparison.\n\n💡 Tip: This helps quickly identify who is organizing each survey walk.',
        position: 'top'
      },
      {
        target: '.upcoming-organizer-sections',
        title: '📊 Events Grid',
        content: 'Events are displayed in a responsive grid layout within each section.\n\n🟢 WWF-led grid - Shows official survey walk events\n🔵 Volunteer-led grid - Shows community events\n\nEach card shows:\n• 📍 Location\n• 📅 Date\n• ⏰ Time\n• 👥 Participants\n\n💡 Tip: Click on any card to see more details or take actions.',
        position: 'top'
      },
      {
        target: '.upcoming-event-card',
        title: '📋 Event Card',
        content: 'Each event card displays key information:\n\n📍 Location - Where the survey will take place\n📅 Date - The scheduled date\n⏰ Time - Start and end time\n👥 Participants - Who has signed up\n\n🔧 Actions:\n• Click the card title to expand/collapse details\n• Edit button - Modify event details\n• Join button - Sign up to participate\n• Delete button - Remove the event (admin only)',
        position: 'top'
      }
    ],
    past: [
      {
        target: '.past-events-container',
        title: '📜 Past Events Overview',
        content: 'Welcome to the Past Events view!\n\nHere you can browse all completed survey walks, review participation records, and analyze historical data.\n\nPast events are organized by year and month for easy navigation.',
        position: 'bottom'
      },
      {
        target: '.year-selection-buttons',
        title: '📅 Year Selection',
        content: 'These are the year filter buttons:\n\n🔵 Blue buttons show available years (2024, 2025, etc.)\n📌 Click a year to filter events from that year\n✓ The selected year has a filled blue background\n\n💡 Tip: Years are sorted from oldest to newest.',
        position: 'bottom'
      },
      {
        target: '.month-selection-buttons',
        conditionalTarget: '.month-selection-buttons',
        title: '📆 Month Selection',
        content: 'After selecting a year, these month buttons appear:\n\n🟢 Green buttons show months with events\n📌 Click a month to view events from that period\n✓ The selected month has a filled green background\n\n💡 Tip: Only months containing events are displayed.',
        position: 'bottom'
      },
      {
        target: '.view-mode-toggle-buttons',
        conditionalTarget: '.view-mode-toggle-buttons',
        title: '📋 View Toggle Buttons',
        content: 'Use these buttons to switch between views:\n\n📋 List View - Shows events in card format organized by organizer type\n\n📅 Calendar View - Shows events in a monthly calendar grid\n\nThe active view button is highlighted.\n\n💡 Tip: Click either button to switch between views.',
        position: 'bottom'
      },
      {
        target: '.calendar-legend',
        conditionalTarget: '.calendar-legend',
        title: '📊 Calendar Legend',
        content: 'This legend explains the color coding used in the calendar:\n\n🟢 WWF-led - Official WWF-organized survey walks\n🔵 Volunteer-led - Community-organized events\n🔴 Other - Other organizers\n✓ You\'re participating - Events you attended\n\nThis helps quickly identify event types at a glance.',
        position: 'bottom'
      },
      {
        target: '.calendar-days-grid',
        conditionalTarget: '.calendar-days-grid',
        title: '📅 Calendar Grid',
        content: 'This calendar grid displays events on their scheduled dates:\n\n🟢 Green badges - WWF-led survey walks\n🔵 Blue badges - Volunteer-led events\n🔴 Red badges - Other organizers\n\n📆 Each cell represents a day of the month\n📌 Event badges appear on days with scheduled walks\n\n💡 Tip: Click on any day with events to see full details.',
        position: 'top'
      },
      {
        target: '.list-view-container',
        conditionalTarget: '.list-view-container',
        title: '🏢 List View Display',
        content: 'This is the List View with events organized by sections:\n\n🟢 WWF-led Section - Green header with official events\n🔵 Volunteer-led Section - Blue header with community events\n\nEach event card shows:\n• 📍 Location\n• 📅 Date\n• ⏰ Time\n• 👥 Participants who attended\n\n💡 Tip: Past events are read-only for historical reference.',
        position: 'top'
      }
    ]
  },
  settings: {
    createBot: [
      {
        target: '.settings-tabs-container',
        title: '📑 Settings Tabs',
        content: 'Switch between different settings sections:\n\n📱 Create Telegram Bot - Set up a new bot\n🤖 Bot Details - View and manage existing bots\n\n💡 Tip: Click on a tab to switch views.',
        position: 'bottom'
      },
      {
        target: '.telegram-bot-tab',
        conditionalTarget: '.telegram-bot-tab',
        title: '📱 Create Telegram Bot',
        content: 'This form allows you to register a new Telegram bot:\n\n1️⃣ Create a bot using @BotFather in Telegram\n2️⃣ Copy the bot token provided\n3️⃣ Paste the token here - name and description auto-fill\n4️⃣ Click "Register Bot" to complete setup\n\n🔒 Your token is securely stored and never displayed after registration.',
        position: 'top'
      }
    ],
    botDetails: [
      {
        target: '.settings-tabs-container',
        title: '📑 Settings Tabs',
        content: 'Switch between different settings sections:\n\n📱 Create Telegram Bot - Set up a new bot\n🤖 Bot Details - View and manage existing bots\n\n💡 Tip: Click on a tab to switch views.',
        position: 'bottom'
      },
      {
        target: '.bot-selector',
        conditionalTarget: '.bot-selector',
        title: '🤖 Bot Selector',
        content: 'Select a registered bot from the dropdown to view its details:\n\n• Bot name and status\n• Connected groups/channels\n• Chat history and messages\n\n💡 Tip: If no bots appear, create one first using the "Create Telegram Bot" tab.',
        position: 'bottom'
      },
      {
        target: '.bot-chat-tabs-buttons',
        conditionalTarget: '.bot-chat-tabs-buttons',
        title: '📋 Groups & Chats Tabs',
        content: 'Switch between different views for this bot:\n\n👥 Groups/Users - View all groups and channels where this bot is a member\n💬 Chats - View message history from groups\n\n💡 Tip: Click on a tab to switch views.',
        position: 'bottom'
      },
      {
        target: '.groups-users-section',
        conditionalTarget: '.groups-users-section',
        title: '👥 Groups & Users',
        content: 'View all groups and channels where this bot is a member:\n\n• Group name and type\n• Click on a group to view its chat history\n• Bot permissions in each group\n\n💡 Tip: Add the bot to a Telegram group to see it listed here.',
        position: 'top'
      },
      {
        target: '.chats-section',
        conditionalTarget: '.chats-section',
        title: '💬 Chat Messages',
        content: 'View message history from the selected group:\n\n• Messages organized by date\n• User interactions with the bot\n• Bot responses and commands\n\n💡 Tip: Select a group from the Groups/Users tab to load its messages.',
        position: 'top'
      }
    ]
  }
};

class InteractiveGuide extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentStep: 0,
      targetRect: null,
      targetElement: null,
      steps: []
    };
    this.spotlightRef = React.createRef();
    this.updateRectRAF = null;
  }

  componentDidMount() {
    this.loadStepsForCurrentPage();
    // Add scroll/resize listeners
    window.addEventListener('scroll', this.handleScrollResize, true);
    window.addEventListener('resize', this.handleScrollResize);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.currentPage !== this.props.currentPage || 
        prevProps.activeDashboardTab !== this.props.activeDashboardTab ||
        prevProps.activeEventsTab !== this.props.activeEventsTab ||
        prevProps.activeSettingsTab !== this.props.activeSettingsTab) {
      this.loadStepsForCurrentPage();
    }
    
    if (prevProps.isOpen !== this.props.isOpen) {
      if (this.props.isOpen) {
        // Add click blocker when guide opens
        document.addEventListener('click', this.blockClicks, true);
        document.addEventListener('mousedown', this.blockClicks, true);
        this.setState({ currentStep: 0 }, () => {
          this.loadStepsForCurrentPage();
          this.highlightCurrentTarget();
        });
      } else {
        // Remove click blocker when guide closes
        document.removeEventListener('click', this.blockClicks, true);
        document.removeEventListener('mousedown', this.blockClicks, true);
      }
    }
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.handleScrollResize, true);
    window.removeEventListener('resize', this.handleScrollResize);
    document.removeEventListener('click', this.blockClicks, true);
    document.removeEventListener('mousedown', this.blockClicks, true);
    if (this.updateRectRAF) {
      cancelAnimationFrame(this.updateRectRAF);
    }
  }

  blockClicks = (e) => {
    // Allow clicks on the tooltip (guide controls)
    const tooltip = document.querySelector('[data-guide-tooltip]');
    if (tooltip && tooltip.contains(e.target)) {
      return; // Allow tooltip clicks
    }
    // Block all other clicks
    e.stopPropagation();
    e.preventDefault();
  }

  handleScrollResize = () => {
    // Use requestAnimationFrame for smooth updates
    if (this.updateRectRAF) {
      cancelAnimationFrame(this.updateRectRAF);
    }
    this.updateRectRAF = requestAnimationFrame(() => {
      if (this.props.isOpen && this.state.targetElement) {
        const rawRect = this.state.targetElement.getBoundingClientRect();
        const clampedRect = this.clampRectToViewport(rawRect);
        this.setState({ targetRect: clampedRect });
      }
    });
  }

  clampRectToViewport = (rawRect) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 20;
    
    // Calculate visible portion of the element
    const clampedRect = {
      top: Math.max(padding, rawRect.top),
      left: Math.max(padding, rawRect.left),
      bottom: Math.min(viewportHeight - padding, rawRect.bottom),
      right: Math.min(viewportWidth - padding, rawRect.right),
    };
    
    // Calculate width and height from clamped values
    clampedRect.width = clampedRect.right - clampedRect.left;
    clampedRect.height = clampedRect.bottom - clampedRect.top;
    
    // Only use clamped rect if it's valid (positive dimensions)
    if (clampedRect.width > 50 && clampedRect.height > 50) {
      return clampedRect;
    }
    // Fallback to original rect if clamping made it too small
    return rawRect;
  }

  loadStepsForCurrentPage = () => {
    const { currentPage, activeDashboardTab, activeEventsTab, activeSettingsTab } = this.props;
    let allSteps = [];

    if (currentPage === 'dashboard' && guideStepsConfig.dashboard[activeDashboardTab]) {
      allSteps = guideStepsConfig.dashboard[activeDashboardTab];
    } else if (currentPage === 'surveyEvents' && guideStepsConfig.surveyEvents) {
      // Handle surveyEvents with tabs (upcoming/past)
      const eventsTabKey = (activeEventsTab || 'Upcoming').toLowerCase();
      if (guideStepsConfig.surveyEvents[eventsTabKey]) {
        allSteps = guideStepsConfig.surveyEvents[eventsTabKey];
      } else {
        // Fallback to upcoming if tab not found
        allSteps = guideStepsConfig.surveyEvents.upcoming || [];
      }
    } else if (currentPage === 'settings' && guideStepsConfig.settings) {
      // Handle settings with tabs (createBot/botDetails)
      const settingsTabKey = activeSettingsTab || 'createBot';
      if (guideStepsConfig.settings[settingsTabKey]) {
        allSteps = guideStepsConfig.settings[settingsTabKey];
      } else {
        // Fallback to createBot if tab not found
        allSteps = guideStepsConfig.settings.createBot || [];
      }
    } else if (guideStepsConfig[currentPage]) {
      allSteps = Array.isArray(guideStepsConfig[currentPage]) 
        ? guideStepsConfig[currentPage] 
        : guideStepsConfig[currentPage].default || [];
    }

    // Filter steps to only include those with visible target elements
    const visibleSteps = allSteps.filter(step => {
      if (!step.target) return true; // Keep steps without targets (welcome messages)
      
      // Check conditionalTarget first - if specified, it must exist for the step to show
      if (step.conditionalTarget) {
        try {
          const conditionalElement = document.querySelector(step.conditionalTarget);
          if (!conditionalElement) {
            return false; // Conditional element doesn't exist, skip this step
          }
          const condRect = conditionalElement.getBoundingClientRect();
          if (condRect.width <= 0 || condRect.height <= 0) {
            return false; // Conditional element not visible, skip this step
          }
        } catch (e) {
          console.log('Invalid conditional selector:', step.conditionalTarget);
          return false;
        }
      }
      
      // Try multiple selectors (comma-separated)
      const selectors = step.target.split(',').map(s => s.trim());
      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            // Check if element is actually rendered (has dimensions)
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return true;
            }
          }
        } catch (e) {
          console.log('Invalid selector:', selector);
        }
      }
      return false;
    });

    // Use filtered steps, or default if none found
    let steps = visibleSteps.length > 0 ? visibleSteps : [{
      target: null,
      title: `Welcome to ${this.getPageTitle()}`,
      content: 'Click Next to learn about the features on this page, or Skip to close.',
      position: 'center'
    }];

    this.setState({ steps, currentStep: 0 }, this.highlightCurrentTarget);
  }

  getPageTitle = () => {
    const { currentPage, activeDashboardTab, activeEventsTab } = this.props;
    const titles = {
      home: 'Home',
      dashboard: activeDashboardTab === 'dataTable' ? 'Data Table' : 
                 activeDashboardTab === 'visualization' ? 'Visualization' : 'Dashboard',
      surveyEvents: activeEventsTab === 'Past' ? 'Past Survey Events' : 'Upcoming Survey Events',
      settings: 'Settings'
    };
    return titles[currentPage] || 'This Page';
  }

  highlightCurrentTarget = () => {
    const { steps, currentStep } = this.state;
    if (!steps[currentStep]) return;

    const target = steps[currentStep].target;
    if (!target) {
      this.setState({ targetRect: null, targetElement: null });
      return;
    }

    // Try multiple selectors (comma-separated)
    const selectors = target.split(',').map(s => s.trim());
    let element = null;
    
    for (const selector of selectors) {
      try {
        element = document.querySelector(selector);
        if (element) break;
      } catch (e) {
        console.log('Invalid selector:', selector);
      }
    }

    if (element) {
      // First set the element immediately so we can track it
      this.setState({ targetElement: element });
      
      // Scroll element into view
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center'
      });
      
      // Wait for scroll to complete, then get the rect
      setTimeout(() => {
        const rawRect = element.getBoundingClientRect();
        // Verify the element is actually visible on screen
        if (rawRect.width > 0 && rawRect.height > 0) {
          const clampedRect = this.clampRectToViewport(rawRect);
          this.setState({ targetRect: clampedRect });
        } else {
          console.log('Element not visible, checking...', element);
          this.setState({ targetRect: null });
        }
      }, 600);
    } else {
      console.log('Element not found for selector:', target);
      this.setState({ targetRect: null, targetElement: null });
    }
  }

  handleNext = () => {
    const { steps, currentStep } = this.state;
    if (currentStep < steps.length - 1) {
      this.setState({ currentStep: currentStep + 1 }, this.highlightCurrentTarget);
    } else {
      this.props.onClose();
    }
  }

  handlePrevious = () => {
    const { currentStep } = this.state;
    if (currentStep > 0) {
      this.setState({ currentStep: currentStep - 1 }, this.highlightCurrentTarget);
    }
  }

  handleSkip = () => {
    this.props.onClose();
  }

  getTooltipPosition = () => {
    const { targetRect } = this.state;
    
    const tooltipWidth = 380;
    const tooltipHeight = 450;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 20;

    // If no target, center on screen
    if (!targetRect) {
      return {
        top: viewportHeight / 2 - tooltipHeight / 2,
        left: viewportWidth / 2 - tooltipWidth / 2,
        arrowPosition: 'none'
      };
    }

    // Calculate center of the target
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    // Calculate available space
    const spaceBelow = viewportHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    let top, left, arrowPosition;

    // Prefer below, then above
    if (spaceBelow >= tooltipHeight + padding + 30) {
      // Position below target
      top = targetRect.bottom + padding;
      left = Math.max(padding, Math.min(targetCenterX - tooltipWidth / 2, viewportWidth - tooltipWidth - padding));
      arrowPosition = 'top';
    } else if (spaceAbove >= tooltipHeight + padding + 30) {
      // Position above target
      top = targetRect.top - tooltipHeight - padding;
      left = Math.max(padding, Math.min(targetCenterX - tooltipWidth / 2, viewportWidth - tooltipWidth - padding));
      arrowPosition = 'bottom';
    } else {
      // Not enough space, position to the side or center
      top = Math.max(padding, Math.min(targetCenterY - tooltipHeight / 2, viewportHeight - tooltipHeight - padding));
      
      // Try right side first
      if (targetRect.right + padding + tooltipWidth < viewportWidth) {
        left = targetRect.right + padding;
        arrowPosition = 'left';
      } else if (targetRect.left - padding - tooltipWidth > 0) {
        left = targetRect.left - tooltipWidth - padding;
        arrowPosition = 'right';
      } else {
        // Center horizontally
        left = (viewportWidth - tooltipWidth) / 2;
        arrowPosition = 'none';
      }
    }

    // Final bounds check
    top = Math.max(padding, Math.min(top, viewportHeight - tooltipHeight - padding));
    left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));

    return { top, left, arrowPosition };
  }

  render() {
    const { isOpen } = this.props;
    const { currentStep, steps, targetRect } = this.state;
    const step = steps[currentStep];

    if (!isOpen || !step) return null;

    const tooltipPosition = this.getTooltipPosition();

    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Dark overlay with spotlight cutout - visual only */}
            <svg
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 10000,
                pointerEvents: 'none'
              }}
            >
              <defs>
                <mask id="guide-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {targetRect && (
                    <rect
                      x={targetRect.left - 8}
                      y={targetRect.top - 8}
                      width={targetRect.width + 16}
                      height={targetRect.height + 16}
                      rx="8"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.7)"
                mask="url(#guide-mask)"
              />
            </svg>

            {/* Spotlight border - visual only */}
            {targetRect && (
              <motion.div
                ref={this.spotlightRef}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  position: 'fixed',
                  top: targetRect.top - 8,
                  left: targetRect.left - 8,
                  width: targetRect.width + 16,
                  height: targetRect.height + 16,
                  border: '3px solid #f59e0b',
                  borderRadius: 8,
                  boxShadow: '0 0 20px rgba(245, 158, 11, 0.5)',
                  zIndex: 10000,
                  pointerEvents: 'none'
                }}
              />
            )}

            {/* Tooltip */}
            <motion.div
              data-guide-tooltip="true"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                zIndex: 10001,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                padding: 0,
                width: 380,
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Arrow pointing to target */}
              {targetRect && tooltipPosition.arrowPosition !== 'none' && (
                <div style={{
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  ...(tooltipPosition.arrowPosition === 'top' && {
                    top: -12,
                    left: Math.min(Math.max(20, targetRect.left + targetRect.width / 2 - tooltipPosition.left), 300),
                    borderLeft: '12px solid transparent',
                    borderRight: '12px solid transparent',
                    borderBottom: '12px solid #f59e0b'
                  }),
                  ...(tooltipPosition.arrowPosition === 'bottom' && {
                    bottom: -12,
                    left: Math.min(Math.max(20, targetRect.left + targetRect.width / 2 - tooltipPosition.left), 300),
                    borderLeft: '12px solid transparent',
                    borderRight: '12px solid transparent',
                    borderTop: '12px solid #f9fafb'
                  }),
                  ...(tooltipPosition.arrowPosition === 'left' && {
                    left: -12,
                    top: Math.min(Math.max(20, targetRect.top + targetRect.height / 2 - tooltipPosition.top - 12), 160),
                    borderTop: '12px solid transparent',
                    borderBottom: '12px solid transparent',
                    borderRight: '12px solid white'
                  }),
                  ...(tooltipPosition.arrowPosition === 'right' && {
                    right: -12,
                    top: Math.min(Math.max(20, targetRect.top + targetRect.height / 2 - tooltipPosition.top - 12), 160),
                    borderTop: '12px solid transparent',
                    borderBottom: '12px solid transparent',
                    borderLeft: '12px solid white'
                  })
                }} />
              )}
              
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                padding: '16px 20px',
                color: 'white'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: 4
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: 18, 
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                    {step.title}
                  </h3>
                  <button
                    className="guide-close-x-btn"
                    onClick={this.handleSkip}
                    title="Close guide"
                  >
                    ✕
                  </button>
                </div>
                <div style={{ 
                  fontSize: 12, 
                  opacity: 0.9,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span>Step {currentStep + 1} of {steps.length}</span>
                  <div style={{
                    flex: 1,
                    height: 4,
                    background: 'rgba(255,255,255,0.3)',
                    borderRadius: 2,
                    marginLeft: 8
                  }}>
                    <div style={{
                      width: `${((currentStep + 1) / steps.length) * 100}%`,
                      height: '100%',
                      background: 'white',
                      borderRadius: 2,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ 
                padding: '20px',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: 14, 
                  lineHeight: 1.6,
                  color: '#4b5563',
                  whiteSpace: 'pre-line'
                }}>
                  {step.content}
                </p>
              </div>

              {/* Footer */}
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f9fafb'
              }}>
                <button
                  onClick={this.handleSkip}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#6b7280',
                    fontWeight: 500
                  }}
                >
                  Skip Tour
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  {currentStep > 0 && (
                    <button
                      onClick={this.handlePrevious}
                      style={{
                        padding: '8px 16px',
                        background: '#e5e7eb',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#374151'
                      }}
                    >
                      Previous
                    </button>
                  )}
                  <button
                    onClick={this.handleNext}
                    style={{
                      padding: '8px 20px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
}

export default InteractiveGuide;
