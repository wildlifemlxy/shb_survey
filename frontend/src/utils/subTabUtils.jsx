/**
 * Utility functions for creating and managing sub-tab configurations
 */

/**
 * Creates a basic sub-tab configuration
 * @param {Object} options - Configuration options
 * @param {string} options.key - Unique key for the sub-tab
 * @param {string} options.title - Display title for the sub-tab
 * @param {React.Element} options.icon - Icon component for the tab button
 * @param {string} options.className - CSS class name for the sub-tab container
 * @param {string} options.layout - Layout type: 'grid', 'flex', 'columns', 'single'
 * @param {Array} options.sections - Array of section configurations
 * @returns {Object} Sub-tab configuration object
 */
export const createSubTabConfig = ({
  key,
  title,
  icon = null,
  className = `${key}-subtab`,
  layout = 'grid',
  sections = []
}) => {
  return {
    id: key,
    key,
    title,
    icon,
    className,
    layout,
    sections
  };
};

/**
 * Creates a section configuration for use within a sub-tab
 * @param {Object} options - Section configuration options
 * @param {string} options.id - Unique identifier for the section
 * @param {string} options.title - Display title for the section
 * @param {string} options.description - Optional description text
 * @param {React.Component} options.component - Chart/component to render
 * @param {string} options.containerClass - CSS class for the section container
 * @param {Object} options.props - Additional props to pass to the component
 * @returns {Object} Section configuration object
 */
export const createSectionConfig = ({
  id,
  title,
  description = null,
  component,
  containerClass = 'chart-container',
  props = {}
}) => {
  return {
    id,
    title,
    description,
    component,
    containerClass,
    props
  };
};

/**
 * Creates a chart section with common chart styling
 * @param {Object} options - Chart section options
 * @param {string} options.id - Unique identifier
 * @param {string} options.title - Chart title
 * @param {string} options.description - Chart description
 * @param {React.Component} options.component - Chart component
 * @param {string} options.size - Chart size: 'full', 'half', 'large'
 * @param {Object} options.props - Additional props
 * @returns {Object} Chart section configuration
 */
export const createChartSection = ({
  id,
  title,
  description = null,
  component,
  size = 'default',
  props = {}
}) => {
  const sizeClasses = {
    'full': 'chart-container chart-full-width',
    'half': 'chart-container chart-half-width',
    'large': 'chart-container chart-full-width tree-chart-large',
    'default': 'chart-container'
  };

  return createSectionConfig({
    id,
    title,
    description,
    component,
    containerClass: sizeClasses[size] || sizeClasses.default,
    props
  });
};

/**
 * Validates a sub-tab configuration
 * @param {Object} config - Sub-tab configuration to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
export const validateSubTabConfig = (config) => {
  const errors = [];
  
  if (!config) {
    errors.push('Configuration is required');
    return { isValid: false, errors };
  }
  
  if (!config.key) {
    errors.push('Sub-tab key is required');
  }
  
  if (!config.title) {
    errors.push('Sub-tab title is required');
  }
  
  if (!config.sections || !Array.isArray(config.sections)) {
    errors.push('Sections array is required');
  } else {
    config.sections.forEach((section, index) => {
      if (!section.id) {
        errors.push(`Section ${index + 1}: id is required`);
      }
      if (!section.component) {
        errors.push(`Section ${index + 1}: component is required`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Creates a standard icon SVG element
 * @param {string} pathData - SVG path data
 * @param {Object} props - Additional SVG props
 * @returns {React.Element} SVG icon element
 */
export const createIcon = (pathData, props = {}) => {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d={pathData} />
    </svg>
  );
};

/**
 * Common icon path data for reuse
 */
export const iconPaths = {
  charts: "M3,13H11V3H3M3,21H11V15H3M13,21H21V11H13M13,3V9H21V3",
  tree: "M15,19L9,16.89V5L15,7.11M20.5,3C20.44,3 20.39,3 20.34,3L15,5.1L9,3L3.36,4.9C3.15,4.97 3,5.15 3,5.38V20.5A0.5,0.5 0 0,0 3.5,21C3.55,21 3.61,21 3.66,21L9,18.9L15,21L20.64,19.1C20.85,19 21,18.85 21,18.62V3.5A0.5,0.5 0 0,0 20.5,3Z",
  map: "M15,19L9,16.89V5L15,7.11M20.5,3C20.44,3 20.39,3 20.34,3L15,5.1L9,3L3.36,4.9C3.15,4.97 3,5.15 3,5.38V20.5A0.5,0.5 0 0,0 3.5,21C3.55,21 3.61,21 3.66,21L9,18.9L15,21L20.64,19.1C20.85,19 21,18.85 21,18.62V3.5A0.5,0.5 0 0,0 20.5,3Z",
  analytics: "M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z",
  timeline: "M9,10H7V12H9V10M13,10H11V12H13V10M17,10H15V12H17V10M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H6V1H8V3H16V1H18V3H19M19,19V8H5V19H19M9,14H7V16H9V14M13,14H11V16H13V14M17,14H15V16H17V14Z"
};

/**
 * Quick helper to create common chart configurations
 */
export const chartConfigs = {
  /**
   * Creates a basic chart configuration - Type A
   */
  chartTypeA: (component, props = {}) => createChartSection({
    id: 'chart-type-a',
    title: '📈 Chart Type A',
    description: 'Standard data visualization',
    component,
    size: 'full',
    props
  }),

  /**
   * Creates a basic chart configuration - Type B
   */
  chartTypeB: (component, props = {}) => createChartSection({
    id: 'chart-type-b',
    title: '📊 Chart Type B',
    description: 'Alternative data visualization',
    component,
    size: 'half',
    props
  }),

  /**
   * Creates a basic chart configuration - Type C
   */
  chartTypeC: (component, props = {}) => createChartSection({
    id: 'chart-type-c',
    title: '🗺️ Chart Type C',
    description: 'Additional data visualization',
    component,
    size: 'half',
    props
  }),

  /**
   * Creates a detailed chart configuration
   */
  detailedChart: (component, props = {}) => createChartSection({
    id: 'detailed-chart',
    title: '🔍 Detailed Chart View',
    description: 'Comprehensive data visualization',
    component,
    size: 'large',
    props
  }),

  /**
   * Creates a comparison chart configuration
   */
  comparisonChart: (component, props = {}) => createChartSection({
    id: 'comparison-chart',
    title: '⚖️ Comparison Chart',
    description: 'Comparative data visualization',
    component,
    size: 'default',
    props
  }),

  /**
   * Creates a summary chart configuration
   */
  summaryChart: (component, props = {}) => createChartSection({
    id: 'summary-chart',
    title: '📈 Summary Chart',
    description: 'Overview data visualization',
    component,
    size: 'default',
    props
  }),

  /**
   * Creates a multi-view chart configuration
   */
  multiViewChart: (component, props = {}) => createChartSection({
    id: 'multi-view-chart',
    title: '🔗 Multi-View Chart',
    description: 'Multiple perspective visualization',
    component,
    size: 'full',
    props
  }),

  /**
   * Creates a custom chart configuration
   */
  custom: (id, title, description, component, size = 'default', props = {}) => createChartSection({
    id,
    title,
    description,
    component,
    size,
    props
  })
};
