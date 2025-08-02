const express = require('express');
const { 
  Issue, 
  IssueStatusLog,
  query,
  queryOne,
  count 
} = require('../database/database');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Get user's reported issues
 * GET /api/users/issues
 */
router.get('/issues', authenticateToken, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;

  // Build filter
  const filter = { reporter_id: req.user.id };
  
  if (status) {
    filter.status = status;
  }

  // Get user's issues with pagination
  const issues = await Issue.find(filter)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Get image counts for each issue
  const issueIds = issues.map(issue => issue.id);
  const imageCounts = await Issue.aggregate([
    { $match: { id: { $in: issueIds } } },
    {
      $lookup: {
        from: 'issueimages',
        localField: 'id',
        foreignField: 'issue_id',
        as: 'images'
      }
    },
    {
      $addFields: {
        image_count: { $size: '$images' }
      }
    },
    { $project: { id: 1, image_count: 1 } }
  ]);

  const imageCountMap = {};
  imageCounts.forEach(item => {
    imageCountMap[item.id] = item.image_count;
  });

  // Add image counts to issues
  const issuesWithCounts = issues.map(issue => ({
    ...issue,
    image_count: imageCountMap[issue.id] || 0
  }));

  // Get total count
  const total = await count(Issue, filter);

  res.json({
    issues: issuesWithCounts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * Get user's issue statistics
 * GET /api/users/stats
 */
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  // Get user's issue statistics
  const stats = await Issue.aggregate([
    { $match: { reporter_id: req.user.id } },
    {
      $group: {
        _id: null,
        total_issues: { $sum: 1 },
        reported: { $sum: { $cond: [{ $eq: ['$status', 'reported'] }, 1, 0] } },
        in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
      }
    }
  ]);

  // Get category breakdown
  const categoryStats = await Issue.aggregate([
    { $match: { reporter_id: req.user.id } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        resolved_count: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Get recent activity
  const recentActivity = await IssueStatusLog.aggregate([
    {
      $lookup: {
        from: 'issues',
        localField: 'issue_id',
        foreignField: 'id',
        as: 'issue'
      }
    },
    { $unwind: '$issue' },
    { $match: { 'issue.reporter_id': req.user.id } },
    { $sort: { created_at: -1 } },
    { $limit: 10 },
    {
      $addFields: {
        issue_title: '$issue.title',
        issue_category: '$issue.category'
      }
    },
    { $project: { issue: 0 } }
  ]);

  res.json({
    overview: stats[0] || {
      total_issues: 0,
      reported: 0,
      in_progress: 0,
      resolved: 0
    },
    by_category: categoryStats,
    recent_activity: recentActivity
  });
}));

/**
 * Get user's specific issue with details
 * GET /api/users/issues/:id
 */
router.get('/issues/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get issue (only if it belongs to the user)
  const issue = await Issue.findOne({ id, reporter_id: req.user.id })
    .lean();

  if (!issue) {
    throw new ValidationError('Issue not found or access denied');
  }

  // Get issue images
  const images = await Issue.find({ issue_id: id })
    .sort({ created_at: 1 })
    .lean();

  // Get status logs
  const statusLogs = await IssueStatusLog.find({ issue_id: id })
    .populate('updated_by', 'name')
    .sort({ created_at: -1 })
    .lean();

  // Format the response
  const formattedStatusLogs = statusLogs.map(log => ({
    ...log,
    updated_by_name: log.updated_by?.name || 'System'
  }));

  res.json({
    issue: {
      ...issue,
      images,
      status_logs: formattedStatusLogs
    }
  });
}));

module.exports = router; 