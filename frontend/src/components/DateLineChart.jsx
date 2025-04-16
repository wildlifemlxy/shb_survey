import React, { Component } from 'react';
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { countByMonthYear } from '../utils/dataProcessing';

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
            <Tooltip
              formatter={(value, name, props) => {
                const [month, year] = props.payload.monthYear.split('-');
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return [
                  <div key="tooltip-content">
                    <div><strong>Observation(s)</strong></div>
                    <div>Heard: {props.payload.Heard}</div>
                    <div>Seen: {props.payload.Seen}</div>
                    <div>Total: {props.payload.Total}</div>
                  </div>
                ];
              }}
              labelFormatter={(label) => {
                const [month, year] = label.split('-');
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return `${monthNames[parseInt(month) - 1]} ${year}`;  // Full month and year
              }}
            />
            {/* Shaded area under the Total line */}
            <Area
              type="monotone"
              dataKey="Total"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.2} // Adjust opacity for the shaded area
            />
            {/* Line on top of the shaded area for Total */}
            <Line 
              type="monotone" 
              dataKey="Total" 
              stroke="#8884d8" 
              dot={true}  // Show dots on the line
            />
            {/*<Line 
              type="monotone" 
              dataKey="Seen" 
              stroke="#82ca9d" 
              dot={true} 
            />
            <Line 
              type="monotone" 
              dataKey="Heard" 
              stroke="#ff7300" 
              dot={true} 
            />*/}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
}

export default DateLineChart;