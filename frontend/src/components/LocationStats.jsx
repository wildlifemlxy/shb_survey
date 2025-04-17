import React, { Component } from 'react';
import chroma from 'chroma-js'; // Import chroma.js
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from 'recharts';
import { countByLocation } from '../utils/dataProcessing';

class LocationStats extends Component {
  state = {
    showLegend: false,
    activeIndex: null,
    tooltipVisible: false,
    expandedIndex: null,
  };

  toggleLegend = () => {
    this.setState((prevState) => ({ showLegend: !prevState.showLegend }));
  };

  handleLegendClick = (index) => {
    this.setState({
      showLegend: false,
    });
  };

  renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const {
      cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload,
    } = props;

    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + (this.state.activeIndex !== null ? 15 : 0)}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}`} stroke={fill} fill="none" />
      </g>
    );
  };

  renderCustomTooltip = ({ active, payload }) => {
    const { tooltipVisible } = this.state;
    if ((active || tooltipVisible) && payload && payload.length) {
      const { location, Seen, Heard, NotFound, Total } = payload[0].payload;
      return (
        <div
          style={{
            fontSize: '1rem',
            fontWeight: 'normal',
            color: '#333',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '4px',
            padding: '5px',
            border: '1px solid #ccc',
          }}
        >
          <div><strong>{location}</strong></div>
          <div style={{ color: '#6DAE80' }}><strong>Heard:</strong> {Heard}</div>
          <div style={{ color: '#B39DDB' }}><strong>Seen:</strong> {Seen}</div>
          <div style={{ color: '#EF9A9A' }}><strong>Not Found:</strong> {NotFound}</div>
          <div style={{ color: '#5e56a2' }}><strong>Total:</strong> {Total}</div>
        </div>
      );
    }
    return null;
  };

  renderStatistics = (locationData) => {
    const { expandedIndex } = this.state;

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

    return (
      <div
        className="statistics-container"
        style={{
          maxHeight: '150px',
          overflowY: 'auto',
          marginTop: '1rem',
          position: 'relative',
        }}
      >
        <div
          onClick={() =>
            this.setState({ expandedIndex: totalExpanded ? null : 'total' })
          }
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
            <span style={{ color: '#5e56a2' }}>{totalEntry.Total} ({totalPercentage}%)</span>
          </div>
          {totalExpanded && (
            <div style={{ marginTop: '0.5rem', fontWeight: 'normal' }}>
              <div style={{ color: '#6DAE80' }}><strong>Seen:</strong> {totalEntry.Seen}</div>
              <div style={{ color: '#B39DDB' }}><strong>Heard:</strong> {totalEntry.Heard}</div>
              <div style={{ color: '#EF9A9A' }}><strong>Not Found:</strong> {totalEntry.NotFound}</div>
            </div>
          )}
        </div>

        {locationData.map((entry, index) => {
          const percentage = ((entry.Total / totalEntry.Total) * 100).toFixed(2);
          const isExpanded = expandedIndex === index;

          return (
            <div
              key={index}
              onClick={() =>
                this.setState({ expandedIndex: isExpanded ? null : index })
              }
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
                <span style={{ color: this.getColorForIndex(index) }}>
                  <strong>{entry.location}</strong>
                </span>
                <span style={{ color: '#5e56a2' }}>
                  <strong>{entry.Total} ({percentage}%)</strong>
                </span>
              </div>
              {isExpanded && (
                <div style={{ marginTop: '0.5rem', color: this.getColorForIndex(index) }}>
                  <div style={{ color: '#6DAE80' }}><strong>Seen:</strong> {totalEntry.Seen}</div>
                  <div style={{ color: '#B39DDB' }}><strong>Heard:</strong> {totalEntry.Heard}</div>
                  <div style={{ color: '#EF9A9A' }}><strong>Not Found:</strong> {totalEntry.NotFound}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

// Helper method to get a distinctive color for each index dynamically
getColorForIndex = (index) => {
  // Generate a scale of distinct colors using HSL (Hue, Saturation, Lightness)
  // The hue will be spaced out by a fixed interval to ensure distinctiveness
  const hue = (index * 137.5) % 360; // 137.5 is a golden angle, ensuring a good spread of colors
  const color = chroma.hsl(hue, 0.75, 0.5).hex(); // Saturation = 0.75, Lightness = 0.5, adjust as needed

  return color;
};

  render() {
    const { data } = this.props;
    const locationData = countByLocation(data);
    const { showLegend, activeIndex } = this.state;

    return (
      <div
        className="chart-container"
        style={{
          position: 'relative',
          overflow: 'visible',
          padding: '2rem',
          zIndex: 0,
        }}
      >
        <h2>Observations by Location</h2>

        <button
          onClick={this.toggleLegend}
          className="legend-toggle-button"
          style={{
            marginBottom: '1rem',
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
              top: '4rem',
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
                  onClick={() => this.setState({ expandedIndex: index })}
                  style={{
                    color: this.getColorForIndex(index),
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  {entry.location}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '500px',
            marginTop: '2rem',
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={locationData}
                dataKey="Total"
                nameKey="location"
                cx="50%"
                cy="50%"
                fill="#8884d8"
                activeIndex={activeIndex}
                activeShape={this.renderActiveShape}
              >
                {locationData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={this.getColorForIndex(index)}
                    onMouseEnter={() =>
                      this.setState({ activeIndex: index, tooltipVisible: true })
                    }
                    onMouseLeave={() =>
                      this.setState({ tooltipVisible: false })
                    }
                    onClick={() => this.setState({ expandedIndex: index === expandedIndex ? null : index })}
                  />
                ))}
              </Pie>
              <Tooltip
                content={this.renderCustomTooltip}
                cursor={false}
                wrapperStyle={{
                  zIndex: 1000,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {this.renderStatistics(locationData)}
      </div>
    );
  }
}

export default LocationStats;
