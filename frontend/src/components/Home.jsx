import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1>WWF Straw-headed Bulbul Survey Platform</h1>
        <p>Centralized dashboard for Straw-headed Bulbul conservation data and survey management</p>
      </header>
      
      <section className="features-section">
        <div className="feature-card">
          <h2>Conservation Dashboard</h2>
          <p>Access interactive visualizations of Straw-headed Bulbul population data and conservation metrics</p>
          <Link to="/dashboard" className="feature-button">View Dashboard</Link>
        </div>
        
        <div className="feature-card">
          <h2>Survey Management</h2>
          <p>Configure and send automated Telegram messages to coordinate field surveys and collect data</p>
          <Link to="/automated" className="feature-button">Manage Surveys</Link>
        </div>
      </section>

      <section className="info-section">
        <div className="info-content">
          <h3>About the Straw-headed Bulbul</h3>
          <p>The Straw-headed Bulbul (Pycnonotus zeylanicus) is a critically endangered bird species native to Southeast Asia. 
             Our conservation efforts focus on monitoring populations and protecting their habitat.</p>
        </div>
      </section>
    </div>
  );
};

export default Home;