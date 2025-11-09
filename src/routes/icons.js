const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { validateIconGenerationRequest } = require('../utils/validation');
const { uploadSingle, uploadAudio, validateFileMetadata } = require('../middleware/upload');
const vertexAIService = require('../services/vertexai');
const userProfileService = require('../services/userProfile');
const iconService = require('../services/icons');

const router = express.Router();

/**
 * @swagger
 * /api/v1/icons/generate-from-text:
 *   post:
 *     tags: [Icons]
 *     summary: Generate icon from text with optional audio
 *     description: |
 *       Generates a culturally-appropriate icon from a text description using AI.
 *       The system retrieves the user's cultural preferences and creates optimized prompts
 *       for accessible icon generation. 
 *       
 *       **Processing Pipeline:**
 *       1. Generate icon from text using Imagen
 *       2. Apply final sanitization to ensure transparent background and remove any text
 *       3. Store clean, optimized icon
 *       
 *       Optionally generates audio for the label in the user's primary language and dialect.
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
 *             label: "Happy Cat"
 *             generateAudio: true
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
    
    const { text, label, category, accent, color, culturalContext: providedCulturalContext, generateAudio } = req.body;
    const userId = req.user.uid;
    
    console.log(`Generating icon for text: "${text}" (user: ${userId})`);
    if (label) console.log(`Label: "${label}"`);
    if (category) console.log(`Category: "${category}"`);
    if (accent) console.log(`Accent: "${accent}"`);
    if (color) console.log(`Color: "${color}"`);
    if (generateAudio) console.log(`Audio generation requested: ${generateAudio}`);
    
    // Step 1: Determine cultural context
    // Priority: provided culturalContext > user profile > default
    let culturalContext;
    
    if (providedCulturalContext && Object.keys(providedCulturalContext).length > 0) {
      // Use provided cultural context from request
      console.log('Using cultural context from request payload');
      culturalContext = providedCulturalContext;
    } else {
      // Retrieve user's cultural context from profile
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
    }
    
    // Step 2: Generate icon using Vertex AI with cultural context
    try {
      const iconResult = await vertexAIService.generateIconFromText(text, culturalContext);
      
      if (!iconResult.success) {
        throw new Error('Icon generation failed - no result returned');
      }
      
      console.log(`✓ Icon generated successfully for text: "${text}" (user: ${userId})`);
      
      // Step 2b: Apply final sanitization to ensure transparent background and no text
      let finalIconData = iconResult.imageData;
      let finalMimeType = iconResult.mimeType;
      let sanitized = false;
      
      try {
        console.log('Applying final sanitization to generated icon...');
        const imageBuffer = Buffer.from(iconResult.imageData, 'base64');
        const sanitizedResult = await vertexAIService.processImageToTransparentIcon(imageBuffer, label || text);
        
        if (sanitizedResult.success && sanitizedResult.imageData) {
          finalIconData = sanitizedResult.imageData;
          finalMimeType = sanitizedResult.mimeType;
          sanitized = true;
          console.log('✓ Icon sanitized successfully');
        } else {
          console.log('⚠️ Sanitization returned no data, using original');
        }
      } catch (sanitizeError) {
        console.warn(`Icon sanitization failed, using original: ${sanitizeError.message}`);
      }
      
      // Step 3: Generate audio for label if requested
      let audioData = null;
      let translationResult = null;
      
      if (generateAudio && label) {
        try {
          console.log(`Generating audio for label: "${label}"`);
          
          // Get primary language and dialect from cultural context
          const primaryLanguage = culturalContext.language || 'en';
          const primaryDialect = culturalContext.dialect || null;
          
          // Step 3a: Translate label to primary language
          if (primaryLanguage !== 'en' || primaryDialect) {
            console.log(`Translating label to ${primaryLanguage}${primaryDialect ? ` (${primaryDialect})` : ''}`);
            translationResult = await vertexAIService.translateText(label, primaryLanguage, primaryDialect);
            console.log(`✓ Label translated: "${translationResult.translatedText}"`);
          }
          
          // Step 3b: Generate audio from translated (or original) text
          const textForAudio = translationResult ? translationResult.translatedText : label;
          const audioResult = await vertexAIService.generateAudioFromText(textForAudio, primaryLanguage, primaryDialect, accent);
          
          if (audioResult.success && audioResult.audioData) {
            audioData = {
              audioData: audioResult.audioData,
              mimeType: audioResult.mimeType,
              language: primaryLanguage,
              dialect: primaryDialect,
              speaker: audioResult.speaker
            };
            console.log(`✓ Audio generated successfully for label with speaker: ${audioResult.speaker}`);
          } else {
            console.log(`⚠️ Audio generation attempted but data not available yet`);
          }
          
        } catch (audioError) {
          console.warn(`Failed to generate audio for label:`, audioError.message);
          // Continue without audio if generation fails
        }
      }
      
      // Step 4: Store the generated icon
      try {
        const metadata = {
          iconType: 'generated',
          generationMethod: sanitized ? 'text-to-icon-sanitized' : 'text-to-icon',
          prompt: iconResult.prompt,
          originalText: text,
          culturalContext: culturalContext,
          tags: [text.toLowerCase().replace(/\s+/g, '_')],
          sanitized: sanitized
        };
        
        // Add optional fields to metadata
        if (label) metadata.label = label;
        if (category) metadata.category = category;
        if (accent) metadata.accent = accent;
        if (color) metadata.color = color;
        
        // Add audio data if available
        if (audioData) {
          metadata.audio = audioData;
        }
        
        // Add translation info if available
        if (translationResult) {
          metadata.translation = {
            originalText: translationResult.originalText,
            translatedText: translationResult.translatedText,
            targetLanguage: translationResult.targetLanguage,
            targetDialect: translationResult.targetDialect
          };
        }
        
        const storedIcon = await iconService.storeIcon(
          userId,
          finalIconData,
          finalMimeType,
          metadata
        );
        
        console.log(`✓ Icon stored successfully: ${storedIcon.id}`);
        
        // Return successful response with stored icon URL
        const responseData = {
          id: storedIcon.id,
          publicUrl: storedIcon.publicUrl,
          mimeType: storedIcon.mimeType,
          size: storedIcon.size,
          prompt: iconResult.prompt,
          text: text,
          createdAt: storedIcon.createdAt,
          cultureProfile: culturalContext
        };
        
        // Add optional fields to response
        if (label) responseData.label = label;
        if (category) responseData.category = category;
        if (accent) responseData.accent = accent;
        if (color) responseData.color = color;
        
        // Add audio information if available
        if (storedIcon.audio) {
          responseData.audio = storedIcon.audio;
        }
        
        // Add translation information if available
        if (translationResult) {
          responseData.translation = {
            originalText: translationResult.originalText,
            translatedText: translationResult.translatedText,
            targetLanguage: translationResult.targetLanguage,
            targetDialect: translationResult.targetDialect
          };
        }
        
        return res.status(200).json({
          success: true,
          data: responseData,
          timestamp: new Date().toISOString()
        });
        
      } catch (storageError) {
        console.error(`Failed to store icon for user ${userId}:`, storageError.message);
        
        // Return the generated icon as base64 if storage fails
        console.log('Falling back to base64 response due to storage error');
        const responseData = {
          imageData: iconResult.imageData,
          mimeType: iconResult.mimeType,
          prompt: iconResult.prompt,
          text: text,
          cultureProfile: culturalContext,
          storageWarning: 'Icon generated but not stored due to storage service error'
        };
        
        // Add optional fields to response
        if (label) responseData.label = label;
        if (category) responseData.category = category;
        if (accent) responseData.accent = accent;
        if (color) responseData.color = color;
        
        return res.status(200).json({
          success: true,
          data: responseData,
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
 *     summary: Upload icon image (with AI processing)
 *     description: |
 *       Upload an icon image with automatic AI processing to create clean, transparent icons:
 *       
 *       **All uploaded images are processed through Gemini Vision to:**
 *       - Remove backgrounds and create transparent PNG
 *       - Remove any text labels or watermarks
 *       - Optimize for AAC communication (simple, high-contrast)
 *       - Ensure consistent icon style
 *       
 *       **Two modes:**
 *       1. **Upload + Full AI Generation** (generateIcon=true): Analyze image and regenerate as new icon
 *       2. **Upload + Processing** (generateIcon=false): Clean up uploaded image while preserving original style
 *       
 *       The generateIcon parameter controls the level of AI transformation applied.
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
 *                 description: Image file to upload
 *               generateIcon:
 *                 type: boolean
 *                 description: Whether to generate a new icon using AI (default true)
 *                 default: true
 *               label:
 *                 type: string
 *                 description: Optional label for the icon
 *               category:
 *                 type: string
 *                 description: Optional category
 *               generateAudio:
 *                 type: boolean
 *                 description: Generate audio for label (requires label field)
 *                 default: false
 *             required:
 *               - image
 *           encoding:
 *             image:
 *               contentType: image/jpeg, image/png, image/gif, image/webp
 *     responses:
 *       200:
 *         description: Icon uploaded/generated successfully
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
 *                     id:
 *                       type: string
 *                     publicUrl:
 *                       type: string
 *                     mimeType:
 *                       type: string
 *                     size:
 *                       type: number
 *                     iconType:
 *                       type: string
 *                       enum: [uploaded, generated]
 *                     generatedByAI:
 *                       type: boolean
 *                     analysis:
 *                       type: object
 *                       description: Only present if generateIcon was true
 *       400:
 *         description: Invalid image file or request
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Upload or processing failed
 */
