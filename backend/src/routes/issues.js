const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { body, query, validationResult } = require('express-validator');
const { 
  Issue, 
  IssueImage, 
  IssueStatusLog, 
  IssueFlag, 
  IssueVote,
  User,
  query: dbQuery, 
  queryOne, 
  run,
  count 
} = require('../database/database');
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
  query('category').optional().isIn(['all', 'roads', 'lighting', 'water supply', 'cleanliness', 'public safety', 'obstructions']),
  query('status').optional().isIn(['all', 'reported', 'in_progress', 'resolved']),
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

  // Build filter
  const filter = { is_hidden: false };
  
  if (category && category !== 'all') {
    filter.category = category;
  }

  if (status && status !== 'all') {
    filter.status = status;
  }

  // Add location-based filtering
  if (latitude && longitude) {
    const latRange = radius / 111; // Rough conversion: 1 degree ≈ 111 km
    const lonRange = radius / (111 * Math.cos(latitude * Math.PI / 180));
    
    filter['location.latitude'] = {
      $gte: parseFloat(latitude) - latRange,
      $lte: parseFloat(latitude) + latRange
    };
    filter['location.longitude'] = {
      $gte: parseFloat(longitude) - lonRange,
      $lte: parseFloat(longitude) + lonRange
    };
  }

  // Get issues with pagination
  const skip = (page - 1) * limit;
  const issues = await Issue.find(filter)
    .populate('reporter_id', 'name')
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Get image counts for each issue
  const issueIds = issues.map(issue => issue.id);
  const imageCounts = await IssueImage.aggregate([
    { $match: { issue_id: { $in: issueIds } } },
    { $group: { _id: '$issue_id', count: { $sum: 1 } } }
  ]);

  const imageCountMap = {};
  imageCounts.forEach(item => {
    imageCountMap[item._id] = item.count;
  });

  // Add image counts and calculate distances
  const issuesWithCounts = issues.map(issue => ({
    ...issue,
    image_count: imageCountMap[issue.id] || 0,
    reporter_name: issue.reporter_id?.name || 'Anonymous',
    distance: latitude && longitude ? calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      issue.location.latitude,
      issue.location.longitude
    ) : undefined
  }));

  // Filter by exact distance if coordinates provided
  let filteredIssues = issuesWithCounts;
  if (latitude && longitude) {
    filteredIssues = issuesWithCounts
      .filter(issue => issue.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  // Get total count for pagination
  const total = await count(Issue, filter);

  res.json({
    issues: filteredIssues,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * Get a specific issue by ID
 * GET /api/issues/:id
 */
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const issue = await Issue.findOne({ id, is_hidden: false })
    .populate('reporter_id', 'name')
    .lean();

  if (!issue) {
    throw new NotFoundError('Issue not found');
  }

  // Get issue images
  const images = await IssueImage.find({ issue_id: id })
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
      reporter_name: issue.reporter_id?.name || 'Anonymous',
      images,
      status_logs: formattedStatusLogs
    }
  });
}));

/**
 * Create a new issue
 * POST /api/issues
 */
router.post('/', upload.array('images', 5), optionalAuth, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
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
  await run(Issue, {
    id: issueId,
    title,
    description,
    category,
    location: {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address
    },
    reporter_id: reporterId,
    is_anonymous,
    is_hidden: false
  });

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
      await run(IssueImage, {
        id: imageId,
        issue_id: issueId,
        image_path: filename
      });

      imagePaths.push(filename);
    }
  }

  // Create initial status log
  await run(IssueStatusLog, {
    id: uuidv4(),
    issue_id: issueId,
    status: 'reported',
    comment: 'Issue reported',
    updated_by: reporterId
  });

  // Get created issue
  const issue = await Issue.findOne({ id: issueId })
    .populate('reporter_id', 'name')
    .lean();

  const imageCount = await count(IssueImage, { issue_id: issueId });

  res.status(201).json({
    message: 'Issue created successfully',
    issue: {
      ...issue,
      reporter_name: issue.reporter_id?.name || 'Anonymous',
      image_count: imageCount,
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
  const issue = await queryOne(Issue, { id });
  if (!issue) {
    throw new NotFoundError('Issue not found');
  }

  // Update issue status
  await Issue.findOneAndUpdate(
    { id },
    { status, updated_at: new Date() }
  );

  // Create status log
  await run(IssueStatusLog, {
    id: uuidv4(),
    issue_id: id,
    status,
    comment,
    updated_by: req.user.id
  });

  res.json({
    message: 'Issue status updated successfully',
    status
  });
}));

