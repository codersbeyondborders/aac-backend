#!/usr/bin/env node

/**
 * User Profile API Testing Script for Smart AAC API
 * 
 * This script specifically tests all user profile endpoints including:
 * - GET /api/v1/profile (get profile)
 * - POST /api/v1/profile (create profile)
 * - PUT /api/v1/profile/step/:step (update profile steps)
 * - GET /api/v1/profile/cultural-context (get cultural context)
 * - DELETE /api/v1/profile (delete profile)
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const TEST_TOKEN = process.env.TEST_TOKEN || null;

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

class UserProfileTester {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.axios = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0
    };

    // Test data for profile creation
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

    this.stepTestData = {
      location: {
        country: "Canada",
        region: "Ontario"
      },
      languages: {
        primary: {
          language: "French",
          dialect: "Canadian French"
        }
      },
      demographics: {
        age: 35,
        gender: "Male",
        religion: "Atheist",
        ethnicity: "Caucasian"
      }
    };
  }

  async testGetProfileNotFound() {
    log('\n👤 Testing Get Profile (Not Found)', colors.bright + colors.blue);
    log('================================', colors.blue);

    try {
      const response = await this.axios.get('/api/v1/profile');
      
      // If we get a 200, that means profile exists, which is fine
      if (response.status === 200) {
        logTest('Get Profile (Existing)', 'PASS', 'Profile already exists');
        this.testResults.passed++;
        return response.data.data; // Return existing profile
      } else {
        logTest('Get Profile (Not Found)', 'FAIL', `Unexpected status: ${response.status}`);
        this.testResults.failed++;
        return null;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        logTest('Get Profile (Not Found)', 'PASS', 'Correctly returned 404 for non-existent profile');
        this.testResults.passed++;
        return null;
      } else {
        logTest('Get Profile (Not Found)', 'FAIL', error.response?.data?.error || error.message);
        this.testResults.failed++;
        return null;
      }
    }
  }

  async testCreateProfile() {
    log('\n📝 Testing Create Profile', colors.bright + colors.blue);
    log('================================', colors.blue);

    try {
      const response = await this.axios.post('/api/v1/profile', this.testProfileData);
      
      if (response.status === 201 && response.data.success) {
        const profile = response.data.data;
        logTest('Create Profile', 'PASS', `Profile created with ID: ${profile.userId}`);
        
        // Validate profile structure
        if (profile.location && profile.languages && profile.demographics) {
          logTest('Profile Structure Validation', 'PASS', 'All required fields present');
          this.testResults.passed++;
        } else {
          logTest('Profile Structure Validation', 'FAIL', 'Missing required fields');
          this.testResults.failed++;
        }
        
        this.testResults.passed++;
        return profile;
      } else {
        logTest('Create Profile', 'FAIL', 'Invalid response format');
        this.testResults.failed++;
        return null;
      }
    } catch (error) {
      if (error.response?.status === 409) {
        logTest('Create Profile', 'PASS', 'Profile already exists (409 conflict)');
        this.testResults.passed++;
        // Try to get the existing profile
        try {
          const getResponse = await this.axios.get('/api/v1/profile');
          return getResponse.data.data;
        } catch (getError) {
          return null;
        }
      } else {
        logTest('Create Profile', 'FAIL', error.response?.data?.error || error.message);
        this.testResults.failed++;
        return null;
      }
    }
  }

  async testGetProfile() {
    log('\n📋 Testing Get Profile', colors.bright + colors.blue);
    log('================================', colors.blue);

    try {
      const response = await this.axios.get('/api/v1/profile');
      
      if (response.status === 200 && response.data.success) {
        const profile = response.data.data;
        logTest('Get Profile', 'PASS', `Retrieved profile for user: ${profile.userId}`);
        
        // Validate profile completeness
        if (profile.profileComplete !== undefined) {
          logTest('Profile Completeness Check', 'PASS', `Profile complete: ${profile.profileComplete}`);
          this.testResults.passed++;
        } else {
          logTest('Profile Completeness Check', 'FAIL', 'Missing profileComplete field');
          this.testResults.failed++;
        }
        
        this.testResults.passed++;
        return profile;
      } else {
        logTest('Get Profile', 'FAIL', 'Invalid response format');
        this.testResults.failed++;
        return null;
      }
    } catch (error) {
      logTest('Get Profile', 'FAIL', error.response?.data?.error || error.message);
      this.testResults.failed++;
      return null;
    }
  }

  async testUpdateProfileSteps() {
    log('\n🔄 Testing Profile Step Updates', colors.bright + colors.blue);
    log('================================', colors.blue);

    const steps = ['location', 'languages', 'demographics'];
    
    for (const step of steps) {
      try {
        const stepData = this.stepTestData[step];
        const response = await this.axios.put(`/api/v1/profile/step/${step}`, stepData);
        
        if (response.status === 200 && response.data.success) {
          const profile = response.data.data;
          logTest(`Update ${step} Step`, 'PASS', `Step updated, onboarding: ${profile.onboardingStep}`);
          this.testResults.passed++;
        } else {
          logTest(`Update ${step} Step`, 'FAIL', 'Invalid response format');
          this.testResults.failed++;
        }
      } catch (error) {
        logTest(`Update ${step} Step`, 'FAIL', error.response?.data?.error || error.message);
        this.testResults.failed++;
      }
    }
  }

  async testGetCulturalContext() {
    log('\n🌍 Testing Cultural Context', colors.bright + colors.blue);
    log('================================', colors.blue);

    try {
      const response = await this.axios.get('/api/v1/profile/cultural-context');
      
      if (response.status === 200 && response.data.success) {
        const context = response.data.data;
        logTest('Get Cultural Context', 'PASS', `Language: ${context.language}, Region: ${context.region}`);
        
        // Validate cultural context structure
        const requiredFields = ['language', 'region', 'country', 'symbolStyle'];
        const hasAllFields = requiredFields.every(field => context[field] !== undefined);
        
        if (hasAllFields) {
          logTest('Cultural Context Structure', 'PASS', 'All required fields present');
          this.testResults.passed++;
        } else {
          logTest('Cultural Context Structure', 'FAIL', 'Missing required fields');
          this.testResults.failed++;
        }
        
        this.testResults.passed++;
        return context;
      } else {
        logTest('Get Cultural Context', 'FAIL', 'Invalid response format');
        this.testResults.failed++;
        return null;
      }
    } catch (error) {
      logTest('Get Cultural Context', 'FAIL', error.response?.data?.error || error.message);
      this.testResults.failed++;
      return null;
    }
  }

  async testInvalidProfileData() {
    log('\n❌ Testing Invalid Data Handling', colors.bright + colors.blue);
    log('================================', colors.blue);

    // Test invalid profile creation
    try {
      await this.axios.post('/api/v1/profile', { invalid: 'data' });
      logTest('Invalid Profile Data', 'FAIL', 'Should have returned 400');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 409) {
        logTest('Invalid Profile Data', 'PASS', `Correctly returned ${error.response.status}`);
        this.testResults.passed++;
      } else {
        logTest('Invalid Profile Data', 'FAIL', `Unexpected status: ${error.response?.status}`);
        this.testResults.failed++;
      }
    }

    // Test invalid step
    try {
      await this.axios.put('/api/v1/profile/step/invalid-step', { data: 'test' });
      logTest('Invalid Step Name', 'FAIL', 'Should have returned 400');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 400) {
        logTest('Invalid Step Name', 'PASS', 'Correctly returned 400');
        this.testResults.passed++;
      } else {
        logTest('Invalid Step Name', 'FAIL', `Unexpected status: ${error.response?.status}`);
        this.testResults.failed++;
      }
    }

    // Test empty step data
    try {
      await this.axios.put('/api/v1/profile/step/location', {});
      logTest('Empty Step Data', 'FAIL', 'Should have returned 400');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 400) {
        logTest('Empty Step Data', 'PASS', 'Correctly returned 400');
        this.testResults.passed++;
      } else {
        logTest('Empty Step Data', 'FAIL', `Unexpected status: ${error.response?.status}`);
        this.testResults.failed++;
      }
    }
  }

  async testDeleteProfile() {
    log('\n🗑️  Testing Delete Profile', colors.bright + colors.blue);
    log('================================', colors.blue);

    try {
      const response = await this.axios.delete('/api/v1/profile');
      
      if (response.status === 200 && response.data.success) {
        logTest('Delete Profile', 'PASS', 'Profile deleted successfully');
        this.testResults.passed++;
        
        // Verify profile is actually deleted
        try {
          await this.axios.get('/api/v1/profile');
          logTest('Verify Profile Deletion', 'FAIL', 'Profile still exists after deletion');
          this.testResults.failed++;
        } catch (error) {
          if (error.response?.status === 404) {
            logTest('Verify Profile Deletion', 'PASS', 'Profile correctly deleted');
            this.testResults.passed++;
          } else {
            logTest('Verify Profile Deletion', 'FAIL', `Unexpected status: ${error.response?.status}`);
            this.testResults.failed++;
          }
        }
      } else {
        logTest('Delete Profile', 'FAIL', 'Invalid response format');
        this.testResults.failed++;
      }
    } catch (error) {
      logTest('Delete Profile', 'FAIL', error.response?.data?.error || error.message);
      this.testResults.failed++;
    }
  }

  async runAllTests() {
    log('👤 Smart AAC User Profile API Testing Suite', colors.bright + colors.cyan);
    log('=============================================', colors.cyan);
    log(`Base URL: ${this.baseUrl}`, colors.blue);
    log(`Authentication: ${this.token ? 'Enabled' : 'Disabled'}`, colors.blue);
    log('');

    if (!this.token) {
      log('❌ No authentication token provided!', colors.red);
      log('Please set TEST_TOKEN environment variable with a valid Firebase ID token.', colors.yellow);
      log('You can generate one using: node scripts/generate-test-token.js', colors.yellow);
      return false;
    }

    // Test sequence
    const existingProfile = await this.testGetProfileNotFound();
    
    if (!existingProfile) {
      await this.testCreateProfile();
    }
    
    await this.testGetProfile();
    await this.testUpdateProfileSteps();
    await this.testGetCulturalContext();
    await this.testInvalidProfileData();
    
    // Only delete if we created a profile during testing
    if (!existingProfile) {
      await this.testDeleteProfile();
    } else {
      log('\n🔒 Skipping Profile Deletion', colors.bright + colors.yellow);
      log('Profile existed before testing, preserving it.', colors.yellow);
      this.testResults.skipped++;
    }

    // Print summary
    log('\n📊 User Profile Test Results Summary', colors.bright + colors.magenta);
    log('====================================', colors.magenta);
    log(`✓ Passed: ${this.testResults.passed}`, colors.green);
    log(`✗ Failed: ${this.testResults.failed}`, colors.red);
    log(`⚠ Skipped: ${this.testResults.skipped}`, colors.yellow);
    
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : 0;
    
    log(`📈 Success Rate: ${successRate}%`, colors.cyan);
    
    if (this.testResults.failed === 0) {
      log('\n🎉 All user profile tests passed! Your API is working correctly.', colors.bright + colors.green);
    } else {
      log('\n⚠️  Some tests failed. Please check the output above for details.', colors.bright + colors.yellow);
    }

    return this.testResults.failed === 0;
  }
}

async function main() {
  const tester = new UserProfileTester(BASE_URL, TEST_TOKEN);
  
  try {
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(`\n💥 Testing failed with error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  log('Smart AAC User Profile API Testing Suite', colors.bright);
  log('');
  log('Usage: node scripts/test-user-profile.js [options]', colors.cyan);
  log('');
  log('Environment Variables:', colors.bright);
  log('  API_BASE_URL    Base URL for the API (default: http://localhost:8080)', colors.yellow);
  log('  TEST_TOKEN      Firebase ID token for authenticated tests (REQUIRED)', colors.yellow);
  log('');
  log('Options:', colors.bright);
  log('  --help, -h      Show this help message', colors.yellow);
  log('');
  log('This script tests all user profile endpoints:', colors.bright);
  log('• GET /api/v1/profile (get profile)', colors.green);
  log('• POST /api/v1/profile (create profile)', colors.green);
  log('• PUT /api/v1/profile/step/:step (update profile steps)', colors.green);
  log('• GET /api/v1/profile/cultural-context (get cultural context)', colors.green);
  log('• DELETE /api/v1/profile (delete profile)', colors.green);
  log('');
  log('Examples:', colors.bright);
  log('  TEST_TOKEN="your-firebase-token" node scripts/test-user-profile.js', colors.cyan);
  log('  API_BASE_URL="https://your-api.com" TEST_TOKEN="token" node scripts/test-user-profile.js', colors.cyan);
  process.exit(0);
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = UserProfileTester;