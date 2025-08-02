const jwt = require('jsonwebtoken');
const { queryOne } = require('../database/database');

/**
 * Middleware to authenticate JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied',
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database to ensure they still exist and aren't banned
    const user = await queryOne(
      'SELECT id, email, name, is_admin, is_banned FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found' 
      });
    }

    if (user.is_banned) {
      return res.status(403).json({ 
        error: 'Account banned',
        message: 'Your account has been suspended' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token is not valid' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Token has expired' 
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'Internal server error' 
    });
  }
};

/**
 * Middleware to check if user is admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAdmin = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Admin privileges required' 
    });
  }
  next();
};

/**
 * Middleware to check if user is verified
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireVerified = async (req, res, next) => {
  try {
    const user = await queryOne(
      'SELECT is_verified FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user.is_verified) {
      return res.status(403).json({ 
        error: 'Account not verified',
        message: 'Please verify your account to access this feature' 
      });
    }
    next();
  } catch (error) {
    console.error('Verification check error:', error);
    return res.status(500).json({ 
      error: 'Verification error',
      message: 'Internal server error' 
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const user = await queryOne(
      'SELECT id, email, name, is_admin, is_banned FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (user && !user.is_banned) {
      req.user = user;
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireVerified,
  optionalAuth
}; 