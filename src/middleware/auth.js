const admin = require('firebase-admin');

/**
 * Firebase JWT authentication middleware
 * Verifies Firebase JWT tokens and extracts user information
 * 
 * Requirements covered:
 * - 2.1: Verify Firebase JWT tokens for all protected endpoints
 * - 2.2: Return HTTP 401 status with error message for invalid/missing tokens
 * - 2.3: Extract user information from validated JWT tokens
 * - 6.2: Log error details using console.error
 * - 6.3: Return meaningful HTTP status codes with JSON error responses
 */
const isAuthenticated = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.error('Authentication failed: No Authorization header provided');
      return res.status(401).json({
        error: 'No authorization header provided',
        code: 'MISSING_AUTH_HEADER',
        timestamp: new Date().toISOString()
      });
    }
    
    // Check if header follows Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      console.error('Authentication failed: Invalid Authorization header format');
      return res.status(401).json({
        error: 'Invalid authorization header format. Expected: Bearer <token>',
        code: 'INVALID_AUTH_FORMAT',
        timestamp: new Date().toISOString()
      });
    }
    
    // Extract token from "Bearer <token>" format
    const token = authHeader.split('Bearer ')[1];
    
    if (!token || token.trim() === '') {
      console.error('Authentication failed: Empty token provided');
      return res.status(401).json({
        error: 'No token provided',
        code: 'MISSING_TOKEN',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verify the Firebase JWT token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Extract user information from validated JWT token
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
      firebase: decodedToken // Include full decoded token for additional claims
    };
    
    // Log successful authentication
    console.log(`Authentication successful for user: ${decodedToken.uid}`);
    
    // Continue to next middleware/route handler
    next();
    
  } catch (error) {
    // Handle different types of authentication errors
    console.error('Authentication error:', error.message);
    
    let errorResponse = {
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    };
    
    // Provide more specific error messages based on Firebase Auth error codes
    if (error.code === 'auth/id-token-expired') {
      errorResponse.error = 'Token has expired';
      errorResponse.code = 'TOKEN_EXPIRED';
    } else if (error.code === 'auth/id-token-revoked') {
      errorResponse.error = 'Token has been revoked';
      errorResponse.code = 'TOKEN_REVOKED';
    } else if (error.code === 'auth/invalid-id-token') {
      errorResponse.error = 'Invalid token format';
      errorResponse.code = 'INVALID_TOKEN_FORMAT';
    } else if (error.code === 'auth/project-not-found') {
      errorResponse.error = 'Authentication service unavailable';
      errorResponse.code = 'AUTH_SERVICE_ERROR';
      console.error('Firebase project configuration error:', error.message);
    }
    
    return res.status(401).json(errorResponse);
  }
};

/**
 * Optional middleware to extract user information if token is present
 * but don't require authentication (for endpoints that work with or without auth)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      
      if (token && token.trim() !== '') {
        try {
          const decodedToken = await admin.auth().verifyIdToken(token);
          req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified,
            name: decodedToken.name,
            picture: decodedToken.picture,
            firebase: decodedToken
          };
          console.log(`Optional authentication successful for user: ${decodedToken.uid}`);
        } catch (error) {
          // For optional auth, we don't return errors, just continue without user
          console.log('Optional authentication failed, continuing without user context:', error.message);
        }
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, always continue even if there are errors
    console.log('Optional authentication middleware error, continuing without user context:', error.message);
    next();
  }
};

module.exports = {
  isAuthenticated,
  optionalAuth
};