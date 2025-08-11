import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Get user profile from user_profiles table
  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          warehouses (
            id,
            name,
            code
          )
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Check for stored tokens
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (accessToken && refreshToken) {
          // Verify session with backend
          const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-session`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const result = await response.json();
            if (mounted) {
              setUser(result.data.user);
              setUserProfile(result.data.user.profile);
            }
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear invalid tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();
  }, []);

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      setSessionLoading(true);
      
      // Use backend API for login
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }

      // Store tokens in localStorage
      localStorage.setItem('accessToken', result.data.accessToken);
      localStorage.setItem('refreshToken', result.data.refreshToken);
      
      // Set user data
      setUser(result.data.user);
      setUserProfile(result.data.user.profile);

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      const errorMessage = error.message || 'Failed to sign in';
      toast.error(errorMessage);
      return { data: null, error };
    } finally {
      setSessionLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, userData = {}) => {
    try {
      setSessionLoading(true);

      // Use backend API for registration
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          first_name: userData.firstName || '',
          last_name: userData.lastName || '',
          role: userData.role || 'user',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      toast.success('Account created successfully! You can now sign in.');
      return { data: result.data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      const errorMessage = error.message || 'Failed to create account';
      toast.error(errorMessage);
      return { data: null, error };
    } finally {
      setSessionLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setSessionLoading(true);
      
      const accessToken = localStorage.getItem('accessToken');
      
      if (accessToken) {
        // Call backend logout endpoint
        await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }

      // Clear tokens and state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setUserProfile(null);
      
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if logout fails, clear local state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setUserProfile(null);
      return { error };
    } finally {
      setSessionLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast.success('Password reset email sent! Please check your inbox.');
      return { data, error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      const errorMessage = error.message || 'Failed to send reset email';
      toast.error(errorMessage);
      return { data: null, error };
    }
  };

  // Update password
  const updatePassword = async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      toast.success('Password updated successfully!');
      return { data, error: null };
    } catch (error) {
      console.error('Update password error:', error);
      const errorMessage = error.message || 'Failed to update password';
      toast.error(errorMessage);
      return { data: null, error };
    }
  };

  // Update user profile
  const updateProfile = async (updates) => {
    try {
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Update user metadata if needed
      const userUpdates = {};
      if (updates.firstName !== undefined) userUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) userUpdates.last_name = updates.lastName;

      if (Object.keys(userUpdates).length > 0) {
        const { error: userError } = await supabase.auth.updateUser({
          data: userUpdates,
        });

        if (userError) {
          throw userError;
        }
      }

      // Update profile table
      const profileUpdates = { ...updates };
      delete profileUpdates.firstName;
      delete profileUpdates.lastName;

      if (Object.keys(profileUpdates).length > 0) {
        const { data, error } = await supabase
          .from('user_profiles')
          .update({
            ...profileUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select(`
            *,
            warehouses (
              id,
              name,
              code
            )
          `)
          .single();

        if (error) {
          throw error;
        }

        setUserProfile(data);
      }

      // Refresh user profile
      const updatedProfile = await fetchUserProfile(user.id);
      setUserProfile(updatedProfile);

      toast.success('Profile updated successfully!');
      return { data: updatedProfile, error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      const errorMessage = error.message || 'Failed to update profile';
      toast.error(errorMessage);
      return { data: null, error };
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    if (!userProfile) return false;
    if (Array.isArray(role)) {
      return role.includes(userProfile.role);
    }
    return userProfile.role === role;
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    if (!userProfile) return false;
    
    const rolePermissions = {
      admin: ['all'],
      manager: ['inventory_read', 'inventory_write', 'products_read', 'products_write', 'purchase_orders_read', 'purchase_orders_write', 'purchase_orders_create', 'purchase_orders_update', 'reports_read'],
      warehouse_staff: ['inventory_read', 'inventory_write', 'products_read', 'purchase_orders_read'],
      sales_staff: ['inventory_read', 'products_read', 'purchase_orders_read'],
      purchaser: ['inventory_read', 'products_read', 'purchase_orders_read', 'purchase_orders_write', 'purchase_orders_create', 'purchase_orders_update'],
      user: ['inventory_read', 'products_read', 'purchase_orders_read'],
    };

    const userPermissions = rolePermissions[userProfile.role] || [];
    return userPermissions.includes('all') || userPermissions.includes(permission);
  };

  // Get user's accessible warehouses
  const getAccessibleWarehouses = () => {
    if (!userProfile) return [];
    
    // Admin and managers can access all warehouses
    if (['admin', 'manager'].includes(userProfile.role)) {
      return 'all';
    }
    
    // Other users are restricted to their assigned warehouse
    return userProfile.warehouse_id ? [userProfile.warehouse_id] : [];
  };

  const value = {
    // State
    user,
    userProfile,
    loading,
    sessionLoading,
    
    // Auth methods
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    
    // Utility methods
    hasRole,
    hasPermission,
    getAccessibleWarehouses,
    
    // Computed properties
    isAuthenticated: !!user,
    isAdmin: hasRole('admin'),
    isManager: hasRole(['admin', 'manager']),
    userDisplayName: userProfile ? `${userProfile.first_name} ${userProfile.last_name}`.trim() : user?.email || 'User',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;