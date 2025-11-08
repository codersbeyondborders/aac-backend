const express = require('express');
const admin = require('firebase-admin');
const vertexAIService = require('../services/vertexai');
const { logger, getLoggingHealth } = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Basic health check
 *     description: Returns basic server health status. No authentication required.
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 environment:
 *                   type: string
 *                   example: development
 *       500:
 *         description: Server is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/health', (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    logger.debug('Health check requested - basic endpoint');
    res.status(200).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', { error: error.message }, error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     tags: [Health]
 *     summary: Detailed health check
 *     description: Returns comprehensive health status including all service dependencies. No authentication required.
 *     responses:
 *       200:
 *         description: All services are healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       503:
 *         description: Some services are degraded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       500:
 *         description: Health check failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 */
router.get('/api/v1/health', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {}
  };

  let overallHealthy = true;

  try {
    // Check Firebase Admin SDK
    try {
      if (admin.apps.length > 0) {
        // Test Firebase Auth by attempting to get user management
        await admin.auth().listUsers(1);
        healthCheck.services.firebase_auth = {
          status: 'healthy',
          message: 'Firebase Auth connection successful'
        };
        logger.debug('Health check - Firebase Auth: healthy');
      } else {
        throw new Error('Firebase Admin not initialized');
      }
    } catch (error) {
      healthCheck.services.firebase_auth = {
        status: 'unhealthy',
        message: error.message
      };
      overallHealthy = false;
      logger.warn('Health check - Firebase Auth: unhealthy', { error: error.message });
    }

    // Check Firestore connection
    try {
      const { firestore } = require('../server');
      const db = firestore();
      
      if (db) {
        // Test Firestore by attempting a simple read operation
        await db.collection('_health_check').limit(1).get();
        healthCheck.services.firestore = {
          status: 'healthy',
          message: 'Firestore connection successful'
        };
        logger.debug('Health check - Firestore: healthy');
      } else {
        throw new Error('Firestore not initialized');
      }
    } catch (error) {
      healthCheck.services.firestore = {
        status: 'unhealthy',
        message: error.message
      };
      overallHealthy = false;
      logger.warn('Health check - Firestore: unhealthy', { error: error.message });
    }

    // Check Vertex AI services
    try {
      const vertexStatus = vertexAIService.getServiceStatus();
      
      if (vertexStatus.initialized) {
        healthCheck.services.vertex_ai = {
          status: 'healthy',
          message: 'Vertex AI services initialized and ready',
          details: {
            projectId: vertexStatus.projectId,
            location: vertexStatus.location
          }
        };
        logger.debug('Health check - Vertex AI: healthy');
      } else {
        throw new Error(vertexStatus.error || 'Vertex AI not initialized');
      }
    } catch (error) {
      healthCheck.services.vertex_ai = {
        status: 'unhealthy',
        message: error.message
      };
      overallHealthy = false;
      logger.warn('Health check - Vertex AI: unhealthy', { error: error.message });
    }

    // Check environment variables
    try {
      const requiredEnvVars = ['GOOGLE_CLOUD_PROJECT'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length === 0) {
        healthCheck.services.environment = {
          status: 'healthy',
          message: 'All required environment variables are set'
        };
        logger.debug('Health check - Environment: healthy');
      } else {
        throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
      }
    } catch (error) {
      healthCheck.services.environment = {
        status: 'unhealthy',
        message: error.message
      };
      overallHealthy = false;
      logger.warn('Health check - Environment: unhealthy', { error: error.message });
    }

    // Add logging system health
    try {
      healthCheck.services.logging = getLoggingHealth();
      logger.debug('Health check - Logging: healthy');
    } catch (error) {
      healthCheck.services.logging = {
        status: 'unhealthy',
        message: error.message
      };
      overallHealthy = false;
      logger.warn('Health check - Logging: unhealthy', { error: error.message });
    }

    // Set overall status
    healthCheck.status = overallHealthy ? 'healthy' : 'degraded';
    
    const statusCode = overallHealthy ? 200 : 503;
    logger.info('Detailed health check completed', { 
      status: healthCheck.status,
      statusCode 
    });
    
    res.status(statusCode).json(healthCheck);

  } catch (error) {
    logger.error('Health check endpoint error', { error: error.message }, error);
    
    healthCheck.status = 'unhealthy';
    healthCheck.error = 'Health check failed';
    
    res.status(500).json(healthCheck);
  }
});

module.exports = router;