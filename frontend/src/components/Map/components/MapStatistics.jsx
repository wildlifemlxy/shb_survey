import React, { Component } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Target, BarChart3, CheckCircle, TrendingUp, Eye, Headphones, XCircle } from 'lucide-react';
import './MapStatistics.css';

class MapStatistics extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isVisible: false,
      animationDelay: 0
    };
  }

  componentDidMount() {
    // Trigger animation after component mounts
    setTimeout(() => {
      this.setState({ isVisible: true });
    }, 100);
  }

  calculateStatistics = () => {
    const { data, validCoordinates } = this.props;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        totalObservations: 0,
        observationsWithCoordinates: 0,
        coordinatesCoverage: 0,
        seenCount: 0,
        heardCount: 0,
        notFoundCount: 0,
        locationsWithCoordinates: 0,
        totalUniqueLocations: 0,
        qualityRating: 'No Data'
      };
    }

    const totalObservations = data.length;
    const observationsWithCoordinates = validCoordinates ? validCoordinates.length : 0;
    const coordinatesCoverage = totalObservations > 0 ? (observationsWithCoordinates / totalObservations) * 100 : 0;
    
    // Calculate observation types
    const seenCount = data.filter(obs => obs["Seen/Heard"] === "Seen").length;
    const heardCount = data.filter(obs => obs["Seen/Heard"] === "Heard").length;
    const notFoundCount = data.filter(obs => obs["Seen/Heard"] === "Not found").length;
    
    // Calculate unique locations
    const locationsWithCoordinates = new Set(
      validCoordinates ? validCoordinates.map(obs => obs.Location) : []
    ).size;
    
    const totalUniqueLocations = new Set(data.map(obs => obs.Location)).size;

    // Determine quality rating
    let qualityRating = 'Poor';
    if (coordinatesCoverage >= 90) qualityRating = 'Excellent';
    else if (coordinatesCoverage >= 75) qualityRating = 'Very Good';
    else if (coordinatesCoverage >= 60) qualityRating = 'Good';
    else if (coordinatesCoverage >= 40) qualityRating = 'Fair';

    return {
      totalObservations,
      observationsWithCoordinates,
      coordinatesCoverage,
      seenCount,
      heardCount,
      notFoundCount,
      locationsWithCoordinates,
      totalUniqueLocations,
      qualityRating
    };
  };

  getQualityColor = (coverage) => {
    if (coverage >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (coverage >= 75) return 'text-green-600 bg-green-50 border-green-200';
    if (coverage >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (coverage >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  render() {
    const { isVisible } = this.state;
    const stats = this.calculateStatistics();

    if (!this.props.data || !Array.isArray(this.props.data) || this.props.data.length === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <MapPin className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Map Statistics</h2>
              <p className="text-sm text-gray-500">Geographic distribution analysis</p>
            </div>
          </div>
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No data available for map statistics</p>
          </div>
        </motion.div>
      );
    }

    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.1
        }
      }
    };

    const cardVariants = {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: {
          duration: 0.5,
          ease: "easeOut"
        }
      }
    };

    return (
      <motion.div 
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        variants={containerVariants}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6"
      >
        {/* Header */}
        <motion.div 
          variants={cardVariants}
          className="flex items-center gap-3 mb-6"
        >
          <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-sm">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Map Statistics</h2>
            <p className="text-sm text-gray-500">Geographic distribution and coordinate quality metrics</p>
          </div>
        </motion.div>
        
        {/* Stats Grid */}
        <motion.div 
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Coordinate Coverage Card */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-700">
                  {Math.round(stats.coordinatesCoverage)}%
                </div>
                <div className="text-xs text-blue-600 font-medium">Coverage Rate</div>
              </div>
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Coordinate Coverage</h3>
            <p className="text-xs text-gray-600 mb-3">Observations with valid GPS coordinates</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Mapped
                </span>
                <span className="font-medium">{stats.observationsWithCoordinates}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-red-500 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Missing
                </span>
                <span className="font-medium">{stats.totalObservations - stats.observationsWithCoordinates}</span>
              </div>
            </div>
          </motion.div>

          {/* Geographic Spread Card */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-700">
                  {stats.locationsWithCoordinates}
                </div>
                <div className="text-xs text-green-600 font-medium">Mapped Locations</div>
              </div>
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Geographic Spread</h3>
            <p className="text-xs text-gray-600 mb-3">Locations with mappable data</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Total Locations</span>
                <span className="font-medium">{stats.totalUniqueLocations}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Mapping Rate
                </span>
                <span className="font-medium">
                  {stats.totalUniqueLocations > 0 ? Math.round((stats.locationsWithCoordinates / stats.totalUniqueLocations) * 100) : 0}%
                </span>
              </div>
            </div>
          </motion.div>

          {/* Observation Distribution Card */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-700">
                  {stats.totalObservations}
                </div>
                <div className="text-xs text-purple-600 font-medium">Total Records</div>
              </div>
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Observation Types</h3>
            <p className="text-xs text-gray-600 mb-3">Distribution of detection methods</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-blue-600 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Seen
                </span>
                <span className="font-medium">{stats.seenCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-green-600 flex items-center gap-1">
                  <Headphones className="w-3 h-3" />
                  Heard
                </span>
                <span className="font-medium">{stats.heardCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-red-500 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Not Found
                </span>
                <span className="font-medium">{stats.notFoundCount}</span>
              </div>
            </div>
          </motion.div>

          {/* Data Quality Card */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className={`bg-gradient-to-br rounded-xl p-4 border hover:shadow-md transition-all duration-200 ${
              stats.coordinatesCoverage >= 90 ? 'from-emerald-50 to-green-50 border-emerald-100' :
              stats.coordinatesCoverage >= 75 ? 'from-green-50 to-lime-50 border-green-100' :
              stats.coordinatesCoverage >= 60 ? 'from-blue-50 to-cyan-50 border-blue-100' :
              stats.coordinatesCoverage >= 40 ? 'from-yellow-50 to-orange-50 border-yellow-100' :
              'from-red-50 to-pink-50 border-red-100'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${
                stats.coordinatesCoverage >= 90 ? 'bg-emerald-100' :
                stats.coordinatesCoverage >= 75 ? 'bg-green-100' :
                stats.coordinatesCoverage >= 60 ? 'bg-blue-100' :
                stats.coordinatesCoverage >= 40 ? 'bg-yellow-100' :
                'bg-red-100'
              }`}>
                <CheckCircle className={`w-5 h-5 ${
                  stats.coordinatesCoverage >= 90 ? 'text-emerald-600' :
                  stats.coordinatesCoverage >= 75 ? 'text-green-600' :
                  stats.coordinatesCoverage >= 60 ? 'text-blue-600' :
                  stats.coordinatesCoverage >= 40 ? 'text-yellow-600' :
                  'text-red-600'
                }`} />
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  stats.coordinatesCoverage >= 90 ? 'text-emerald-700' :
                  stats.coordinatesCoverage >= 75 ? 'text-green-700' :
                  stats.coordinatesCoverage >= 60 ? 'text-blue-700' :
                  stats.coordinatesCoverage >= 40 ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {stats.qualityRating}
                </div>
                <div className={`text-xs font-medium ${
                  stats.coordinatesCoverage >= 90 ? 'text-emerald-600' :
                  stats.coordinatesCoverage >= 75 ? 'text-green-600' :
                  stats.coordinatesCoverage >= 60 ? 'text-blue-600' :
                  stats.coordinatesCoverage >= 40 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  Data Quality
                </div>
              </div>
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Map Data Quality</h3>
            <p className="text-xs text-gray-600 mb-3">Based on coordinate completeness</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Quality Score</span>
                <span className="font-medium">{Math.round(stats.coordinatesCoverage)}%</span>
              </div>
              <div className="text-xs">
                <span className={`inline-flex items-center gap-1 ${
                  stats.coordinatesCoverage >= 90 ? 'text-emerald-600' :
                  stats.coordinatesCoverage >= 75 ? 'text-green-600' :
                  stats.coordinatesCoverage >= 60 ? 'text-blue-600' :
                  stats.coordinatesCoverage >= 40 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {stats.coordinatesCoverage >= 90 ? '🎯 Excellent for analysis' :
                   stats.coordinatesCoverage >= 75 ? '✨ Very good coverage' :
                   stats.coordinatesCoverage >= 60 ? '✅ Good for mapping' :
                   stats.coordinatesCoverage >= 40 ? '⚠️ Needs improvement' : '🔴 Review required'}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }
}

export default MapStatistics;
