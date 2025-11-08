/**
 * Structured logging utilities for the Smart AAC API
 * Provides consistent logging format with performance monitoring
 */

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level based on environment
const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] 
  : (process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG);

/**
 * Performance monitoring class for tracking operation metrics
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }
  
  /**
   * Start timing an operation
   */
  startTimer(operationName, context = {}) {
    const startTime = process.hrtime.bigint();
    const timerId = `${operationName}_${Date.now()}_${Math.random()}`;
    
    this.metrics.set(timerId, {
      operation: operationName,
      startTime,
      context
    });
    
    return timerId;
  }
  
  /**
   * End timing and log performance metrics
   */
  endTimer(timerId, additionalContext = {}) {
    const metric = this.metrics.get(timerId);
    if (!metric) {
      logger.warn('Performance timer not found', { timerId });
      return null;
    }
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - metric.startTime) / 1000000; // Convert to milliseconds
    
    const performanceData = {
      operation: metric.operation,
      duration: `${duration.toFixed(2)}ms`,
      durationMs: Math.round(duration),
      context: { ...metric.context, ...additionalContext }
    };
    
    // Log performance data
    logger.info('Performance metric', performanceData);
    
    // Clean up
    this.metrics.delete(timerId);
    
    return performanceData;
  }
  
  /**
   * Get current metrics summary
   */
  getMetricsSummary() {
    return {
      activeTimers: this.metrics.size,
      operations: Array.from(this.metrics.values()).map(m => ({
        operation: m.operation,
        startedAt: new Date(Number(m.startTime) / 1000000).toISOString()
      }))
    };
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

/**
 * Create structured log entry
 */
function createLogEntry(level, message, context = {}, error = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    service: 'smart-aac-api',
    environment: process.env.NODE_ENV || 'development',
    ...context
  };
  
  // Add error details if provided
  if (error) {
    logEntry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    };
  }
  
  // Add memory usage in development
  if (process.env.NODE_ENV === 'development') {
    const memUsage = process.memoryUsage();
    logEntry.memory = {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    };
  }
  
  return logEntry;
}

/**
 * Check if log level should be output
 */
function shouldLog(level) {
  return LOG_LEVELS[level.toUpperCase()] <= CURRENT_LOG_LEVEL;
}

/**
 * Format log output based on environment
 */
function formatLogOutput(logEntry) {
  if (process.env.NODE_ENV === 'production') {
    // JSON format for production (structured logging)
    return JSON.stringify(logEntry);
  } else {
    // Human-readable format for development
    const { timestamp, level, message, ...context } = logEntry;
    let output = `${timestamp} [${level}] ${message}`;
    
    if (Object.keys(context).length > 0) {
      output += `\n  Context: ${JSON.stringify(context, null, 2)}`;
    }
    
    return output;
  }
}

/**
 * Main logger object with different log levels
 */
const logger = {
  /**
   * Error level logging
   */
  error(message, context = {}, error = null) {
    if (!shouldLog('ERROR')) return;
    
    const logEntry = createLogEntry('error', message, context, error);
    console.error(formatLogOutput(logEntry));
  },
  
  /**
   * Warning level logging
   */
  warn(message, context = {}) {
    if (!shouldLog('WARN')) return;
    
    const logEntry = createLogEntry('warn', message, context);
    console.warn(formatLogOutput(logEntry));
  },
  
  /**
   * Info level logging
   */
  info(message, context = {}) {
    if (!shouldLog('INFO')) return;
    
    const logEntry = createLogEntry('info', message, context);
    console.log(formatLogOutput(logEntry));
  },
  
  /**
   * Debug level logging
   */
  debug(message, context = {}) {
    if (!shouldLog('DEBUG')) return;
    
    const logEntry = createLogEntry('debug', message, context);
    console.log(formatLogOutput(logEntry));
  },
  
  /**
   * Log HTTP request
   */
  request(req, res, responseTime = null) {
    const context = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.requestId,
      userId: req.user?.uid || 'anonymous'
    };
    
    if (responseTime) {
      context.responseTime = `${responseTime}ms`;
    }
    
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this[level]('HTTP Request', context);
  },
  
  /**
   * Log service operation
   */
  service(serviceName, operation, context = {}) {
    this.info(`Service operation: ${serviceName}.${operation}`, {
      service: serviceName,
      operation,
      ...context
    });
  },
  
  /**
   * Log database operation
   */
  database(operation, collection, context = {}) {
    this.debug(`Database operation: ${operation}`, {
      operation,
      collection,
      ...context
    });
  },
  
  /**
   * Log external API call
   */
  externalApi(apiName, endpoint, method, statusCode, responseTime, context = {}) {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this[level](`External API call: ${apiName}`, {
      api: apiName,
      endpoint,
      method,
      statusCode,
      responseTime: `${responseTime}ms`,
      ...context
    });
  }
};

/**
 * Express middleware for request logging with performance tracking
 */
const requestLoggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.debug('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestId: req.requestId
  });
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    logger.request(req, res, responseTime);
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Create a performance-tracked wrapper for async functions
 */
function withPerformanceTracking(operationName, asyncFn) {
  return async function(...args) {
    const timerId = performanceMonitor.startTimer(operationName, {
      args: args.length
    });
    
    try {
      const result = await asyncFn.apply(this, args);
      performanceMonitor.endTimer(timerId, { success: true });
      return result;
    } catch (error) {
      performanceMonitor.endTimer(timerId, { 
        success: false, 
        error: error.message 
      });
      throw error;
    }
  };
}

/**
 * Health check for logging system
 */
function getLoggingHealth() {
  return {
    status: 'healthy',
    logLevel: Object.keys(LOG_LEVELS)[CURRENT_LOG_LEVEL],
    environment: process.env.NODE_ENV || 'development',
    performanceMonitor: performanceMonitor.getMetricsSummary()
  };
}

module.exports = {
  logger,
  performanceMonitor,
  requestLoggingMiddleware,
  withPerformanceTracking,
  getLoggingHealth,
  LOG_LEVELS
};