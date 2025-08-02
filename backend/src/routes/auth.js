const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { queryOne, run } = require('../database/database');
const { asyncHandler, ValidationError, UnauthorizedError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * User registration
 * POST /api/auth/register
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number is required')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { email, password, name, phone } = req.body;

  // Check if user already exists
  const existingUser = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser) {
    throw new ValidationError('User with this email already exists');
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const userId = uuidv4();
  await run(
    'INSERT INTO users (id, email, password_hash, name, phone) VALUES (?, ?, ?, ?, ?)',
    [userId, email, passwordHash, name, phone]
  );

  // Generate JWT token
  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );

  // Get created user (without password)
  const user = await queryOne(
    'SELECT id, email, name, phone, is_verified, is_admin, created_at FROM users WHERE id = ?',
    [userId]
  );

  res.status(201).json({
    message: 'User registered successfully',
    user,
    token
  });
}));

/**
 * User login
 * POST /api/auth/login
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { email, password } = req.body;

  // Find user
  const user = await queryOne(
    'SELECT id, email, password_hash, name, phone, is_verified, is_admin, is_banned FROM users WHERE email = ?',
    [email]
  );

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.is_banned) {
    throw new UnauthorizedError('Account has been suspended');
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );

  // Remove password hash from response
  const { password_hash, ...userWithoutPassword } = user;

  res.json({
    message: 'Login successful',
    user: userWithoutPassword,
    token
  });
}));

/**
 * Get current user profile
 * GET /api/auth/profile
 */
router.get('/profile', asyncHandler(async (req, res) => {
  // This route requires authentication middleware
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const user = await queryOne(
    'SELECT id, email, name, phone, is_verified, is_admin, created_at FROM users WHERE id = ?',
    [req.user.id]
  );

  res.json({
    user
  });
}));

/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put('/profile', [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number is required')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { name, phone } = req.body;
  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }

  if (phone) {
    updates.push('phone = ?');
    params.push(phone);
  }

  if (updates.length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.user.id);

  await run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  // Get updated user
  const user = await queryOne(
    'SELECT id, email, name, phone, is_verified, is_admin, created_at FROM users WHERE id = ?',
    [req.user.id]
  );

  res.json({
    message: 'Profile updated successfully',
    user
  });
}));

/**
 * Change password
 * PUT /api/auth/change-password
 */
router.put('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { currentPassword, newPassword } = req.body;

  // Get current user with password
  const user = await queryOne(
    'SELECT password_hash FROM users WHERE id = ?',
    [req.user.id]
  );

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidPassword) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Hash new password
  const saltRounds = 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await run(
    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [newPasswordHash, req.user.id]
  );

  res.json({
    message: 'Password changed successfully'
  });
}));

/**
 * Verify token (for frontend token validation)
 * POST /api/auth/verify
 */
router.post('/verify', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Token is required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const user = await queryOne(
      'SELECT id, email, name, phone, is_verified, is_admin, is_banned FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.is_banned) {
      throw new UnauthorizedError('Account has been suspended');
    }

    res.json({
      valid: true,
      user
    });
  } catch (error) {
    res.json({
      valid: false,
      message: 'Invalid or expired token'
    });
  }
}));

module.exports = router; 