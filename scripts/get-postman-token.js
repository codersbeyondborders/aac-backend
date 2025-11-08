#!/usr/bin/env node

/**
 * Get Firebase ID Token for Postman Testing
 * 
 * This script helps you get a Firebase ID token that can be used
 * in Postman for testing the Smart AAC API endpoints.
 */

const admin = require('firebase-admin');
const readline = require('readline');
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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(50));
  log(message, 'cyan');
  console.log('='.repeat(50));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function initializeFirebase() {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID,
      });
    }
    logSuccess('Firebase Admin SDK initialized');
    return true;
  } catch (error) {
    logError(`Failed to initialize Firebase: ${error.message}`);
    return false;
  }
}

async function createTestUser(email, password) {
  try {
    logInfo(`Creating test user: ${email}`);
    
    // Try to create the user
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: true,
      displayName: 'Postman Test User'
    });
    
    logSuccess(`Test user created with UID: ${userRecord.uid}`);
    return userRecord;
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      logWarning('User already exists, fetching existing user...');
      try {
        const existingUser = await admin.auth().getUserByEmail(email);
        logInfo(`Using existing user with UID: ${existingUser.uid}`);
        return existingUser;
      } catch (fetchError) {
        logError(`Failed to fetch existing user: ${fetchError.message}`);
        throw fetchError;
      }
    } else {
      logError(`Failed to create user: ${error.message}`);
      throw error;
    }
  }
}

async function generateCustomToken(uid) {
  try {
    logInfo('Generating custom token...');
    const customToken = await admin.auth().createCustomToken(uid);
    logSuccess('Custom token generated successfully');
    return customToken;
  } catch (error) {
    logError(`Failed to generate custom token: ${error.message}`);
    throw error;
  }
}

function displayTokenInstructions(customToken) {
  logHeader('🎯 POSTMAN SETUP INSTRUCTIONS');
  
  console.log('\n📋 Step 1: Copy the Custom Token');
  console.log('─'.repeat(30));
  log('Custom Token:', 'yellow');
  log(customToken, 'bright');
  
  console.log('\n🔄 Step 2: Exchange for ID Token');
  console.log('─'.repeat(35));
  logInfo('You need to exchange this custom token for an ID token using Firebase Auth SDK.');
  logInfo('Here are two methods:');
  
  console.log('\n📱 Method A: Use Firebase Web SDK');
  console.log('─'.repeat(32));
  console.log(`
${colors.cyan}// In browser console or Node.js script:${colors.reset}
import { getAuth, signInWithCustomToken } from 'firebase/auth';

const auth = getAuth();
signInWithCustomToken(auth, '${customToken}')
  .then((userCredential) => {
    return userCredential.user.getIdToken();
  })
  .then((idToken) => {
    console.log('ID Token for Postman:', idToken);
    // Copy this ID token to Postman's authToken variable
  });
`);

  console.log('\n🛠️  Method B: Use the Test API Script');
  console.log('─'.repeat(35));
  log('npm run test:api', 'green');
  logInfo('This script will show you the ID token being used for API calls.');
  
  console.log('\n📮 Step 3: Set Token in Postman');
  console.log('─'.repeat(32));
  logInfo('1. Open Postman');
  logInfo('2. Select "Smart AAC - Development" environment');
  logInfo('3. Set the "authToken" variable to your ID token');
  logInfo('4. Save the environment');
  
  console.log('\n⏰ Important Notes');
  console.log('─'.repeat(17));
  logWarning('• Custom tokens are valid for 1 hour');
  logWarning('• ID tokens are also valid for 1 hour');
  logWarning('• Re-run this script when tokens expire');
  
  console.log('\n🧪 Testing');
  console.log('─'.repeat(10));
  logInfo('1. Start your backend: npm run dev');
  logInfo('2. Test health endpoint first: GET /health');
  logInfo('3. Test authenticated endpoint: GET /api/v1/profile/status');
}

async function main() {
  try {
    logHeader('🔐 Smart AAC API - Postman Token Generator');
    
    // Initialize Firebase
    const firebaseReady = await initializeFirebase();
    if (!firebaseReady) {
      process.exit(1);
    }
    
    // Get user input
    console.log('\n📝 User Information');
    console.log('─'.repeat(20));
    
    const email = await askQuestion('Enter test user email (default: postman-test@example.com): ') 
      || 'postman-test@example.com';
    
    const password = await askQuestion('Enter test user password (default: postman123): ') 
      || 'postman123';
    
    // Create or get test user
    const userRecord = await createTestUser(email, password);
    
    // Generate custom token
    const customToken = await generateCustomToken(userRecord.uid);
    
    // Display instructions
    displayTokenInstructions(customToken);
    
    logHeader('✅ Token Generation Complete');
    logSuccess('Your custom token is ready for use!');
    logInfo('Follow the instructions above to get your ID token for Postman.');
    
  } catch (error) {
    logError(`Script failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n\n👋 Script interrupted by user');
  rl.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };