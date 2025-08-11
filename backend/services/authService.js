const { supabaseAdmin, supabaseClient } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { logSecurityEvent, logBusinessEvent } = require('../utils/logger');

class AuthService {
  // User login
  async login(email, password) {
    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        logSecurityEvent('LOGIN_FAILED', null, { email, error: error.message });
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      console.log('Login successful for user:', data.user.email);
      console.log('User ID:', data.user.id);
      
      // Get user profile
      console.log('Fetching user profile for email:', data.user.email);
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('email', data.user.email)
        .single();

      console.log('Profile query result:', { userProfile, profileError });

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      if (!userProfile) {
        console.error('No profile found for email:', data.user.email);
        throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      console.log('Profile found:', userProfile);

      if (userProfile.status !== 'active') {
        logSecurityEvent('LOGIN_INACTIVE_ACCOUNT', data.user.id, { email });
        throw new AppError('Account is inactive', 403, 'ACCOUNT_INACTIVE');
      }

      // Update last login
      await supabaseAdmin
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('email', data.user.email);

      logBusinessEvent('USER_LOGIN', data.user.id, { email });

      return {
        user: {
          id: data.user.id,
          email: data.user.email,
          role: userProfile.role,
          profile: userProfile
        },
        session: data.session
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Login error:', error);
      throw new AppError('Login failed', 500, 'LOGIN_ERROR');
    }
  }

  // User registration
  async register(userData) {
    try {
      console.log('Received user data:', userData);
      const { email, password, first_name, last_name, phone, role = 'user' } = userData;

      console.log('Starting user registration...');

      // Create user in Supabase Auth
      console.log('Creating user in Supabase Auth...');
      console.log('User data:', { email, first_name, last_name, role });
      
      // Validate required fields
      if (!email || !password || !first_name || !last_name) {
        throw new AppError('Missing required fields: email, password, first_name, last_name', 400, 'MISSING_FIELDS');
      }

      // Validate role
      const validRoles = ['admin', 'manager', 'user'];
      if (!validRoles.includes(role)) {
        throw new AppError(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`, 400, 'INVALID_ROLE');
      }
      
      const signUpPayload = {
        email: email,
        password: password,
        options: {
          data: {
            first_name: first_name,
            last_name: last_name,
            role: role
          }
        }
      };
      
      console.log('SignUp payload:', JSON.stringify(signUpPayload, null, 2));
      
      // Try with admin client to bypass potential RLS issues
      console.log('Attempting user creation with admin client...');
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Disable email confirmation requirement
        user_metadata: {
          first_name: first_name,
          last_name: last_name,
          role: role
        }
      });

      if (error) {
        console.error('Supabase registration error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack
        });
        logSecurityEvent('REGISTRATION_FAILED', null, { email, error: error.message });
        
        // Handle specific Supabase errors
        if (error.message.includes('User already registered')) {
          throw new AppError('An account with this email already exists', 400, 'USER_EXISTS');
        } else if (error.message.includes('Password should be at least')) {
          throw new AppError(error.message, 400, 'WEAK_PASSWORD');
        } else if (error.message.includes('Invalid email')) {
          throw new AppError('Please enter a valid email address', 400, 'INVALID_EMAIL');
        } else if (error.message.includes('Database error saving new user')) {
          console.error('Database error details:', error);
          throw new AppError('Database configuration issue. Please contact support.', 500, 'DB_CONFIG_ERROR');
        } else {
          throw new AppError('Registration failed: ' + error.message, 400, 'REGISTRATION_ERROR');
        }
      }

      console.log('User created successfully:', data.user?.id);
      console.log('User metadata:', data.user?.user_metadata);

      // Manually create user profile
      if (data?.user) {
        console.log('Creating user profile manually...');
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            first_name: first_name,
            last_name: last_name,
            role: role,
            status: 'active'
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw new AppError('Failed to create user profile: ' + profileError.message, 500, 'PROFILE_CREATION_ERROR');
        }
        console.log('User profile created successfully');
      }

      logBusinessEvent('USER_REGISTERED', data.user.id, { email, role });

      return {
        user: {
          id: data.user.id,
          email: data.user.email,
          role: role
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Registration error:', error);
      throw new AppError('Registration failed', 500, 'REGISTRATION_ERROR');
    }
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      const { data, error } = await supabaseAdmin.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error || !data.session) {
        logSecurityEvent('TOKEN_REFRESH_FAILED', null, { error: error?.message });
        throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      // Get updated user profile
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('email', data.user.email)
        .single();

      if (profileError) {
        console.error('Profile fetch error in refreshToken:', profileError);
        throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      if (!userProfile) {
        console.error('No profile found for email in refreshToken:', data.user.email);
        throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email,
          role: userProfile.role,
          profile: userProfile
        },
        session: data.session
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Token refresh error:', error);
      throw new AppError('Token refresh failed', 500, 'TOKEN_REFRESH_ERROR');
    }
  }

  // Logout user
  async logout(accessToken) {
    try {
      const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
      
      if (error) {
        console.error('Logout error:', error);
      }

      logBusinessEvent('USER_LOGOUT', null, { token: accessToken?.substring(0, 10) + '...' });
      
      return { message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw error on logout failure
      return { message: 'Logged out' };
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const { data: userProfile, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !userProfile) {
        throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      return userProfile;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Get profile error:', error);
      throw new AppError('Failed to get user profile', 500, 'GET_PROFILE_ERROR');
    }
  }

  // Update user profile
  async updateUserProfile(userId, updateData) {
    try {
      const allowedFields = ['first_name', 'last_name', 'phone', 'avatar_url'];
      const filteredData = {};

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_UPDATE_FIELDS');
      }

      filteredData.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update(filteredData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Profile update error:', error);
        throw new AppError('Failed to update profile', 500, 'PROFILE_UPDATE_ERROR');
      }

      logBusinessEvent('PROFILE_UPDATED', userId, filteredData);

      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Update profile error:', error);
      throw new AppError('Failed to update profile', 500, 'PROFILE_UPDATE_ERROR');
    }
  }

  // Change password
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // First verify the old password by attempting to sign in
      const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (!userProfile) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify old password
      const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
        email: userProfile.email,
        password: oldPassword
      });

      if (verifyError) {
        logSecurityEvent('PASSWORD_CHANGE_FAILED', userId, { reason: 'Invalid old password' });
        throw new AppError('Current password is incorrect', 400, 'INVALID_OLD_PASSWORD');
      }

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        console.error('Password update error:', updateError);
        throw new AppError('Failed to update password', 500, 'PASSWORD_UPDATE_ERROR');
      }

      logBusinessEvent('PASSWORD_CHANGED', userId);

      return { message: 'Password updated successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Change password error:', error);
      throw new AppError('Failed to change password', 500, 'PASSWORD_CHANGE_ERROR');
    }
  }

  // Reset password request
  async requestPasswordReset(email) {
    try {
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`
      });

      if (error) {
        console.error('Password reset request error:', error);
        // Don't reveal if email exists or not
      }

      logSecurityEvent('PASSWORD_RESET_REQUESTED', null, { email });

      return { message: 'If an account with that email exists, a reset link has been sent.' };
    } catch (error) {
      console.error('Request password reset error:', error);
      return { message: 'Password reset request processed.' };
    }
  }

  // Verify user session
  async verifySession(accessToken) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

      if (error || !user) {
        throw new AppError('Invalid session', 401, 'INVALID_SESSION');
      }

      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('email', user.email)
        .single();

      if (profileError) {
        console.error('Profile fetch error in verifySession:', profileError);
        throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      if (!userProfile) {
        console.error('No profile found for email in verifySession:', user.email);
        throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          role: userProfile.role,
          profile: userProfile
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Session verification error:', error);
      throw new AppError('Session verification failed', 500, 'SESSION_VERIFICATION_ERROR');
    }
  }
}

module.exports = new AuthService();