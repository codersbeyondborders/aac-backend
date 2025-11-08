const firestoreService = require('./firestore');

/**
 * User Profile Service
 * Handles user profile creation, updates, and cultural context management
 */
class UserProfileService {
  constructor() {
    this.collectionName = 'user_profiles';
  }

  /**
   * Validate location data
   * @param {Object} locationData - Location data to validate
   */
  validateLocationData(locationData) {
    if (!locationData || typeof locationData !== 'object') {
      throw new Error('Location data must be an object');
    }

    if (!locationData.country || typeof locationData.country !== 'string' || locationData.country.trim().length === 0) {
      throw new Error('Country is required and must be a non-empty string');
    }

    if (!locationData.region || typeof locationData.region !== 'string' || locationData.region.trim().length === 0) {
      throw new Error('Region is required and must be a non-empty string');
    }

    if (locationData.country.length > 100) {
      throw new Error('Country name must be less than 100 characters');
    }

    if (locationData.region.length > 100) {
      throw new Error('Region name must be less than 100 characters');
    }
  }

  /**
   * Validate language data
   * @param {Object} languageData - Language data to validate
   */
  validateLanguageData(languageData) {
    if (!languageData || typeof languageData !== 'object') {
      throw new Error('Language data must be an object');
    }

    // Validate primary language
    if (!languageData.primary || typeof languageData.primary !== 'object') {
      throw new Error('Primary language is required and must be an object');
    }

    if (!languageData.primary.language || typeof languageData.primary.language !== 'string') {
      throw new Error('Primary language is required');
    }

    if (!languageData.primary.dialect || typeof languageData.primary.dialect !== 'string') {
      throw new Error('Primary dialect is required');
    }

    // Validate secondary language (optional)
    if (languageData.secondary) {
      if (typeof languageData.secondary !== 'object') {
        throw new Error('Secondary language must be an object');
      }

      if (languageData.secondary.language && typeof languageData.secondary.language !== 'string') {
        throw new Error('Secondary language must be a string');
      }

      if (languageData.secondary.dialect && typeof languageData.secondary.dialect !== 'string') {
        throw new Error('Secondary dialect must be a string');
      }
    }
  }

  /**
   * Validate demographics data
   * @param {Object} demographicsData - Demographics data to validate
   */
  validateDemographicsData(demographicsData) {
    if (!demographicsData || typeof demographicsData !== 'object') {
      throw new Error('Demographics data must be an object');
    }

    // Validate age
    if (demographicsData.age !== undefined) {
      const age = parseInt(demographicsData.age, 10);
      if (isNaN(age) || age < 1 || age > 120) {
        throw new Error('Age must be a number between 1 and 120');
      }
    }

    // Validate gender (optional)
    if (demographicsData.gender && typeof demographicsData.gender !== 'string') {
      throw new Error('Gender must be a string');
    }

    // Validate religion (optional)
    if (demographicsData.religion && typeof demographicsData.religion !== 'string') {
      throw new Error('Religion must be a string');
    }

    // Validate ethnicity (optional)
    if (demographicsData.ethnicity && typeof demographicsData.ethnicity !== 'string') {
      throw new Error('Ethnicity must be a string');
    }

    // Length validations
    if (demographicsData.gender && demographicsData.gender.length > 50) {
      throw new Error('Gender must be less than 50 characters');
    }

    if (demographicsData.religion && demographicsData.religion.length > 100) {
      throw new Error('Religion must be less than 100 characters');
    }

    if (demographicsData.ethnicity && demographicsData.ethnicity.length > 100) {
      throw new Error('Ethnicity must be less than 100 characters');
    }
  }

  /**
   * Validate complete profile data
   * @param {Object} profileData - Complete profile data to validate
   */
  validateCompleteProfile(profileData) {
    if (!profileData || typeof profileData !== 'object') {
      throw new Error('Profile data must be an object');
    }

    this.validateLocationData(profileData.location);
    this.validateLanguageData(profileData.languages);
    this.validateDemographicsData(profileData.demographics);
  }

