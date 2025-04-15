import React, { Component } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { countByLocation } from '../utils/dataProcessing';

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1',
  '#d0ed57', '#ffb6c1', '#ff6347', '#2e8b57', '#adff2f', '#da70d6', '#f08080', '#f5deb3',
  '#d2691e', '#ff1493', '#ff4500', '#2e8b57', '#d3d3d3', '#a52a2a', '#9acd32', '#f4a300',
  '#7b68ee', '#87cefa', '#32cd32', '#ff7f50', '#ff4500', '#ff6347', '#ff1493', '#8b4513',
  '#bc8f8f', '#b8860b', '#ff8c00', '#9932cc', '#8a2be2', '#ff69b4', '#c71585', '#f0e68c',
  '#6a5acd', '#20b2aa', '#98fb98', '#ff0000', '#fa8072', '#dcdcdc', '#c0c0c0', '#708090',
  '#add8e6', '#fdf5e6', '#ffdead', '#a9a9a9', '#ffdb58'
];

class LocationStats extends Component {
  state = {
    showLegend: false,
    activeLocation: null, // Track the clicked location
    activeIndex: null, // Track the active pie slice index
  };

  toggleLegend = () => {
    this.setState((prevState) => ({ showLegend: !prevState.showLegend }));
  };

  render() {
    const { data } = this.props;
    const locationData = countByLocation(data);
    const { showLegend, activeLocation, activeIndex } = this.state;

    return (
      <div
        className="chart-container"
        style={{
          position: 'relative',
          overflow: 'visible',
          padding: '2rem', // Increased padding to add space around the chart
          zIndex: 0,
        }}
      >
        <h2>Observations by Location</h2>

        <button
          onClick={this.toggleLegend}
          className="legend-toggle-button"
          style={{
            marginBottom: '1rem', // Adjust space between button and chart
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        >
          {showLegend ? 'Hide Legend' : 'Show Legend'}
        </button>

        {showLegend && (
          <div
            className="legend-popup"
            style={{
              position: 'absolute',
              top: '4rem', // Adjusted to give more room for the chart
              right: '1rem',
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              padding: '1rem',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              zIndex: 9999,
            }}
          >
            <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
              {locationData.map((entry, index) => (
                <li
                  key={index}
                  style={{ color: COLORS[index % COLORS.length], marginBottom: '0.5rem' }}
                >
                  {entry.location}
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeLocation && (
          <div
            style={{
              position: 'absolute',
              top: '4rem', // Adjusted to give more room for the chart
              left: '1rem',
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              padding: '1rem',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              zIndex: 9999,
            }}
          >
            <h3>{activeLocation.location}</h3>
            <p>Count: {activeLocation.count}</p>
          </div>
        )}

        {/* Chart container, now placed below the button */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '500px',
            marginTop: '2rem', // Add some space between the button and the chart
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={locationData}
                dataKey="count"
                nameKey="location"
                cx="50%"
                cy="50%"
                fill="#8884d8"
              >
                {locationData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]} // Use colors from the COLORS array
                    onMouseEnter={() => this.setState({ activeIndex: index })} // Optional: Highlight on hoverx
                  />
                ))}
              </Pie>
              <Tooltip
                wrapperStyle={{
                  zIndex: 9999,
                  position: 'absolute',
                  pointerEvents: 'auto',
                }}
                contentStyle={{
                  fontSize: '0.75rem', // Adjust this value to make the text smaller
                  fontWeight: 'normal', // Optional: Adjust font weight if needed
                  color: '#333', // Optional: Change text color if necessary
                  backgroundColor: 'rgba(255, 255, 255, 0.9)', // Optional: Adjust background color for readability
                  borderRadius: '4px', // Optional: Add rounded corners to the tooltip
                  padding: '5px', // Optional: Adjust padding around the text
                }}
                active={activeIndex !== null} // Only show tooltip when activeIndex is set
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }
}

export default LocationStats;
