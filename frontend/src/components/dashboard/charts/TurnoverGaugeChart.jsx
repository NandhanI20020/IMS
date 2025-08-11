import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import ChartCard from '../ChartCard';

const TurnoverGaugeChart = ({ data = { ratio: 0, benchmark: 4.5 }, loading = false, error = null }) => {
  const { ratio, benchmark } = data;
  
  // Create gauge data
  const maxValue = 10;
  const percentage = Math.min((ratio / maxValue) * 100, 100);
  
  const gaugeData = [
    { name: 'Current', value: percentage, color: getGaugeColor(ratio) },
    { name: 'Remaining', value: 100 - percentage, color: '#E5E7EB' }
  ];

  function getGaugeColor(value) {
    if (value < 2) return '#EF4444';      // Red - Poor
    if (value < 4) return '#F59E0B';      // Yellow - Fair
    if (value < 6) return '#10B981';      // Green - Good
    if (value < 8) return '#059669';      // Dark Green - Very Good
    return '#047857';                     // Darker Green - Excellent
  }

  function getTurnoverLabel(value) {
    if (value < 2) return 'Poor';
    if (value < 4) return 'Fair';
    if (value < 6) return 'Good';
    if (value < 8) return 'Very Good';
    return 'Excellent';
  }

  const CustomLabel = () => {
    return (
      <g>
        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-900">
          <tspan fontSize="24" fontWeight="bold">{ratio.toFixed(1)}</tspan>
        </text>
        <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-600">
          <tspan fontSize="12">times/year</tspan>
        </text>
        <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-500">
          <tspan fontSize="14" fontWeight="medium">{getTurnoverLabel(ratio)}</tspan>
        </text>
      </g>
    );
  };

  return (
    <ChartCard
      title="Inventory Turnover Ratio"
      loading={loading}
      error={error}
      headerAction={
        <div className="text-xs text-gray-500">
          Benchmark: {benchmark} times/year
        </div>
      }
    >
      <div className="flex flex-col items-center">
        <div className="relative w-full h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="70%"
                startAngle={180}
                endAngle={0}
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                stroke="none"
              >
                {gaugeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <CustomLabel />
          </div>
        </div>

        {/* Performance indicators */}
        <div className="w-full mt-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">vs Benchmark:</span>
            <div className="flex items-center">
              {ratio >= benchmark ? (
                <>
                  <svg className="w-4 h-4 text-success-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-success-600 font-medium">
                    +{((ratio - benchmark) / benchmark * 100).toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-error-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-error-600 font-medium">
                    {((ratio - benchmark) / benchmark * 100).toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Performance scale */}
          <div className="flex justify-between text-xs text-gray-500">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-error-500 rounded-full mb-1"></div>
              <span>Poor</span>
              <span>&lt;2</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-warning-500 rounded-full mb-1"></div>
              <span>Fair</span>
              <span>2-4</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-success-500 rounded-full mb-1"></div>
              <span>Good</span>
              <span>4-6</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-success-600 rounded-full mb-1"></div>
              <span>V.Good</span>
              <span>6-8</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-success-700 rounded-full mb-1"></div>
              <span>Excellent</span>
              <span>&gt;8</span>
            </div>
          </div>
        </div>
      </div>
    </ChartCard>
  );
};

export default TurnoverGaugeChart;