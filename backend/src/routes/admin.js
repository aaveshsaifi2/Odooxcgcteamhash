const express = require('express');
const { 
  Issue, 
  User, 
  IssueFlag, 
  IssueStatusLog,
  query,
  queryOne,
  run,
  count 
} = require('../database/database');
const { asyncHandler, ValidationError, ForbiddenError } = require('../middleware/errorHandler');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * Admin dashboard overview
 * GET /api/admin/dashboard
 */
router.get('/dashboard', requireAdmin, asyncHandler(async (req, res) => {
  // Get overall statistics
  const stats = await Issue.aggregate([
    {
      $group: {
        _id: null,
        total_issues: { $sum: 1 },
        reported: { $sum: { $cond: [{ $eq: ['$status', 'reported'] }, 1, 0] } },
        in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        hidden: { $sum: { $cond: ['$is_hidden', 1, 0] } }
      }
    }
  ]);

  // Get user statistics
  const userStats = await User.aggregate([
    {
      $group: {
        _id: null,
        total_users: { $sum: 1 },
        verified_users: { $sum: { $cond: ['$is_verified', 1, 0] } },
        admin_users: { $sum: { $cond: ['$is_admin', 1, 0] } },
        banned_users: { $sum: { $cond: ['$is_banned', 1, 0] } }
      }
    }
  ]);

  // Get category statistics
  const categoryStats = await Issue.aggregate([
    { $match: { is_hidden: false } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        resolved_count: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Get flagged issues
  const flaggedIssues = await Issue.aggregate([
    { $match: { flag_count: { $gt: 0 } } },
    { $sort: { flag_count: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: 'reporter_id',
        foreignField: 'id',
        as: 'reporter'
      }
    },
    {
      $addFields: {
        reporter_name: { $arrayElemAt: ['$reporter.name', 0] }
      }
    },
    { $project: { reporter: 0 } }
  ]);

  // Get recent activity
  const recentActivity = await IssueStatusLog.aggregate([
    { $sort: { created_at: -1 } },
    { $limit: 20 },
    {
      $lookup: {
        from: 'issues',
        localField: 'issue_id',
        foreignField: 'id',
        as: 'issue'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'updated_by',
        foreignField: 'id',
        as: 'user'
      }
    },
    {
      $addFields: {
        issue_title: { $arrayElemAt: ['$issue.title', 0] },
        updated_by_name: { $arrayElemAt: ['$user.name', 0] }
      }
    },
    { $project: { issue: 0, user: 0 } }
  ]);

  res.json({
    overview: stats[0] || {
      total_issues: 0,
      reported: 0,
      in_progress: 0,
      resolved: 0,
      hidden: 0
    },
    users: userStats[0] || {
      total_users: 0,
      verified_users: 0,
      admin_users: 0,
      banned_users: 0
    },
    categories: categoryStats,
    flagged_issues: flaggedIssues,
    recent_activity: recentActivity
  });
}));

/**
 * Get all issues with admin details
 * GET /api/admin/issues
 */
router.get('/issues', requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, category, flagged } = req.query;
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {};
  
  if (status) {
    filter.status = status;
  }

  if (category) {
    filter.category = category;
  }

  if (flagged === 'true') {
    filter.flag_count = { $gt: 0 };
  }

  // Get issues with pagination
  const issues = await Issue.find(filter)
    .populate('reporter_id', 'name email')
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Get total count
  const total = await count(Issue, filter);

  // Format response
  const formattedIssues = issues.map(issue => ({
    ...issue,
    reporter_name: issue.reporter_id?.name || 'Anonymous',
    reporter_email: issue.reporter_id?.email
  }));

  res.json({
    issues: formattedIssues,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * Get all users with admin details
 * GET /api/admin/users
 */
router.get('/users', requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, verified, banned } = req.query;
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {};
  
  if (verified === 'true') {
    filter.is_verified = true;
  } else if (verified === 'false') {
    filter.is_verified = false;
  }

  if (banned === 'true') {
    filter.is_banned = true;
  } else if (banned === 'false') {
    filter.is_banned = false;
  }

  // Get users with pagination
  const users = await User.find(filter)
    .select('-password_hash')
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Get issue counts for each user
  const userIds = users.map(user => user.id);
  const issueCounts = await Issue.aggregate([
    { $match: { reporter_id: { $in: userIds } } },
    { $group: { _id: '$reporter_id', count: { $sum: 1 } } }
  ]);

  const issueCountMap = {};
  issueCounts.forEach(item => {
    issueCountMap[item._id] = item.count;
  });

  // Add issue counts to users
  const usersWithCounts = users.map(user => ({
    ...user,
    issue_count: issueCountMap[user.id] || 0
  }));

  // Get total count
  const total = await count(User, filter);

  res.json({
    users: usersWithCounts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * Ban/unban a user
 * PUT /api/admin/users/:id/ban
 */
router.put('/users/:id/ban', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_banned, reason } = req.body;

  if (typeof is_banned !== 'boolean') {
    throw new ValidationError('is_banned must be a boolean');
  }

  // Check if user exists
  const user = await queryOne(User, { id });
  if (!user) {
    throw new ValidationError('User not found');
  }

  // Prevent banning admin users
  if (user.is_admin && is_banned) {
    throw new ForbiddenError('Cannot ban admin users');
  }

  // Update user ban status
  await User.findOneAndUpdate(
    { id },
    { 
      is_banned,
      updated_at: new Date()
    }
  );

  res.json({
    message: `User ${is_banned ? 'banned' : 'unbanned'} successfully`,
    is_banned
  });
}));

/**
 * Verify/unverify a user
 * PUT /api/admin/users/:id/verify
 */
router.put('/users/:id/verify', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_verified } = req.body;

  if (typeof is_verified !== 'boolean') {
    throw new ValidationError('is_verified must be a boolean');
  }

  // Check if user exists
  const user = await queryOne(User, { id });
  if (!user) {
    throw new ValidationError('User not found');
  }

  // Update user verification status
  await User.findOneAndUpdate(
    { id },
    { 
      is_verified,
      updated_at: new Date()
    }
  );

  res.json({
    message: `User ${is_verified ? 'verified' : 'unverified'} successfully`,
    is_verified
  });
}));

/**
 * Hide/unhide an issue
 * PUT /api/admin/issues/:id/visibility
 */
router.put('/issues/:id/visibility', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_hidden } = req.body;

  if (typeof is_hidden !== 'boolean') {
    throw new ValidationError('is_hidden must be a boolean');
  }

  // Check if issue exists
  const issue = await queryOne(Issue, { id });
  if (!issue) {
    throw new ValidationError('Issue not found');
  }

  // Update issue visibility
  await Issue.findOneAndUpdate(
    { id },
    { 
      is_hidden,
      updated_at: new Date()
    }
  );

  res.json({
    message: `Issue ${is_hidden ? 'hidden' : 'unhidden'} successfully`,
    is_hidden
  });
}));