/**
 * Vote on an issue (upvote/downvote)
 * POST /api/issues/:id/vote
 */
router.post('/:id/vote', [
  body('type').isIn(['upvote', 'downvote']).withMessage('Vote type must be upvote or downvote')
], optionalAuth, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  if (!req.user) {
    throw new ForbiddenError('Authentication required');
  }

  const { id } = req.params;
  const { type } = req.body;

  // Check if issue exists
  const issue = await queryOne(Issue, { id });
  if (!issue) {
    throw new NotFoundError('Issue not found');
  }

  // Prevent users from voting on their own issues
  if (issue.reporter_id === req.user.id) {
    throw new ForbiddenError('Cannot vote on your own issue');
  }

  // Check if user already voted on this issue
  const existingVote = await queryOne(IssueVote, { issue_id: id, user_id: req.user.id });

  if (existingVote) {
    // Update existing vote
    if (existingVote.vote_type === type) {
      // Remove vote if clicking same button
      await deleteOne(IssueVote, { id: existingVote.id });
      await Issue.findOneAndUpdate(
        { id },
        { $inc: { [`${type}s`]: -1 } }
      );
      res.json({
        message: 'Vote removed successfully',
        upvotes: issue.upvotes + (type === 'upvote' ? -1 : 0),
        downvotes: issue.downvotes + (type === 'downvote' ? -1 : 0)
      });
    } else {
      // Change vote
      await IssueVote.findOneAndUpdate({ id: existingVote.id }, { vote_type: type });
      await Issue.findOneAndUpdate(
        { id },
        { 
          $inc: { 
            [`${type}s`]: 1,
            [`${existingVote.vote_type}s`]: -1
          } 
        }
      );
      res.json({
        message: 'Vote updated successfully',
        upvotes: issue.upvotes + (type === 'upvote' ? 1 : -1),
        downvotes: issue.downvotes + (type === 'downvote' ? 1 : -1)
      });
    }
  } else {
    // Create new vote
    await run(IssueVote, {
      id: uuidv4(),
      issue_id: id,
      user_id: req.user.id,
      vote_type: type
    });
    await Issue.findOneAndUpdate(
      { id },
      { $inc: { [`${type}s`]: 1 } }
    );
    res.json({
      message: 'Vote added successfully',
      upvotes: issue.upvotes + (type === 'upvote' ? 1 : 0),
      downvotes: issue.downvotes + (type === 'downvote' ? 1 : 0)
    });
  }
}));

/**
 * Flag an issue as inappropriate
 * POST /api/issues/:id/flag
 */
router.post('/:id/flag', [
  body('reason').optional().trim().isLength({ max: 200 }).withMessage('Reason must be less than 200 characters')
], optionalAuth, asyncHandler(async (req, res) => {
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
  const issue = await queryOne(Issue, { id });
  if (!issue) {
    throw new NotFoundError('Issue not found');
  }

  // Prevent users from flagging their own issues
  if (issue.reporter_id === req.user.id) {
    throw new ForbiddenError('Cannot flag your own issue');
  }

  // Check if user already flagged this issue
  const existingFlag = await queryOne(IssueFlag, { issue_id: id, flagged_by: req.user.id });

  if (existingFlag) {
    throw new ValidationError('You have already flagged this issue');
  }

  // Create flag
  await run(IssueFlag, {
    id: uuidv4(),
    issue_id: id,
    flagged_by: req.user.id,
    reason
  });

  // Update flag count
  await Issue.findOneAndUpdate(
    { id },
    { $inc: { flag_count: 1 } }
  );

  // Auto-hide issue if flagged by multiple users (3 or more)
  const flagCount = await count(IssueFlag, { issue_id: id });

  if (flagCount >= 3) {
    await Issue.findOneAndUpdate(
      { id },
      { is_hidden: true }
    );
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

  res.json({
    overview: stats[0] || {
      total_issues: 0,
      reported: 0,
      in_progress: 0,
      resolved: 0,
      hidden: 0
    },
    by_category: categoryStats
  });
}));

module.exports = router; 