import DateLineChart from '../components/Charts/DateLineChart';
import LocationStats from '../components/Charts/LocationStats';
import D3TreeHeightChart from '../components/Charts/TreeChart/HabitatChart';
import { 
  createSubTabConfig, 
  createChartSection, 
  createIcon, 
  iconPaths 
} from '../utils/subTabUtils';

// Sub-tab configurations using utility functions
export const subTabConfigs = {
  viewOne: createSubTabConfig({
    key: 'viewOne',
    title: 'Population Analytics',
    icon: createIcon(iconPaths.charts),
    layout: 'grid',
    sections: [
      createChartSection({
        id: 'chart-section-1',
        title: 'Observations Over Time (Monthly)',
        description: 'Monthly trends and temporal patterns in observation data',
        component: DateLineChart,
        size: 'default'
      }),
      createChartSection({
        id: 'chart-section-2',
        title: 'Observation Distribution',
        description: 'Straw-headed Bulbul distribution across Singapore',
        component: LocationStats,
        size: 'default'
      })
    ]
  }),

  viewTwo: createSubTabConfig({
    key: 'viewTwo',
    title: 'Habitat Analytics',
    icon: createIcon(iconPaths.analytics),
    layout: 'single',
    sections: [
      createChartSection({
        id: 'chart-section-3',
        title: '',
        description: '',
        component: D3TreeHeightChart,
        size: 'large'
      })
    ]
  })
};

// Helper function to get all sub-tab configurations
export const getAllSubTabConfigs = () => {
  return Object.values(subTabConfigs);
};

// Helper function to get specific sub-tab configuration
export const getSubTabConfig = (key) => {
  return subTabConfigs[key] || null;
};

// Helper function to add a new sub-tab configuration
export const addSubTabConfig = (key, config) => {
  subTabConfigs[key] = {
    id: key,
    key: key,
    ...config
  };
};

// Helper function to update an existing sub-tab configuration
export const updateSubTabConfig = (key, updates) => {
  if (subTabConfigs[key]) {
    subTabConfigs[key] = {
      ...subTabConfigs[key],
      ...updates
    };
  }
};

// Helper function to remove a sub-tab configuration
export const removeSubTabConfig = (key) => {
  delete subTabConfigs[key];
};

// Example of how to add a new sub-tab dynamically
export const addNewSubTab = (key, title, icon, sections) => {
  const newConfig = createSubTabConfig({
    key,
    title,
    icon,
    sections
  });
  
  addSubTabConfig(key, newConfig);
  return newConfig;
};

// Generic sub-tab templates for easy reuse
export const createGenericSubTabs = {
  // Template for multi-view layout
  multiView: (chartComponents) => createSubTabConfig({
    key: 'multi-view',
    title: '📊 Multi-View Display',
    icon: createIcon(iconPaths.analytics),
    layout: 'grid',
    sections: chartComponents.map((component, index) => 
      createChartSection({
        id: `view-${index}`,
        title: `📈 View ${index + 1}`,
        description: 'Data visualization display',
        component,
        size: 'default'
      })
    )
  }),

  // Template for single detailed view
  singleView: (component, title = 'Single View') => createSubTabConfig({
    key: 'single-view',
    title: `🔍 ${title}`,
    icon: createIcon(iconPaths.analytics),
    layout: 'single',
    sections: [
      createChartSection({
        id: 'main-view',
        title: `📊 ${title}`,
        description: 'Primary data visualization',
        component,
        size: 'large'
      })
    ]
  }),

  // Template for dashboard layout
  dashboard: (views) => createSubTabConfig({
    key: 'dashboard-view',
    title: '📈 Dashboard View',
    icon: createIcon(iconPaths.charts),
    layout: 'grid',
    sections: views.map(view => 
      createChartSection({
        id: view.id,
        title: view.title,
        description: view.description,
        component: view.component,
        size: view.size || 'default'
      })
    )
  })
};

export default subTabConfigs;
