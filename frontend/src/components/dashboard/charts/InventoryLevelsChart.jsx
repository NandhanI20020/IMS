import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ChartCard from '../ChartCard';

const InventoryLevelsChart = ({ data = [], loading = false, error = null }) => {
  const chartData = data.map(item => ({
    category: item.name,
    current: item.currentStock,
    minimum: item.minimumStock,
    maximum: item.maximumStock,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()} units
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ChartCard
      title="Inventory Levels by Category"
      loading={loading}
      error={error}
      headerAction={
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-primary-500 rounded mr-1"></div>
            <span>Current</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-warning-500 rounded mr-1"></div>
            <span>Minimum</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-success-500 rounded mr-1"></div>
            <span>Maximum</span>
          </div>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="category" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar 
            dataKey="current" 
            name="Current Stock"
            fill="#3B82F6" 
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="minimum" 
            name="Minimum Stock"
            fill="#EAB308" 
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="maximum" 
            name="Maximum Stock"
            fill="#10B981" 
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default InventoryLevelsChart;