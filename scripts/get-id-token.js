#!/usr/bin/env node

/**
 * ID Token Generator for Smart AAC API Testing
 * 
 * This script exchanges Firebase custom tokens for ID tokens that can be used
 * to authenticate with your API endpoints.
 */

const axios = require('axios');
require('dotenv').config();

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

async function exchangeCustomTokenForIdToken(customToken) {
  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_WEB_API_KEY || 'AIzaSyDummyKeyForTesting'}`,
      {
        token: customToken,
        returnSecureToken: true
      }
    );
    
    return response.data.idToken;
  } catch (error) {
    log(`Error exchanging custom token: ${error.response?.data?.error?.message || error.message}`, colors.red);
    return null;
  }
}

async function signInWithEmailPassword(email, password) {
  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY || 'AIzaSyDummyKeyForTesting'}`,
      {
        email: email,
        password: password,
        returnSecureToken: true
      }
    );
    
    return response.data.idToken;
  } catch (error) {
    log(`Error signing in with email/password: ${error.response?.data?.error?.message || error.message}`, colors.red);
    return null;
  }
}

async function main() {
  log('🔑 Firebase ID Token Generator', colors.bright + colors.cyan);
  log('================================', colors.cyan);
  
  // Try to get ID token using email/password (more reliable for testing)
  log('Attempting to sign in with test user credentials...', colors.blue);
  
  // const testUsers = [
  //   { email: 'testuser1@example.com', password: 'testpassword123', name: 'Test User 1' },
  //   { email: 'testuser2@example.com', password: 'testpassword456', name: 'Test User 2' }
  // ];
  
    const testUsers = [
    { email: 'hello@gmail.com', password: 'Test@123', name: 'Test User 1' },
    { email: 'amir@gmail.com', password: 'Test@123', name: 'Test User 2' }
  ];

  for (const user of testUsers) {
    log(`\nTrying to get ID token for ${user.name}...`, colors.yellow);
    
    const idToken = await signInWithEmailPassword(user.email, user.password);
    
    if (idToken) {
      log(`✓ Successfully obtained ID token for ${user.name}`, colors.green);
      log(`Email: ${user.email}`, colors.cyan);
      log(`ID Token: ${idToken}`, colors.magenta);
      log('');
      log('💡 Use this token for API testing:', colors.bright);
      log(`export TEST_TOKEN="${idToken}"`, colors.cyan);
      log(`TEST_TOKEN="${idToken}" node scripts/test-user-profile.js`, colors.cyan);
      log('');
      
      // Test the token with a quick API call
      try {
        const testResponse = await axios.get('http://localhost:8080/api/v1/profile', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        log(`✓ Token validation successful - API responded with status ${testResponse.status}`, colors.green);
      } catch (error) {
        if (error.response?.status === 404) {
          log('✓ Token validation successful - Profile not found (expected for new user)', colors.green);
        } else {
          log(`⚠ Token validation warning - API responded with status ${error.response?.status}`, colors.yellow);
        }
      }
      
      return idToken; // Return the first successful token
    } else {
      log(`✗ Failed to get ID token for ${user.name}`, colors.red);
    }
  }
  
  log('\n❌ Could not obtain any valid ID tokens', colors.red);
  log('Make sure your Firebase project is properly configured and test users exist.', colors.yellow);
  return null;
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  log('Firebase ID Token Generator', colors.bright);
  log('');
  log('Usage: node scripts/get-id-token.js [options]', colors.cyan);
  log('');
  log('This script generates Firebase ID tokens for API testing by:', colors.bright);
  log('• Signing in with test user email/password', colors.green);
  log('• Returning a valid ID token for API authentication', colors.green);
  log('• Testing the token against your API', colors.green);
  log('');
  log('Options:', colors.bright);
  log('  --help, -h     Show this help message', colors.yellow);
  log('');
  log('The generated ID token can be used with:', colors.bright);
  log('  TEST_TOKEN="token" node scripts/test-user-profile.js', colors.cyan);
  process.exit(0);
}

// Run the main function
if (require.main === module) {
  main().then(token => {
    process.exit(token ? 0 : 1);
  }).catch(error => {
    log(`Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  });
}

module.exports = { exchangeCustomTokenForIdToken, signInWithEmailPassword };