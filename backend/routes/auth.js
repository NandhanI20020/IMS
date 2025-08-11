const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authValidations, handleValidationErrors } = require('../middleware/validation');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// Authentication routes (public)
router.post('/login', authValidations.login, authController.login);
router.post('/register', authValidations.register, authController.register);
router.post('/refresh-token', authValidations.refreshToken, authController.refreshToken);
router.post('/request-password-reset', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  handleValidationErrors
], authController.requestPasswordReset);

// Protected routes (require authentication)
router.use(authenticateToken);

router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);
router.put('/profile', [
  body('first_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
  body('last_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('avatar_url').optional().isURL().withMessage('Valid URL required'),
  handleValidationErrors
], authController.updateProfile);

router.post('/change-password', [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  handleValidationErrors
], authController.changePassword);

router.get('/verify-session', authController.verifySession);
router.get('/me', authController.getCurrentUser);

// Admin routes
router.post('/admin/register', 
  requireRole(['admin']),
  authValidations.register,
  authController.register
);

module.exports = router;