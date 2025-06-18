import React, { Suspense, lazy, Component } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { ClipLoader } from 'react-spinners'; // Import the spinner
import fallbackData from './data/fallbackData';

// Dynamically import the components
const Dashboard = lazy(() => import('./components/Dashboard'));
const TelegramMessaging = lazy(() => import('./components/WWFSurveyBot'));
const Home = lazy(() => import('./components/Home')); // Import the new Home component

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      shbData: fallbackData, // Start with fallback data
      isLoading: true,
      dataSource: 'fallback'
    };
  }

  async componentDidMount() {
    try {
      // Dynamically import and load the async shbData
      const { default: loadShbData } = await import('./data/shbData');
      
      // shbData is the result of the async function
      if (loadShbData && Array.isArray(loadShbData) && loadShbData.length > 0) {
        console.log('Loaded real shbData:', loadShbData.length, 'observations');
        this.setState({ 
          shbData: loadShbData, 
          isLoading: false,
          dataSource: 'google-sheets'
        });
      } else {
        console.log('Using fallback data:', fallbackData.length, 'observations');
        this.setState({ 
          shbData: fallbackData, 
          isLoading: false,
          dataSource: 'fallback'
        });
      }
    } catch (error) {
      console.error('Error loading shbData, using fallback:', error);
      this.setState({ 
        shbData: fallbackData, 
        isLoading: false,
        dataSource: 'fallback'
      });
    }
  }

  render() {
    const { shbData, isLoading, dataSource } = this.state;
    
    return (
      <div className="App">
        <Router>
          {/* Wrap your Routes with Suspense */}
          <Suspense fallback={<div className="spinner-container"><ClipLoader color="#3498db" size={50} /></div>}>
            <Routes>
              {/* Define your routes - note the element prop instead of component or children */}
              <Route path="/" element={<Home shbData={shbData} isLoading={isLoading} dataSource={dataSource} />} />
              <Route path="/dashboard" element={<Dashboard data={shbData} isLoading={isLoading} dataSource={dataSource} />} />
              <Route path="/automated" element={<TelegramMessaging />} />
            </Routes>
          </Suspense>
        </Router>
      </div>
    );
  }
}

export default App;