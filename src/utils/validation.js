/**
 * Input validation utilities for Smart AAC API
 * Provides validation and sanitization functions for different endpoints
 */

/**
 * Sanitizes string input by trimming whitespace and removing potentially harmful characters
 * @param {string} input - The input string to sanitize
 * @param {number} maxLength - Maximum allowed length (default: 1000)
 * @returns {string} Sanitized string
 */
function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential HTML tags
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email);
}

/**
 * Validates if input is a non-empty string
 * @param {any} input - Input to validate
 * @param {number} minLength - Minimum required length (default: 1)
 * @param {number} maxLength - Maximum allowed length (default: 1000)
 * @returns {boolean} True if valid string
 */
function isValidString(input, minLength = 1, maxLength = 1000) {
  return typeof input === 'string' && 
         input.trim().length >= minLength && 
         input.trim().length <= maxLength;
}

/**
 * Validates if input is a valid boolean
 * @param {any} input - Input to validate
 * @returns {boolean} True if valid boolean
 */
function isValidBoolean(input) {
  return typeof input === 'boolean';
}

/**
 * Validates if input is a valid array
 * @param {any} input - Input to validate
 * @param {number} maxLength - Maximum array length (default: 100)
 * @returns {boolean} True if valid array
 */
function isValidArray(input, maxLength = 100) {
  return Array.isArray(input) && input.length <= maxLength;
}

