const express = require('express');
const { body, validationResult } = require('express-validator');
const { query: dbQuery, queryOne, run } = require('../database/database');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * Get user's reported issues
 * GET /api/users/issues
 */
router.get('/issues', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const sql = `
    SELECT 
      i.id, i.title, i.description, i.category, i.status, 
      i.latitude, i.longitude, i.address, i.is_anonymous,
      i.flag_count, i.is_hidden, i.created_at, i.updated_at,
      COUNT(ii.id) as image_count
    FROM issues i
    LEFT JOIN issue_images ii ON i.id = ii.issue_id
    WHERE i.reporter_id = ?
    GROUP BY i.id
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const offset = (page - 1) * limit;
  const issues = await dbQuery(sql, [req.user.id, limit, offset]);

  // Get total count
  const countResult = await queryOne(
    'SELECT COUNT(*) as total FROM issues WHERE reporter_id = ?',
    [req.user.id]
  );

  res.json({
    issues,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult.total,
      pages: Math.ceil(countResult.total / limit)
    }
  });
}));

/**
 * Get user's profile statistics
 * GET /api/users/stats
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await queryOne(`
    SELECT 
      COUNT(*) as total_issues,
      COUNT(CASE WHEN status = 'reported' THEN 1 END) as reported,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
    FROM issues
    WHERE reporter_id = ?
  `, [req.user.id]);

  const categoryStats = await dbQuery(`
    SELECT 
      category,
      COUNT(*) as count
    FROM issues
    WHERE reporter_id = ?
    GROUP BY category
    ORDER BY count DESC
  `, [req.user.id]);

  res.json({
    overview: stats,
    by_category: categoryStats
  });
}));

module.exports = router; 