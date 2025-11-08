#!/usr/bin/env node

/**
 * Test Token Generator for Smart AAC API
 * 
 * This script helps generate Firebase custom tokens and create test users
 * for local development and testing.
 */

const admin = require('firebase-admin');
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

async function initializeFirebase() {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
      });
    }
    log('✓ Firebase Admin SDK initialized', colors.green);
    return true;
  } catch (error) {
    log(`✗ Failed to initialize Firebase: ${error.message}`, colors.red);
    return false;
  }
}

async function createTestUser(userId, email, password, displayName) {
  try {
    const userRecord = await admin.auth().createUser({
      uid: userId,
      email: email,
      displayName: displayName,
      password: password,
      emailVerified: true
    });
    
    log(`✓ Test user created: ${userRecord.uid}`, colors.green);
    return userRecord;
  } catch (error) {
    if (error.code === 'auth/uid-already-exists') {
      log(`⚠ Test user already exists: ${userId}`, colors.yellow);
      return await admin.auth().getUser(userId);
    } else {
      log(`✗ Error creating user: ${error.message}`, colors.red);
      throw error;
    }
  }
}

async function generateCustomToken(userId, claims = {}) {
  try {
    const customToken = await admin.auth().createCustomToken(userId, claims);
    log(`✓ Custom token generated for user: ${userId}`, colors.green);
    return customToken;
  } catch (error) {
    log(`✗ Error generating custom token: ${error.message}`, colors.red);
    throw error;
  }
}

async function createCultureProfile(userId) {
  try {
    const firestore = admin.firestore();
    const cultureProfile = {
      userId: userId,
      culturalPreferences: {
        language: 'en',
        region: 'US',
        symbolStyle: 'simple',
        colorPreferences: ['blue', 'green', 'yellow'],
        avoidColors: ['red'],
        culturalContext: 'Western',
        accessibilityNeeds: {
          highContrast: false,
          largeText: false,
          simplifiedIcons: true
        }
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await firestore.collection('users').doc(userId).collection('profile').doc('culture').set(cultureProfile);
    log(`✓ Culture profile created for user: ${userId}`, colors.green);
    return cultureProfile;
  } catch (error) {
    log(`✗ Error creating culture profile: ${error.message}`, colors.red);
    throw error;
  }
}

async function createSampleBoard(userId) {
  try {
    const firestore = admin.firestore();
    const sampleBoard = {
      name: 'Sample Communication Board',
      description: 'A sample board for testing the Smart AAC API',
      userId: userId,
      isPublic: false,
      icons: [
        {
          id: 'icon-1',
          text: 'Hello',
          imageUrl: null,
          position: { x: 0, y: 0 }
        },
        {
          id: 'icon-2',
          text: 'Thank you',
          imageUrl: null,
          position: { x: 1, y: 0 }
        },
        {
          id: 'icon-3',
          text: 'Help',
          imageUrl: null,
          position: { x: 0, y: 1 }
        }
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await firestore.collection('boards').add(sampleBoard);
    log(`✓ Sample board created with ID: ${docRef.id}`, colors.green);
    return { id: docRef.id, ...sampleBoard };
  } catch (error) {
    log(`✗ Error creating sample board: ${error.message}`, colors.red);
    throw error;
  }
}

async function main() {
  log('🚀 Smart AAC API Test Setup', colors.bright + colors.cyan);
  log('================================', colors.cyan);
  
  // Check environment variables
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    log('✗ GOOGLE_CLOUD_PROJECT environment variable not set', colors.red);
    log('Please set up your .env file first', colors.yellow);
    process.exit(1);
  }
  
  log(`Project ID: ${process.env.GOOGLE_CLOUD_PROJECT}`, colors.blue);
  log('');
  
  // Initialize Firebase
  const initialized = await initializeFirebase();
  if (!initialized) {
    process.exit(1);
  }
  
  try {
    // Create test users
    const testUsers = [
      {
        userId: 'test-user-1',
        email: 'testuser1@example.com',
        password: 'testpassword123',
        displayName: 'Test User 1'
      },
      {
        userId: 'test-user-2',
        email: 'testuser2@example.com',
        password: 'testpassword456',
        displayName: 'Test User 2'
      }
    ];
    
    log('Creating test users...', colors.bright);
    
    for (const userData of testUsers) {
      const user = await createTestUser(
        userData.userId,
        userData.email,
        userData.password,
        userData.displayName
      );
      
      // Generate custom token
      const customToken = await generateCustomToken(userData.userId, {
        email: userData.email,
        name: userData.displayName
      });
      
      // Create culture profile
      await createCultureProfile(userData.userId);
      
      // Create sample board
      await createSampleBoard(userData.userId);
      
      log('');
      log(`📋 Test User: ${userData.displayName}`, colors.bright + colors.magenta);
      log(`   Email: ${userData.email}`, colors.magenta);
      log(`   Password: ${userData.password}`, colors.magenta);
      log(`   Custom Token: ${customToken}`, colors.cyan);
      log('');
    }
    
    log('🎉 Test setup completed successfully!', colors.bright + colors.green);
    log('');
    log('Next steps:', colors.bright);
    log('1. Start your local server: npm run dev', colors.yellow);
    log('2. Test health endpoint: curl http://localhost:8080/health', colors.yellow);
    log('3. Use the custom tokens above for API testing', colors.yellow);
    log('4. Or use email/password to get ID tokens through Firebase Auth', colors.yellow);
    log('');
    log('💡 Pro tip: Save these tokens as environment variables for easy testing:', colors.blue);
    log(`export TEST_TOKEN_1="${testUsers[0].userId}"`, colors.cyan);
    log(`export TEST_TOKEN_2="${testUsers[1].userId}"`, colors.cyan);
    
  } catch (error) {
    log(`✗ Setup failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  log('Smart AAC API Test Setup', colors.bright);
  log('');
  log('Usage: node scripts/generate-test-token.js [options]', colors.cyan);
  log('');
  log('Options:', colors.bright);
  log('  --help, -h     Show this help message', colors.yellow);
  log('');
  log('This script will:', colors.bright);
  log('• Initialize Firebase Admin SDK', colors.green);
  log('• Create test users with known credentials', colors.green);
  log('• Generate custom tokens for API testing', colors.green);
  log('• Set up culture profiles for users', colors.green);
  log('• Create sample boards for testing', colors.green);
  log('');
  log('Make sure to set up your .env file before running this script.', colors.yellow);
  process.exit(0);
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  });
}

module.exports = {
  initializeFirebase,
  createTestUser,
  generateCustomToken,
  createCultureProfile,
  createSampleBoard
};