const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { body, query, validationResult } = require('express-validator');
const { query: dbQuery, queryOne, run } = require('../database/database');
const { asyncHandler, ValidationError, NotFoundError, ForbiddenError } = require('../middleware/errorHandler');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Get issues with location-based filtering
 * GET /api/issues
 */
router.get('/', [
  query('latitude').optional().isFloat({ min: -90, max: 90 }),
  query('longitude').optional().isFloat({ min: -180, max: 180 }),
  query('radius').optional().isFloat({ min: 0.1, max: 10 }),
  query('category').optional().isIn(['roads', 'lighting', 'water_supply', 'cleanliness', 'public_safety', 'obstructions']),
  query('status').optional().isIn(['reported', 'in_progress', 'resolved']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], optionalAuth, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const {
    latitude,
    longitude,
    radius = 5,
    category,
    status,
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
    WHERE i.is_hidden = FALSE
  `;

  const params = [];
  const conditions = [];

  // Add category filter
  if (category) {
    conditions.push('i.category = ?');
    params.push(category);
  }

  // Add status filter
  if (status) {
    conditions.push('i.status = ?');
    params.push(status);
  }

  // Add location-based filtering
  if (latitude && longitude) {
    // Use SQLite's built-in distance calculation for better performance
    // This is a simplified version - in production, consider using PostGIS or similar
    conditions.push(`
      (i.latitude BETWEEN ? AND ?) AND 
      (i.longitude BETWEEN ? AND ?)
    `);
    const latRange = radius / 111; // Rough conversion: 1 degree ≈ 111 km
    const lonRange = radius / (111 * Math.cos(latitude * Math.PI / 180));
    params.push(latitude - latRange, latitude + latRange, longitude - lonRange, longitude + lonRange);
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

  // Calculate exact distances if coordinates provided
  if (latitude && longitude) {
    issues.forEach(issue => {
      issue.distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        issue.latitude,
        issue.longitude
      );
    });

    // Filter by exact distance and sort by distance
    const filteredIssues = issues
      .filter(issue => issue.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    // Get total count for pagination
    const countSql = `
      SELECT COUNT(DISTINCT i.id) as total
      FROM issues i
      WHERE i.is_hidden = FALSE
      ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}
    `;
    const countResult = await queryOne(countSql, params.slice(0, -2)); // Remove limit and offset
    const total = countResult.total;

    res.json({
      issues: filteredIssues,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } else {
    // Get total count for pagination
    const countSql = `
      SELECT COUNT(DISTINCT i.id) as total
      FROM issues i
      WHERE i.is_hidden = FALSE
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
  }
}));

/**
 * Get a specific issue by ID
 * GET /api/issues/:id
 */
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const issue = await queryOne(`
    SELECT 
      i.*, u.name as reporter_name,
      COUNT(ii.id) as image_count
    FROM issues i
    LEFT JOIN users u ON i.reporter_id = u.id
    LEFT JOIN issue_images ii ON i.id = ii.issue_id
    WHERE i.id = ? AND i.is_hidden = FALSE
    GROUP BY i.id
  `, [id]);

  if (!issue) {
    throw new NotFoundError('Issue not found');
  }

  // Get issue images
  const images = await dbQuery(
    'SELECT id, image_path, created_at FROM issue_images WHERE issue_id = ? ORDER BY created_at',
    [id]
  );

  // Get status logs
  const statusLogs = await dbQuery(`
    SELECT 
      isl.*, u.name as updated_by_name
    FROM issue_status_logs isl
    LEFT JOIN users u ON isl.updated_by = u.id
    WHERE isl.issue_id = ?
    ORDER BY isl.created_at DESC
  `, [id]);

  res.json({
    issue: {
      ...issue,
      images,
      status_logs: statusLogs
    }
  });
}));

/**
 * Create a new issue
 * POST /api/issues
 */
