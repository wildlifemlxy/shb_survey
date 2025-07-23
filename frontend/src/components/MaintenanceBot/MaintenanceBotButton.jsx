import React, { Component } from 'react';
import axios from 'axios';
import domtoimage from 'dom-to-image';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import './MaintenanceBotButton.css';
import SystemHealthStatus from './SystemHealthStatus';
import QuickActionsPanel from './QuickActionsPanel';
import StatusMessages from './StatusMessages';
import LastMaintenanceInfo from './LastMaintenanceInfo';
import SHBSurveyAssistant from './SHBSurveyAssistant';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

class MaintenanceBotButton extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      maintenanceStatus: 'idle', // idle, running, completed, error
      lastMaintenance: null,
      activeTasks: [],
      systemHealth: {
        database: 'Healthy',
        storage: 'Healthy',
        performance: 'Good'
      },
      showQuickActions: false,
      isHidden: false,
      // Export functionality
      showExportActions: false,
      exportStatus: 'idle', // idle, exporting, completed, error
      currentPage: null,
      activeDashboardTab: 'overview', // Track active dashboard tab
      // Chat functionality
      showChat: false,
      messages: [
        { id: 1, text: "🤖 Hello! I'm the SHB Survey Assistant. How can I help you today?", sender: 'bot', timestamp: new Date() }
      ]
    };
  }

  componentDidMount() {
    console.log('MaintenanceBotButton mounted', this.props.shbData);
    this.loadMaintenanceStatus();
    // Check status every 30 seconds
    this.statusInterval = setInterval(this.loadMaintenanceStatus, 30000);
    
    // Listen for popup events to hide/show maintenance bot
    window.addEventListener('popupOpen', this.hideMaintenanceBot);
    window.addEventListener('popupClose', this.showMaintenanceBot);
    
    // Add click outside listener to close panel
    document.addEventListener('mousedown', this.handleClickOutside);
    
    // Detect current page for export functionality
    this.detectCurrentPage();
    
    // Listen for route changes to update current page in real-time
    window.addEventListener('popstate', this.detectCurrentPage);
    window.addEventListener('hashchange', this.detectCurrentPage);
    
    // For single-page apps, also listen for manual navigation
    this.navigationObserver = setInterval(() => {
      const currentPath = window.location.pathname + window.location.hash;
      if (this.lastPath !== currentPath) {
        this.lastPath = currentPath;
        this.detectCurrentPage();
      }
    }, 500); // Check every 500ms for route changes
    
    // Monitor tab changes in real-time
    this.tabObserver = setInterval(() => {
      if (this.state.currentPage === 'dashboard') {
        const currentTab = this.detectActiveDashboardTab();
        if (this.state.activeDashboardTab !== currentTab) {
          this.setState({ activeDashboardTab: currentTab });
          console.log(`Dashboard tab changed to: ${currentTab}`);
        }
      }
    }, 300); // Check every 300ms for tab changes
    
    // Also listen for click events on potential tab elements for immediate detection
    this.addTabClickListeners();
    
    // Set up MutationObserver to detect DOM changes that might indicate tab changes
    this.setupDOMObserver();
    
    // Initialize lastPath
    this.lastPath = window.location.pathname + window.location.hash;
  }

  componentWillUnmount() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
    if (this.navigationObserver) {
      clearInterval(this.navigationObserver);
    }
    if (this.tabObserver) {
      clearInterval(this.tabObserver);
    }
    if (this.tabChangeTimeout) {
      clearTimeout(this.tabChangeTimeout);
    }
    if (this.domObserver) {
      this.domObserver.disconnect();
    }
    
    // Clean up event listeners
    window.removeEventListener('popupOpen', this.hideMaintenanceBot);
    window.removeEventListener('popupClose', this.showMaintenanceBot);
    window.removeEventListener('popstate', this.detectCurrentPage);
    window.removeEventListener('hashchange', this.detectCurrentPage);
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  hideMaintenanceBot = () => {
    this.setState({ isHidden: true });
  };

  showMaintenanceBot = () => {
    this.setState({ isHidden: false });
  };

  // Export functionality
  detectCurrentPage = () => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    const fullPath = path + hash;
    let currentPage = 'home';
    
    console.log('Detecting current page:', { path, hash, fullPath });
    
    // Check both pathname and hash for route detection
    if (fullPath.includes('/dashboard') || fullPath.includes('#dashboard')) {
      currentPage = 'dashboard';
    } else if (fullPath.includes('/surveyEvents') || fullPath.includes('#surveyEvents')) {
      currentPage = 'surveyEvents';
    } else if (fullPath.includes('/settings') || fullPath.includes('#settings')) {
      currentPage = 'settings';
    }
    
    console.log('Detected page:', currentPage);
    
    // Only update state if the page has actually changed
    if (this.state.currentPage !== currentPage) {
      this.setState({ currentPage });
      console.log(`Page changed to: ${currentPage} (${fullPath})`); // Debug log
      
      // If we're on dashboard, also update the active tab immediately
      if (currentPage === 'dashboard') {
        const activeTab = this.detectActiveDashboardTab();
        this.setState({ activeDashboardTab: activeTab });
        console.log(`Initial dashboard tab: ${activeTab}`);
      }
    }
  };

  // Detect active dashboard tab
  detectActiveDashboardTab = () => {
    // Try multiple selectors to find the active tab
    const activeTabSelectors = [
      '.tab.active',
      '.tab-item.active',
      '.nav-tab.active',
      '.dashboard-tab.active',
      '[aria-selected="true"]',
      '.selected',
      '.active',
      '.current',
      '.MuiTab-root[aria-selected="true"]', // Material-UI
      '.ant-tabs-tab-active', // Ant Design
      '.nav-link.active', // Bootstrap
      '.tab-button.active',
      '.tab-header.active'
    ];
    
    let activeTab = 'overview'; // default
    
    // First try to find active tab by selector
    for (const selector of activeTabSelectors) {
      const activeElements = document.querySelectorAll(selector);
      for (const activeElement of activeElements) {
        if (activeElement) {
          const tabText = activeElement.textContent?.toLowerCase() || '';
          const tabId = activeElement.id?.toLowerCase() || '';
          const tabClass = activeElement.className?.toLowerCase() || '';
          
          if (tabText.includes('data table') || tabText.includes('table') || 
              tabId.includes('table') || tabClass.includes('table')) {
            activeTab = 'dataTable';
            break;
          } else if (tabText.includes('visualization') || tabText.includes('chart') ||
                     tabId.includes('chart') || tabClass.includes('chart')) {
            activeTab = 'visualization';
            break;
          } else if (tabText.includes('map') || tabId.includes('map') || 
                     tabClass.includes('map')) {
            activeTab = 'mapView';
            break;
          } else if (tabText.includes('overview') || tabId.includes('overview') || 
                     tabClass.includes('overview')) {
            activeTab = 'overview';
            break;
          }
        }
      }
      if (activeTab !== 'overview') break; // If we found a specific tab, stop searching
    }
    
    // Also check URL hash for tab indicators
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('table')) {
      activeTab = 'dataTable';
    } else if (hash.includes('chart') || hash.includes('visualization')) {
      activeTab = 'visualization';
    } else if (hash.includes('map')) {
      activeTab = 'mapView';
    }
    
    // Check URL search params as well
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab')?.toLowerCase();
    if (tabParam) {
      if (tabParam.includes('table')) {
        activeTab = 'dataTable';
      } else if (tabParam.includes('chart') || tabParam.includes('visualization')) {
        activeTab = 'visualization';
      } else if (tabParam.includes('map')) {
        activeTab = 'mapView';
      } else if (tabParam.includes('overview')) {
        activeTab = 'overview';
      }
    }
    
    return activeTab;
  };

  // Add click listeners to tab elements for immediate detection
  addTabClickListeners = () => {
    const tabSelectors = [
      '.tab',
      '.tab-item',
      '.nav-tab', 
      '.dashboard-tab',
      '[role="tab"]',
      '.MuiTab-root', // Material-UI tabs
      '.ant-tabs-tab', // Ant Design tabs
      '.nav-link', // Bootstrap tabs
      '.tab-button',
      '.tab-header',
      '.subtab',
      '.subtab-item',
      '.sub-tab',
      'button[data-tab]',
      'a[data-tab]',
      '[role="button"][aria-selected]'
    ];
    
    const handleTabClick = (event) => {
      // Small delay to allow tab activation
      setTimeout(() => {
        if (this.state.currentPage === 'dashboard') {
          const currentTab = this.detectActiveDashboardTab();
          if (this.state.activeDashboardTab !== currentTab) {
            this.setState({ activeDashboardTab: currentTab });
            console.log(`Tab clicked - changed to: ${currentTab}`, event.target);
          }
        }
      }, 100);
    };
    
    // Add event listeners using event delegation for better performance
    document.addEventListener('click', (event) => {
      const target = event.target;
      const isTabElement = tabSelectors.some(selector => {
        try {
          return target.matches && target.matches(selector);
        } catch (e) {
          return false;
        }
      });
      
      if (isTabElement) {
        handleTabClick(event);
      }
    });
    
    // Also listen for keyboard navigation
    document.addEventListener('keydown', (event) => {
      if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight' || 
           event.key === 'Tab') && event.target.matches && 
          tabSelectors.some(selector => {
            try {
              return event.target.matches(selector);
            } catch (e) {
              return false;
            }
          })) {
        setTimeout(() => {
          if (this.state.currentPage === 'dashboard') {
            const currentTab = this.detectActiveDashboardTab();
            if (this.state.activeDashboardTab !== currentTab) {
              this.setState({ activeDashboardTab: currentTab });
              console.log(`Tab keyboard navigation - changed to: ${currentTab}`);
            }
          }
        }, 100);
      }
    });
    
    // Store reference for cleanup
    this.tabClickHandler = handleTabClick;
  };

  // Set up MutationObserver to detect DOM changes
  setupDOMObserver = () => {
    // Create an observer to watch for class changes on tab elements
    this.domObserver = new MutationObserver((mutations) => {
      let tabChanged = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || 
             mutation.attributeName === 'aria-selected')) {
          const target = mutation.target;
          if (target.classList && 
              (target.classList.contains('tab') || 
               target.classList.contains('active') ||
               target.getAttribute('role') === 'tab' ||
               target.getAttribute('aria-selected') === 'true')) {
            tabChanged = true;
          }
        }
      });
      
      if (tabChanged && this.state.currentPage === 'dashboard') {
        // Debounce the tab detection to avoid excessive calls
        if (this.tabChangeTimeout) {
          clearTimeout(this.tabChangeTimeout);
        }
        this.tabChangeTimeout = setTimeout(() => {
          const currentTab = this.detectActiveDashboardTab();
          if (this.state.activeDashboardTab !== currentTab) {
            this.setState({ activeDashboardTab: currentTab });
            console.log(`DOM observer detected tab change to: ${currentTab}`);
          }
        }, 50);
      }
    });
    
    // Start observing
    this.domObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'aria-selected'],
      subtree: true
    });
  };

  exportCurrentPage = async (format) => {
    console.log(`Starting export with format: ${format}`);
    console.log(`Current state:`, {
      currentPage: this.state.currentPage,
      activeDashboardTab: this.state.activeDashboardTab,
      exportStatus: this.state.exportStatus
    });
    
    this.setState({ exportStatus: 'exporting' });
    
    try {
      if (format === 'excel') {
        console.log('Starting Excel export...');
        await this.exportExcel();
      } else if (format === 'pdf') {
        console.log('Starting PDF export...');
        await this.exportPDF();
      } else if (format === 'backup') {
        console.log('Starting backup export...');
        // For backup on dashboard, determine export type based on active tab
        if (this.state.currentPage === 'dashboard') {
          const activeTab = this.state.activeDashboardTab; // Use state instead of detecting again
          console.log(`Backup export with active tab: ${activeTab}`); // Debug log
          
          if (activeTab === 'dataTable') {
            // Data Table tab → Export as Excel
            console.log('Backup: Exporting Data Table as Excel...');
            await this.exportExcel();
          } else {
            // Overview, Visualization, Map View tabs → Export complete dashboard as PDF
            console.log('Backup: Exporting dashboard as PDF...');
            await this.exportPDF();
          }
        } else {
          // Non-dashboard pages → Export as PDF
          console.log('Backup: Exporting non-dashboard page as PDF...');
          await this.exportPDF();
        }
        
        // Always run backup task regardless of export type
        console.log('Running backend backup task...');
        try {
          await this.runBackupTask();
          console.log('Backup task completed successfully');
        } catch (backupError) {
          console.warn('Backend backup failed, but continuing with export:', backupError);
          // Don't throw the error - allow export to complete even if backup fails
        }
      }
      
      console.log('Export completed successfully');
      this.setState({ exportStatus: 'completed' });
      setTimeout(() => {
        this.setState({ exportStatus: 'idle' });
      }, 3000);
    } catch (error) {
      console.error('Export failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      alert(`Export failed: ${error.message}`);
      this.setState({ exportStatus: 'error' });
      setTimeout(() => {
        this.setState({ exportStatus: 'idle' });
      }, 3000);
    }
  };

  runBackupTask = async () => {
    console.log('Starting backend backup task...');
    try {
      const requestData = {
        purpose: 'runMaintenance',
        taskType: 'backup',
        immediate: true
      };
      
      console.log('Sending backup request to:', `${BASE_URL}/telegram`);
      console.log('Request data:', requestData);
      
      // Add timeout to prevent hanging
      const response = await axios.post(`${BASE_URL}/telegram`, requestData, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Backup response received:', response.data);

      if (response.data && response.data.result) {
        this.setState({ 
          lastMaintenance: new Date().toISOString()
        });
        console.log('Backup task completed successfully');
      } else {
        console.warn('Backup task may not have completed successfully:', response.data);
        // Don't throw error for unsuccessful backup - it's not critical for export
      }
      
      return response.data;
    } catch (error) {
      console.error('Backup task failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        timeout: error.code === 'ECONNABORTED'
      });
      
      // Check if it's a network/server issue vs validation issue
      if (error.response?.status === 400) {
        console.warn('Backend validation error - backup endpoint may need different parameters');
      } else if (error.code === 'ECONNABORTED') {
        console.warn('Backup request timed out');
      } else if (!error.response) {
        console.warn('Backend server may be down');
      }
      
      throw error; // Re-throw to be caught by exportCurrentPage
    }
  };

  exportPDF = async () => {
    const { currentPage } = this.state;
    let fileName = 'SHB Survey Dashboard Export';
    
    console.log('Starting PDF export - targeting dashboard content...');
    console.log('Current DOM state:');
    console.log('- Document ready state:', document.readyState);
    console.log('- Available selectors check:');
    
    // Enhanced selectors to capture the exact visible dashboard content
    const selectors = [
      // Primary dashboard content selectors
      '.dashboard-content',
      '.dashboard-container',
      '.dashboard-main',
      '.dashboard-wrapper',
      
      // Tab-specific content selectors
      '.overview-tab',
      '.data-table-tab',
      '.visualization-tab',
      '.map-view-tab',
      
      // General content selectors (ordered by specificity)
      '.main-content',
      '.content-wrapper',
      '.app-content',
      '.page-content',
      
      // React component selectors
      '[class*="Dashboard"]',
      '[id*="dashboard"]',
      
      // Fallback to main application container
      '.App',
      '#root > div',
      '#app > div',
      'main',
      'body > div'
    ];
    
    let element = null;
    let bestElement = null;
    let bestScore = 0;
    
    // Find the best matching element based on content and visibility
    for (const selector of selectors) {
      try {
        const found = document.querySelector(selector);
        if (found && this.isElementVisible(found)) {
          const score = this.calculateElementScore(found);
          console.log(`  - ${selector}: found (${found.offsetWidth}x${found.offsetHeight}) score: ${score}`);
          
          if (score > bestScore) {
            bestElement = found;
            bestScore = score;
            element = found;
            console.log(`New best element using selector: ${selector} (score: ${score})`);
          }
        } else {
          console.log(`  - ${selector}: ${found ? 'found but not visible' : 'not found'}`);
        }
      } catch (error) {
        console.log(`  - ${selector}: error - ${error.message}`);
      }
    }
    
    // If no specific element found, try to find any visible container with significant content
    if (!element) {
      console.log('No specific selector found, searching for any visible dashboard content...');
      
      const allElements = document.querySelectorAll('div, main, section, article');
      for (const el of allElements) {
        if (this.isElementVisible(el) && this.hasSignificantContent(el)) {
          const score = this.calculateElementScore(el);
          if (score > bestScore) {
            bestElement = el;
            bestScore = score;
            element = el;
            console.log(`Found fallback element: .${el.className} (score: ${score})`);
          }
        }
      }
    }
    
    if (!element) {
      console.error('No suitable content element found for export');
      console.log('Available visible elements in DOM:');
      document.querySelectorAll('div, main, section').forEach((el, i) => {
        if (this.isElementVisible(el)) {
          console.log(`  ${i}: .${el.className} (${el.offsetWidth}x${el.offsetHeight})`);
        }
      });
      
      const errorMessage = "No visible dashboard content found for export. Please ensure you are on the Dashboard page and the content is fully loaded.";
      alert(errorMessage);
      throw new Error('Cannot export: no suitable visible content element found on the page');
    }
    
    let hiddenElements = [];
    
    console.log(`Exporting element:`, element);
    console.log(`Element details:`, {
      tagName: element.tagName,
      className: element.className,
      id: element.id,
      dimensions: `${element.offsetWidth}x${element.offsetHeight}`,
      scrollDimensions: `${element.scrollWidth}x${element.scrollHeight}`,
      hasChildren: element.children.length > 0,
      childrenCount: element.children.length
    });
    
    // Hide interfering elements that might cause rendering issues
    const interfereSelectors = [
      '.maintenance-bot-container',
      '.floating-button',
      '.popup',
      '.modal',
      '.tooltip',
      '.notification',
      '.header-actions', // Hide navigation elements
      '.filters-section', // Hide filters for cleaner export
      '.dashboard-tabs' // Hide tab navigation
    ];
    
    interfereSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el && el.style) {
          hiddenElements.push({
            element: el,
            originalDisplay: el.style.display,
            originalVisibility: el.style.visibility
          });
          el.style.display = 'none';
          el.style.visibility = 'hidden';
        }
      });
    });
    
    // Wait a moment for styling to apply
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      console.log('Setting up PDF export...');
      
      // Wait longer for content to stabilize and animations to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Scroll the target element into view to ensure it's fully rendered
      element.scrollIntoView({ behavior: 'instant', block: 'start' });
      
      // Wait for scroll to complete and any lazy-loaded content
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Wait for all images to load within the target element
      console.log('Ensuring all images are loaded...');
      await this.waitForImages(element);
      
      // Wait for background images to load as well
      console.log('Ensuring all background images are loaded...');
      await this.waitForBackgroundImages(element);
      
      // Check if dom-to-image is available
      if (!domtoimage || typeof domtoimage.toPng !== 'function') {
        throw new Error('dom-to-image library is not available or not properly loaded');
      }
      
      console.log('Capturing content with dom-to-image...');
      console.log('Target element final details:', {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        dimensions: `${element.offsetWidth}x${element.offsetHeight}`,
        scrollDimensions: `${element.scrollWidth}x${element.scrollHeight}`,
        position: element.getBoundingClientRect(),
        visible: this.isElementVisible(element)
      });
      
      // Enhanced dom-to-image options for more accurate capture
      const options = {
        quality: 1,
        bgcolor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: element.scrollWidth + 'px',
          height: element.scrollHeight + 'px',
          // Ensure consistent rendering
          overflow: 'visible'
        },
        // Use higher DPI for better quality
        pixelRatio: window.devicePixelRatio || 2,
        // Include fonts and external resources - IMPORTANT for images
        useCORS: true,
        allowTaint: true,
        // Enhanced image handling
        imagePlaceholder: undefined, // Don't use placeholder for missing images
        filter: (node) => {
          // More comprehensive filtering
          if (node.nodeType === Node.ELEMENT_NODE) {
            const classList = node.classList;
            const className = node.className || '';
            const tagName = node.tagName?.toLowerCase();
            
            // ALWAYS include images, especially logos
            if (tagName === 'img') {
              console.log('Including image in export:', node.src || node.getAttribute('src'));
              return true;
            }
            
            // ALWAYS include SVG elements (often used for logos/icons)
            if (tagName === 'svg') {
              console.log('Including SVG in export');
              return true;
            }
            
            // ALWAYS include canvas elements (charts often use canvas)
            if (tagName === 'canvas') {
              console.log('Including canvas in export');
              return true;
            }
            
            // Skip unwanted UI elements but preserve content
            if (classList && (
              classList.contains('maintenance-bot-container') ||
              classList.contains('floating-button') ||
              classList.contains('popup') ||
              classList.contains('modal') ||
              classList.contains('tooltip') ||
              classList.contains('notification') ||
              classList.contains('header-actions') ||
              classList.contains('filters-section') ||
              classList.contains('dashboard-tabs')
            )) {
              return false;
            }
            
            // Skip hidden elements but be more lenient for images
            const style = window.getComputedStyle(node);
            if (style.display === 'none' || 
                style.visibility === 'hidden') {
              return false;
            }
            
            // For images, don't skip based on opacity as they might be fading in
            if (tagName !== 'img' && tagName !== 'svg' && style.opacity === '0') {
              return false;
            }
            
            // Skip script and style tags
            if (tagName === 'script' || tagName === 'style') {
              return false;
            }
          }
          
          return true;
        }
      };
      
      console.log('Enhanced dom-to-image options:', options);
      console.log('Calling domtoimage.toPng with enhanced settings...');
      
      let dataUrl;
      try {
        dataUrl = await domtoimage.toPng(element, options);
      } catch (primaryError) {
        console.warn('Primary PNG capture failed, trying fallback method:', primaryError);
        
        // Fallback with simpler options
        const fallbackOptions = {
          quality: 0.9,
          bgcolor: '#ffffff',
          filter: (node) => {
            // Basic filtering only
            if (node.classList) {
              return !node.classList.contains('maintenance-bot-container') &&
                     !node.classList.contains('floating-button');
            }
            return true;
          }
        };
        
        try {
          dataUrl = await domtoimage.toPng(element, fallbackOptions);
          console.log('Fallback PNG capture succeeded');
        } catch (fallbackError) {
          console.error('Both primary and fallback PNG capture failed');
          throw new Error(`PNG capture failed: ${primaryError.message}. Fallback also failed: ${fallbackError.message}`);
        }
      }
      
      console.log('domtoimage.toPng completed');
      console.log('Generated data URL length:', dataUrl ? dataUrl.length : 'null');
      console.log('Data URL preview:', dataUrl ? dataUrl.substring(0, 100) + '...' : 'null');
      
      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 1000) {
        const error = new Error('Failed to generate image data - ' + (dataUrl ? `data too small (${dataUrl.length} bytes)` : 'no data returned'));
        console.error('Image generation failed:', error);
        throw error;
      }
      
      // Create canvas from the data URL for PDF processing
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            console.log(`Image created: ${canvas.width}x${canvas.height}`);
            
            // Create and save PDF
            this.createPDFFromCanvas(canvas, dataUrl, fileName);
            console.log('PDF export completed successfully');
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load generated image'));
        };
        
        img.src = dataUrl;
      });
      
    } catch (error) {
      console.error('PDF export error:', error);
      throw new Error(`PDF export failed: ${error.message}`);
    } finally {
      // Cleanup
      hiddenElements.forEach(({ element, originalDisplay, originalVisibility }) => {
        if (element && element.style) {
          element.style.display = originalDisplay || '';
          element.style.visibility = originalVisibility || '';
        }
      });
      
      // Remove temporary styles
      const exportStyleEl = document.querySelector('style:last-child');
      if (exportStyleEl && exportStyleEl.textContent.includes('border-collapse')) {
        exportStyleEl.remove();
      }
    }
  };

  // Helper method to check if element is visible
  isElementVisible = (element) => {
    if (!element || !element.offsetParent) return false;
    
    const style = getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  };

  // Helper method to check if element has significant content
  hasSignificantContent = (element) => {
    if (!element) return false;
    
    // Check for child elements
    const hasChildren = element.children.length > 0;
    
    // Check for meaningful text content
    const textContent = element.textContent?.trim() || '';
    const hasText = textContent.length > 15; // Lowered threshold for data content
    
    // Check for data-related content specifically
    const hasDataContent = element.querySelectorAll(`
      table, 
      .stat-card, 
      .chart-container, 
      .data-table,
      .stats-grid,
      .overview-tab,
      [class*="chart"],
      [class*="stats"],
      [class*="data"]
    `).length > 0;
    
    // Check for images or visual content
    const hasImages = element.querySelectorAll('img, svg, canvas').length > 0;
    
    // Check dimensions - more lenient for data content
    const hasSize = element.offsetWidth >= 150 && element.offsetHeight >= 80;
    
    // Special check for data tables
    const hasTableData = element.querySelectorAll('table tr').length > 1;
    
    return hasSize && (hasChildren || hasText || hasImages || hasDataContent || hasTableData);
  };

  // Helper method to validate canvas content
  validateCanvasContent = (canvas) => {
    try {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
      
      // Check for variety in pixel colors (not just white/empty)
      const colorVariety = new Set();
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const alpha = imageData.data[i + 3];
        
        if (alpha > 0) { // Only consider visible pixels
          colorVariety.add(`${r},${g},${b}`);
        }
        
        // If we have enough variety, content is likely present
        if (colorVariety.size > 5) return true;
      }
      
      return colorVariety.size > 2; // At least some color variation
    } catch (error) {
      console.warn('Could not validate canvas content:', error);
      return true; // Assume content is present if we can't check
    }
  };

  // Helper method to create PDF from canvas
  createPDFFromCanvas = (canvas, imgData, fileName) => {
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Determine optimal orientation and format
    const isLandscape = imgWidth > imgHeight;
    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'a4',
      compress: true
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate scaling to fit content on page with margins
    const margin = 40; // 40pt margins
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - (margin * 2);
    
    const ratioX = availableWidth / imgWidth;
    const ratioY = availableHeight / imgHeight;
    const ratio = Math.min(ratioX, ratioY);
    
    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;
    
    // Center the content
    const xOffset = (pageWidth - scaledWidth) / 2;
    const yOffset = (pageHeight - scaledHeight) / 2;
    
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, scaledWidth, scaledHeight, undefined, 'FAST');
    
    // Add basic PDF metadata
    pdf.setProperties({
      title: 'SHB Survey Dashboard Export',
      subject: 'Bird Survey Statistics Dashboard',
      author: 'SHB Survey System',
      keywords: 'survey, birds, statistics, dashboard',
      creator: 'SHB Survey Export Tool'
    });
    
    // Generate filename with timestamp
    const timestampDate = new Date();
    const timestamp = `${String(timestampDate.getDate()).padStart(2, '0')}${String(timestampDate.getMonth() + 1).padStart(2, '0')}${timestampDate.getFullYear()} ${String(timestampDate.getHours()).padStart(2, '0')}:${String(timestampDate.getMinutes()).padStart(2, '0')}:${String(timestampDate.getSeconds()).padStart(2, '0')}`;
    
    // Simple filename without interactive indicators
    const exportFileName = `${fileName} ${timestamp}.pdf`;
    
    // Download PDF
    console.log('Downloading PDF...');
    
    // Create download link
    const pdfBlob = pdf.output('blob');
    const downloadUrl = URL.createObjectURL(pdfBlob);
    
    // Create a temporary download link
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = exportFileName;
    downloadLink.style.display = 'none';
    
    // Add to DOM, click, and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Clean up the blob URL after download
    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 5000);
    
    return pdf;
  };

  exportExcel = async () => {
    // Only works for dashboard with data
    if (this.state.currentPage !== 'dashboard') {
      throw new Error('Excel export only available on Dashboard');
    }
    
    // Try to get data from props first (preferred method)
    let observationData = null;
    if (this.props.shbData && Array.isArray(this.props.shbData)) {
      observationData = this.props.shbData;
      console.log(`Using shbData prop with ${observationData.length} records`);
    }
    
    // If no props data, try to scrape from DOM as fallback
    if (!observationData || observationData.length === 0) {
      console.log('No shbData prop found, trying to scrape table from DOM');
      return this.exportTableFromDOM();
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Observation Data');
    
    // Dynamically extract all unique keys from the observation data
    const allKeys = new Set();
    observationData.forEach(record => {
      Object.keys(record).forEach(key => allKeys.add(key));
    });
    
    // Fixed order of columns that should always be used (regardless of other keys)
    const fixedOrderColumns = [
      'S/N',
      'Observer', 
      'Bird ID',
      'Location',
      'Latitude', 
      'Longitude',
      'Number of Bird(s)',
      'Height of Tree',
      'Height of Bird',
      'Date',
      'Time',
      'Activity',
      'Seen/Heard',
      'Activity Details'
    ];
    
    // Map to normalize variations of the same field
    const fieldMappings = {
      // Observer variations
      'Observer name': 'Observer',
      'observer': 'Observer',
      // Bird ID variations
      'SHB individual ID': 'Bird ID',
      'birdId': 'Bird ID',
      'birdID': 'Bird ID',
      // Location variations
      'location': 'Location',
      // Latitude variations
      'Latitude': 'Latitude',
      'Lat': 'Latitude',
      // Longitude variations
      'Longitude': 'Longitude',
      'Long': 'Longitude',
      // Number of Birds variations
      'numberOfBirds': 'Number of Bird(s)',
      'count': 'Number of Bird(s)',
      'Number of Birds': 'Number of Bird(s)',
      // Height of Tree variations
      'Height of tree/m': 'Height of Tree',
      'heightOfTree': 'Height of Tree',
      'treeHeight': 'Height of Tree',
      // Height of Bird variations
      'Height of bird/m': 'Height of Bird',
      'heightOfBird': 'Height of Bird',
      'birdHeight': 'Height of Bird',
      // Date variations
      'date': 'Date',
      'observationDate': 'Date',
      // Time variations
      'time': 'Time',
      // Activity variations
      'Activity (foraging, preening, calling, perching, others)': 'Activity',
      'activity': 'Activity',
      // Seen/Heard variations
      'seenHeard': 'Seen/Heard',
      'seen_heard': 'Seen/Heard',
      'seen/heard': 'Seen/Heard',
      // Activity Details variations
      'Activity details': 'Activity Details',
      'activityDetails': 'Activity Details',
      'Details': 'Activity Details',
      'activity_details': 'Activity Details'
    };
    
    // Create the headers array with fixed order and add any additional headers at the end
    const headers = [...fixedOrderColumns];
    
    console.log(`Exporting ${headers.length} columns: ${headers.join(', ')}`);
    
    const headerRowIndex = 1; // Headers start at row 1 (no legend)
    
    // Set up columns with appropriate widths
    worksheet.columns = headers.map((header) => {
      let width = 15; // default width
      
      // Adjust column widths based on header content
      switch (header) {
        case 'S/N':
          width = 10;
          break;
        case 'Observer':
          width = 25;
          break;
        case 'Bird ID':
          width = 15;
          break;
        case 'Location':
          width = 30;
          break;
        case 'Latitude':
        case 'Longitude':
          width = 15;
          break;
        case 'Number of Bird(s)':
          width = 18;
          break;
        case 'Height of Tree':
        case 'Height of Bird':
          width = 15;
          break;
        case 'Date':
        case 'Time':
          width = 15;
          break;
        case 'Activity':
          width = 25;
          break;
        case 'Seen/Heard':
          width = 15;
          break;
        case 'Activity Details':
          width = 200; // 10x the default width
          break;
        default:
          width = 15;
      }
      
      return {
        header: header,
        key: header,
        width: width
      };
    });
    
    // Add header row
    const headerRow = worksheet.getRow(headerRowIndex);
    headers.forEach((header, index) => {
      headerRow.getCell(index + 1).value = header;
    });
    
    // Add data rows from observationData
    observationData.forEach((record, index) => {
      const dataRow = worksheet.getRow(headerRowIndex + 1 + index);
      
      // Create normalized record with standardized keys
      const normalizedRecord = {};
      Object.keys(record).forEach(key => {
        const normalizedKey = fieldMappings[key] || key;
        normalizedRecord[normalizedKey] = record[key];
      });
      
      // Add S/N column (starts at 1)
      normalizedRecord['S/N'] = index + 1;
      
      // Add data to each cell based on headers
      headers.forEach((header, colIndex) => {
        const cellValue = normalizedRecord[header] !== undefined ? normalizedRecord[header] : '';
        dataRow.getCell(colIndex + 1).value = cellValue;
      });
      
      // Find Seen/Heard value for row styling
      let seenHeardValue = normalizedRecord['Seen/Heard'] || '';
      seenHeardValue = seenHeardValue.toString().toLowerCase();
      
      // Apply row styling based on Seen/Heard value
      let rowFillColor = { argb: 'FFFFFFFF' }; // Default white
      let rowFontColor = { argb: 'FF000000' }; // Black font
      
      if (seenHeardValue === 'seen') {
        rowFillColor = { argb: 'FFA8E6CF' }; // Light green for "Seen" - matches UI
      } else if (seenHeardValue === 'heard') {
        rowFillColor = { argb: 'FFFFE0B2' }; // Light orange for "Heard" - matches UI
      } else if (seenHeardValue === 'not found' || seenHeardValue === 'notfound') {
        rowFillColor = { argb: 'FFE0E0E0' }; // Light gray for "Not found" - matches UI
      } else {
        // Apply alternating row colors for other values
        if (index % 2 === 0) {
          rowFillColor = { argb: 'FFFFFFFF' }; // Even rows - white background
        } else {
          rowFillColor = { argb: 'FFE6F3FF' }; // Odd rows - light blue background
        }
      }
      
      // Apply styling to entire row
      dataRow.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: rowFillColor
        };
        cell.font = { color: rowFontColor };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    // Style header row
    const styledHeaderRow = worksheet.getRow(headerRowIndex);
    styledHeaderRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FF333333' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB3B3B3' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Generate filename with timestamp
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `as of ${day}${month}${year} at ${hours}${minutes}${seconds} hrs`;
    const fileName = `Observation Data ${timestamp}.xlsx`;
    
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
  };

  // Fallback method to scrape table from DOM
  exportTableFromDOM = async () => {
    // Try multiple selectors to find table data - prioritize observation data table
    const tableSelectors = [
      // Add more robust selectors for your dashboard table
      '.MuiTable-root',
      '.dashboard-table table',
      '.observation-data table',
      '.observation-table table',
      'table[class*="observation"]',
      'table[id*="observation"]',
      '.data-table table',
      '.table-container table',
      'table',
      '[role="table"]',
      '.table',
      '.data-grid table',
      '.survey-table table'
    ];
    
    let dataElement = null;
    for (const selector of tableSelectors) {
      dataElement = document.querySelector(selector);
      if (dataElement && dataElement.querySelectorAll('tr').length > 0) {
        console.log(`Found table using selector: ${selector}`);
        break;
      }
    }

    // If no table found, fallback to props data if available
    if (!dataElement) {
      console.warn('No table found in DOM, trying to export from props...');
      if (this.props.shbData && Array.isArray(this.props.shbData) && this.props.shbData.length > 0) {
        // Use the same logic as exportExcel to export from props
        return this.exportExcel();
      }
      // If no props data, show error message
      console.error('No table data found to export');
      alert('No table data found to export. Please ensure you are on a page with data table.');
      return;
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Observation Data');
    
    const startRowIndex = 1; // Data starts at row 1 (no legend)
    
    // Extract table data with better error handling
    let rows;
    try {
      rows = Array.from(dataElement.querySelectorAll('tr'));
      console.log(`Found ${rows.length} table rows`);
    } catch (error) {
      console.error('Error extracting table rows:', error);
      throw new Error('Failed to extract table data');
    }
    
    // Process data with improved handling for observation data
    const data = rows.map((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      console.log(`Row ${rowIndex}: ${cells.length} cells`);
      return cells.map(cell => {
        // Get text content and clean it up
        let text = cell.textContent || cell.innerText || '';
        text = text.trim().replace(/\s+/g, ' '); // Normalize whitespace
        
        // Handle special cases for observation data
        if (text.includes('m') && /^\d+m$/.test(text)) {
          // Keep height measurements as is (e.g., "20m", "12m")
          return text;
        }
        
        return text;
      });
    }).filter(row => row.length > 0 && row.some(cell => cell.length > 0)); // Filter out empty rows
    
    console.log(`Processed ${data.length} data rows`);
    
    // Extract headers from the first row (since there are 2 header rows)
    let headers = [];
    if (data.length > 0 && data[0].length > 0) {
      headers = data[0]; // Use first row as headers
      console.log('Extracted headers from DOM:', headers);
    } else {
      // Fallback to predefined headers if extraction fails
      headers = [
        'Observer', 
        'Bird ID',
        'Location',
        'Number of Bird(s)',
        'Height of Tree',
        'Height of Bird',
        'Date',
        'Time',
        'Activity',
        'Seen/Heard'
      ];
      console.log('Using fallback headers');
    }
    
    // Remove the first 2 rows from the data (both header rows)
    const processedData = data.slice(2);
    
    // Set up columns with appropriate headers for observation data
    if (processedData.length > 0) {
      worksheet.columns = headers.map((header, index) => {
        let width = 20; // default width
        
        // Adjust column widths based on header content
        if (header.toLowerCase().includes('observer')) {
          width = 25;
        } else if (header.toLowerCase().includes('location')) {
          width = 30;
        } else if (header.toLowerCase().includes('date')) {
          width = 15;
        } else if (header.toLowerCase().includes('bird id')) {
          width = 12;
        } else if (header.toLowerCase().includes('s/n')) {
          width = 8;
        }
        
        return {
          header: header,
          key: `col${index}`,
          width: width
        };
      });
      
      // Add header row first at the designated start row
      const headerRow = worksheet.getRow(startRowIndex);
      headers.forEach((header, index) => {
        headerRow.getCell(index + 1).value = header;
      });
      
      // Add data rows with styling (using processedData which already has first 2 rows removed)
      processedData.forEach((row, index) => {
        const dataRow = worksheet.getRow(startRowIndex + 1 + index);
        row.forEach((cell, cellIndex) => {
          dataRow.getCell(cellIndex + 1).value = cell;
        });
        
        // Check if this row contains Seen/Heard data for special styling
        const seenHeardValue = row.find(cell => 
          cell?.toString().toLowerCase() === 'seen' || 
          cell?.toString().toLowerCase() === 'heard' || 
          cell?.toString().toLowerCase() === 'not found' ||
          cell?.toString().toLowerCase() === 'notfound'
        )?.toString().toLowerCase();
        
        // Determine row styling based on Seen/Heard value
        let rowFillColor = { argb: 'FFFFFFFF' }; // Default white
        let rowFontColor = { argb: 'FF000000' }; // Black font
        
        if (seenHeardValue === 'seen') {
          rowFillColor = { argb: 'FFA8E6CF' }; // Light green for "Seen" - matches UI
        } else if (seenHeardValue === 'heard') {
          rowFillColor = { argb: 'FFFFE0B2' }; // Light orange for "Heard" - matches UI
        } else if (seenHeardValue === 'not found' || seenHeardValue === 'notfound') {
          rowFillColor = { argb: 'FFE0E0E0' }; // Light gray for "Not found" - matches UI
        } else {
          // Apply alternating row colors for other values
          if (index % 2 === 0) {
            rowFillColor = { argb: 'FFFFFFFF' }; // Even rows - white background
          } else {
            rowFillColor = { argb: 'FFE6F3FF' }; // Odd rows - light blue background
          }
        }
        
        // Apply styling to entire row
        dataRow.eachCell(cell => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: rowFillColor
          };
          cell.font = { color: rowFontColor };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    }
    
    // Style header row
    const domHeaderRow = worksheet.getRow(startRowIndex);
    domHeaderRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FF333333' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB3B3B3' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Generate filename with timestamp
    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const fileName = `Observation Data ${timestamp}.xlsx`;
    
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
  };


  
  // Helper method to extract text content from an element
  extractTextFromElement = (element) => {
    const texts = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text && text.length > 2 && !texts.includes(text)) {
        texts.push(text);
      }
    }
    
    return texts;
  };

  loadMaintenanceStatus = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'getMaintenanceStatus'
      });
      
      if (response.data.status) {
        this.setState({
          lastMaintenance: response.data.status.lastMaintenance,
          activeTasks: response.data.status.activeTasks || [],
          systemHealth: response.data.status.systemHealth || this.state.systemHealth
        });
      }
    } catch (error) {
      console.error('Failed to load maintenance status:', error);
    }
  };

  togglePanel = () => {
    this.setState(prevState => ({
      isOpen: !prevState.isOpen,
      showQuickActions: false
    }));
  };

  runMaintenanceTask = async (taskType) => {
    this.setState({ maintenanceStatus: 'running' });
    
    try {
      const response = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'runMaintenance',
        taskType: taskType,
        immediate: true
      });

      if (response.data.result) {
        this.setState({ 
          maintenanceStatus: 'completed',
          lastMaintenance: new Date().toISOString()
        });
        
        // Auto close after 3 seconds
        setTimeout(() => {
          this.setState({ maintenanceStatus: 'idle' });
        }, 3000);
      }
    } catch (error) {
      console.error('Maintenance task failed:', error);
      this.setState({ maintenanceStatus: 'error' });
      
      setTimeout(() => {
        this.setState({ maintenanceStatus: 'idle' });
      }, 3000);
    }
  };

  getStatusColor = () => {
    const { systemHealth } = this.state;
    if (systemHealth.database === 'error' || systemHealth.storage === 'error') {
      return '#ef4444'; // red
    }
    if (systemHealth.performance === 'slow') {
      return '#f59e0b'; // yellow
    }
    return '#ffffff'; // green
  };

  // Force refresh tab detection (useful for ensuring UI updates)
  forceRefreshTabDetection = () => {
    if (this.state.currentPage === 'dashboard') {
      const currentTab = this.detectActiveDashboardTab();
      this.setState({ activeDashboardTab: currentTab });
      console.log(`Force refresh - current tab: ${currentTab}`);
      return currentTab;
    }
    return null;
  };

  // Public method for external components to trigger tab update
  updateTabDetection = () => {
    if (this.state.currentPage === 'dashboard') {
      setTimeout(() => {
        this.forceRefreshTabDetection();
      }, 100);
    }
  };

  // Helper method to calculate element score for PDF export selection
  calculateElementScore = (element) => {
    if (!element || !this.isElementVisible(element)) return 0;
    
    let score = 0;
    
    // Size score (larger elements get higher scores, but with diminishing returns)
    const area = element.offsetWidth * element.offsetHeight;
    score += Math.min(area / 10000, 50); // Max 50 points for size
    
    // Content score based on meaningful children
    const charts = element.querySelectorAll('canvas, svg, [class*="chart"], [class*="graph"]').length;
    const tables = element.querySelectorAll('table, [class*="table"]').length;
    const images = element.querySelectorAll('img').length;
    const dataElements = element.querySelectorAll('[class*="data"], [class*="stat"], [class*="metric"]').length;
    
    score += charts * 15; // Charts are valuable
    score += tables * 10; // Tables are valuable
    score += images * 5;  // Images add value
    score += dataElements * 3; // Data elements add value
    
    // Dashboard-specific bonus points
    const className = element.className.toLowerCase();
    const id = element.id ? element.id.toLowerCase() : '';
    
    if (className.includes('dashboard')) score += 20;
    if (className.includes('content')) score += 15;
    if (className.includes('main')) score += 10;
    if (className.includes('overview') || className.includes('visualization') || className.includes('data')) score += 8;
    if (id.includes('dashboard') || id.includes('main')) score += 10;
    
    // Penalty for elements that are likely containers without meaningful content
    if (className.includes('wrapper') && element.children.length < 3) score -= 5;
    if (className.includes('container') && element.children.length < 2) score -= 3;
    
    // Bonus for elements with good depth of content
    const depth = this.getElementDepth(element);
    if (depth > 3) score += Math.min(depth, 10);
    
    // Text content bonus (but not too much - we want visual content)
    const textLength = element.textContent?.trim().length || 0;
    if (textLength > 100) score += Math.min(textLength / 200, 5);
    
    return Math.max(score, 0);
  };

  // Helper method to get element depth
  getElementDepth = (element) => {
    let maxDepth = 0;
    
    function traverse(node, depth) {
      maxDepth = Math.max(maxDepth, depth);
      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    }
    
    traverse(element, 0);
    return maxDepth;
  };

  // Helper method to wait for all images to load
  waitForImages = async (element) => {
    const images = element.querySelectorAll('img');
    console.log(`Found ${images.length} images to wait for`);
    
    const imagePromises = Array.from(images).map((img, index) => {
      return new Promise((resolve) => {
        if (img.complete && img.naturalHeight !== 0) {
          console.log(`Image ${index + 1} already loaded: ${img.src || img.getAttribute('src')}`);
          resolve();
        } else {
          console.log(`Waiting for image ${index + 1} to load: ${img.src || img.getAttribute('src')}`);
          
          const handleLoad = () => {
            console.log(`Image ${index + 1} loaded successfully`);
            img.removeEventListener('load', handleLoad);
            img.removeEventListener('error', handleError);
            resolve();
          };
          
          const handleError = () => {
            console.warn(`Image ${index + 1} failed to load: ${img.src || img.getAttribute('src')}`);
            img.removeEventListener('load', handleLoad);
            img.removeEventListener('error', handleError);
            resolve(); // Resolve anyway to not block the export
          };
          
          img.addEventListener('load', handleLoad);
          img.addEventListener('error', handleError);
          
          // Force reload if src is already set but image hasn't loaded
          if (img.src) {
            const originalSrc = img.src;
            img.src = '';
            img.src = originalSrc;
          }
          
          // Timeout after 5 seconds to prevent hanging
          setTimeout(() => {
            console.warn(`Image ${index + 1} load timeout: ${img.src || img.getAttribute('src')}`);
            img.removeEventListener('load', handleLoad);
            img.removeEventListener('error', handleError);
            resolve();
          }, 5000);
        }
      });
    });
    
    // Wait for all images or timeout after 10 seconds
    try {
      await Promise.race([
        Promise.all(imagePromises),
        new Promise(resolve => setTimeout(resolve, 10000))
      ]);
      console.log('All images loaded or timeout reached');
    } catch (error) {
      console.warn('Error waiting for images:', error);
    }
  };

  // Helper method to wait for background images to load
  waitForBackgroundImages = async (element) => {
    const elementsWithBgImages = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      const style = window.getComputedStyle(node);
      const bgImage = style.backgroundImage;
      
      if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
        elementsWithBgImages.push({
          element: node,
          bgImage: bgImage
        });
      }
    }
    
    console.log(`Found ${elementsWithBgImages.length} elements with background images`);
    
    const bgImagePromises = elementsWithBgImages.map(({ element, bgImage }, index) => {
      return new Promise((resolve) => {
        // Extract URL from background-image CSS property
        const urlMatch = bgImage.match(/url\(['"]?([^'")]+)['"]?\)/);
        if (!urlMatch) {
          resolve();
          return;
        }
        
        const imageUrl = urlMatch[1];
        console.log(`Loading background image ${index + 1}: ${imageUrl}`);
        
        const img = new Image();
        
        const handleLoad = () => {
          console.log(`Background image ${index + 1} loaded successfully`);
          resolve();
        };
        
        const handleError = () => {
          console.warn(`Background image ${index + 1} failed to load: ${imageUrl}`);
          resolve(); // Resolve anyway to not block the export
        };
        
        img.addEventListener('load', handleLoad);
        img.addEventListener('error', handleError);
        
        // Set CORS attributes for external images
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        
        // Timeout after 5 seconds
        setTimeout(() => {
          console.warn(`Background image ${index + 1} load timeout: ${imageUrl}`);
          resolve();
        }, 5000);
      });
    });
    
    try {
      await Promise.all(bgImagePromises);
      console.log('All background images loaded');
    } catch (error) {
      console.warn('Error waiting for background images:', error);
    }
  };

  handleClickOutside = (event) => {
    // Close panel when clicking outside
    if (this.state.isOpen && this.panelRef && !this.panelRef.contains(event.target) && 
        this.buttonRef && !this.buttonRef.contains(event.target)) {
      this.setState({ isOpen: false });
    }
  }

  // Chat functionality methods
  handleChatToggle = () => {
    this.setState(prevState => ({ 
      showChat: !prevState.showChat,
      isOpen: false // Close the maintenance bot popup when chat opens
    }));
  }

  handleSendMessage = (message) => {
    const { messages } = this.state;
    const newUserMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };

    this.setState({
      messages: [...messages, newUserMessage]
    });
  }

  handleBotResponse = (response) => {
    const newBotMessage = {
      id: Date.now() + 1,
      text: response,
      sender: 'bot',
      timestamp: new Date()
    };

    this.setState(prevState => ({
      messages: [...prevState.messages, newBotMessage]
    }));
  }

  render() {
    const { isOpen, maintenanceStatus, lastMaintenance, activeTasks, systemHealth, showQuickActions, isHidden, showExportActions, exportStatus, currentPage, activeDashboardTab, showChat, messages } = this.state;
    const statusColor = this.getStatusColor();
    const exportType = currentPage === 'dashboard' && activeDashboardTab === 'dataTable' ? 'Excel' : 'PDF';
    const isDataTableTab = currentPage === 'dashboard' && activeDashboardTab === 'dataTable';
    const backupTooltip = currentPage !== 'dashboard' 
      ? 'Backup only available on Dashboard page' 
      : !isDataTableTab 
        ? 'Export only available on Data Table tab - please switch to Data Table'
        : `Create backup (${exportType} export + backend backup)`;
    if (isHidden) return null;
    return (
      <>
        {/* SHB Survey Assistant Chat Component */}
        <SHBSurveyAssistant 
          showChat={showChat}
          onChatToggle={this.handleChatToggle}
          messages={messages}
          onSendMessage={this.handleSendMessage}
          onBotResponse={this.handleBotResponse}
          currentPage={currentPage}
        />

        {/* Floating Button with image icon */}
        <div className={`maintenance-bot-container ${isHidden ? 'hidden' : ''}`}>
          <button
            ref={(ref) => this.buttonRef = ref}
            className={`maintenance-bot-button ${isOpen ? 'open' : ''}`}
            onClick={this.togglePanel}
            style={{
              position: 'fixed',
              bottom: 20,
              right: 110, /* Moved further right to avoid chat bot */
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: statusColor,
              border: 'none',
              color: 'white',
              fontSize: 24,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 999,
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Dashboard Tools & Settings"
          >
            {/* Modern robot image icon */}
            <img
              src={'./robot.png'}
              alt="Maintenance Bot"
              style={{ width: 36, height: 36, objectFit: 'contain', display: 'block' }}
            />
          </button>
          {/* Maintenance Panel */}
          {isOpen && (
            <div 
              ref={(ref) => this.panelRef = ref}
              className="maintenance-panel"
              style={{
                position: 'fixed',
                bottom: 90,
                right: 110, /* Moved to align with button */
                width: 320,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                zIndex: 998,
                border: '1px solid #e5e7eb'
              }}
            >
              {/* Panel Header */}
              <div style={{
                padding: 16,
                borderBottom: '1px solid #e5e7eb',
                background: '#f8fafc',
                borderRadius: '12px 12px 0 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={'./robot.png'} alt="Maintenance Bot" style={{ width: 24, height: 24, objectFit: 'contain', display: 'inline-block' }} />
                      <span>Dashboard Tools & Settings</span>
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#6b7280' }}>
                      System settings, exports, and other tools
                    </p>
                  </div>
                  <div 
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: statusColor
                    }}
                    title="System Health"
                  />
                </div>
              </div>
              <div style={{ padding: 16 }}>
                {/* System Health */}
                <SystemHealthStatus systemHealth={systemHealth} />
                {/* Quick Actions */}
                <QuickActionsPanel
                  showQuickActions={showQuickActions}
                  currentUser={this.props.currentUser}
                  onToggleQuickActions={() => this.setState(prev => ({ showQuickActions: !prev.showQuickActions }))}
                  onBackup={() => this.exportCurrentPage('backup')}
                  onChatbot={this.handleChatToggle}
                  backupDisabled={
                    currentPage !== 'dashboard' ||
                    !isDataTableTab ||
                    exportStatus === 'exporting' ||
                    activeDashboardTab === 'visualization' ||
                    (currentPage === 'dashboard' && isDataTableTab && window.dataViewCurrentView === 'pivot')
                  }
                  backupTooltip={
                    activeDashboardTab === 'visualization'
                      ? 'Pivot table export is not supported at this time.'
                      : (currentPage === 'dashboard' && isDataTableTab && window.dataViewCurrentView === 'pivot')
                        ? 'Export is not supported for Pivot View.'
                        : backupTooltip
                 
                  }
                />
                {/* Status Messages */}
                <StatusMessages maintenanceStatus={maintenanceStatus} exportStatus={exportStatus} />
                {/* Last Maintenance */}
                <LastMaintenanceInfo lastMaintenance={lastMaintenance} />
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
}

export default MaintenanceBotButton;
