const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/database');
const config = require('../config/config');
const { AppError } = require('./errorHandler');

// Verify JWT token and extract user information
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return next(new AppError('Access token required', 401));
    }

    // Verify Supabase JWT token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return next(new AppError('Invalid or expired token', 401));
    }

    // Get user profile with role information
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return next(new AppError('User profile not found', 404));
    }

    if (userProfile.status !== 'active') {
      return next(new AppError('Account is inactive', 403));
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: userProfile.role,
      status: userProfile.status,
      warehouseId: userProfile.warehouse_id,
      profile: userProfile
    };

    req.accessToken = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return next(new AppError('Authentication failed', 401));
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (!error && user) {
      const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userProfile && userProfile.status === 'active') {
        req.user = {
          id: user.id,
          email: user.email,
          role: userProfile.role,
          status: userProfile.status,
          warehouseId: userProfile.warehouse_id,
          profile: userProfile
        };
        req.accessToken = token;
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    next();
  }
};

// Refresh token validation
const validateRefreshToken = async (refreshToken) => {
  try {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session) {
      throw new Error('Invalid refresh token');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: data.user
    };
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  validateRefreshToken
};