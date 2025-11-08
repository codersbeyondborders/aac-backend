const firestoreService = require('./firestore');

/**
 * Culture Profile Management Service
 * Handles user culture profiles for AI prompt optimization
 */
class CultureService {
  constructor() {
    this.collectionName = 'culture_profiles';
  }

  /**
   * Get default culture profile for new users
   * @returns {Object} Default culture profile
   */
  getDefaultProfile() {
    return {
      culturalPreferences: {
        language: 'en',
        region: 'US',
        colorPreferences: ['blue', 'green', 'yellow'],
        symbolStyle: 'simple', // 'realistic' | 'abstract' | 'cartoon' | 'simple'
        accessibility: {
          highContrast: false,
          largeText: false,
          simplifiedIcons: true
        }
      },
      isDefault: true
    };
  }

  /**
   * Retrieve user culture profile from Firestore
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User culture profile or default profile
   */
  async getCultureProfile(userId) {
    try {
      console.log(`Retrieving culture profile for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Try to get existing profile
      const existingProfile = await firestoreService.read(this.collectionName, userId);
      
      if (existingProfile) {
        console.log(`✓ Found existing culture profile for user: ${userId}`);
        return existingProfile;
      }

      // Return default profile if none exists
      console.log(`No culture profile found for user: ${userId}, returning default profile`);
      const defaultProfile = this.getDefaultProfile();
      
      return {
        userId,
        ...defaultProfile
      };
      
    } catch (error) {
      console.error(`✗ Failed to retrieve culture profile for user ${userId}:`, error.message);
      
      // Return default profile on error to ensure system continues working
      console.log('Returning default culture profile due to error');
      return {
        userId,
        ...this.getDefaultProfile()
      };
    }
  }

  /**
   * Create culture profile for a new user
   * @param {string} userId - User ID
   * @param {Object} [profileData] - Optional profile data, uses default if not provided
   * @returns {Promise<Object>} Created culture profile
   */
  async createCultureProfile(userId, profileData = null) {
    try {
      console.log(`Creating culture profile for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Check if profile already exists
      const existingProfile = await firestoreService.read(this.collectionName, userId);
      if (existingProfile) {
        console.log(`Culture profile already exists for user: ${userId}`);
        return existingProfile;
      }

      // Use provided data or default profile
      const cultureData = profileData || this.getDefaultProfile();
      
      // Validate profile data structure
      this.validateProfileData(cultureData);

      const profileToCreate = {
        userId,
        ...cultureData,
        isDefault: !profileData // Mark as default if no custom data provided
      };

      const createdProfile = await firestoreService.create(
        this.collectionName, 
        profileToCreate, 
        userId // Use userId as document ID
      );

      console.log(`✓ Culture profile created successfully for user: ${userId}`);
      return createdProfile;
      
    } catch (error) {
      console.error(`✗ Failed to create culture profile for user ${userId}:`, error.message);
      throw new Error(`Culture profile creation failed: ${error.message}`);
    }
  }

  /**
   * Update user culture profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated culture profile
   */
  async updateCultureProfile(userId, updates) {
    try {
      console.log(`Updating culture profile for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!updates || typeof updates !== 'object') {
        throw new Error('Profile updates are required');
      }

      // Validate update data structure
      this.validateProfileData(updates, true);

      // Check if profile exists, create if it doesn't
      const existingProfile = await firestoreService.read(this.collectionName, userId);
      
      if (!existingProfile) {
        console.log(`No existing profile found for user: ${userId}, creating new profile with updates`);
        const defaultProfile = this.getDefaultProfile();
        const mergedProfile = this.mergeProfileData(defaultProfile, updates);
        return await this.createCultureProfile(userId, mergedProfile);
      }

      // Merge updates with existing profile
      const mergedUpdates = this.mergeProfileData(existingProfile.culturalPreferences, updates.culturalPreferences || updates);
      
      const updateData = {
        culturalPreferences: mergedUpdates,
        isDefault: false // Mark as customized
      };

      const updatedProfile = await firestoreService.update(this.collectionName, userId, updateData);

      console.log(`✓ Culture profile updated successfully for user: ${userId}`);
      return updatedProfile;
      
    } catch (error) {
      console.error(`✗ Failed to update culture profile for user ${userId}:`, error.message);
      throw new Error(`Culture profile update failed: ${error.message}`);
    }
  }

  /**
   * Delete user culture profile (resets to default)
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteCultureProfile(userId) {
    try {
      console.log(`Deleting culture profile for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      const success = await firestoreService.delete(this.collectionName, userId);
      
      if (success) {
        console.log(`✓ Culture profile deleted successfully for user: ${userId}`);
      }
      
      return success;
      
    } catch (error) {
      console.error(`✗ Failed to delete culture profile for user ${userId}:`, error.message);
      throw new Error(`Culture profile deletion failed: ${error.message}`);
    }
  }

  /**
   * Get culture profiles for multiple users (batch operation)
   * @param {Array<string>} userIds - Array of user IDs
   * @returns {Promise<Object>} Map of userId to culture profile
   */
  async getBatchCultureProfiles(userIds) {
    try {
      console.log(`Retrieving culture profiles for ${userIds.length} users`);
      
      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('User IDs array is required');
      }

      const profiles = {};
      const defaultProfile = this.getDefaultProfile();

      // Process each user ID
      for (const userId of userIds) {
        try {
          const profile = await this.getCultureProfile(userId);
          profiles[userId] = profile;
        } catch (error) {
          console.error(`Failed to get profile for user ${userId}:`, error.message);
          // Use default profile for failed requests
          profiles[userId] = {
            userId,
            ...defaultProfile
          };
        }
      }

      console.log(`✓ Retrieved culture profiles for ${Object.keys(profiles).length} users`);
      return profiles;
      
    } catch (error) {
      console.error(`✗ Failed to retrieve batch culture profiles:`, error.message);
      throw new Error(`Batch culture profile retrieval failed: ${error.message}`);
    }
  }

  /**
   * Validate culture profile data structure
   * @param {Object} profileData - Profile data to validate
   * @param {boolean} [isPartialUpdate] - Whether this is a partial update
   */
  validateProfileData(profileData, isPartialUpdate = false) {
    if (!profileData || typeof profileData !== 'object') {
      throw new Error('Profile data must be an object');
    }

    const culturalPrefs = profileData.culturalPreferences || profileData;
    
    if (!isPartialUpdate && !culturalPrefs) {
      throw new Error('Cultural preferences are required');
    }

    if (culturalPrefs) {
      // Validate language
      if (culturalPrefs.language && typeof culturalPrefs.language !== 'string') {
        throw new Error('Language must be a string');
      }

      // Validate region
      if (culturalPrefs.region && typeof culturalPrefs.region !== 'string') {
        throw new Error('Region must be a string');
      }

      // Validate color preferences
      if (culturalPrefs.colorPreferences && !Array.isArray(culturalPrefs.colorPreferences)) {
        throw new Error('Color preferences must be an array');
      }

      // Validate symbol style
      if (culturalPrefs.symbolStyle) {
        const validStyles = ['realistic', 'abstract', 'cartoon', 'simple'];
        if (!validStyles.includes(culturalPrefs.symbolStyle)) {
          throw new Error(`Symbol style must be one of: ${validStyles.join(', ')}`);
        }
      }

      // Validate accessibility settings
      if (culturalPrefs.accessibility && typeof culturalPrefs.accessibility !== 'object') {
        throw new Error('Accessibility settings must be an object');
      }
    }
  }

  /**
   * Merge profile data with existing data
   * @param {Object} existing - Existing profile data
   * @param {Object} updates - Updates to merge
   * @returns {Object} Merged profile data
   */
  mergeProfileData(existing, updates) {
    const merged = { ...existing };

    if (updates.language) merged.language = updates.language;
    if (updates.region) merged.region = updates.region;
    if (updates.colorPreferences) merged.colorPreferences = updates.colorPreferences;
    if (updates.symbolStyle) merged.symbolStyle = updates.symbolStyle;
    
    if (updates.accessibility) {
      merged.accessibility = {
        ...merged.accessibility,
        ...updates.accessibility
      };
    }

    return merged;
  }

  /**
   * Get culture-specific prompt enhancements for AI generation
   * @param {Object} cultureProfile - User's culture profile
   * @returns {Object} Prompt enhancement data
   */
  getPromptEnhancements(cultureProfile) {
    try {
      const prefs = cultureProfile.culturalPreferences || cultureProfile;
      
      const enhancements = {
        language: prefs.language || 'en',
        region: prefs.region || 'US',
        styleModifiers: [],
        colorGuidance: prefs.colorPreferences || ['blue', 'green', 'yellow'],
        accessibilityConstraints: []
      };

      // Add style modifiers based on symbol style
      switch (prefs.symbolStyle) {
        case 'realistic':
          enhancements.styleModifiers.push('photorealistic', 'detailed');
          break;
        case 'abstract':
          enhancements.styleModifiers.push('abstract', 'geometric', 'minimalist');
          break;
        case 'cartoon':
          enhancements.styleModifiers.push('cartoon style', 'friendly', 'colorful');
          break;
        case 'simple':
        default:
          enhancements.styleModifiers.push('simple', 'clean', 'minimal');
          break;
      }

      // Add accessibility constraints
      if (prefs.accessibility) {
        if (prefs.accessibility.highContrast) {
          enhancements.accessibilityConstraints.push('high contrast');
        }
        if (prefs.accessibility.simplifiedIcons) {
          enhancements.accessibilityConstraints.push('simplified', 'clear outlines');
        }
        if (prefs.accessibility.largeText) {
          enhancements.accessibilityConstraints.push('large text elements');
        }
      }

      return enhancements;
      
    } catch (error) {
      console.error('Failed to generate prompt enhancements:', error.message);
      // Return basic enhancements on error
      return {
        language: 'en',
        region: 'US',
        styleModifiers: ['simple', 'clean'],
        colorGuidance: ['blue', 'green', 'yellow'],
        accessibilityConstraints: ['simplified', 'clear outlines']
      };
    }
  }
}

// Create and export singleton instance
const cultureService = new CultureService();

module.exports = cultureService;