/**
 * Validates AAC board creation/update data
 * @param {object} boardData - Board data to validate
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateBoardData(boardData) {
  const errors = [];
  
  if (!boardData || typeof boardData !== 'object') {
    return { isValid: false, errors: ['Board data must be an object'] };
  }
  
  // Validate required fields for board creation
  if (!isValidString(boardData.name, 1, 100)) {
    errors.push('Board name is required and must be 1-100 characters');
  }
  
  if (!isValidString(boardData.description, 1, 500)) {
    errors.push('Board description is required and must be 1-500 characters');
  }
  
  // Validate optional fields
  if (boardData.isPublic !== undefined && !isValidBoolean(boardData.isPublic)) {
    errors.push('isPublic must be a boolean');
  }
  
  if (boardData.icons !== undefined) {
    if (!isValidArray(boardData.icons, 50)) {
      errors.push('Icons must be an array with maximum 50 items');
    } else {
      // Validate each icon in the array
      boardData.icons.forEach((icon, index) => {
        const iconErrors = validateIconData(icon);
        if (!iconErrors.isValid) {
          errors.push(`Icon ${index}: ${iconErrors.errors.join(', ')}`);
        }
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      name: sanitizeString(boardData.name, 100),
      description: sanitizeString(boardData.description, 500),
      isPublic: boardData.isPublic || false,
      icons: boardData.icons || []
    }
  };
}

/**
 * Validates individual icon data
 * @param {object} iconData - Icon data to validate
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateIconData(iconData) {
  const errors = [];
  
  if (!iconData || typeof iconData !== 'object') {
    return { isValid: false, errors: ['Icon data must be an object'] };
  }
  
  if (!isValidString(iconData.text, 1, 100)) {
    errors.push('Icon text is required and must be 1-100 characters');
  }
  
  if (iconData.imageUrl && !isValidString(iconData.imageUrl, 1, 500)) {
    errors.push('Icon imageUrl must be a valid string (1-500 characters)');
  }
  
  if (iconData.category && !isValidString(iconData.category, 1, 50)) {
    errors.push('Icon category must be 1-50 characters');
  }
  
  // Validate position if provided
  if (iconData.position) {
    if (typeof iconData.position !== 'object' || 
        typeof iconData.position.x !== 'number' || 
        typeof iconData.position.y !== 'number') {
      errors.push('Icon position must be an object with numeric x and y properties');
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Validates icon generation request data
 * @param {object} requestData - Icon generation request data
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateIconGenerationRequest(requestData) {
  const errors = [];
  
  if (!requestData || typeof requestData !== 'object') {
    return { isValid: false, errors: ['Request data must be an object'] };
  }
  
  if (!isValidString(requestData.text, 1, 500)) {
    errors.push('Text description is required and must be 1-500 characters');
  }
  
  // Validate optional label
  if (requestData.label && !isValidString(requestData.label, 1, 100)) {
    errors.push('Label must be 1-100 characters');
  }
  
  // Validate optional category
  if (requestData.category && !isValidString(requestData.category, 1, 50)) {
    errors.push('Category must be 1-50 characters');
  }
  
  // Validate optional accent
  if (requestData.accent && !isValidString(requestData.accent, 1, 50)) {
    errors.push('Accent must be 1-50 characters');
  }
  
  // Validate optional color
  if (requestData.color && !isValidString(requestData.color, 1, 50)) {
    errors.push('Color must be 1-50 characters');
  }
  
  // Validate optional generateAudio flag
  if (requestData.generateAudio !== undefined && !isValidBoolean(requestData.generateAudio)) {
    errors.push('generateAudio must be a boolean');
  }
  
  // Validate optional cultural context with comprehensive structure
  if (requestData.culturalContext) {
    const context = requestData.culturalContext;
    if (typeof context !== 'object') {
      errors.push('Cultural context must be an object');
    } else {
      // Validate country
      if (context.country && !isValidString(context.country, 2, 100)) {
        errors.push('Country must be 2-100 characters');
      }
      
      // Validate region
      if (context.region && !isValidString(context.region, 2, 100)) {
        errors.push('Region must be 2-100 characters');
      }
      
      // Validate languages object
      if (context.languages) {
        if (typeof context.languages !== 'object') {
          errors.push('Languages must be an object');
        } else {
          // Validate primary language
          if (context.languages.primary) {
            if (typeof context.languages.primary !== 'object') {
              errors.push('Primary language must be an object');
            } else {
              if (context.languages.primary.language && !isValidString(context.languages.primary.language, 2, 50)) {
                errors.push('Primary language must be 2-50 characters');
              }
              if (context.languages.primary.dialect && !isValidString(context.languages.primary.dialect, 2, 50)) {
                errors.push('Primary dialect must be 2-50 characters');
              }
            }
          }
        }
      }
      
      // Validate demographics object
      if (context.demographics) {
        if (typeof context.demographics !== 'object') {
          errors.push('Demographics must be an object');
        } else {
          if (context.demographics.age !== undefined) {
            const age = parseInt(context.demographics.age, 10);
            if (isNaN(age) || age < 1 || age > 120) {
              errors.push('Age must be a number between 1 and 120');
            }
          }
          if (context.demographics.gender && !isValidString(context.demographics.gender, 1, 50)) {
            errors.push('Gender must be 1-50 characters');
          }
          if (context.demographics.religion && !isValidString(context.demographics.religion, 1, 100)) {
            errors.push('Religion must be 1-100 characters');
          }
          if (context.demographics.ethnicity && !isValidString(context.demographics.ethnicity, 1, 100)) {
            errors.push('Ethnicity must be 1-100 characters');
          }
        }
      }
    }
  }
  
  // Validate optional constraints
  if (requestData.constraints) {
    const constraints = requestData.constraints;
    if (typeof constraints !== 'object') {
      errors.push('Constraints must be an object');
    } else {
      const validStyles = ['2D', '3D'];
      const validComplexity = ['simple', 'detailed'];
      const validColors = ['minimal', 'full'];
      
      if (constraints.style && !validStyles.includes(constraints.style)) {
        errors.push('Style must be either "2D" or "3D"');
      }
      if (constraints.complexity && !validComplexity.includes(constraints.complexity)) {
        errors.push('Complexity must be either "simple" or "detailed"');
      }
      if (constraints.colors && !validColors.includes(constraints.colors)) {
        errors.push('Colors must be either "minimal" or "full"');
      }
      if (constraints.accessibility !== undefined && !isValidBoolean(constraints.accessibility)) {
        errors.push('Accessibility must be a boolean');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      text: sanitizeString(requestData.text, 500),
      label: requestData.label ? sanitizeString(requestData.label, 100) : undefined,
      category: requestData.category ? sanitizeString(requestData.category, 50) : undefined,
      accent: requestData.accent ? sanitizeString(requestData.accent, 50) : undefined,
      color: requestData.color ? sanitizeString(requestData.color, 50) : undefined,
      generateAudio: requestData.generateAudio || false,
      culturalContext: requestData.culturalContext || {},
      constraints: requestData.constraints || {}
    }
  };
}

/**
 * Validates culture profile data
 * @param {object} profileData - Culture profile data to validate
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validateCultureProfile(profileData) {
  const errors = [];
  
  if (!profileData || typeof profileData !== 'object') {
    return { isValid: false, errors: ['Profile data must be an object'] };
  }
  
  if (profileData.culturalPreferences) {
    const prefs = profileData.culturalPreferences;
    if (typeof prefs !== 'object') {
      errors.push('Cultural preferences must be an object');
    } else {
      if (prefs.language && !isValidString(prefs.language, 2, 10)) {
        errors.push('Language must be 2-10 characters');
      }
      if (prefs.region && !isValidString(prefs.region, 2, 50)) {
        errors.push('Region must be 2-50 characters');
      }
      if (prefs.symbolStyle && !['realistic', 'abstract', 'cartoon'].includes(prefs.symbolStyle)) {
        errors.push('Symbol style must be "realistic", "abstract", or "cartoon"');
      }
      if (prefs.colorPreferences && !isValidArray(prefs.colorPreferences, 10)) {
        errors.push('Color preferences must be an array with maximum 10 items');
      }
      
      // Validate accessibility settings
      if (prefs.accessibility) {
        const acc = prefs.accessibility;
        if (typeof acc !== 'object') {
          errors.push('Accessibility settings must be an object');
        } else {
          if (acc.highContrast !== undefined && !isValidBoolean(acc.highContrast)) {
            errors.push('High contrast must be a boolean');
          }
          if (acc.largeText !== undefined && !isValidBoolean(acc.largeText)) {
            errors.push('Large text must be a boolean');
          }
          if (acc.simplifiedIcons !== undefined && !isValidBoolean(acc.simplifiedIcons)) {
            errors.push('Simplified icons must be a boolean');
          }
        }
      }
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Express middleware for validating request body
 * @param {function} validationFunction - Validation function to use
 * @returns {function} Express middleware function
 */
