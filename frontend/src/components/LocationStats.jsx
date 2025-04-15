// src/components/LocationStats.jsx
import React, { Component } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { countByLocation } from '../utils/dataProcessing';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

class LocationStats extends Component {
  render() {
    const { data } = this.props;
    const locationData = countByLocation(data);
    
    return (
      <div className="chart-container">
        <h2>Observations by Location</h2>
        <ResponsiveContainer width="100%" height={500}>
          <PieChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }} // 👈 Adds spacing for legend
          >
            <Pie
              data={locationData}
              dataKey="count"
              nameKey="location"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label
            >
              {locationData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }
}

export default LocationStats;