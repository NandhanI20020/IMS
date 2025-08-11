import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ChartCard from '../ChartCard';

const StockMovementChart = ({ data = [], loading = false, error = null }) => {
  const [timeRange, setTimeRange] = useState('7d');

  const timeRangeOptions = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
  ];

  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    stockIn: item.stockIn,
    stockOut: item.stockOut,
    netMovement: item.stockIn - item.stockOut,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const netMovement = payload.find(p => p.dataKey === 'netMovement')?.value || 0;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.filter(p => p.dataKey !== 'netMovement').map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()} units
            </p>
          ))}
          <div className="border-t border-gray-200 mt-2 pt-2">
            <p className={`text-sm font-medium ${netMovement >= 0 ? 'text-success-600' : 'text-error-600'}`}>
              Net Movement: {netMovement >= 0 ? '+' : ''}{netMovement.toLocaleString()} units
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const headerAction = (
    <select
      value={timeRange}
      onChange={(e) => setTimeRange(e.target.value)}
      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      {timeRangeOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return (
    <ChartCard
      title="Stock Movement Trends"
      loading={loading}
      error={error}
      headerAction={headerAction}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line 
            type="monotone" 
            dataKey="stockIn" 
            name="Stock In"
            stroke="#10B981" 
            strokeWidth={2}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="stockOut" 
            name="Stock Out"
            stroke="#EF4444" 
            strokeWidth={2}
            dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="netMovement" 
            name="Net Movement"
            stroke="#8B5CF6" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default StockMovementChart;