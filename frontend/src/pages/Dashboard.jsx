import React from 'react';
import { 
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import MetricCard from '@/components/dashboard/MetricCard';
import InventoryLevelsChart from '@/components/dashboard/charts/InventoryLevelsChart';
import StockMovementChart from '@/components/dashboard/charts/StockMovementChart';
import WarehouseDistributionChart from '@/components/dashboard/charts/WarehouseDistributionChart';
import PurchaseOrderStatusChart from '@/components/dashboard/charts/PurchaseOrderStatusChart';
import TopProductsChart from '@/components/dashboard/charts/TopProductsChart';
import TurnoverGaugeChart from '@/components/dashboard/charts/TurnoverGaugeChart';
import RecentMovementsTable from '@/components/dashboard/tables/RecentMovementsTable';
import LowStockAlertsTable from '@/components/dashboard/tables/LowStockAlertsTable';
import PendingPurchaseOrdersTable from '@/components/dashboard/tables/PendingPurchaseOrdersTable';
import useDashboardData from '@/hooks/useDashboardData';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { data, loading, error, lastUpdated, refresh } = useDashboardData();

  const handleRefresh = () => {
    refresh();
    toast.success('Dashboard refreshed');
  };

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-error-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading dashboard</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                onClick={handleRefresh}
                className="btn-primary"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Real-time inventory analytics and insights
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="btn-secondary flex items-center"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Inventory Value"
            value={metrics.totalInventoryValue}
            previousValue={metrics.previousInventoryValue}
            icon={CurrencyDollarIcon}
            format="currency"
            loading={loading}
          />
          <MetricCard
            title="Low Stock Items"
            value={metrics.lowStockItems}
            previousValue={metrics.previousLowStockItems}
            icon={ExclamationTriangleIcon}
            format="number"
            loading={loading}
          />
          <MetricCard
            title="Pending Purchase Orders"
            value={metrics.pendingPurchaseOrders}
            previousValue={metrics.previousPendingPurchaseOrders}
            icon={DocumentTextIcon}
            format="number"
            loading={loading}
          />
          <MetricCard
            title="Today's Stock Movements"
            value={metrics.todayStockMovements}
            previousValue={metrics.previousStockMovements}
            icon={ArrowsRightLeftIcon}
            format="number"
            loading={loading}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Inventory Levels Chart */}
          <InventoryLevelsChart
            data={data?.inventoryLevels || []}
            loading={loading}
            error={error}
          />

          {/* Stock Movement Chart */}
          <StockMovementChart
            data={data?.stockMovements || []}
            loading={loading}
            error={error}
          />

          {/* Warehouse Distribution Chart */}
          <WarehouseDistributionChart
            data={data?.warehouseDistribution || []}
            loading={loading}
            error={error}
          />

          {/* Purchase Order Status Chart */}
          <PurchaseOrderStatusChart
            data={data?.purchaseOrderStatus || []}
            loading={loading}
            error={error}
          />
        </div>

        {/* Second Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Products Chart - spans 2 columns */}
          <div className="lg:col-span-2">
            <TopProductsChart
              data={data?.topProducts || []}
              loading={loading}
              error={error}
            />
          </div>

          {/* Turnover Gauge Chart - spans 1 column */}
          <TurnoverGaugeChart
            data={data?.turnoverData || { ratio: 0, benchmark: 4.5 }}
            loading={loading}
            error={error}
          />
        </div>

        {/* Data Tables */}
        <div className="space-y-6">
          {/* Recent Stock Movements */}
          <RecentMovementsTable
            data={data?.recentMovements || []}
            loading={loading}
            error={error}
          />

          {/* Low Stock Alerts and Pending Purchase Orders */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <LowStockAlertsTable
              data={data?.lowStockAlerts || []}
              loading={loading}
              error={error}
            />
            <PendingPurchaseOrdersTable
              data={data?.pendingPurchaseOrders || []}
              loading={loading}
              error={error}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;