  /**
   * Create a new user profile
   * @param {string} userId - Firebase user ID
   * @param {Object} profileData - Complete profile data
   * @returns {Promise<Object>} Created profile
   */
  async createProfile(userId, profileData) {
    try {
      console.log(`Creating profile for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate complete profile data
      this.validateCompleteProfile(profileData);

      // Check if profile already exists
      const existingProfile = await this.getProfile(userId);
      if (existingProfile) {
        throw new Error('User profile already exists');
      }

      // Prepare profile document
      const profileToCreate = {
        userId,
        location: {
          country: profileData.location.country.trim(),
          region: profileData.location.region.trim()
        },
        languages: {
          primary: {
            language: profileData.languages.primary.language.trim(),
            dialect: profileData.languages.primary.dialect.trim()
          },
          secondary: profileData.languages.secondary ? {
            language: profileData.languages.secondary.language?.trim() || '',
            dialect: profileData.languages.secondary.dialect?.trim() || ''
          } : null
        },
        demographics: {
          age: profileData.demographics.age ? parseInt(profileData.demographics.age, 10) : null,
          gender: profileData.demographics.gender?.trim() || null,
          religion: profileData.demographics.religion?.trim() || null,
          ethnicity: profileData.demographics.ethnicity?.trim() || null
        },
        profileComplete: true,
        onboardingStep: 'completed',
        metadata: {
          version: 1,
          lastUpdated: new Date()
        }
      };

      const createdProfile = await firestoreService.create(this.collectionName, profileToCreate, userId);

      console.log(`✓ Profile created successfully for user: ${userId}`);
      return createdProfile;
      
    } catch (error) {
      console.error(`✗ Failed to create profile for user ${userId}:`, error.message);
      throw new Error(`Profile creation failed: ${error.message}`);
    }
  }

  /**
   * Update user profile step by step
   * @param {string} userId - Firebase user ID
   * @param {string} step - Profile step ('location', 'languages', 'demographics')
   * @param {Object} stepData - Step-specific data
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfileStep(userId, step, stepData) {
    try {
      console.log(`Updating profile step '${step}' for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!step || !['location', 'languages', 'demographics'].includes(step)) {
        throw new Error('Invalid profile step. Must be: location, languages, or demographics');
      }

      // Validate step data
      switch (step) {
        case 'location':
          this.validateLocationData(stepData);
          break;
        case 'languages':
          this.validateLanguageData(stepData);
          break;
        case 'demographics':
          this.validateDemographicsData(stepData);
          break;
      }

      // Get existing profile or create partial one
      let existingProfile = await this.getProfile(userId);
      
      if (!existingProfile) {
        // Create initial profile document
        const initialProfile = {
          userId,
          location: null,
          languages: null,
          demographics: null,
          profileComplete: false,
          onboardingStep: step,
          metadata: {
            version: 1,
            lastUpdated: new Date()
          }
        };
        existingProfile = await firestoreService.create(this.collectionName, initialProfile, userId);
      }

      // Prepare update data
      const updateData = {
        [step]: stepData,
        onboardingStep: step,
        'metadata.lastUpdated': new Date(),
        'metadata.version': (existingProfile.metadata?.version || 1) + 1
      };

      // Check if profile is now complete
      const updatedProfile = { ...existingProfile, [step]: stepData };
      const isComplete = this.isProfileComplete(updatedProfile);
      
      if (isComplete) {
        updateData.profileComplete = true;
        updateData.onboardingStep = 'completed';
      }

      const result = await firestoreService.update(this.collectionName, userId, updateData);

      console.log(`✓ Profile step '${step}' updated successfully for user: ${userId}`);
      return result;
      
    } catch (error) {
      console.error(`✗ Failed to update profile step for user ${userId}:`, error.message);
      throw new Error(`Profile step update failed: ${error.message}`);
    }
  }

