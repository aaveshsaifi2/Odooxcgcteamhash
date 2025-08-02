const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { query: dbQuery, queryOne, run } = require('../database/database');
const { asyncHandler, ValidationError, NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply admin middleware to all routes
router.use(requireAdmin);

/**
 * Get admin dashboard statistics
 * GET /api/admin/dashboard
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  // Get overall statistics
  const overallStats = await queryOne(`
    SELECT 
      COUNT(*) as total_issues,
      COUNT(CASE WHEN status = 'reported' THEN 1 END) as reported,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
      COUNT(CASE WHEN is_hidden = TRUE THEN 1 END) as hidden,
      COUNT(CASE WHEN flag_count > 0 THEN 1 END) as flagged
    FROM issues
  `);

  // Get user statistics
  const userStats = await queryOne(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN is_verified = TRUE THEN 1 END) as verified_users,
      COUNT(CASE WHEN is_banned = TRUE THEN 1 END) as banned_users,
      COUNT(CASE WHEN is_admin = TRUE THEN 1 END) as admin_users
    FROM users
  `);

  // Get recent issues (last 7 days)
  const recentIssues = await dbQuery(`
    SELECT 
      i.id, i.title, i.category, i.status, i.created_at,
      u.name as reporter_name
    FROM issues i
    LEFT JOIN users u ON i.reporter_id = u.id
    WHERE i.created_at >= datetime('now', '-7 days')
    ORDER BY i.created_at DESC
    LIMIT 10
  `);

  // Get most active categories
  const categoryStats = await dbQuery(`
    SELECT 
      category,
      COUNT(*) as count,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count
    FROM issues
    WHERE is_hidden = FALSE
    GROUP BY category
    ORDER BY count DESC
  `);

  // Get flagged issues
  const flaggedIssues = await dbQuery(`
    SELECT 
      i.id, i.title, i.category, i.flag_count, i.created_at,
      u.name as reporter_name
    FROM issues i
    LEFT JOIN users u ON i.reporter_id = u.id
    WHERE i.flag_count > 0
    ORDER BY i.flag_count DESC, i.created_at DESC
    LIMIT 10
  `);

  res.json({
    overall_stats: overallStats,
    user_stats: userStats,
    recent_issues: recentIssues,
    category_stats: categoryStats,
    flagged_issues: flaggedIssues
  });
}));

/**
 * Get all issues with admin filters
 * GET /api/admin/issues
 */
router.get('/issues', [
  query('status').optional().isIn(['reported', 'in_progress', 'resolved']),
  query('category').optional().isIn(['roads', 'lighting', 'water_supply', 'cleanliness', 'public_safety', 'obstructions']),
  query('flagged').optional().isBoolean(),
  query('hidden').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const {
    status,
    category,
    flagged,
    hidden,
    page = 1,
    limit = 20
  } = req.query;

  let sql = `
    SELECT 
      i.id, i.title, i.description, i.category, i.status, 
      i.latitude, i.longitude, i.address, i.is_anonymous,
      i.flag_count, i.is_hidden, i.created_at, i.updated_at,
      u.name as reporter_name,
      COUNT(ii.id) as image_count
    FROM issues i
    LEFT JOIN users u ON i.reporter_id = u.id
    LEFT JOIN issue_images ii ON i.id = ii.issue_id
    WHERE 1=1
  `;

  const params = [];
  const conditions = [];

  // Add filters
  if (status) {
    conditions.push('i.status = ?');
    params.push(status);
  }

  if (category) {
    conditions.push('i.category = ?');
    params.push(category);
  }

  if (flagged === 'true') {
    conditions.push('i.flag_count > 0');
  }

  if (hidden === 'true') {
    conditions.push('i.is_hidden = TRUE');
  } else if (hidden === 'false') {
    conditions.push('i.is_hidden = FALSE');
  }

  if (conditions.length > 0) {
    sql += ' AND ' + conditions.join(' AND ');
  }

  sql += ' GROUP BY i.id ORDER BY i.created_at DESC';

  // Add pagination
  const offset = (page - 1) * limit;
  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const issues = await dbQuery(sql, params);

  // Get total count
  const countSql = `
    SELECT COUNT(DISTINCT i.id) as total
    FROM issues i
    WHERE 1=1
    ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}
  `;
  const countResult = await queryOne(countSql, params.slice(0, -2));
  const total = countResult.total;

  res.json({
    issues,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * Update issue status
 * PUT /api/admin/issues/:id/status
 */
router.put('/issues/:id/status', [
  body('status').isIn(['reported', 'in_progress', 'resolved']).withMessage('Invalid status'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment must be less than 500 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { id } = req.params;
  const { status, comment } = req.body;

  // Check if issue exists
  const issue = await queryOne('SELECT id, status FROM issues WHERE id = ?', [id]);
  if (!issue) {
    throw new NotFoundError('Issue not found');
  }

  // Update issue status
  await run(
    'UPDATE issues SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, id]
  );

  // Create status log
  await run(`
    INSERT INTO issue_status_logs (id, issue_id, status, comment, updated_by)
    VALUES (?, ?, ?, ?, ?)
  `, [require('uuid').v4(), id, status, comment, req.user.id]);

  res.json({
    message: 'Issue status updated successfully',
    status
  });
}));

/**
 * Hide/unhide issue
 * PUT /api/admin/issues/:id/visibility
 */
router.put('/issues/:id/visibility', [
  body('hidden').isBoolean().withMessage('Hidden must be a boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { id } = req.params;
  const { hidden } = req.body;

  // Check if issue exists
  const issue = await queryOne('SELECT id FROM issues WHERE id = ?', [id]);
  if (!issue) {
    throw new NotFoundError('Issue not found');
  }

  // Update visibility
  await run(
    'UPDATE issues SET is_hidden = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [hidden, id]
  );

  res.json({
    message: `Issue ${hidden ? 'hidden' : 'unhidden'} successfully`,
    hidden
  });
}));

/**
 * Get all users
 * GET /api/admin/users
 */
router.get('/users', [
  query('verified').optional().isBoolean(),
  query('banned').optional().isBoolean(),
  query('admin').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const {
    verified,
    banned,
    admin,
    page = 1,
    limit = 20
  } = req.query;

  let sql = `
    SELECT 
      id, email, name, phone, is_verified, is_admin, is_banned,
      created_at, updated_at,
      (SELECT COUNT(*) FROM issues WHERE reporter_id = users.id) as issues_count
    FROM users
    WHERE 1=1
  `;

  const params = [];
  const conditions = [];

  // Add filters
  if (verified === 'true') {
    conditions.push('is_verified = TRUE');
  } else if (verified === 'false') {
    conditions.push('is_verified = FALSE');
  }

  if (banned === 'true') {
    conditions.push('is_banned = TRUE');
  } else if (banned === 'false') {
    conditions.push('is_banned = FALSE');
  }

  if (admin === 'true') {
    conditions.push('is_admin = TRUE');
  } else if (admin === 'false') {
    conditions.push('is_admin = FALSE');
  }

  if (conditions.length > 0) {
    sql += ' AND ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC';

  // Add pagination
  const offset = (page - 1) * limit;
  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const users = await dbQuery(sql, params);

  // Get total count
  const countSql = `
    SELECT COUNT(*) as total
    FROM users
    WHERE 1=1
    ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}
  `;
  const countResult = await queryOne(countSql, params.slice(0, -2));
  const total = countResult.total;

  res.json({
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * Ban/unban user
 * PUT /api/admin/users/:id/ban
 */
router.put('/users/:id/ban', [
  body('banned').isBoolean().withMessage('Banned must be a boolean'),
  body('reason').optional().trim().isLength({ max: 200 }).withMessage('Reason must be less than 200 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { id } = req.params;
  const { banned, reason } = req.body;

  // Check if user exists
  const user = await queryOne('SELECT id, is_admin FROM users WHERE id = ?', [id]);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Prevent banning admins
  if (user.is_admin && banned) {
    throw new ForbiddenError('Cannot ban admin users');
  }

  // Update ban status
  await run(
    'UPDATE users SET is_banned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [banned, id]
  );

  res.json({
    message: `User ${banned ? 'banned' : 'unbanned'} successfully`,
    banned
  });
}));

/**
 * Verify user
 * PUT /api/admin/users/:id/verify
 */
router.put('/users/:id/verify', [
  body('verified').isBoolean().withMessage('Verified must be a boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { id } = req.params;
  const { verified } = req.body;

  // Check if user exists
  const user = await queryOne('SELECT id FROM users WHERE id = ?', [id]);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Update verification status
  await run(
    'UPDATE users SET is_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [verified, id]
  );

  res.json({
    message: `User ${verified ? 'verified' : 'unverified'} successfully`,
    verified
  });
}));

/**
 * Get analytics data
 * GET /api/admin/analytics
 */
router.get('/analytics', [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { period = '30d' } = req.query;

  // Map period to SQLite datetime
  const periodMap = {
    '7d': '-7 days',
    '30d': '-30 days',
    '90d': '-90 days',
    '1y': '-1 year'
  };

  const timeFilter = periodMap[period];

  // Get issues over time
  const issuesOverTime = await dbQuery(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
    FROM issues
    WHERE created_at >= datetime('now', ?)
    GROUP BY DATE(created_at)
    ORDER BY date
  `, [timeFilter]);

  // Get category distribution
  const categoryDistribution = await dbQuery(`
    SELECT 
      category,
      COUNT(*) as count,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
    FROM issues
    WHERE created_at >= datetime('now', ?)
    GROUP BY category
    ORDER BY count DESC
  `, [timeFilter]);

  // Get status distribution
  const statusDistribution = await dbQuery(`
    SELECT 
      status,
      COUNT(*) as count
    FROM issues
    WHERE created_at >= datetime('now', ?)
    GROUP BY status
    ORDER BY count DESC
  `, [timeFilter]);

  // Get top reporters
  const topReporters = await dbQuery(`
    SELECT 
      u.name,
      COUNT(i.id) as issues_count,
      COUNT(CASE WHEN i.status = 'resolved' THEN 1 END) as resolved_count
    FROM users u
    JOIN issues i ON u.id = i.reporter_id
    WHERE i.created_at >= datetime('now', ?)
    GROUP BY u.id, u.name
    ORDER BY issues_count DESC
    LIMIT 10
  `, [timeFilter]);

  res.json({
    period,
    issues_over_time: issuesOverTime,
    category_distribution: categoryDistribution,
    status_distribution: statusDistribution,
    top_reporters: topReporters
  });
}));

module.exports = router; 