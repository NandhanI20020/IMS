const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/errorHandler');
const { formatResponse } = require('../utils/helpers');

class AuthController {
  // Login user
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.status(200).json(formatResponse({
      user: result.user,
      accessToken: result.session.access_token,
      refreshToken: result.session.refresh_token,
      expiresAt: result.session.expires_at
    }, 'Login successful'));
  });

  // Register new user
  register = asyncHandler(async (req, res) => {
    const userData = req.body;

    const result = await authService.register(userData);

    res.status(201).json(formatResponse(result, 'User registered successfully'));
  });

  // Refresh access token
  refreshToken = asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;

    const result = await authService.refreshToken(refresh_token);

    res.status(200).json(formatResponse({
      user: result.user,
      accessToken: result.session.access_token,
      refreshToken: result.session.refresh_token,
      expiresAt: result.session.expires_at
    }, 'Token refreshed successfully'));
  });

  // Logout user
  logout = asyncHandler(async (req, res) => {
    const accessToken = req.accessToken;

    await authService.logout(accessToken);

    res.status(200).json(formatResponse(null, 'Logged out successfully'));
  });

  // Get current user profile
  getProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const profile = await authService.getUserProfile(userId);

    res.status(200).json(formatResponse(profile, 'Profile retrieved successfully'));
  });

  // Update user profile
  updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const updateData = req.body;

    const updatedProfile = await authService.updateUserProfile(userId, updateData);

    res.status(200).json(formatResponse(updatedProfile, 'Profile updated successfully'));
  });

  // Change password
  changePassword = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    await authService.changePassword(userId, current_password, new_password);

    res.status(200).json(formatResponse(null, 'Password changed successfully'));
  });

  // Request password reset
  requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const result = await authService.requestPasswordReset(email);

    res.status(200).json(formatResponse(null, result.message));
  });

  // Verify session
  verifySession = asyncHandler(async (req, res) => {
    const accessToken = req.accessToken;

    const result = await authService.verifySession(accessToken);

    res.status(200).json(formatResponse(result, 'Session verified'));
  });

  // Get current user info (from token)
  getCurrentUser = asyncHandler(async (req, res) => {
    const user = req.user;

    res.status(200).json(formatResponse({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      warehouseId: user.warehouseId,
      profile: user.profile
    }, 'User info retrieved successfully'));
  });
}

module.exports = new AuthController();