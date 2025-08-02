/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let error = 'Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    error = 'Validation Error';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    error = 'Invalid Input';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 400;
    message = 'Data constraint violation';
    error = 'Constraint Error';
  } else if (err.code === 'SQLITE_BUSY') {
    statusCode = 503;
    message = 'Database is busy, please try again';
    error = 'Service Unavailable';
  } else if (err.message && err.message.includes('ENOENT')) {
    statusCode = 404;
    message = 'File not found';
    error = 'Not Found';
  } else if (err.message && err.message.includes('LIMIT_FILE_SIZE')) {
    statusCode = 413;
    message = 'File too large';
    error = 'File Size Error';
  } else if (err.message && err.message.includes('LIMIT_UNEXPECTED_FILE')) {
    statusCode = 400;
    message = 'Unexpected file field';
    error = 'File Upload Error';
  }

  // Send error response
  res.status(statusCode).json({
    error,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
    path: req.path
  });
};

/**
 * Async error wrapper to catch async errors in route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorType = 'Application Error') {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'Validation Error');
    this.details = details;
  }
}

/**
 * Not found error class
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'Not Found');
  }
}

/**
 * Unauthorized error class
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'Unauthorized');
  }
}

/**
 * Forbidden error class
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'Forbidden');
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError
}; 