import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import ChartCard from '../ChartCard';

const PurchaseOrderStatusChart = ({ data = [], loading = false, error = null }) => {
  const STATUS_COLORS = {
    pending: '#EAB308',     // Yellow
    approved: '#3B82F6',    // Blue
    ordered: '#8B5CF6',     // Purple
    received: '#10B981',    // Green
    cancelled: '#EF4444',   // Red
    partial: '#F97316',     // Orange
  };

  const chartData = data.map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    totalValue: item.totalValue,
    color: STATUS_COLORS[item.status] || '#6B7280',
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-1">{data.name}</p>
          <p className="text-sm text-gray-600">
            Count: {data.value} orders
          </p>
          <p className="text-sm text-gray-600">
            Value: ${data.totalValue.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomLegend = ({ payload }) => (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {payload.map((entry, index) => {
        const itemData = chartData.find(item => item.name === entry.value);
        return (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.value}</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {itemData?.value || 0}
            </span>
          </div>
        );
      })}
    </div>
  );

  const totalOrders = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartCard
      title="Purchase Order Status"
      loading={loading}
      error={error}
      headerAction={
        <div className="text-xs text-gray-500">
          Total: {totalOrders} orders
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={70}
            innerRadius={30}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default PurchaseOrderStatusChart;