router.post('/', [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('category').isIn(['roads', 'lighting', 'water_supply', 'cleanliness', 'public_safety', 'obstructions']).withMessage('Invalid category'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('address').optional().trim().isLength({ max: 200 }).withMessage('Address must be less than 200 characters'),
  body('is_anonymous').optional().isBoolean().withMessage('is_anonymous must be a boolean')
], upload.array('images', 5), asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const {
    title,
    description,
    category,
    latitude,
    longitude,
    address,
    is_anonymous = false
  } = req.body;

  const issueId = uuidv4();
  const reporterId = req.user ? req.user.id : null;

  // Create issue
  await run(`
    INSERT INTO issues (id, title, description, category, latitude, longitude, address, reporter_id, is_anonymous)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [issueId, title, description, category, latitude, longitude, address, reporterId, is_anonymous]);

  // Process and save images
  const imagePaths = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const imageId = uuidv4();
      const filename = `${imageId}.webp`;
      const imagePath = path.join(uploadsDir, filename);

      // Resize and optimize image
      await sharp(file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(imagePath);

      // Save image record
      await run(
        'INSERT INTO issue_images (id, issue_id, image_path) VALUES (?, ?, ?)',
        [imageId, issueId, filename]
      );

      imagePaths.push(filename);
    }
  }

  // Create initial status log
  await run(`
    INSERT INTO issue_status_logs (id, issue_id, status, comment, updated_by)
    VALUES (?, ?, 'reported', 'Issue reported', ?)
  `, [uuidv4(), issueId, reporterId]);

  // Get created issue
  const issue = await queryOne(`
    SELECT 
      i.*, u.name as reporter_name,
      COUNT(ii.id) as image_count
    FROM issues i
    LEFT JOIN users u ON i.reporter_id = u.id
    LEFT JOIN issue_images ii ON i.id = ii.issue_id
    WHERE i.id = ?
    GROUP BY i.id
  `, [issueId]);

  res.status(201).json({
    message: 'Issue created successfully',
    issue: {
      ...issue,
      images: imagePaths.map(path => ({ image_path: path }))
    }
  });
}));

/**
 * Update issue status (admin only)
 * PUT /api/issues/:id/status
 */
router.put('/:id/status', [
  body('status').isIn(['reported', 'in_progress', 'resolved']).withMessage('Invalid status'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment must be less than 500 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  if (!req.user || !req.user.is_admin) {
    throw new ForbiddenError('Admin privileges required');
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
  `, [uuidv4(), id, status, comment, req.user.id]);

  res.json({
    message: 'Issue status updated successfully',
    status
  });
}));

/**
 * Flag an issue as inappropriate
 * POST /api/issues/:id/flag
 */
router.post('/:id/flag', [
  body('reason').optional().trim().isLength({ max: 200 }).withMessage('Reason must be less than 200 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  if (!req.user) {
    throw new ForbiddenError('Authentication required');
  }

  const { id } = req.params;
  const { reason } = req.body;

  // Check if issue exists
  const issue = await queryOne('SELECT id, reporter_id FROM issues WHERE id = ?', [id]);
  if (!issue) {
    throw new NotFoundError('Issue not found');
  }

  // Prevent users from flagging their own issues
  if (issue.reporter_id === req.user.id) {
    throw new ForbiddenError('Cannot flag your own issue');
  }

  // Check if user already flagged this issue
  const existingFlag = await queryOne(
    'SELECT id FROM issue_flags WHERE issue_id = ? AND user_id = ?',
    [id, req.user.id]
  );

  if (existingFlag) {
    throw new ValidationError('You have already flagged this issue');
  }

  // Create flag
  await run(
    'INSERT INTO issue_flags (id, issue_id, user_id, reason) VALUES (?, ?, ?, ?)',
    [uuidv4(), id, req.user.id, reason]
  );

  // Update flag count
  await run(
    'UPDATE issues SET flag_count = flag_count + 1 WHERE id = ?',
    [id]
  );

  // Auto-hide issue if flagged by multiple users (3 or more)
  const flagCount = await queryOne(
    'SELECT COUNT(*) as count FROM issue_flags WHERE issue_id = ?',
    [id]
  );

  if (flagCount.count >= 3) {
    await run('UPDATE issues SET is_hidden = TRUE WHERE id = ?', [id]);
  }

  res.json({
    message: 'Issue flagged successfully'
  });
}));

/**
 * Get issue statistics
 * GET /api/issues/stats/overview
 */
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const stats = await queryOne(`
    SELECT 
      COUNT(*) as total_issues,
      COUNT(CASE WHEN status = 'reported' THEN 1 END) as reported,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
      COUNT(CASE WHEN is_hidden = TRUE THEN 1 END) as hidden
    FROM issues
  `);

  const categoryStats = await dbQuery(`
    SELECT 
      category,
      COUNT(*) as count
    FROM issues
    WHERE is_hidden = FALSE
    GROUP BY category
    ORDER BY count DESC
  `);

  res.json({
    overview: stats,
    by_category: categoryStats
  });
}));

module.exports = router; 