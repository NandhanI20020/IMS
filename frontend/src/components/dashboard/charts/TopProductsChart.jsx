import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartCard from '../ChartCard';

const TopProductsChart = ({ data = [], loading = false, error = null }) => {
  const [metric, setMetric] = useState('revenue');

  const metricOptions = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'quantity', label: 'Quantity Sold' },
    { value: 'profit', label: 'Profit' },
  ];

  const chartData = data.map(item => ({
    name: item.productName.length > 15 
      ? item.productName.substring(0, 15) + '...' 
      : item.productName,
    fullName: item.productName,
    revenue: item.revenue,
    quantity: item.quantitySold,
    profit: item.profit,
  }));

  const getMetricValue = (item) => item[metric];
  const getMetricLabel = () => metricOptions.find(opt => opt.value === metric)?.label || 'Value';

  const formatValue = (value) => {
    if (metric === 'quantity') {
      return value.toLocaleString();
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="font-medium text-gray-900 mb-2">{data.fullName}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Revenue: {formatValue(data.revenue)}
            </p>
            <p className="text-sm text-gray-600">
              Quantity: {data.quantity.toLocaleString()} units
            </p>
            <p className="text-sm text-gray-600">
              Profit: {formatValue(data.profit)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const getBarColor = () => {
    switch (metric) {
      case 'revenue': return '#3B82F6';
      case 'quantity': return '#10B981';
      case 'profit': return '#8B5CF6';
      default: return '#3B82F6';
    }
  };

  const headerAction = (
    <select
      value={metric}
      onChange={(e) => setMetric(e.target.value)}
      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      {metricOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return (
    <ChartCard
      title="Top-Selling Products"
      loading={loading}
      error={error}
      headerAction={headerAction}
      height="h-96"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            type="number"
            tick={{ fontSize: 12 }}
            tickFormatter={formatValue}
          />
          <YAxis 
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey={metric}
            fill={getBarColor()}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default TopProductsChart;