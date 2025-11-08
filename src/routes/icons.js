const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { validateIconGenerationRequest } = require('../utils/validation');
const { uploadSingle, validateFileMetadata } = require('../middleware/upload');
const vertexAIService = require('../services/vertexai');
const userProfileService = require('../services/userProfile');
const iconService = require('../services/icons');

const router = express.Router();

/**
 * @swagger
 * /api/v1/icons/generate-from-text:
 *   post:
 *     tags: [Icons]
 *     summary: Generate icon from text
 *     description: |
 *       Generates a culturally-appropriate icon from a text description using AI.
 *       The system retrieves the user's cultural preferences and creates optimized prompts
 *       for accessible icon generation.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateIconRequest'
 *           example:
 *             text: "happy cat"
 *     responses:
 *       200:
 *         description: Icon generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GeneratedIconResponse'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Invalid request data"
 *               code: "VALIDATION_ERROR"
 *               details: ["Text must be between 1 and 200 characters"]
 *               timestamp: "2024-01-01T12:00:00.000Z"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Icon generation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Icon generation service unavailable"
 *               code: "AI_SERVICE_ERROR"
 *               timestamp: "2024-01-01T12:00:00.000Z"
 */
router.post('/generate-from-text', isAuthenticated, async (req, res) => {
  try {
    console.log(`Text-to-icon generation request from user: ${req.user.uid}`);
    
    // Validate request body
    const validation = validateIconGenerationRequest(req.body);
    
    if (!validation.isValid) {
      console.error('Validation failed for text-to-icon request:', validation.errors);
      return res.status(400).json({
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: validation.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    const { text } = req.body;
    const userId = req.user.uid;
    
    console.log(`Generating icon for text: "${text}" (user: ${userId})`);
    
    // Step 1: Retrieve user's cultural context
    let culturalContext;
    try {
      culturalContext = await userProfileService.getCulturalContext(userId);
      console.log(`✓ Retrieved cultural context for user: ${userId}`);
    } catch (error) {
      console.error(`Failed to retrieve cultural context for user ${userId}:`, error.message);
      // Continue with default context to ensure service availability
      culturalContext = {
        language: 'en',
        region: 'US',
        symbolStyle: 'simple',
        culturalAdaptation: false
      };
      console.log('Using default cultural context due to retrieval error');
    }
    
    // Step 2: Generate icon using Vertex AI with cultural context
    // Note: Quality parameter removed - using single optimized model
    
    try {
      const iconResult = await vertexAIService.generateIconFromText(text, culturalContext);
      
      if (!iconResult.success) {
        throw new Error('Icon generation failed - no result returned');
      }
      
      console.log(`✓ Icon generated successfully for text: "${text}" (user: ${userId})`);
      
      // Step 3: Store the generated icon
      try {
        const storedIcon = await iconService.storeIcon(
          userId,
          iconResult.imageData,
          iconResult.mimeType,
          {
            iconType: 'generated',
            generationMethod: 'text-to-icon',
            prompt: iconResult.prompt,
            originalText: text,
            culturalContext: culturalContext,
            tags: [text.toLowerCase().replace(/\s+/g, '_')]
          }
        );
        
        console.log(`✓ Icon stored successfully: ${storedIcon.id}`);
        
        // Return successful response with stored icon URL
        return res.status(200).json({
          success: true,
          data: {
            id: storedIcon.id,
            publicUrl: storedIcon.publicUrl,
            mimeType: storedIcon.mimeType,
            size: storedIcon.size,
            prompt: iconResult.prompt,
            text: text,
            createdAt: storedIcon.createdAt,
            cultureProfile: {
              language: culturalContext.language || 'en',
              region: culturalContext.region || 'US',
              symbolStyle: culturalContext.symbolStyle || 'simple'
            }
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (storageError) {
        console.error(`Failed to store icon for user ${userId}:`, storageError.message);
        
        // Return the generated icon as base64 if storage fails
        console.log('Falling back to base64 response due to storage error');
        return res.status(200).json({
          success: true,
          data: {
            imageData: iconResult.imageData,
            mimeType: iconResult.mimeType,
            prompt: iconResult.prompt,
            text: text,
            cultureProfile: {
              language: culturalContext.language || 'en',
              region: culturalContext.region || 'US',
              symbolStyle: culturalContext.symbolStyle || 'simple'
            },
            storageWarning: 'Icon generated but not stored due to storage service error'
          },
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (aiError) {
      console.error(`AI service error during icon generation for user ${userId}:`, aiError.message);
      
      return res.status(500).json({
        error: 'Icon generation service unavailable',
        code: 'AI_SERVICE_ERROR',
        details: aiError.message,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Unexpected error in text-to-icon generation:', error);
    
    return res.status(500).json({
      error: 'Internal server error during icon generation',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/icons/generate-from-image:
 *   post:
 *     tags: [Icons]
 *     summary: Generate icon from uploaded image
 *     description: |
 *       Analyzes an uploaded image using AI vision and generates a simplified, 
 *       culturally-appropriate icon based on the analysis. The process involves:
 *       1. Image analysis using Gemini Vision
 *       2. Text description generation
 *       3. Cultural context application
 *       4. Simplified icon generation using Imagen
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to analyze and convert to icon
 *             required:
 *               - image
 *           encoding:
 *             image:
 *               contentType: image/jpeg, image/png, image/gif, image/webp
 *     responses:
 *       200:
 *         description: Icon generated successfully from image
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/GeneratedIconResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         originalImage:
 *                           type: object
 *                           properties:
 *                             filename:
 *                               type: string
 *                             size:
 *                               type: number
 *                             mimetype:
 *                               type: string
 *                         analysis:
 *                           type: object
 *                           properties:
 *                             description:
 *                               type: string
 *                               description: AI-generated description of the image
 *                             analysisType:
 *                               type: string
 *                             confidence:
 *                               type: number
 *       400:
 *         description: Invalid image file or request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "No valid image file provided"
 *               code: "NO_IMAGE_FILE"
 *               details: "Please upload an image file in the 'image' field"
 *               timestamp: "2024-01-01T12:00:00.000Z"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Image analysis or icon generation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Image analysis service unavailable"
 *               code: "IMAGE_ANALYSIS_ERROR"
 *               timestamp: "2024-01-01T12:00:00.000Z"
 */
router.post('/generate-from-image', 
  isAuthenticated, 
  uploadSingle('image'), 
  validateFileMetadata, 
  async (req, res) => {
    try {
      console.log(`Image-to-icon generation request from user: ${req.user.uid}`);
      
      const userId = req.user.uid;
      const uploadedFile = req.file;
      
      if (!uploadedFile || !uploadedFile.buffer) {
        console.error('No valid image file provided in request');
        return res.status(400).json({
          error: 'No valid image file provided',
          code: 'NO_IMAGE_FILE',
          details: 'Please upload an image file in the "image" field',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`Processing uploaded image: ${uploadedFile.originalname} (${uploadedFile.size} bytes) for user: ${userId}`);
      
      // Step 1: Retrieve user's cultural context
      let culturalContext;
      try {
        culturalContext = await userProfileService.getCulturalContext(userId);
        console.log(`✓ Retrieved cultural context for user: ${userId}`);
      } catch (error) {
        console.error(`Failed to retrieve cultural context for user ${userId}:`, error.message);
        // Continue with default context to ensure service availability
        culturalContext = {
          language: 'en',
          region: 'US',
          symbolStyle: 'simple',
          culturalAdaptation: false
        };
        console.log('Using default cultural context due to retrieval error');
      }
      
      // Step 2: Analyze uploaded image using Gemini Vision
      let imageAnalysis;
      try {
        console.log('Analyzing uploaded image with Gemini Vision...');
        imageAnalysis = await vertexAIService.analyzeImage(uploadedFile.buffer, 'icon_elements');
        
        if (!imageAnalysis.success || !imageAnalysis.description) {
          throw new Error('Image analysis failed - no description generated');
        }
        
        console.log(`✓ Image analysis completed: "${imageAnalysis.description}"`);
        
      } catch (analysisError) {
        console.error(`Image analysis failed for user ${userId}:`, analysisError.message);
        
        return res.status(500).json({
          error: 'Image analysis service unavailable',
          code: 'IMAGE_ANALYSIS_ERROR',
          details: analysisError.message,
          timestamp: new Date().toISOString()
        });
      }
      
      // Step 3: Generate icon from analysis description using Imagen
      // Note: Quality parameter removed - using single optimized model
      
      try {
        console.log(`Generating icon from analysis: "${imageAnalysis.description}"`);
        
        const iconResult = await vertexAIService.generateIconFromText(
          imageAnalysis.description, 
          culturalContext
        );
        
        if (!iconResult.success) {
          throw new Error('Icon generation failed - no result returned');
        }
        
        console.log(`✓ Icon generated successfully from image analysis (user: ${userId})`);
        
        // Step 4: Store the generated icon
        try {
          const storedIcon = await iconService.storeIcon(
            userId,
            iconResult.imageData,
            iconResult.mimeType,
            {
              iconType: 'generated',
              generationMethod: 'image-to-icon',
              prompt: iconResult.prompt,
              originalText: imageAnalysis.description,
              originalImageInfo: {
                filename: uploadedFile.originalname,
                size: uploadedFile.size,
                mimetype: uploadedFile.mimetype
              },
              analysisData: {
                description: imageAnalysis.description,
                analysisType: imageAnalysis.analysisType,
                confidence: imageAnalysis.confidence
              },
              culturalContext: culturalContext,
              tags: [imageAnalysis.description.toLowerCase().replace(/\s+/g, '_').substring(0, 50)]
            }
          );
          
          console.log(`✓ Icon stored successfully: ${storedIcon.id}`);
          
          // Return successful response with stored icon URL and complete pipeline results
          return res.status(200).json({
            success: true,
            data: {
              id: storedIcon.id,
              publicUrl: storedIcon.publicUrl,
              mimeType: storedIcon.mimeType,
              size: storedIcon.size,
              prompt: iconResult.prompt,
              createdAt: storedIcon.createdAt,
              originalImage: {
                filename: uploadedFile.originalname,
                size: uploadedFile.size,
                mimetype: uploadedFile.mimetype
              },
              analysis: {
                description: imageAnalysis.description,
                analysisType: imageAnalysis.analysisType,
                confidence: imageAnalysis.confidence
              },
              cultureProfile: {
                language: culturalContext.language || 'en',
                region: culturalContext.region || 'US',
                symbolStyle: culturalContext.symbolStyle || 'simple'
              }
            },
            timestamp: new Date().toISOString()
          });
          
        } catch (storageError) {
          console.error(`Failed to store icon for user ${userId}:`, storageError.message);
          
          // Return the generated icon as base64 if storage fails
          console.log('Falling back to base64 response due to storage error');
          return res.status(200).json({
            success: true,
            data: {
              imageData: iconResult.imageData,
              mimeType: iconResult.mimeType,
              prompt: iconResult.prompt,
              originalImage: {
                filename: uploadedFile.originalname,
                size: uploadedFile.size,
                mimetype: uploadedFile.mimetype
              },
              analysis: {
                description: imageAnalysis.description,
                analysisType: imageAnalysis.analysisType,
                confidence: imageAnalysis.confidence
              },
              cultureProfile: {
                language: culturalContext.language || 'en',
                region: culturalContext.region || 'US',
                symbolStyle: culturalContext.symbolStyle || 'simple'
              },
              storageWarning: 'Icon generated but not stored due to storage service error'
            },
            timestamp: new Date().toISOString()
          });
        }
        
      } catch (iconError) {
        console.error(`Icon generation failed for user ${userId}:`, iconError.message);
        
        return res.status(500).json({
          error: 'Icon generation service unavailable',
          code: 'ICON_GENERATION_ERROR',
          details: iconError.message,
          analysis: imageAnalysis ? {
            description: imageAnalysis.description,
            confidence: imageAnalysis.confidence
          } : null,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Unexpected error in image-to-icon generation:', error);
      
      return res.status(500).json({
        error: 'Internal server error during image-to-icon generation',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/icons:
 *   get:
 *     tags: [Icons]
 *     summary: Get user's generated icons
 *     description: |
 *       Retrieves a paginated list of icons generated by the authenticated user.
 *       Supports filtering by icon type and sorting options.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of icons to return per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of icons to skip for pagination
 *       - in: query
 *         name: iconType
 *         schema:
 *           type: string
 *           enum: [generated, uploaded, custom]
 *         description: Filter by icon type
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, size, iconType]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Icons retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     icons:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/IconMetadata'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    console.log(`Retrieving icons for user: ${req.user.uid}`);
    
    const userId = req.user.uid;
    const {
      limit = 20,
      offset = 0,
      iconType = null,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Validate query parameters
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);
    
    const validSortFields = ['createdAt', 'size', 'iconType'];
    const validSortOrders = ['asc', 'desc'];
    
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const finalSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';
    
    // Retrieve user's icons
    const result = await iconService.getUserIcons(userId, {
      limit: parsedLimit,
      offset: parsedOffset,
      iconType: iconType,
      sortBy: finalSortBy,
      sortOrder: finalSortOrder
    });
    
    console.log(`✓ Retrieved ${result.icons.length} icons for user: ${userId}`);
    
    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error retrieving user icons:', error);
    
    return res.status(500).json({
      error: 'Failed to retrieve icons',
      code: 'ICON_RETRIEVAL_ERROR',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/icons/search:
 *   get:
 *     tags: [Icons]
 *     summary: Search user's icons
 *     description: Search through user's icons by text content or tags
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     icons:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/IconMetadata'
 *                     searchQuery:
 *                       type: string
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid search query
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/search', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { q: searchQuery, limit = 20, offset = 0 } = req.query;
    
    console.log(`Searching icons for user: ${userId}, query: "${searchQuery}"`);
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({
        error: 'Search query is required',
        code: 'MISSING_SEARCH_QUERY',
        timestamp: new Date().toISOString()
      });
    }
    
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);
    
    const result = await iconService.searchUserIcons(userId, searchQuery.trim(), {
      limit: parsedLimit,
      offset: parsedOffset
    });
    
    console.log(`✓ Found ${result.icons.length} icons matching query: "${searchQuery}"`);
    
    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error searching icons:', error);
    
    return res.status(500).json({
      error: 'Failed to search icons',
      code: 'ICON_SEARCH_ERROR',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/icons/stats:
 *   get:
 *     tags: [Icons]
 *     summary: Get user's icon statistics
 *     description: Retrieves statistics about user's generated icons
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalIcons:
 *                       type: integer
 *                     iconsByType:
 *                       type: object
 *                     iconsByMethod:
 *                       type: object
 *                     totalStorageUsed:
 *                       type: integer
 *                       description: Total storage used in bytes
 *                     oldestIcon:
 *                       type: string
 *                       format: date-time
 *                     newestIcon:
 *                       type: string
 *                       format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    console.log(`Retrieving icon statistics for user: ${userId}`);
    
    const stats = await iconService.getUserIconStats(userId);
    
    console.log(`✓ Retrieved statistics for user: ${userId}`);
    
    return res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error retrieving icon statistics:', error);
    
    return res.status(500).json({
      error: 'Failed to retrieve icon statistics',
      code: 'STATS_RETRIEVAL_ERROR',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/icons/{iconId}:
 *   get:
 *     tags: [Icons]
 *     summary: Get specific icon details
 *     description: Retrieves detailed information about a specific icon by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: iconId
 *         required: true
 *         schema:
 *           type: string
 *         description: Icon ID
 *     responses:
 *       200:
 *         description: Icon details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/IconDetails'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied - icon belongs to different user
 *       404:
 *         description: Icon not found
 *       500:
 *         description: Server error
 */
router.get('/:iconId', isAuthenticated, async (req, res) => {
  try {
    const { iconId } = req.params;
    const userId = req.user.uid;
    
    console.log(`Retrieving icon: ${iconId} for user: ${userId}`);
    
    if (!iconId) {
      return res.status(400).json({
        error: 'Icon ID is required',
        code: 'MISSING_ICON_ID',
        timestamp: new Date().toISOString()
      });
    }
    
    const icon = await iconService.getIcon(iconId, userId);
    
    console.log(`✓ Retrieved icon: ${iconId}`);
    
    return res.status(200).json({
      success: true,
      data: icon,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error retrieving icon:', error);
    
    let statusCode = 500;
    let errorCode = 'ICON_RETRIEVAL_ERROR';
    
    if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'ICON_NOT_FOUND';
    } else if (error.message.includes('Access denied')) {
      statusCode = 403;
      errorCode = 'ACCESS_DENIED';
    }
    
    return res.status(statusCode).json({
      error: error.message,
      code: errorCode,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/icons/{iconId}:
 *   delete:
 *     tags: [Icons]
 *     summary: Delete an icon
 *     description: Deletes an icon and removes it from storage
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: iconId
 *         required: true
 *         schema:
 *           type: string
 *         description: Icon ID to delete
 *     responses:
 *       200:
 *         description: Icon deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied - icon belongs to different user
 *       404:
 *         description: Icon not found
 *       500:
 *         description: Server error
 */
router.delete('/:iconId', isAuthenticated, async (req, res) => {
  try {
    const { iconId } = req.params;
    const userId = req.user.uid;
    
    console.log(`Deleting icon: ${iconId} for user: ${userId}`);
    
    if (!iconId) {
      return res.status(400).json({
        error: 'Icon ID is required',
        code: 'MISSING_ICON_ID',
        timestamp: new Date().toISOString()
      });
    }
    
    const success = await iconService.deleteIcon(iconId, userId);
    
    if (success) {
      console.log(`✓ Icon deleted successfully: ${iconId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Icon deleted successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error('Failed to delete icon');
    }
    
  } catch (error) {
    console.error('Error deleting icon:', error);
    
    let statusCode = 500;
    let errorCode = 'ICON_DELETION_ERROR';
    
    if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'ICON_NOT_FOUND';
    } else if (error.message.includes('Access denied')) {
      statusCode = 403;
      errorCode = 'ACCESS_DENIED';
    }
    
    return res.status(statusCode).json({
      error: error.message,
      code: errorCode,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;