  /**
   * Get user profile
   * @param {string} userId - Firebase user ID
   * @returns {Promise<Object|null>} User profile or null if not found
   */
  async getProfile(userId) {
    try {
      console.log(`Retrieving profile for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      const profile = await firestoreService.read(this.collectionName, userId);

      if (profile) {
        console.log(`✓ Profile retrieved successfully for user: ${userId}`);
      } else {
        console.log(`Profile not found for user: ${userId}`);
      }

      return profile;
      
    } catch (error) {
      console.error(`✗ Failed to retrieve profile for user ${userId}:`, error.message);
      throw new Error(`Profile retrieval failed: ${error.message}`);
    }
  }

  /**
   * Check if profile is complete
   * @param {Object} profile - Profile object to check
   * @returns {boolean} True if profile is complete
   */
  isProfileComplete(profile) {
    if (!profile) return false;

    return !!(
      profile.location &&
      profile.location.country &&
      profile.location.region &&
      profile.languages &&
      profile.languages.primary &&
      profile.languages.primary.language &&
      profile.languages.primary.dialect &&
      profile.demographics
    );
  }

  /**
   * Get cultural context from profile
   * @param {string} userId - Firebase user ID
   * @returns {Promise<Object>} Cultural context for AI services
   */
  async getCulturalContext(userId) {
    try {
      const profile = await this.getProfile(userId);
      
      if (!profile || !profile.profileComplete) {
        // Return default context if profile is incomplete
        return {
          language: 'en',
          region: 'US',
          symbolStyle: 'simple',
          culturalAdaptation: false
        };
      }

      return {
        language: profile.languages.primary.language,
        dialect: profile.languages.primary.dialect,
        region: profile.location.region,
        country: profile.location.country,
        symbolStyle: this.getSymbolStyleForDemographics(profile.demographics),
        culturalAdaptation: true,
        demographics: {
          age: profile.demographics.age,
          gender: profile.demographics.gender,
          religion: profile.demographics.religion,
          ethnicity: profile.demographics.ethnicity
        }
      };
      
    } catch (error) {
      console.error(`✗ Failed to get cultural context for user ${userId}:`, error.message);
      // Return default context on error
      return {
        language: 'en',
        region: 'US',
        symbolStyle: 'simple',
        culturalAdaptation: false
      };
    }
  }

  /**
   * Determine symbol style based on demographics
   * @param {Object} demographics - Demographics data
   * @returns {string} Symbol style preference
   */
  getSymbolStyleForDemographics(demographics) {
    if (!demographics || !demographics.age) {
      return 'simple';
    }

    const age = demographics.age;
    
    if (age <= 12) {
      return 'cartoon';
    } else if (age <= 25) {
      return 'modern';
    } else {
      return 'simple';
    }
  }

  /**
   * Delete user profile
   * @param {string} userId - Firebase user ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProfile(userId) {
    try {
      console.log(`Deleting profile for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      const success = await firestoreService.delete(this.collectionName, userId);

      if (success) {
        console.log(`✓ Profile deleted successfully for user: ${userId}`);
      }
      
      return success;
      
    } catch (error) {
      console.error(`✗ Failed to delete profile for user ${userId}:`, error.message);
      throw new Error(`Profile deletion failed: ${error.message}`);
    }
  }

  /**
   * Update complete user profile
   * @param {string} userId - Firebase user ID
   * @param {Object} profileData - Complete profile data to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateCompleteProfile(userId, profileData) {
    try {
      console.log(`Updating complete profile for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Check if profile exists
      const existingProfile = await this.getProfile(userId);
      if (!existingProfile) {
        throw new Error('Profile not found. Use POST to create a new profile.');
      }

      // Validate the data (only validate provided sections)
      if (profileData.location) {
        this.validateLocationData(profileData.location);
      }
      if (profileData.languages) {
        this.validateLanguageData(profileData.languages);
      }
      if (profileData.demographics) {
        this.validateDemographicsData(profileData.demographics);
      }

      // Prepare update data
      const updateData = {
        'metadata.lastUpdated': new Date(),
        'metadata.version': (existingProfile.metadata?.version || 1) + 1
      };

      // Update provided sections
      if (profileData.location) {
        updateData.location = {
          country: profileData.location.country.trim(),
          region: profileData.location.region.trim()
        };
      }

      if (profileData.languages) {
        updateData.languages = {
          primary: {
            language: profileData.languages.primary.language.trim(),
            dialect: profileData.languages.primary.dialect.trim()
          },
          secondary: profileData.languages.secondary ? {
            language: profileData.languages.secondary.language?.trim() || '',
            dialect: profileData.languages.secondary.dialect?.trim() || ''
          } : existingProfile.languages?.secondary || null
        };
      }

      if (profileData.demographics) {
        updateData.demographics = {
          age: profileData.demographics.age ? parseInt(profileData.demographics.age, 10) : existingProfile.demographics?.age || null,
          gender: profileData.demographics.gender?.trim() || existingProfile.demographics?.gender || null,
          religion: profileData.demographics.religion?.trim() || existingProfile.demographics?.religion || null,
          ethnicity: profileData.demographics.ethnicity?.trim() || existingProfile.demographics?.ethnicity || null
        };
      }

      // Check if profile is now complete
      const updatedProfile = { ...existingProfile, ...updateData };
      const isComplete = this.isProfileComplete(updatedProfile);
      
      updateData.profileComplete = isComplete;
      updateData.onboardingStep = isComplete ? 'completed' : existingProfile.onboardingStep;

      const result = await firestoreService.update(this.collectionName, userId, updateData);

      console.log(`✓ Complete profile updated successfully for user: ${userId}`);
      return result;
      
    } catch (error) {
      console.error(`✗ Failed to update complete profile for user ${userId}:`, error.message);
      throw new Error(`Complete profile update failed: ${error.message}`);
    }
  }

  /**
   * Update a specific profile section (for post-signup editing)
   * @param {string} userId - Firebase user ID
   * @param {string} section - Profile section ('location', 'languages', 'demographics')
   * @param {Object} sectionData - Section-specific data
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfileSection(userId, section, sectionData) {
    try {
      console.log(`Updating profile section '${section}' for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!section || !['location', 'languages', 'demographics'].includes(section)) {
        throw new Error('Invalid profile section. Must be: location, languages, or demographics');
      }

      // Check if profile exists
      const existingProfile = await this.getProfile(userId);
      if (!existingProfile) {
        throw new Error('Profile not found. Create a profile first.');
      }

      // Validate section data
      switch (section) {
        case 'location':
          this.validateLocationData(sectionData);
          break;
        case 'languages':
          this.validateLanguageData(sectionData);
          break;
        case 'demographics':
          this.validateDemographicsData(sectionData);
          break;
      }

      // Prepare update data
      const updateData = {
        [section]: sectionData,
        'metadata.lastUpdated': new Date(),
        'metadata.version': (existingProfile.metadata?.version || 1) + 1
      };

      // Check if profile is now complete
      const updatedProfile = { ...existingProfile, [section]: sectionData };
      const isComplete = this.isProfileComplete(updatedProfile);
      
      updateData.profileComplete = isComplete;
      if (isComplete) {
        updateData.onboardingStep = 'completed';
      }

      const result = await firestoreService.update(this.collectionName, userId, updateData);

      console.log(`✓ Profile section '${section}' updated successfully for user: ${userId}`);
      return result;
      
    } catch (error) {
      console.error(`✗ Failed to update profile section for user ${userId}:`, error.message);
      throw new Error(`Profile section update failed: ${error.message}`);
    }
  }

  /**
   * Get profile status and onboarding information
   * @param {string} userId - Firebase user ID
   * @returns {Promise<Object>} Profile status information
   */
  async getProfileStatus(userId) {
    try {
      console.log(`Getting profile status for user: ${userId}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      const profile = await this.getProfile(userId);
      
      if (!profile) {
        return {
          profileExists: false,
          isComplete: false,
          currentStep: 'location',
          completionPercentage: 0,
          missingFields: ['location', 'languages', 'demographics'],
          nextStep: 'location'
        };
      }

      const missingFields = [];
      let completedSections = 0;
      const totalSections = 3;

      // Check each section
      if (!profile.location || !profile.location.country || !profile.location.region) {
        missingFields.push('location');
      } else {
        completedSections++;
      }

      if (!profile.languages || !profile.languages.primary || !profile.languages.primary.language || !profile.languages.primary.dialect) {
        missingFields.push('languages');
      } else {
        completedSections++;
      }

      if (!profile.demographics) {
        missingFields.push('demographics');
      } else {
        completedSections++;
      }

      const completionPercentage = (completedSections / totalSections) * 100;
      const isComplete = missingFields.length === 0;
      
      // Determine next step
      let nextStep = 'completed';
      if (missingFields.length > 0) {
        const stepOrder = ['location', 'languages', 'demographics'];
        nextStep = stepOrder.find(step => missingFields.includes(step)) || 'completed';
      }

      return {
        profileExists: true,
        isComplete,
        currentStep: profile.onboardingStep || nextStep,
        completionPercentage: Math.round(completionPercentage * 10) / 10,
        missingFields,
        nextStep
      };
      
    } catch (error) {
      console.error(`✗ Failed to get profile status for user ${userId}:`, error.message);
      throw new Error(`Profile status retrieval failed: ${error.message}`);
    }
  }

  /**
   * Validate profile data without saving
   * @param {Object} profileData - Profile data to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateProfileData(profileData) {
    try {
      console.log('Validating profile data');
      
      const errors = [];
      
      if (!profileData || typeof profileData !== 'object') {
        errors.push('Profile data must be an object');
        return { valid: false, errors };
      }

      // Validate each section if provided
      if (profileData.location) {
        try {
          this.validateLocationData(profileData.location);
        } catch (error) {
          errors.push(`Location: ${error.message}`);
        }
      }

      if (profileData.languages) {
        try {
          this.validateLanguageData(profileData.languages);
        } catch (error) {
          errors.push(`Languages: ${error.message}`);
        }
      }

      if (profileData.demographics) {
        try {
          this.validateDemographicsData(profileData.demographics);
        } catch (error) {
          errors.push(`Demographics: ${error.message}`);
        }
      }

      const isValid = errors.length === 0;
      
      console.log(`✓ Profile data validation completed. Valid: ${isValid}`);
      return {
        valid: isValid,
        errors
      };
      
    } catch (error) {
      console.error(`✗ Failed to validate profile data:`, error.message);
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  }

  /**
   * Get profile statistics
   * @returns {Promise<Object>} Profile statistics
   */
  async getProfileStats() {
    try {
      console.log('Getting profile statistics');
      
      const allProfiles = await firestoreService.query(this.collectionName, { limit: 1000 });
      
      const stats = {
        totalProfiles: allProfiles.count,
        completeProfiles: 0,
        incompleteProfiles: 0,
        topCountries: {},
        topLanguages: {},
        ageDistribution: {
          '0-12': 0,
          '13-25': 0,
          '26-50': 0,
          '51+': 0
        }
      };

      allProfiles.documents.forEach(profile => {
        if (profile.profileComplete) {
          stats.completeProfiles++;
          
          // Count countries
          if (profile.location?.country) {
            stats.topCountries[profile.location.country] = (stats.topCountries[profile.location.country] || 0) + 1;
          }
          
          // Count languages
          if (profile.languages?.primary?.language) {
            stats.topLanguages[profile.languages.primary.language] = (stats.topLanguages[profile.languages.primary.language] || 0) + 1;
          }
          
          // Age distribution
          if (profile.demographics?.age) {
            const age = profile.demographics.age;
            if (age <= 12) stats.ageDistribution['0-12']++;
            else if (age <= 25) stats.ageDistribution['13-25']++;
            else if (age <= 50) stats.ageDistribution['26-50']++;
            else stats.ageDistribution['51+']++;
          }
        } else {
          stats.incompleteProfiles++;
        }
      });

      console.log(`✓ Profile statistics calculated`);
      return stats;
      
    } catch (error) {
      console.error(`✗ Failed to get profile statistics:`, error.message);
      throw new Error(`Profile statistics failed: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const userProfileService = new UserProfileService();

module.exports = userProfileService;