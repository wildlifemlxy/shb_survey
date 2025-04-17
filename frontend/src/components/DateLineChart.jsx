import React, { Component } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { countByMonthYear } from '../utils/dataProcessing';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; // Get the payload for the hovered line

    // Inline styles for background colors based on data types
    const tooltipStyles = {
      heard: { color: '#D1C4E9' },
      seen: { color: '#A8E6CF'},
      NotFound: { color: '#FFCDD2' },
      total: { color: '#8884d8' }
    };

    // Format the label (monthYear) to "MMM YYYY"
    const formatLabel = (label) => {
      const [month, year] = label.split('-');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[parseInt(month) - 1]} ${year}`;  // Format as "MMM YYYY"
    };

    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
        <p><strong>{formatLabel(label)}</strong></p> {/* Display formatted month-year */}
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
  render() {
    const { data } = this.props;
    const dateData = countByMonthYear(data);  // Assuming this processes the data correctly

    // Log the dateData to verify its structure
    console.log("Date Data:", dateData);

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
                return `${monthNames[parseInt(month) - 1]} ${year}`;
              }}
              interval={0}  // Show every month (no skipping)
              angle={-40}   // Rotate the labels by 40 degrees
              textAnchor="end" // Align the labels after rotation
              height={80}  // Set a fixed height for the X axis to prevent labels from being cut off
            />
            <YAxis />
            {/* Custom Tooltip */}
            <Tooltip content={<CustomTooltip />} />
            {/* Lines for the data */}
            <Line 
              type="monotone" 
              dataKey="Total" 
              stroke="#8884d8" 
              dot={true}  // Show dots on the line
              legendType="line" // Show in the legend as a line
            />
            <Line 
              type="monotone" 
              dataKey="Seen" 
              stroke="#A8E6CF" 
              dot={true} 
              legendType="line" // Show in the legend as a line
            />
            <Line 
              type="monotone" 
              dataKey="Heard" 
              stroke="#D1C4E9" 
              dot={true} 
              legendType="line" // Show in the legend as a line
            />
            <Line 
              type="monotone" 
              dataKey="NotFound"
              stroke="#FFCDD2" 
              dot={true} 
              legendType="line" // Show in the legend as a line
            />
            {/* Add the Legend component to show the legend for each line */}
            <Legend 
              layout="horizontal"
              align="center" 
              verticalAlign="bottom" 
              iconType="line"  // Use lines for the legend icons
              wrapperStyle={{
                paddingTop: '30px', // Adds space above the legend
                paddingBottom: '30px', // Adds space below the legend
              }}
              iconSize={20} // Optional: to control the size of the legend icons
              itemGap={20} // This adds horizontal space between the legend items
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
}

export default DateLineChart;
