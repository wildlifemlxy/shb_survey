import React, { useState } from 'react';
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const chartColors = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#ca8a04', '#db2777'];

const RifleChartTooltip = ({ active, payload, sectionColor, showPercentage = true }) => {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  const entryColor = entry.payload.color || sectionColor;
  const label = entry.payload.name || entry.name;
  const total = entry.payload.total || 0;
  const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="rifle-chart-tooltip" style={{ color: entryColor }}>
      <strong>{label}</strong>
      <span>Observations: {entry.value}</span>
      {showPercentage && <span>Percentage: {percentage}%</span>}
    </div>
  );
};

const getValue = (record, field) => {
  if (field === 'sideOfRoad') return record['Which side of the road is it on? (N/S/On road)'];
  if (field === 'targetSpecies') return record['Target Species?'];
  if (field === 'identified') return record['Identified?'];
  if (field === 'taxonomy') return record.Taxonomy || record.Taxa;
  return record[field];
};

const getDateValue = value => {
  if (!value) return null;
  if (typeof value === 'number') {
    return new Date((value - 25569) * 86400 * 1000);
  }
  if (typeof value === 'string') {
    const slashParts = value.trim().split('/');
    if (slashParts.length === 3) {
      const [day, month, year] = slashParts.map(Number);
      const parsed = new Date(year < 100 ? 2000 + year : year, month - 1, day);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

function RifleFieldChart({ data = [], field, date = false, sectionColor = chartColors[0] }) {
  const [dateGrouping, setDateGrouping] = useState('monthly');
  const counts = data.reduce((result, record) => {
    const dateValue = date ? getDateValue(record['Survey Date']) : null;
    const value = date
      ? dateValue
        ? dateGrouping === 'monthly'
          ? dateValue.toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })
          : String(dateValue.getFullYear())
        : 'Unknown'
      : String(getValue(record, field) ?? '').trim();
    const label = value || 'Unknown';
    result[label] = (result[label] || 0) + 1;
    return result;
  }, {});

  const chartData = Object.entries(counts)
    .map(([name, observations]) => ({
      name,
      observations,
      sortKey: date
        ? dateGrouping === 'yearly'
          ? Number(name)
          : new Date(`1 ${name}`).getTime()
        : 0
    }))
    .sort((left, right) => date ? left.sortKey - right.sortKey : right.observations - left.observations)
    .slice(0, 30);

  const coloredChartData = chartData.map((entry, index) => ({
    ...entry,
    color: chartColors[index % chartColors.length]
  }));
  const total = coloredChartData.reduce((sum, entry) => sum + entry.observations, 0);
  const pieData = coloredChartData.map(entry => ({
    ...entry,
    total
  }));

  const summaryTable = (
    <div className="rifle-chart-summary">
      <div className="rifle-chart-total" style={{ color: '#000000' }}><strong style={{ color: '#000000' }}>Total</strong><strong style={{ color: '#000000' }}>{total}</strong></div>
      {coloredChartData.map(entry => (
        <div className="rifle-chart-summary-row" key={`summary-${entry.name}`} style={{ color: entry.color }}>
          <span>{entry.name}</span>
          <strong>{entry.observations}</strong>
        </div>
      ))}
    </div>
  );

  if (date) {
    return (
      <div className="rifle-chart-content">
        <div className="rifle-chart-period-tabs" role="tablist" aria-label="Observation time grouping">
          <button type="button" role="tab" aria-selected={dateGrouping === 'monthly'} className={dateGrouping === 'monthly' ? 'active' : ''} onClick={() => setDateGrouping('monthly')}>Monthly</button>
          <button type="button" role="tab" aria-selected={dateGrouping === 'yearly'} className={dateGrouping === 'yearly' ? 'active' : ''} onClick={() => setDateGrouping('yearly')}>Yearly</button>
        </div>
        <ResponsiveContainer>
          <LineChart data={coloredChartData} margin={{ top: 16, right: 24, left: 8, bottom: 72 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} height={90} />
            <YAxis allowDecimals={false} />
            <Tooltip content={<RifleChartTooltip sectionColor={sectionColor} showPercentage={false} />} />
            <Line type="monotone" dataKey="observations" stroke={sectionColor} strokeWidth={3} dot={{ r: 4 }} name="Observations" />
          </LineChart>
        </ResponsiveContainer>
        {summaryTable}
      </div>
    );
  }

  return (
    <div className="rifle-chart-content">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={pieData} dataKey="observations" nameKey="name" cx="50%" cy="48%" outerRadius="68%">
            {pieData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
          <Tooltip content={<RifleChartTooltip sectionColor={sectionColor} showPercentage={false} />} />
        </PieChart>
      </ResponsiveContainer>
        {summaryTable}
    </div>
  );
}

export default RifleFieldChart;
