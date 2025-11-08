const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const userProfileService = require('../services/userProfile');
const { validateRequestBody } = require('../utils/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LocationData:
 *       type: object
 *       required:
 *         - country
 *         - region
 *       properties:
 *         country:
 *           type: string
 *           maxLength: 100
 *           example: "United States"
 *         region:
 *           type: string
 *           maxLength: 100
 *           example: "California"
 *     
 *     LanguageInfo:
 *       type: object
 *       required:
 *         - language
 *         - dialect
 *       properties:
 *         language:
 *           type: string
 *           example: "English"
 *         dialect:
 *           type: string
 *           example: "American English"
 *     
 *     LanguageData:
 *       type: object
 *       required:
 *         - primary
 *       properties:
 *         primary:
 *           $ref: '#/components/schemas/LanguageInfo'
 *         secondary:
 *           $ref: '#/components/schemas/LanguageInfo'
 *     
 *     DemographicsData:
 *       type: object
 *       properties:
 *         age:
 *           type: integer
 *           minimum: 1
 *           maximum: 120
 *           example: 25
 *         gender:
 *           type: string
 *           maxLength: 50
 *           example: "Female"
 *         religion:
 *           type: string
 *           maxLength: 100
 *           example: "Christianity"
 *         ethnicity:
 *           type: string
 *           maxLength: 100
 *           example: "Hispanic/Latino"
 *     
 *     UserProfile:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           example: "firebase-user-id-123"
 *         location:
 *           $ref: '#/components/schemas/LocationData'
 *         languages:
 *           $ref: '#/components/schemas/LanguageData'
 *         demographics:
 *           $ref: '#/components/schemas/DemographicsData'
 *         profileComplete:
 *           type: boolean
 *           example: true
 *         onboardingStep:
 *           type: string
 *           enum: [location, languages, demographics, completed]
 *           example: "completed"
 *         metadata:
 *           type: object
 *           properties:
 *             version:
 *               type: integer
 *             lastUpdated:
 *               type: string
 *               format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CulturalContext:
 *       type: object
 *       properties:
 *         language:
 *           type: string
 *           example: "en"
 *         dialect:
 *           type: string
 *           example: "American English"
 *         region:
 *           type: string
 *           example: "California"
 *         country:
 *           type: string
 *           example: "United States"
 *         symbolStyle:
 *           type: string
 *           enum: [simple, cartoon, modern]
 *           example: "modern"
 *         culturalAdaptation:
 *           type: boolean
 *           example: true
 *         demographics:
 *           $ref: '#/components/schemas/DemographicsData'
 */

/**
 * @swagger
 * /api/v1/profile:
 *   get:
 *     tags: [User Profile]
 *     summary: Get user profile
 *     description: Retrieves the current user's profile information
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    console.log(`Getting profile for user: ${req.user.uid}`);
    
    const profile = await userProfileService.getProfile(req.user.uid);
    
    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: profile
    });
    
  } catch (error) {
    console.error('Profile retrieval error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve profile',
      code: 'PROFILE_RETRIEVAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/profile:
 *   post:
 *     tags: [User Profile]
 *     summary: Create complete user profile
 *     description: Creates a complete user profile with all required information
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location
 *               - languages
 *               - demographics
 *             properties:
 *               location:
 *                 $ref: '#/components/schemas/LocationData'
 *               languages:
 *                 $ref: '#/components/schemas/LanguageData'
 *               demographics:
 *                 $ref: '#/components/schemas/DemographicsData'
 *           example:
 *             location:
 *               country: "United States"
 *               region: "California"
 *             languages:
 *               primary:
 *                 language: "English"
 *                 dialect: "American English"
 *               secondary:
 *                 language: "Spanish"
 *                 dialect: "Mexican Spanish"
 *             demographics:
 *               age: 25
 *               gender: "Female"
 *               religion: "Christianity"
 *               ethnicity: "Hispanic/Latino"
 *     responses:
 *       201:
 *         description: Profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Invalid profile data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Profile already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', isAuthenticated, async (req, res) => {
  try {
    console.log(`Creating profile for user: ${req.user.uid}`);
    
    const profileData = req.body;
    
    if (!profileData || typeof profileData !== 'object') {
      return res.status(400).json({
        error: 'Profile data must be an object',
        code: 'INVALID_PROFILE_DATA',
        timestamp: new Date().toISOString()
      });
    }
    
    const createdProfile = await userProfileService.createProfile(req.user.uid, profileData);
    
    res.status(201).json({
      success: true,
      data: createdProfile,
      message: 'Profile created successfully'
    });
    
  } catch (error) {
    console.error('Profile creation error:', error.message);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message,
        code: 'PROFILE_ALREADY_EXISTS',
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.message.includes('validation') || error.message.includes('required')) {
      return res.status(400).json({
        error: error.message,
        code: 'PROFILE_VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to create profile',
      code: 'PROFILE_CREATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/profile/step/{step}:
 *   put:
 *     tags: [User Profile]
 *     summary: Update profile step
 *     description: Updates a specific step of the user profile during onboarding
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: step
 *         required: true
 *         schema:
 *           type: string
 *           enum: [location, languages, demographics]
 *         description: Profile step to update
 *         example: "location"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/LocationData'
 *               - $ref: '#/components/schemas/LanguageData'
 *               - $ref: '#/components/schemas/DemographicsData'
 *           examples:
 *             location:
 *               summary: Location step
 *               value:
 *                 country: "United States"
 *                 region: "California"
 *             languages:
 *               summary: Languages step
 *               value:
 *                 primary:
 *                   language: "English"
 *                   dialect: "American English"
 *                 secondary:
 *                   language: "Spanish"
 *                   dialect: "Mexican Spanish"
 *             demographics:
 *               summary: Demographics step
 *               value:
 *                 age: 25
 *                 gender: "Female"
 *                 religion: "Christianity"
 *                 ethnicity: "Hispanic/Latino"
 *     responses:
 *       200:
 *         description: Profile step updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Invalid step data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/step/:step', isAuthenticated, async (req, res) => {
  try {
    const step = req.params.step;
    const stepData = req.body;
    
    console.log(`Updating profile step '${step}' for user: ${req.user.uid}`);
    
    if (!stepData || typeof stepData !== 'object') {
      return res.status(400).json({
        error: 'Step data must be an object',
        code: 'INVALID_STEP_DATA',
        timestamp: new Date().toISOString()
      });
    }
    
    const updatedProfile = await userProfileService.updateProfileStep(req.user.uid, step, stepData);
    
    res.json({
      success: true,
      data: updatedProfile,
      message: `Profile step '${step}' updated successfully`
    });
    
  } catch (error) {
    console.error('Profile step update error:', error.message);
    
    if (error.message.includes('Invalid profile step') || error.message.includes('validation') || error.message.includes('required')) {
      return res.status(400).json({
        error: error.message,
        code: 'PROFILE_STEP_VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to update profile step',
      code: 'PROFILE_STEP_UPDATE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/profile/cultural-context:
 *   get:
 *     tags: [User Profile]
 *     summary: Get cultural context
 *     description: Retrieves cultural context derived from user profile for AI personalization
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cultural context retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CulturalContext'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/cultural-context', isAuthenticated, async (req, res) => {
  try {
    console.log(`Getting cultural context for user: ${req.user.uid}`);
    
    const culturalContext = await userProfileService.getCulturalContext(req.user.uid);
    
    res.json({
      success: true,
      data: culturalContext
    });
    
  } catch (error) {
    console.error('Cultural context retrieval error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve cultural context',
      code: 'CULTURAL_CONTEXT_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/profile:
 *   delete:
 *     tags: [User Profile]
 *     summary: Delete user profile
 *     description: Deletes the current user's profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /api/v1/profile:
 *   put:
 *     tags: [User Profile]
 *     summary: Update complete user profile
 *     description: Updates an existing user profile with new information (different from POST which creates)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 $ref: '#/components/schemas/LocationData'
 *               languages:
 *                 $ref: '#/components/schemas/LanguageData'
 *               demographics:
 *                 $ref: '#/components/schemas/DemographicsData'
 *           example:
 *             location:
 *               country: "Canada"
 *               region: "Ontario"
 *             languages:
 *               primary:
 *                 language: "French"
 *                 dialect: "Canadian French"
 *             demographics:
 *               age: 30
 *               gender: "Male"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Invalid profile data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/', isAuthenticated, async (req, res) => {
  try {
    console.log(`Updating complete profile for user: ${req.user.uid}`);
    
    const profileData = req.body;
    
    if (!profileData || typeof profileData !== 'object') {
      return res.status(400).json({
        error: 'Profile data must be an object',
        code: 'INVALID_PROFILE_DATA',
        timestamp: new Date().toISOString()
      });
    }
    
    const updatedProfile = await userProfileService.updateCompleteProfile(req.user.uid, profileData);
    
    res.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Profile update error:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'PROFILE_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.message.includes('validation') || error.message.includes('required')) {
      return res.status(400).json({
        error: error.message,
        code: 'PROFILE_VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to update profile',
      code: 'PROFILE_UPDATE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/profile/status:
 *   get:
 *     tags: [User Profile]
 *     summary: Get profile status
 *     description: Returns profile existence, completion status, and onboarding information
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         profileExists:
 *                           type: boolean
 *                           example: true
 *                         isComplete:
 *                           type: boolean
 *                           example: false
 *                         currentStep:
 *                           type: string
 *                           enum: [location, languages, demographics, completed]
 *                           example: "languages"
 *                         completionPercentage:
 *                           type: number
 *                           example: 66.7
 *                         missingFields:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["languages", "demographics"]
 *                         nextStep:
 *                           type: string
 *                           example: "languages"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    console.log(`Getting profile status for user: ${req.user.uid}`);
    
    const status = await userProfileService.getProfileStatus(req.user.uid);
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('Profile status error:', error.message);
    res.status(500).json({
      error: 'Failed to get profile status',
      code: 'PROFILE_STATUS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/profile/section/{section}:
 *   patch:
 *     tags: [User Profile]
 *     summary: Update profile section
 *     description: Updates a specific section of the user profile (for post-signup editing)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [location, languages, demographics]
 *         description: Profile section to update
 *         example: "location"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/LocationData'
 *               - $ref: '#/components/schemas/LanguageData'
 *               - $ref: '#/components/schemas/DemographicsData'
 *           examples:
 *             location:
 *               summary: Update location
 *               value:
 *                 country: "Canada"
 *                 region: "Ontario"
 *             languages:
 *               summary: Update languages
 *               value:
 *                 primary:
 *                   language: "French"
 *                   dialect: "Canadian French"
 *             demographics:
 *               summary: Update demographics
 *               value:
 *                 age: 30
 *                 gender: "Male"
 *     responses:
 *       200:
 *         description: Profile section updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Invalid section data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/section/:section', isAuthenticated, async (req, res) => {
  try {
    const section = req.params.section;
    const sectionData = req.body;
    
    console.log(`Updating profile section '${section}' for user: ${req.user.uid}`);
    
    if (!sectionData || typeof sectionData !== 'object') {
      return res.status(400).json({
        error: 'Section data must be an object',
        code: 'INVALID_SECTION_DATA',
        timestamp: new Date().toISOString()
      });
    }
    
    const updatedProfile = await userProfileService.updateProfileSection(req.user.uid, section, sectionData);
    
    res.json({
      success: true,
      data: updatedProfile,
      message: `Profile section '${section}' updated successfully`
    });
    
  } catch (error) {
    console.error('Profile section update error:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'PROFILE_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.message.includes('Invalid profile section') || error.message.includes('validation') || error.message.includes('required')) {
      return res.status(400).json({
        error: error.message,
        code: 'PROFILE_SECTION_VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to update profile section',
      code: 'PROFILE_SECTION_UPDATE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/profile/validate:
 *   post:
 *     tags: [User Profile]
 *     summary: Validate profile data
 *     description: Validates profile data without saving (useful for real-time validation)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 $ref: '#/components/schemas/LocationData'
 *               languages:
 *                 $ref: '#/components/schemas/LanguageData'
 *               demographics:
 *                 $ref: '#/components/schemas/DemographicsData'
 *     responses:
 *       200:
 *         description: Profile data is valid
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         valid:
 *                           type: boolean
 *                           example: true
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *       400:
 *         description: Profile data is invalid
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         valid:
 *                           type: boolean
 *                           example: false
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["Country is required", "Primary language is required"]
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/validate', isAuthenticated, async (req, res) => {
  try {
    console.log(`Validating profile data for user: ${req.user.uid}`);
    
    const profileData = req.body;
    const validationResult = await userProfileService.validateProfileData(profileData);
    
    if (validationResult.valid) {
      res.json({
        success: true,
        data: validationResult,
        message: 'Profile data is valid'
      });
    } else {
      res.status(400).json({
        success: false,
        data: validationResult,
        error: 'Profile data validation failed',
        code: 'PROFILE_VALIDATION_FAILED',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Profile validation error:', error.message);
    res.status(500).json({
      error: 'Failed to validate profile data',
      code: 'PROFILE_VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

router.delete('/', isAuthenticated, async (req, res) => {
  try {
    console.log(`Deleting profile for user: ${req.user.uid}`);
    
    const success = await userProfileService.deleteProfile(req.user.uid);
    
    if (success) {
      res.json({
        success: true,
        message: 'Profile deleted successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete profile',
        code: 'PROFILE_DELETION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Profile deletion error:', error.message);
    res.status(500).json({
      error: 'Failed to delete profile',
      code: 'PROFILE_DELETION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;