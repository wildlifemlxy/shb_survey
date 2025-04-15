import React, { Component } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { countByMonthYear } from '../utils/dataProcessing';

class DateLineChart extends Component {
  render() {
    const { data } = this.props;
    const dateData = countByMonthYear(data);

    return (
      <div className="chart-container">
        <h2>Observations Over Time (Monthly)</h2>
        <ResponsiveContainer width="100%" height={300}>
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
            />
            <YAxis />
            <Tooltip
              formatter={(value, name, props) => {
                const [month, year] = props.payload.monthYear.split('-');
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const monthName = monthNames[parseInt(month) - 1];
                return [`Observation: ${value}`]; // Format: "Observation: X"
              }}
              labelFormatter={(label) => {
                const [month, year] = label.split('-');
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return `${monthNames[parseInt(month) - 1]} ${year}`;  // Full month and year
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#82ca9d" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
}

export default DateLineChart;
