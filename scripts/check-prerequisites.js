#!/usr/bin/env node

/**
 * Prerequisites Checker for Smart AAC API
 * 
 * This script checks if all required tools and configurations
 * are in place for local development.
 */

const fs = require('fs');
const { execSync } = require('child_process');
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

function checkCommand(command, name) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    log(`✓ ${name} is installed`, colors.green);
    return true;
  } catch (error) {
    log(`✗ ${name} is not installed`, colors.red);
    return false;
  }
}

function checkFile(filePath, name) {
  if (fs.existsSync(filePath)) {
    log(`✓ ${name} exists`, colors.green);
    return true;
  } else {
    log(`✗ ${name} not found`, colors.red);
    return false;
  }
}

function checkEnvironmentVariable(varName, description) {
  if (process.env[varName]) {
    log(`✓ ${description} is set`, colors.green);
    return true;
  } else {
    log(`✗ ${description} is not set`, colors.red);
    return false;
  }
}

async function checkGoogleCloudAuth() {
  try {
    const output = execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (output.trim()) {
      log(`✓ Google Cloud authenticated as: ${output.trim()}`, colors.green);
      return true;
    } else {
      log('✗ Not authenticated with Google Cloud', colors.red);
      return false;
    }
  } catch (error) {
    log('✗ Google Cloud CLI not working or not authenticated', colors.red);
    return false;
  }
}

async function checkFirebaseProject() {
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    return false;
  }

  try {
    execSync(`gcloud projects describe ${process.env.GOOGLE_CLOUD_PROJECT}`, { 
      stdio: 'ignore' 
    });
    log(`✓ Google Cloud project '${process.env.GOOGLE_CLOUD_PROJECT}' exists`, colors.green);
    return true;
  } catch (error) {
    log(`✗ Google Cloud project '${process.env.GOOGLE_CLOUD_PROJECT}' not found or no access`, colors.red);
    return false;
  }
}

async function checkRequiredAPIs() {
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    return false;
  }

  const requiredAPIs = [
    'firestore.googleapis.com',
    'storage.googleapis.com',
    'aiplatform.googleapis.com'
  ];

  let allEnabled = true;

  for (const api of requiredAPIs) {
    try {
      execSync(`gcloud services list --enabled --filter="name:${api}" --format="value(name)" --project=${process.env.GOOGLE_CLOUD_PROJECT}`, { 
        stdio: 'ignore' 
      });
      log(`✓ ${api} is enabled`, colors.green);
    } catch (error) {
      log(`✗ ${api} is not enabled`, colors.red);
      allEnabled = false;
    }
  }

  return allEnabled;
}

async function main() {
  log('🔍 Smart AAC API Prerequisites Check', colors.bright + colors.cyan);
  log('=====================================', colors.cyan);
  log('');

  let allGood = true;

  // Check Node.js and npm
  log('📦 Checking Development Tools', colors.bright + colors.blue);
  log('------------------------------', colors.blue);
  allGood &= checkCommand('node', 'Node.js');
  allGood &= checkCommand('npm', 'npm');
  allGood &= checkCommand('curl', 'curl');
  
  // Check Node.js version
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    if (majorVersion >= 18) {
      log(`✓ Node.js version ${nodeVersion} (>= 18 required)`, colors.green);
    } else {
      log(`✗ Node.js version ${nodeVersion} (>= 18 required)`, colors.red);
      allGood = false;
    }
  } catch (error) {
    log('✗ Could not check Node.js version', colors.red);
    allGood = false;
  }

  log('');

  // Check Google Cloud tools
  log('☁️  Checking Google Cloud Setup', colors.bright + colors.blue);
  log('--------------------------------', colors.blue);
  allGood &= checkCommand('gcloud', 'Google Cloud CLI');
  allGood &= checkCommand('gsutil', 'Google Cloud Storage CLI');
  
  if (checkCommand('gcloud', 'Google Cloud CLI (recheck)')) {
    allGood &= await checkGoogleCloudAuth();
  }

  log('');

  // Check configuration files
  log('📄 Checking Configuration Files', colors.bright + colors.blue);
  log('--------------------------------', colors.blue);
  allGood &= checkFile('.env', '.env file');
  allGood &= checkFile('package.json', 'package.json');
  
  // Check service account key if specified
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    allGood &= checkFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'Service Account Key');
  }

  log('');

  // Check environment variables
  log('🔧 Checking Environment Variables', colors.bright + colors.blue);
  log('----------------------------------', colors.blue);
  allGood &= checkEnvironmentVariable('GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT');
  allGood &= checkEnvironmentVariable('FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID');
  allGood &= checkEnvironmentVariable('VERTEX_AI_LOCATION', 'VERTEX_AI_LOCATION');
  allGood &= checkEnvironmentVariable('STORAGE_BUCKET_NAME', 'STORAGE_BUCKET_NAME');

  log('');

  // Check Google Cloud project and APIs
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    log('🌐 Checking Google Cloud Project', colors.bright + colors.blue);
    log('---------------------------------', colors.blue);
    allGood &= await checkFirebaseProject();
    allGood &= await checkRequiredAPIs();
    log('');
  }

  // Check dependencies
  log('📚 Checking Dependencies', colors.bright + colors.blue);
  log('-------------------------', colors.blue);
  if (checkFile('node_modules', 'node_modules directory')) {
    log('✓ Dependencies appear to be installed', colors.green);
  } else {
    log('✗ Dependencies not installed. Run: npm install', colors.red);
    allGood = false;
  }

  log('');

  // Summary
  log('📊 Prerequisites Summary', colors.bright + colors.magenta);
  log('========================', colors.magenta);
  
  if (allGood) {
    log('🎉 All prerequisites are met! You can start local development.', colors.bright + colors.green);
    log('');
    log('Next steps:', colors.bright);
    log('1. npm run dev          # Start the development server', colors.cyan);
    log('2. npm run setup:test   # Set up test users and data', colors.cyan);
    log('3. npm run test:api     # Test all API endpoints', colors.cyan);
  } else {
    log('⚠️  Some prerequisites are missing. Please address the issues above.', colors.bright + colors.yellow);
    log('');
    log('Common fixes:', colors.bright);
    log('• Install missing tools (Node.js, Google Cloud CLI)', colors.yellow);
    log('• Run: gcloud auth login', colors.yellow);
    log('• Create .env file from .env.example', colors.yellow);
    log('• Run: npm install', colors.yellow);
    log('• Enable required Google Cloud APIs', colors.yellow);
  }

  process.exit(allGood ? 0 : 1);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  log('Smart AAC API Prerequisites Checker', colors.bright);
  log('');
  log('Usage: node scripts/check-prerequisites.js', colors.cyan);
  log('');
  log('This script checks if all required tools and configurations', colors.bright);
  log('are in place for local development of the Smart AAC API.', colors.bright);
  log('');
  log('It will verify:', colors.bright);
  log('• Development tools (Node.js, npm, curl)', colors.green);
  log('• Google Cloud CLI and authentication', colors.green);
  log('• Configuration files (.env, package.json)', colors.green);
  log('• Environment variables', colors.green);
  log('• Google Cloud project and API access', colors.green);
  log('• Installed dependencies', colors.green);
  process.exit(0);
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  });
}