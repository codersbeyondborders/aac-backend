#!/usr/bin/env node

/**
 * Direct User Profile Testing Script
 * 
 * This script tests user profile functionality by directly calling the service layer
 * instead of going through HTTP endpoints, which bypasses authentication issues.
 */

const path = require('path');
require('dotenv').config();

// Add the src directory to the module path
const srcPath = path.join(__dirname, '..', 'src');
process.env.NODE_PATH = srcPath;
require('module').Module._initPaths();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(testName, status, details = '') {
  const statusColor = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;
  const statusIcon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  
  log(`${statusIcon} ${testName}`, statusColor);
  if (details) {
    log(`   ${details}`, colors.cyan);
  }
}

class DirectProfileTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0
    };

    this.testUserId = 'test-user-direct-' + Date.now();
    
    // Test data
    this.testProfileData = {
      location: {
        country: "United States",
        region: "California"
      },
      languages: {
        primary: {
          language: "English",
          dialect: "American English"
        },
        secondary: {
          language: "Spanish",
          dialect: "Mexican Spanish"
        }
      },
      demographics: {
        age: 28,
        gender: "Non-binary",
        religion: "Buddhism",
        ethnicity: "Asian American"
      }
    };
  }

  async initializeServices() {
    try {
      // Initialize Firebase Admin (if not already done)
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
        });
      }

      // Initialize Firestore service
      const firestoreService = require('../src/services/firestore');
      await firestoreService.initialize();

      // Import the user profile service
      this.userProfileService = require('../src/services/userProfile');
      
      log('✓ Services initialized successfully', colors.green);
      return true;
    } catch (error) {
      log(`✗ Failed to initialize services: ${error.message}`, colors.red);
      return false;
    }
  }

  async testCreateProfile() {
    log('\n📝 Testing Create Profile (Direct)', colors.bright + colors.blue);
    log('================================', colors.blue);

    try {
      const profile = await this.userProfileService.createProfile(this.testUserId, this.testProfileData);
      
      if (profile && profile.userId === this.testUserId) {
        logTest('Create Profile', 'PASS', `Profile created for user: ${profile.userId}`);
        
        // Validate structure
        if (profile.location && profile.languages && profile.demographics) {
          logTest('Profile Structure', 'PASS', 'All required fields present');
          this.testResults.passed++;
        } else {
          logTest('Profile Structure', 'FAIL', 'Missing required fields');
          this.testResults.failed++;
        }
        
        this.testResults.passed++;
        return profile;
      } else {
        logTest('Create Profile', 'FAIL', 'Invalid profile returned');
        this.testResults.failed++;
        return null;
      }
    } catch (error) {
      if (error.message.includes('already exists')) {
        logTest('Create Profile', 'PASS', 'Profile already exists (expected behavior)');
        this.testResults.passed++;
        // Try to get existing profile
        try {
          return await this.userProfileService.getProfile(this.testUserId);
        } catch (getError) {
          return null;
        }
      } else {
        logTest('Create Profile', 'FAIL', error.message);
        this.testResults.failed++;
        return null;
      }
    }
  }

  async testGetProfile() {
    log('\n📋 Testing Get Profile (Direct)', colors.bright + colors.blue);
    log('================================', colors.blue);

    try {
      const profile = await this.userProfileService.getProfile(this.testUserId);
      
      if (profile) {
        logTest('Get Profile', 'PASS', `Retrieved profile for: ${profile.userId}`);
        
        // Check profile completeness
        if (typeof profile.profileComplete === 'boolean') {
          logTest('Profile Completeness', 'PASS', `Complete: ${profile.profileComplete}`);
          this.testResults.passed++;
        } else {
          logTest('Profile Completeness', 'FAIL', 'Missing profileComplete field');
          this.testResults.failed++;
        }
        
        this.testResults.passed++;
        return profile;
      } else {
        logTest('Get Profile', 'FAIL', 'No profile returned');
        this.testResults.failed++;
        return null;
      }
    } catch (error) {
      logTest('Get Profile', 'FAIL', error.message);
      this.testResults.failed++;
      return null;
    }
  }

  async testUpdateProfileSteps() {
    log('\n🔄 Testing Profile Step Updates (Direct)', colors.bright + colors.blue);
    log('================================', colors.blue);

    const steps = [
      { name: 'location', data: { country: "Canada", region: "Ontario" } },
      { name: 'languages', data: { primary: { language: "French", dialect: "Canadian French" } } },
      { name: 'demographics', data: { age: 35, gender: "Male" } }
    ];

    for (const step of steps) {
      try {
        const updatedProfile = await this.userProfileService.updateProfileStep(
          this.testUserId, 
          step.name, 
          step.data
        );
        
        if (updatedProfile) {
          logTest(`Update ${step.name} Step`, 'PASS', `Onboarding step: ${updatedProfile.onboardingStep}`);
          this.testResults.passed++;
        } else {
          logTest(`Update ${step.name} Step`, 'FAIL', 'No profile returned');
          this.testResults.failed++;
        }
      } catch (error) {
        logTest(`Update ${step.name} Step`, 'FAIL', error.message);
        this.testResults.failed++;
      }
    }
  }

  async testGetCulturalContext() {
    log('\n🌍 Testing Cultural Context (Direct)', colors.bright + colors.blue);
    log('================================', colors.blue);

    try {
      const context = await this.userProfileService.getCulturalContext(this.testUserId);
      
      if (context) {
        logTest('Get Cultural Context', 'PASS', `Language: ${context.language}, Region: ${context.region}`);
        
        // Validate structure
        const requiredFields = ['language', 'region', 'country'];
        const hasRequiredFields = requiredFields.every(field => context[field] !== undefined);
        
        if (hasRequiredFields) {
          logTest('Cultural Context Structure', 'PASS', 'Required fields present');
          this.testResults.passed++;
        } else {
          logTest('Cultural Context Structure', 'FAIL', 'Missing required fields');
          this.testResults.failed++;
        }
        
        this.testResults.passed++;
        return context;
      } else {
        logTest('Get Cultural Context', 'FAIL', 'No context returned');
        this.testResults.failed++;
        return null;
      }
    } catch (error) {
      logTest('Get Cultural Context', 'FAIL', error.message);
      this.testResults.failed++;
      return null;
    }
  }

  async testInvalidData() {
    log('\n❌ Testing Invalid Data Handling (Direct)', colors.bright + colors.blue);
    log('================================', colors.blue);

    // Test invalid profile data
    try {
      await this.userProfileService.createProfile('invalid-user-' + Date.now(), { invalid: 'data' });
      logTest('Invalid Profile Data', 'FAIL', 'Should have thrown an error');
      this.testResults.failed++;
    } catch (error) {
      logTest('Invalid Profile Data', 'PASS', 'Correctly rejected invalid data');
      this.testResults.passed++;
    }

    // Test invalid step
    try {
      await this.userProfileService.updateProfileStep(this.testUserId, 'invalid-step', { data: 'test' });
      logTest('Invalid Step Name', 'FAIL', 'Should have thrown an error');
      this.testResults.failed++;
    } catch (error) {
      logTest('Invalid Step Name', 'PASS', 'Correctly rejected invalid step');
      this.testResults.passed++;
    }
  }

  async testProfileStatus() {
    log('\n📊 Testing Profile Status (Direct)', colors.bright + colors.blue);
    log('================================', colors.blue);

    try {
      const status = await this.userProfileService.getProfileStatus(this.testUserId);
      
      if (status && typeof status.profileExists === 'boolean') {
        logTest('Get Profile Status', 'PASS', `Exists: ${status.profileExists}, Complete: ${status.isComplete}`);
        
        // Validate status structure
        const requiredFields = ['profileExists', 'isComplete', 'currentStep', 'completionPercentage', 'missingFields', 'nextStep'];
        const hasAllFields = requiredFields.every(field => status[field] !== undefined);
        
        if (hasAllFields) {
          logTest('Status Structure', 'PASS', `Completion: ${status.completionPercentage}%, Next: ${status.nextStep}`);
          this.testResults.passed++;
        } else {
          logTest('Status Structure', 'FAIL', 'Missing required status fields');
          this.testResults.failed++;
        }
        
        this.testResults.passed++;
        return status;
      } else {
        logTest('Get Profile Status', 'FAIL', 'Invalid status returned');
        this.testResults.failed++;
        return null;
      }
    } catch (error) {
      logTest('Get Profile Status', 'FAIL', error.message);
      this.testResults.failed++;
      return null;
    }
  }

  async testCompleteProfileUpdate() {
    log('\n🔄 Testing Complete Profile Update (Direct)', colors.bright + colors.blue);
    log('================================', colors.blue);

    const updateData = {
      location: {
        country: "Australia",
        region: "New South Wales"
      },
      languages: {
        primary: {
          language: "English",
          dialect: "Australian English"
        }
      },
      demographics: {
        age: 40,
        gender: "Female",
        religion: "None",
        ethnicity: "European Australian"
      }
    };

    try {
      const updatedProfile = await this.userProfileService.updateCompleteProfile(this.testUserId, updateData);
      
      if (updatedProfile && updatedProfile.location.country === "Australia") {
        logTest('Update Complete Profile', 'PASS', `Updated to: ${updatedProfile.location.country}`);
        this.testResults.passed++;
        return updatedProfile;
      } else {
        logTest('Update Complete Profile', 'FAIL', 'Profile not updated correctly');
        this.testResults.failed++;
        return null;
      }
    } catch (error) {
      logTest('Update Complete Profile', 'FAIL', error.message);
      this.testResults.failed++;
      return null;
    }
  }

  async testProfileSectionUpdates() {
    log('\n🎯 Testing Profile Section Updates (Direct)', colors.bright + colors.blue);
    log('================================', colors.blue);

    const sections = [
      { 
        name: 'location', 
        data: { country: "New Zealand", region: "Auckland" } 
      },
      { 
        name: 'languages', 
        data: { 
          primary: { language: "English", dialect: "New Zealand English" },
          secondary: { language: "Maori", dialect: "Te Reo Maori" }
        } 
      },
      { 
        name: 'demographics', 
        data: { age: 45, gender: "Other", religion: "Spiritual", ethnicity: "Maori" } 
      }
    ];

    for (const section of sections) {
      try {
        const updatedProfile = await this.userProfileService.updateProfileSection(
          this.testUserId, 
          section.name, 
          section.data
        );
        
        if (updatedProfile) {
          logTest(`Update ${section.name} Section`, 'PASS', `Section updated successfully`);
          this.testResults.passed++;
        } else {
          logTest(`Update ${section.name} Section`, 'FAIL', 'No profile returned');
          this.testResults.failed++;
        }
      } catch (error) {
        logTest(`Update ${section.name} Section`, 'FAIL', error.message);
        this.testResults.failed++;
      }
    }
  }

  async testProfileValidation() {
    log('\n✅ Testing Profile Validation (Direct)', colors.bright + colors.blue);
    log('================================', colors.blue);

    // Test valid data
    const validData = {
      location: { country: "Japan", region: "Tokyo" },
      languages: { 
        primary: { language: "Japanese", dialect: "Standard Japanese" }
      },
      demographics: { age: 25, gender: "Male" }
    };

    try {
      const validResult = await this.userProfileService.validateProfileData(validData);
      
      if (validResult.valid === true) {
        logTest('Valid Data Validation', 'PASS', 'Correctly validated valid data');
        this.testResults.passed++;
      } else {
        logTest('Valid Data Validation', 'FAIL', `Should be valid: ${validResult.errors.join(', ')}`);
        this.testResults.failed++;
      }
    } catch (error) {
      logTest('Valid Data Validation', 'FAIL', error.message);
      this.testResults.failed++;
    }

    // Test invalid data
    const invalidData = {
      location: { country: "", region: "Tokyo" }, // Empty country
      languages: { 
        primary: { language: "", dialect: "Standard Japanese" } // Empty language
      }
    };

    try {
      const invalidResult = await this.userProfileService.validateProfileData(invalidData);
      
      if (invalidResult.valid === false && invalidResult.errors.length > 0) {
        logTest('Invalid Data Validation', 'PASS', `Correctly rejected invalid data (${invalidResult.errors.length} errors)`);
        this.testResults.passed++;
      } else {
        logTest('Invalid Data Validation', 'FAIL', 'Should have rejected invalid data');
        this.testResults.failed++;
      }
    } catch (error) {
      logTest('Invalid Data Validation', 'FAIL', error.message);
      this.testResults.failed++;
    }
  }

  async testDeleteProfile() {
    log('\n🗑️  Testing Delete Profile (Direct)', colors.bright + colors.blue);
    log('================================', colors.blue);

    try {
      const success = await this.userProfileService.deleteProfile(this.testUserId);
      
      if (success) {
        logTest('Delete Profile', 'PASS', 'Profile deleted successfully');
        this.testResults.passed++;
        
        // Verify deletion
        try {
          const deletedProfile = await this.userProfileService.getProfile(this.testUserId);
          if (!deletedProfile) {
            logTest('Verify Deletion', 'PASS', 'Profile correctly deleted');
            this.testResults.passed++;
          } else {
            logTest('Verify Deletion', 'FAIL', 'Profile still exists');
            this.testResults.failed++;
          }
        } catch (error) {
          logTest('Verify Deletion', 'PASS', 'Profile not found (correctly deleted)');
          this.testResults.passed++;
        }
      } else {
        logTest('Delete Profile', 'FAIL', 'Delete operation returned false');
        this.testResults.failed++;
      }
    } catch (error) {
      logTest('Delete Profile', 'FAIL', error.message);
      this.testResults.failed++;
    }
  }

  async runAllTests() {
    log('👤 Smart AAC User Profile Service Testing (Direct)', colors.bright + colors.cyan);
    log('==================================================', colors.cyan);
    log(`Test User ID: ${this.testUserId}`, colors.blue);
    log('');

    // Initialize services
    const initialized = await this.initializeServices();
    if (!initialized) {
      return false;
    }

    // Run tests
    await this.testCreateProfile();
    await this.testGetProfile();
    await this.testProfileStatus();
    await this.testUpdateProfileSteps();
    await this.testCompleteProfileUpdate();
    await this.testProfileSectionUpdates();
    await this.testGetCulturalContext();
    await this.testProfileValidation();
    await this.testInvalidData();
    await this.testDeleteProfile();

    // Print summary
    log('\n📊 Direct Profile Test Results Summary', colors.bright + colors.magenta);
    log('======================================', colors.magenta);
    log(`✓ Passed: ${this.testResults.passed}`, colors.green);
    log(`✗ Failed: ${this.testResults.failed}`, colors.red);
    log(`⚠ Skipped: ${this.testResults.skipped}`, colors.yellow);
    
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : 0;
    
    log(`📈 Success Rate: ${successRate}%`, colors.cyan);
    
    if (this.testResults.failed === 0) {
      log('\n🎉 All direct service tests passed! Your user profile service is working correctly.', colors.bright + colors.green);
    } else {
      log('\n⚠️  Some tests failed. Please check the output above for details.', colors.bright + colors.yellow);
    }

    return this.testResults.failed === 0;
  }
}

async function main() {
  const tester = new DirectProfileTester();
  
  try {
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(`\n💥 Testing failed with error: ${error.message}`, colors.red);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  log('Smart AAC User Profile Service Testing (Direct)', colors.bright);
  log('');
  log('Usage: node scripts/test-profile-direct.js [options]', colors.cyan);
  log('');
  log('This script tests user profile functionality by calling services directly:', colors.bright);
  log('• Create profile', colors.green);
  log('• Get profile', colors.green);
  log('• Update profile steps', colors.green);
  log('• Get cultural context', colors.green);
  log('• Delete profile', colors.green);
  log('• Error handling', colors.green);
  log('');
  log('Options:', colors.bright);
  log('  --help, -h     Show this help message', colors.yellow);
  process.exit(0);
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = DirectProfileTester;