function validateRequestBody(validationFunction) {
  return (req, res, next) => {
    try {
      const validation = validationFunction(req.body);
      
      if (!validation.isValid) {
        console.error('Validation failed:', validation.errors);
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validation.errors,
          timestamp: new Date().toISOString()
        });
      }
      
      // Attach sanitized data to request if available
      if (validation.sanitizedData) {
        req.validatedBody = validation.sanitizedData;
      }
      
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        error: 'Internal validation error',
        code: 'VALIDATION_MIDDLEWARE_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Validates query parameters for pagination
 * @param {object} query - Query parameters object
 * @returns {object} Validation result with sanitized pagination params
 */
function validatePaginationParams(query) {
  const errors = [];
  let page = 1;
  let limit = 10;
  
  if (query.page) {
    const pageNum = parseInt(query.page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be a positive integer');
    } else if (pageNum > 1000) {
      errors.push('Page number too large (max: 1000)');
    } else {
      page = pageNum;
    }
  }
  
  if (query.limit) {
    const limitNum = parseInt(query.limit, 10);
    if (isNaN(limitNum) || limitNum < 1) {
      errors.push('Limit must be a positive integer');
    } else if (limitNum > 100) {
      errors.push('Limit too large (max: 100)');
    } else {
      limit = limitNum;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedParams: { page, limit }
  };
}

module.exports = {
  sanitizeString,
  isValidEmail,
  isValidString,
  isValidBoolean,
  isValidArray,
  validateBoardData,
  validateIconData,
  validateIconGenerationRequest,
  validateCultureProfile,
  validateRequestBody,
  validatePaginationParams
};