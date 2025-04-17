import React, { Component } from 'react';
import chroma from 'chroma-js'; // Import chroma.js
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { countByMonthYear } from '../utils/dataProcessing';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    const tooltipStyles = {
      heard: { color: '#D1C4E9' },
      seen: { color: '#A8E6CF' },
      NotFound: { color: '#FFCDD2' },
      total: { color: '#8884d8' }
    };

    const formatLabel = (label) => {
      const [month, year] = label.split('-');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    };

    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
        <p><strong>{formatLabel(label)}</strong></p>
        <p><strong>Observation(s):</strong></p>
        <div style={tooltipStyles.total}><strong>Total:</strong> {data.Total}</div>
        <div style={tooltipStyles.seen}><strong>Seen:</strong> {data.Seen}</div>
        <div style={tooltipStyles.heard}><strong>Heard:</strong> {data.Heard}</div>
        <div style={tooltipStyles.NotFound}><strong>Not Found:</strong> {data.NotFound}</div>
      </div>
    );
  }
  return null;
};

class DateLineChart extends Component {
  state = {
    expandedIndex: null,  // To handle collapsible behavior
  };

  renderStatistics = (locationData) => {
    const { expandedIndex } = this.state;
  
    // Aggregating totals
    const totalEntry = locationData.reduce(
      (acc, curr) => ({
        Total: acc.Total + curr.Total,
        Seen: acc.Seen + curr.Seen,
        Heard: acc.Heard + curr.Heard,
        NotFound: acc.NotFound + curr.NotFound,
      }),
      { Total: 0, Seen: 0, Heard: 0, NotFound: 0 }
    );
  
    const totalExpanded = expandedIndex === 'total';
    const totalPercentage = totalEntry.Total
      ? ((totalEntry.Total / totalEntry.Total) * 100).toFixed(2)
      : '0.00';
  
    // Helper function to format month-year as "MMM YYYY"
    const formatMonthYear = (monthYear) => {
      const [month, year] = monthYear.split('-');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    };
  
    // Dynamically generate a color palette based on the length of data
    const colorPalette = chroma.scale('Set1')  // Use a predefined, high-contrast color scale
                                    .mode('hsl')  // Using HSL ensures better color contrast and variation
                                    .colors(locationData.length);  // Adjust the number of colors based on the data length
  
    return (
      <div className="statistics-container" style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '1rem' }}>
        {/* Sticky Total Row */}
        <div
          onClick={() => this.setState({ expandedIndex: totalExpanded ? null : 'total' })}
          style={{
            position: 'sticky',
            top: 0,
            backgroundColor: totalExpanded ? '#f9f9f9' : '#fff',
            zIndex: 1,
            padding: '0.5rem',
            borderBottom: '2px solid #000',
            fontWeight: 'bold',
            display: 'flex',
            flexDirection: 'column',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total</span>
            <span>{totalEntry.Total}</span>
          </div>
          {totalExpanded && (
            <div style={{ marginTop: '0.5rem', fontWeight: 'normal' }}>
              <div style={{ color: '#A8E6CF' }}><strong>Seen:</strong> {totalEntry.Seen}</div>
              <div style={{ color: '#D1C4E9' }}><strong>Heard:</strong> {totalEntry.Heard}</div>
              <div style={{ color: '#FFCDD2' }}><strong>Not Found:</strong> {totalEntry.NotFound}</div>
            </div>
          )}
        </div>
  
        {/* Render for each locationData */}
        {locationData.map((entry, index) => {
          const isExpanded = expandedIndex === entry.monthYear;
          const labelColor = colorPalette[index];  // Dynamically assign color from the palette
  
          return (
            <div
              key={index}
              onClick={() => this.setState({ expandedIndex: isExpanded ? null : entry.monthYear })}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '0.5rem',
                borderBottom: '1px solid #ccc',
                cursor: 'pointer',
                backgroundColor: isExpanded ? '#f9f9f9' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: labelColor }}><strong>{formatMonthYear(entry.monthYear)}</strong></span>
                <span><strong style={{ color: labelColor }}>{entry.Total}</strong></span> {/* Apply the same color to Total */}
              </div>
              {isExpanded && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ color: labelColor }}><strong>Seen:</strong> {entry.Seen}</div> {/* Apply the same color to Seen */}
                  <div style={{ color: labelColor }}><strong>Heard:</strong> {entry.Heard}</div> {/* Apply the same color to Heard */}
                  <div style={{ color: labelColor }}><strong>Not Found:</strong> {entry.NotFound}</div> {/* Apply the same color to Not Found */}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  render() {
    const { data } = this.props;
    const dateData = countByMonthYear(data);

    // Dynamically generate color palette based on the length of dateData

    return (
      <div className="chart-container">
        <h2>Observations Over Time (Monthly)</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={dateData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="monthYear"
              tickFormatter={(tick) => {
                const [month, year] = tick.split('-');
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return `${monthNames[parseInt(month) - 1]} ${year}`; // "MMM YYYY"
              }}
              tick={({ x, y, payload, index }) => {
                const monthYear = payload.value; // Get the value of the tick (MM-YYYY)
                const [month, year] = monthYear.split('-'); // Split the month and year
            
                // Generate a color palette using Chroma.js
                const colorPalette = chroma.scale('Set1')  // Use a predefined, high-contrast color scale
                                    .mode('hsl')  // Using HSL ensures better color contrast and variation
                                    .colors(dateData.length);  // Adjust the number of colors based on the data length
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const month1 = `${monthNames[parseInt(month) - 1]} ${year}`; // "MMM YYYY"
                const labelColor = colorPalette[index % colorPalette.length]; // Use index to select color from the chroma palette

                return (
                  <text
                    x={x}
                    y={y + 10}
                    textAnchor="middle"
                    fill={labelColor} // Set color for X-axis label
                    fontSize="13"
                    fontWeight="bold"
                  >
                    {month1}
                  </text>
                );
              }}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="Total" stroke="#8884d8" />
            <Line type="monotone" dataKey="Seen" stroke="#A8E6CF" />
            <Line type="monotone" dataKey="Heard" stroke="#D1C4E9" />
            <Line type="monotone" dataKey="NotFound" stroke="#FFCDD2" />
            <Legend layout="horizontal" align="center" verticalAlign="bottom" />
          </LineChart>
        </ResponsiveContainer>

        {/* Render Statistics Below the Chart */}
        {this.renderStatistics(dateData)}
      </div>
    );
  }
}

export default DateLineChart;
