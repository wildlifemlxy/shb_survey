import React, { Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  TrendingUp, 
  MapPin, 
  Clock, 
  Eye, 
  Headphones, 
  Activity, 
  BarChart3,
  Calendar,
  Users,
  TreePine,
  Target,
  Award,
  Layers,
  Download
} from 'lucide-react';
import { 
  calculateDetailedStatistics, 
  exportToCSV, 
  exportToJSON, 
  formatPercentage, 
  formatDate, 
  getTopActivities, 
  getTopLocations 
} from '../utils/detailedAnalysisUtils';
import '../css/components/DetailedAnalysisPopup.css';

class DetailedAnalysisPopup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeSection: 'overview',
      exportLoading: false
    };
  }

  getStats = () => {
    return calculateDetailedStatistics(this.props.data);
  };

  renderOverviewSection = () => {
    const stats = this.getStats();
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px' 
        }}>
          <motion.div 
            whileHover={{ scale: 1.02 }}
            style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #bfdbfe'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <BarChart3 style={{ width: '20px', height: '20px', color: '#2563eb' }} />
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e40af' }}>Total Records</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a' }}>{stats.totalObservations}</div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #bbf7d0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <MapPin style={{ width: '20px', height: '20px', color: '#16a34a' }} />
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#15803d' }}>Locations</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534' }}>{stats.uniqueLocations}</div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            style={{
              background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #d8b4fe'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Users style={{ width: '20px', height: '20px', color: '#9333ea' }} />
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#7c3aed' }}>Observers</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b21a8' }}>{stats.uniqueObservers}</div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            style={{
              background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #fdba74'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Target style={{ width: '20px', height: '20px', color: '#ea580c' }} />
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#dc2626' }}>Individuals</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c2410c' }}>{stats.uniqueIndividuals}</div>
          </motion.div>
        </div>

        <div style={{
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <TrendingUp style={{ width: '20px', height: '20px', color: '#374151' }} />
            Key Insights
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '16px' 
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <h4 style={{ fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Average Bird Height</h4>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#14b8a6' }}>
                {stats.avgHeight > 0 ? `${stats.avgHeight.toFixed(1)}m` : 'N/A'}
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Above ground level</p>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <h4 style={{ fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Most Active Location</h4>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#14b8a6' }}>
                {Object.keys(stats.locationFreq || {}).length > 0 
                  ? Object.entries(stats.locationFreq).reduce((a, b) => a[1] > b[1] ? a : b)[0]
                  : 'N/A'
                }
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                {Object.keys(stats.locationFreq || {}).length > 0 
                  ? `${Object.entries(stats.locationFreq).reduce((a, b) => a[1] > b[1] ? a : b)[1]} observations`
                  : 'No data'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  renderActivitySection = () => {
    const stats = this.calculateDetailedStatistics();
    const activities = Object.entries(stats.activities || {}).sort((a, b) => b[1] - a[1]);

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Distribution
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activities.map(([activity, count], index) => {
            const percentage = ((count / stats.totalObservations) * 100).toFixed(1);
            return (
              <motion.div
                key={activity}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-800">{activity}</h4>
                  <span className="text-sm text-gray-600">{percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">{count} observations</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  renderLocationSection = () => {
    const stats = this.calculateDetailedStatistics();
    const locations = Object.entries(stats.locationFreq || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Top Observation Locations
        </h3>
        
        <div className="space-y-3">
          {locations.map(([location, count], index) => {
            const percentage = ((count / stats.totalObservations) * 100).toFixed(1);
            return (
              <motion.div
                key={location}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-800 flex-1">{location}</h4>
                  <div className="text-right ml-4">
                    <span className="text-lg font-bold text-primary-600">{count}</span>
                    <span className="text-sm text-gray-600 ml-1">({percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  renderTemporalSection = () => {
    const stats = this.calculateDetailedStatistics();
    const timeSlots = Object.entries(stats.timeDistribution || {}).sort();
    const months = Object.entries(stats.dateFreq || {}).sort();

    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" />
            Time Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {timeSlots.map(([time, count], index) => (
              <motion.div
                key={time}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white p-3 rounded-lg border border-gray-200 text-center"
              >
                <div className="text-sm font-medium text-gray-800">{time}</div>
                <div className="text-lg font-bold text-blue-600">{count}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" />
            Monthly Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {months.map(([month, count], index) => (
              <motion.div
                key={month}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-4 rounded-lg border border-gray-200 text-center"
              >
                <div className="text-sm font-medium text-gray-800">{month}</div>
                <div className="text-xl font-bold text-green-600">{count}</div>
                <div className="text-xs text-gray-600">observations</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  handleExportAnalysis = async () => {
    this.setState({ exportLoading: true });
    
    // Simulate export process
    setTimeout(() => {
      const stats = this.calculateDetailedStatistics();
      const analysisData = {
        timestamp: new Date().toISOString(),
        summary: stats,
        data: this.props.data
      };
      
      const blob = new Blob([JSON.stringify(analysisData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bird-observation-analysis-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.setState({ exportLoading: false });
    }, 1000);
  };

  render() {
    const { isOpen, onClose } = this.props;
    const { activeSection, exportLoading } = this.state;

    const sections = [
      { id: 'overview', label: 'Overview', icon: BarChart3 },
      { id: 'activities', label: 'Activities', icon: Activity },
      { id: 'locations', label: 'Locations', icon: MapPin },
      { id: 'temporal', label: 'Time Analysis', icon: Clock },
    ];

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Detailed Analysis</h2>
                    <p className="text-primary-100 mt-1">Comprehensive bird observation insights</p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={this.handleExportAnalysis}
                      disabled={exportLoading}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {exportLoading ? 'Exporting...' : 'Export'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="border-b border-gray-200 px-6">
                <nav className="flex space-x-8">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => this.setState({ activeSection: section.id })}
                        className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                          activeSection === section.id
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {section.label}
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeSection === 'overview' && this.renderOverviewSection()}
                  {activeSection === 'activities' && this.renderActivitySection()}
                  {activeSection === 'locations' && this.renderLocationSection()}
                  {activeSection === 'temporal' && this.renderTemporalSection()}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
}

export default DetailedAnalysisPopup;