/**
 * Get flagged issues details
 * GET /api/admin/flagged-issues
 */
router.get('/flagged-issues', requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  // Get flagged issues with flag details
  const flaggedIssues = await Issue.aggregate([
    { $match: { flag_count: { $gt: 0 } } },
    { $sort: { flag_count: -1 } },
    { $skip: skip },
    { $limit: parseInt(limit) },
    {
      $lookup: {
        from: 'users',
        localField: 'reporter_id',
        foreignField: 'id',
        as: 'reporter'
      }
    },
    {
      $addFields: {
        reporter_name: { $arrayElemAt: ['$reporter.name', 0] }
      }
    },
    { $project: { reporter: 0 } }
  ]);

  // Get flag details for each issue
  const issueIds = flaggedIssues.map(issue => issue.id);
  const flagDetails = await IssueFlag.aggregate([
    { $match: { issue_id: { $in: issueIds } } },
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: 'id',
        as: 'user'
      }
    },
    {
      $addFields: {
        user_name: { $arrayElemAt: ['$user.name', 0] }
      }
    },
    { $project: { user: 0 } },
    { $sort: { created_at: -1 } }
  ]);

  // Group flags by issue
  const flagsByIssue = {};
  flagDetails.forEach(flag => {
    if (!flagsByIssue[flag.issue_id]) {
      flagsByIssue[flag.issue_id] = [];
    }
    flagsByIssue[flag.issue_id].push(flag);
  });

  // Add flag details to issues
  const issuesWithFlags = flaggedIssues.map(issue => ({
    ...issue,
    flags: flagsByIssue[issue.id] || []
  }));

  // Get total count
  const total = await count(Issue, { flag_count: { $gt: 0 } });

  res.json({
    issues: issuesWithFlags,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

module.exports = router; 