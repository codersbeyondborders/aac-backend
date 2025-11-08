const { v4: uuidv4 } = require('uuid');

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Request ID generation middleware
 * Adds a unique request ID to each request for tracking
 */
const requestIdMiddleware = (req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

/**
 * Centralized error handling middleware
 * Handles all errors and formats consistent error responses
 */
const errorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || null;
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid input data';
    details = err.details || err.message;
  } else if (err.name === 'UnauthorizedError' || err.code === 'auth/id-token-expired') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Authentication required or token expired';
  } else if (err.code === 'PERMISSION_DENIED') {
    statusCode = 403;
    code = 'FORBIDDEN';
    message = 'Insufficient permissions';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    statusCode = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = 'External service unavailable';
  } else if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  }
  
  // Create structured error response
  const errorResponse = {
    error: message,
    code: code,
    timestamp: new Date().toISOString(),
    requestId: req.requestId || 'unknown'
  };
  
  // Add details only if they exist and we're not in production
  if (details && process.env.NODE_ENV !== 'production') {
    errorResponse.details = details;
  }
  
  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }
  
  // Log error with context
  const logContext = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.uid || 'anonymous',
    statusCode,
    errorCode: code,
    message: err.message,
    stack: err.stack
  };
  
  if (statusCode >= 500) {
    console.error('Server Error:', JSON.stringify(logContext, null, 2));
  } else {
    console.warn('Client Error:', JSON.stringify(logContext, null, 2));
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global unhandled rejection and exception handlers
 */
const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process in production, just log the error
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Exit the process for uncaught exceptions as the app state is unreliable
    process.exit(1);
  });
};

module.exports = {
  AppError,
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  setupGlobalErrorHandlers
};