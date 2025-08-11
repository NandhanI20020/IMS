import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

export const useDashboardData = (options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { user } = useAuth();
  const { autoRefresh = false, refreshMs = 30000, period = '30d' } = options;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the regular dashboard endpoint (no authentication required)
      const response = await apiClient.getDashboard({ period });

      // The API response should match the expected data structure
      if (response.data) {
        setData(response.data);
        setLastUpdated(new Date());
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      
      // Handle different types of errors
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        setError('Authentication required. Please log in.');
      } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
        setError('Access denied. You do not have permission to view this data.');
      } else if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
        setError('Server error. Please try again later.');
      } else if (err.message.includes('Network') || err.message.includes('fetch')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to load dashboard data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Optional auto-refresh (only when user is authenticated)
  useEffect(() => {
    if (!user || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, refreshMs);
    return () => clearInterval(interval);
  }, [user, autoRefresh, refreshMs, fetchData]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
  };
};

export default useDashboardData;