const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const admin = require('firebase-admin');
const { Firestore } = require('@google-cloud/firestore');
const vertexAIService = require('./services/vertexai');
const { logger, requestLoggingMiddleware } = require('./utils/logger');
const { 
  requestIdMiddleware, 
  errorHandler, 
  notFoundHandler, 
  setupGlobalErrorHandlers 
} = require('./middleware/errorHandler');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Global variables for initialized services
let firestore = null;

// Initialize Firebase Admin SDK
async function initializeFirebase() {
  try {
    logger.info('Initializing Firebase Admin SDK...');
    
    // Initialize Firebase Admin with default credentials
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID,
      });
    }
    
    logger.info('Firebase Admin SDK initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', { error: error.message }, error);
    throw error;
  }
}

// Initialize Firestore database connection
async function initializeFirestore() {
  try {
    logger.info('Initializing Firestore database connection...');
    
    firestore = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });
    
    // Test the connection by attempting to read from a collection
    await firestore.collection('_health_check').limit(1).get();
    
    // Also initialize the firestoreService singleton used by other services
    const firestoreService = require('./services/firestore');
    await firestoreService.initialize();
    
    logger.info('Firestore database connection initialized successfully');
    return firestore;
  } catch (error) {
    logger.error('Failed to initialize Firestore database connection', { error: error.message }, error);
    throw error;
  }
}

// Configure Express middleware
function configureMiddleware() {
  logger.info('Configuring Express middleware...');
  
  // Request ID middleware (must be first)
  app.use(requestIdMiddleware);
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for API
    crossOriginEmbedderPolicy: false
  }));
  
  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-frontend-domain.com'] // Replace with actual frontend domains
      : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Request logging middleware
  app.use(requestLoggingMiddleware);
  
  logger.info('Express middleware configured successfully');
}

// Initialize Vertex AI services
async function initializeVertexAI() {
  try {
    logger.info('Initializing Vertex AI services...');
    
    await vertexAIService.initialize();
    
    logger.info('Vertex AI services initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Vertex AI services', { error: error.message }, error);
    throw error;
  }
}

// Initialize all services
async function initializeServices() {
  logger.info('Starting service initialization...');
  
  try {
    await initializeFirebase();
    await initializeFirestore();
    await initializeVertexAI();
    
    logger.info('All services initialized successfully');
    return true;
  } catch (error) {
    logger.error('Service initialization failed', { error: error.message }, error);
    throw error;
  }
}

// Graceful shutdown handler
function setupGracefulShutdown() {
  const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
      logger.info('HTTP server closed');
      
      // Close Firestore connection if it exists
      if (firestore) {
        logger.info('Firestore connection closed');
      }
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    });
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Import and configure routes
const healthRoutes = require('./routes/health');
const boardRoutes = require('./routes/boards');
const iconRoutes = require('./routes/icons');
const userProfileRoutes = require('./routes/userProfile');

// Import Swagger configuration
const { specs, swaggerUi, swaggerOptions } = require('./config/swagger');

// Configure routes
function configureRoutes() {
  logger.info('Configuring API routes...');
  
  // Swagger documentation routes
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(specs, swaggerOptions));
  
  // API documentation redirect
  app.get('/docs', (req, res) => {
    res.redirect('/api-docs');
  });
  
  // Health check routes (no authentication required)
  app.use('/', healthRoutes);
  
  // API v1 routes
  app.use('/api/v1/boards', boardRoutes);
  app.use('/api/v1/icons', iconRoutes);
  app.use('/api/v1/profile', userProfileRoutes);
  
  // 404 handler for unmatched routes
  app.use(notFoundHandler);
  
  // Global error handling middleware (must be last)
  app.use(errorHandler);
  
  logger.info('API routes configured successfully');
  logger.info('Swagger documentation available at /api-docs');
}

// Start the server
async function startServer() {
  try {
    // Setup global error handlers first
    setupGlobalErrorHandlers();
    
    logger.info('=== Smart AAC API Server Starting ===', {
      environment: process.env.NODE_ENV || 'development',
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'not-set',
      port: PORT
    });
    
    // Configure middleware first
    configureMiddleware();
    
    // Initialize all services
    await initializeServices();
    
    // Configure routes
    configureRoutes();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info('Server startup completed successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
    });
    
    // Setup graceful shutdown
    setupGracefulShutdown();
    
    // Make server available globally for shutdown
    global.server = server;
    
    return server;
    
  } catch (error) {
    logger.error('Server startup failed', { error: error.message }, error);
    process.exit(1);
  }
}

// Export app for testing and firestore for other modules
module.exports = { app, firestore: () => firestore };

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}