router.post('/generate-from-image', 
  isAuthenticated, 
  uploadSingle('image'), 
  validateFileMetadata, 
  async (req, res) => {
    try {
      console.log(`Image upload request from user: ${req.user.uid}`);
      
      const userId = req.user.uid;
      const uploadedFile = req.file;
      const { generateIcon, label, category, accent, color, generateAudio } = req.body;
      
      if (!uploadedFile || !uploadedFile.buffer) {
        console.error('No valid image file provided in request');
        return res.status(400).json({
          error: 'No valid image file provided',
          code: 'NO_IMAGE_FILE',
          details: 'Please upload an image file in the "image" field',
          timestamp: new Date().toISOString()
        });
      }
      
      // Default to true for backward compatibility
      const shouldGenerateIcon = generateIcon === undefined || generateIcon === 'true' || generateIcon === true;
      
      console.log(`Processing uploaded image: ${uploadedFile.originalname} (${uploadedFile.size} bytes) for user: ${userId}`);
      console.log(`Generate icon with AI: ${shouldGenerateIcon}`);
      
      // Retrieve user's cultural context
      let culturalContext;
      try {
        culturalContext = await userProfileService.getCulturalContext(userId);
        console.log(`✓ Retrieved cultural context for user: ${userId}`);
      } catch (error) {
        console.error(`Failed to retrieve cultural context for user ${userId}:`, error.message);
        culturalContext = {
          language: 'en',
          region: 'US',
          symbolStyle: 'simple',
          culturalAdaptation: false
        };
        console.log('Using default cultural context due to retrieval error');
      }
      
      let finalImageData;
      let finalMimeType;
      let iconType;
      let generationMethod;
      let analysisData = null;
      let prompt = null;
      
      if (shouldGenerateIcon) {
        // Mode 1: AI Generation - Analyze and generate new icon with transparent background
        console.log('Generating new icon from uploaded image using AI...');
        
        try {
          // Process image to create clean transparent icon
          console.log('Processing uploaded image to create transparent icon...');
          const iconResult = await vertexAIService.processImageToTransparentIcon(
            uploadedFile.buffer,
            label // Use label as hint for what the icon should represent
          );
          
          if (!iconResult.success || !iconResult.imageData) {
            throw new Error('Icon processing failed - no result returned');
          }
          
          console.log(`✓ Icon processed successfully with transparent background (user: ${userId})`);
          
          analysisData = {
            description: iconResult.originalDescription,
            analysisType: 'icon_elements',
            confidence: 'high',
            processed: true
          };
          
          finalImageData = iconResult.imageData;
          finalMimeType = iconResult.mimeType;
          iconType = 'generated';
          generationMethod = 'image-to-icon-processed';
          prompt = iconResult.prompt;
          
        } catch (aiError) {
          console.error(`AI processing failed: ${aiError.message}`);
          return res.status(500).json({
            error: 'Icon processing service unavailable',
            code: 'ICON_PROCESSING_ERROR',
            details: aiError.message,
            timestamp: new Date().toISOString()
          });
        }
        
      } else {
        // Mode 2: Direct Upload - Process to ensure transparent background and no text
        console.log('Processing uploaded icon to ensure clean transparent background...');
        
        try {
          // Even for manual uploads, process to remove background and text
          const iconResult = await vertexAIService.processImageToTransparentIcon(
            uploadedFile.buffer,
            label
          );
          
          if (iconResult.success && iconResult.imageData) {
            console.log('✓ Manual upload processed to transparent icon');
            finalImageData = iconResult.imageData;
            finalMimeType = iconResult.mimeType;
            iconType = 'uploaded-processed';
            generationMethod = 'manual-upload-processed';
            
            analysisData = {
              description: iconResult.originalDescription,
              processed: true
            };
          } else {
            // Fallback to original if processing fails
            console.log('⚠️ Processing failed, using original upload');
            finalImageData = uploadedFile.buffer.toString('base64');
            finalMimeType = uploadedFile.mimetype;
            iconType = 'uploaded';
            generationMethod = 'manual-upload';
          }
        } catch (processError) {
          // If processing fails, use original image
          console.warn(`Image processing failed, using original: ${processError.message}`);
          finalImageData = uploadedFile.buffer.toString('base64');
          finalMimeType = uploadedFile.mimetype;
          iconType = 'uploaded';
          generationMethod = 'manual-upload';
        }
      }
      
      // Generate audio if requested
      let audioData = null;
      let translationResult = null;
      
      if (generateAudio && label) {
        try {
          console.log(`Generating audio for label: "${label}"`);
          
          const primaryLanguage = culturalContext.language || 'en';
          const primaryDialect = culturalContext.dialect || null;
          
          // Translate label if needed
          if (primaryLanguage !== 'en' || primaryDialect) {
            console.log(`Translating label to ${primaryLanguage}${primaryDialect ? ` (${primaryDialect})` : ''}`);
            translationResult = await vertexAIService.translateText(label, primaryLanguage, primaryDialect);
            console.log(`✓ Label translated: "${translationResult.translatedText}"`);
          }
          
          // Generate audio
          const textForAudio = translationResult ? translationResult.translatedText : label;
          const audioResult = await vertexAIService.generateAudioFromText(textForAudio, primaryLanguage, primaryDialect, accent);
          
          if (audioResult.success && audioResult.audioData) {
            audioData = {
              audioData: audioResult.audioData,
              mimeType: audioResult.mimeType,
              language: primaryLanguage,
              dialect: primaryDialect,
              speaker: audioResult.speaker
            };
            console.log(`✓ Audio generated successfully for label with speaker: ${audioResult.speaker}`);
          }
          
        } catch (audioError) {
          console.warn(`Failed to generate audio for label:`, audioError.message);
        }
      }
      
      // Store the icon
      try {
        const metadata = {
          iconType: iconType,
          generationMethod: generationMethod,
          originalImageInfo: {
            filename: uploadedFile.originalname,
            size: uploadedFile.size,
            mimetype: uploadedFile.mimetype
          },
          culturalContext: culturalContext
        };
        
        if (prompt) metadata.prompt = prompt;
        if (analysisData) {
          metadata.analysisData = analysisData;
          metadata.originalText = analysisData.description;
        }
        if (label) metadata.label = label;
        if (category) metadata.category = category;
        if (accent) metadata.accent = accent;
        if (color) metadata.color = color;
        if (audioData) metadata.audio = audioData;
        if (translationResult) {
          metadata.translation = {
            originalText: translationResult.originalText,
            translatedText: translationResult.translatedText,
            targetLanguage: translationResult.targetLanguage,
            targetDialect: translationResult.targetDialect
          };
        }
        
        const storedIcon = await iconService.storeIcon(
          userId,
          finalImageData,
          finalMimeType,
          metadata
        );
        
        console.log(`✓ Icon stored successfully: ${storedIcon.id}`);
        
        // Build response
        const responseData = {
          id: storedIcon.id,
          publicUrl: storedIcon.publicUrl,
          mimeType: storedIcon.mimeType,
          size: storedIcon.size,
          iconType: iconType,
          generatedByAI: shouldGenerateIcon,
          createdAt: storedIcon.createdAt,
          originalImage: {
            filename: uploadedFile.originalname,
            size: uploadedFile.size,
            mimetype: uploadedFile.mimetype
          }
        };
        
        if (label) responseData.label = label;
        if (category) responseData.category = category;
        if (prompt) responseData.prompt = prompt;
        if (analysisData) responseData.analysis = analysisData;
        if (storedIcon.audio) responseData.audio = storedIcon.audio;
        if (translationResult) responseData.translation = translationResult;
        if (shouldGenerateIcon) {
          responseData.cultureProfile = {
            language: culturalContext.language || 'en',
            region: culturalContext.region || 'US',
            symbolStyle: culturalContext.symbolStyle || 'simple'
          };
        }
        
        return res.status(200).json({
          success: true,
          data: responseData,
          timestamp: new Date().toISOString()
        });
        
      } catch (storageError) {
        console.error(`Failed to store icon for user ${userId}:`, storageError.message);
        
        return res.status(500).json({
          error: 'Icon storage failed',
          code: 'STORAGE_ERROR',
          details: storageError.message,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Unexpected error in image upload/generation:', error);
      
      return res.status(500).json({
        error: 'Internal server error during image processing',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/icons/generate-audio-from-recording:
 *   post:
 *     tags: [Icons]
 *     summary: Upload and store recorded audio for icon
 *     description: |
 *       Uploads and stores recorded audio file for an icon. The original audio is stored
 *       as-is without any processing or transcription. Optionally link the audio to an
 *       existing icon by providing the iconId.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file to upload (webm, mp3, wav, ogg, m4a)
 *               iconId:
 *                 type: string
 *                 description: Optional icon ID to associate audio with
 *               label:
 *                 type: string
 *                 description: Optional label/description for the audio
 *             required:
 *               - audio
 *           encoding:
 *             audio:
 *               contentType: audio/webm, audio/mpeg, audio/mp3, audio/wav, audio/ogg
 *     responses:
 *       200:
 *         description: Audio uploaded and stored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 audio:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                     publicUrl:
 *                       type: string
 *                     mimeType:
 *                       type: string
 *                     size:
 *                       type: number
 *                     uploadedAt:
 *                       type: string
 *                       format: date-time
 *                 iconId:
 *                   type: string
 *                   nullable: true
 *                 originalFile:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                     size:
 *                       type: number
 *                     mimetype:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid audio file or request
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Audio storage failed
 */
router.post('/generate-audio-from-recording',
  isAuthenticated,
  uploadAudio('audio'),
  validateFileMetadata,
  async (req, res) => {
    try {
      console.log(`Audio-to-audio generation request from user: ${req.user.uid}`);
      
      const userId = req.user.uid;
      const uploadedFile = req.file;
      const { iconId } = req.body;
      
      if (!uploadedFile || !uploadedFile.buffer) {
        console.error('No valid audio file provided in request');
        return res.status(400).json({
          error: 'No valid audio file provided',
          code: 'NO_AUDIO_FILE',
          details: 'Please upload an audio file in the "audio" field',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`Storing uploaded audio: ${uploadedFile.originalname} (${uploadedFile.size} bytes) for user: ${userId}`);
      
      // Get optional label from request
      const { label } = req.body;
      
      // Step 1: Convert uploaded audio buffer to base64
      const audioBase64 = uploadedFile.buffer.toString('base64');
      
      // Step 2: Store the original recorded audio
      try {
        const storedAudio = await iconService.storeAudio(
          userId,
          audioBase64,
          uploadedFile.mimetype,
          {
            label: label || 'Recorded audio',
            iconId: iconId || null,
            originalFilename: uploadedFile.originalname,
            recordedAt: new Date().toISOString()
          }
        );
        
        console.log(`✓ Audio stored successfully: ${storedAudio.filename}`);
        
        // Return successful response
        return res.status(200).json({
          success: true,
          audio: {
            filename: storedAudio.filename,
            publicUrl: storedAudio.publicUrl,
            mimeType: storedAudio.mimeType,
            size: storedAudio.size,
            uploadedAt: storedAudio.uploadedAt
          },
          iconId: iconId || null,
          originalFile: {
            filename: uploadedFile.originalname,
            size: uploadedFile.size,
            mimetype: uploadedFile.mimetype
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (storageError) {
        console.error(`Failed to store audio for user ${userId}:`, storageError.message);
        
        return res.status(500).json({
          error: 'Audio storage failed',
          code: 'AUDIO_STORAGE_ERROR',
          details: storageError.message,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Unexpected error in audio-to-audio generation:', error);
      
      return res.status(500).json({
        error: 'Internal server error during audio processing',
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