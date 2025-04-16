import React, { Component } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from 'recharts';
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
    activeIndex: null,
    tooltipVisible: false,
  };

  toggleLegend = () => {
    this.setState((prevState) => ({ showLegend: !prevState.showLegend }));
  };

  handleLegendClick = (index) => {
    this.setState({
      showLegend: false
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
          outerRadius={outerRadius + 10}
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
    console.log("Payload:", payload);
    if ((active || tooltipVisible) && payload && payload.length) {
      const { location, Seen, Heard, Total } = payload[0].payload;
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
          <div><strong>Observation(s)</strong></div>
          <div>Heard: {Heard}</div>
          <div>Seen: {Seen}</div>
          <div>Total: {Total}</div>
        </div>
      );
    }

    return null;
  };

  render() {
    const { data } = this.props;
    const locationData = countByLocation(data);
    console.log("Location Data:", locationData)
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
                  onClick={() => this.handleLegendClick(index)}
                  onMouseEnter={() =>
                    this.setState({ activeIndex: index, tooltipVisible: true })
                  }
                  style={{
                    color: COLORS[index % COLORS.length],
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: activeIndex === index ? 'bold' : 'normal',
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
                    fill={COLORS[index % COLORS.length]}
                    onMouseEnter={() =>
                      this.setState({ activeIndex: index, tooltipVisible: true })
                    }
                    onMouseLeave={() =>
                      this.setState({ tooltipVisible: false })
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                content={this.renderCustomTooltip}
                wrapperStyle={{ zIndex: 9999 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }
}

export default LocationStats;
