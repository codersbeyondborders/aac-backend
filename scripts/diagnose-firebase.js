#!/usr/bin/env node

/**
 * Firebase Configuration Diagnostic Script
 * 
 * This script helps diagnose Firebase configuration issues
 * and provides step-by-step guidance to fix them.
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

function logIssue(issue, solution) {
  log(`❌ Issue: ${issue}`, colors.red);
  log(`💡 Solution: ${solution}`, colors.yellow);
  log('');
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

class FirebaseDiagnostic {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.config = {};
  }

  checkEnvironmentVariables() {
    log('🔍 Checking Environment Variables', colors.bright + colors.blue);
    log('==================================', colors.blue);

    const requiredVars = [
      'GOOGLE_CLOUD_PROJECT',
      'FIREBASE_PROJECT_ID',
      'GOOGLE_APPLICATION_CREDENTIALS'
    ];

    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        this.issues.push({
          type: 'missing_env_var',
          variable: varName,
          message: `${varName} is not set or empty`
        });
        log(`❌ ${varName}: Not set`, colors.red);
      } else {
        log(`✅ ${varName}: ${value}`, colors.green);
        this.config[varName] = value;
      }
    }

    // Check if project IDs match
    if (this.config.GOOGLE_CLOUD_PROJECT && this.config.FIREBASE_PROJECT_ID) {
      if (this.config.GOOGLE_CLOUD_PROJECT !== this.config.FIREBASE_PROJECT_ID) {
        this.warnings.push({
          type: 'project_id_mismatch',
          message: 'GOOGLE_CLOUD_PROJECT and FIREBASE_PROJECT_ID are different'
        });
        logWarning('Project IDs don\'t match - this might be intentional if using different projects');
      }
    }

    log('');
  }

  checkServiceAccountKey() {
    log('🔑 Checking Service Account Key', colors.bright + colors.blue);
    log('===============================', colors.blue);

    const keyPath = this.config.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!keyPath) {
      this.issues.push({
        type: 'missing_service_key_path',
        message: 'GOOGLE_APPLICATION_CREDENTIALS path not set'
      });
      log('❌ Service account key path not configured', colors.red);
      log('');
      return;
    }

    // Check if file exists
    if (!fs.existsSync(keyPath)) {
      this.issues.push({
        type: 'service_key_not_found',
        path: keyPath,
        message: `Service account key file not found at: ${keyPath}`
      });
      log(`❌ Service account key file not found: ${keyPath}`, colors.red);
      log('');
      return;
    }

    // Check if file is readable and valid JSON
    try {
      const keyContent = fs.readFileSync(keyPath, 'utf8');
      const keyData = JSON.parse(keyContent);
      
      // Validate key structure
      const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
      const missingFields = requiredFields.filter(field => !keyData[field]);
      
      if (missingFields.length > 0) {
        this.issues.push({
          type: 'invalid_service_key',
          missingFields,
          message: `Service account key is missing required fields: ${missingFields.join(', ')}`
        });
        log(`❌ Invalid service account key - missing fields: ${missingFields.join(', ')}`, colors.red);
      } else {
        logSuccess(`Service account key is valid`);
        log(`   Project ID in key: ${keyData.project_id}`, colors.cyan);
        log(`   Client email: ${keyData.client_email}`, colors.cyan);
        
        // Check if project ID in key matches environment
        if (keyData.project_id !== this.config.GOOGLE_CLOUD_PROJECT) {
          this.warnings.push({
            type: 'key_project_mismatch',
            keyProjectId: keyData.project_id,
            envProjectId: this.config.GOOGLE_CLOUD_PROJECT,
            message: 'Project ID in service key doesn\'t match GOOGLE_CLOUD_PROJECT'
          });
          logWarning(`Project ID mismatch: key has '${keyData.project_id}', env has '${this.config.GOOGLE_CLOUD_PROJECT}'`);
        }
      }
    } catch (error) {
      this.issues.push({
        type: 'service_key_parse_error',
        error: error.message,
        message: `Cannot parse service account key: ${error.message}`
      });
      log(`❌ Cannot parse service account key: ${error.message}`, colors.red);
    }

    log('');
  }

  checkGoogleCloudCLI() {
    log('☁️  Checking Google Cloud CLI', colors.bright + colors.blue);
    log('=============================', colors.blue);

    try {
      // Check if gcloud is installed
      execSync('which gcloud', { stdio: 'ignore' });
      logSuccess('Google Cloud CLI is installed');

      // Check authentication
      try {
        const activeAccount = execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', { 
          encoding: 'utf8',
          stdio: 'pipe'
        }).trim();

        if (activeAccount) {
          logSuccess(`Authenticated as: ${activeAccount}`);
        } else {
          this.issues.push({
            type: 'gcloud_not_authenticated',
            message: 'Not authenticated with Google Cloud CLI'
          });
          log('❌ Not authenticated with Google Cloud CLI', colors.red);
        }
      } catch (error) {
        this.issues.push({
          type: 'gcloud_auth_check_failed',
          error: error.message,
          message: 'Cannot check Google Cloud CLI authentication'
        });
        log(`❌ Cannot check authentication: ${error.message}`, colors.red);
      }

      // Check current project
      try {
        const currentProject = execSync('gcloud config get-value project', { 
          encoding: 'utf8',
          stdio: 'pipe'
        }).trim();

        if (currentProject && currentProject !== '(unset)') {
          log(`   Current project: ${currentProject}`, colors.cyan);
          
          if (currentProject !== this.config.GOOGLE_CLOUD_PROJECT) {
            this.warnings.push({
              type: 'gcloud_project_mismatch',
              currentProject,
              envProject: this.config.GOOGLE_CLOUD_PROJECT,
              message: 'gcloud current project doesn\'t match environment variable'
            });
            logWarning(`Project mismatch: gcloud has '${currentProject}', env has '${this.config.GOOGLE_CLOUD_PROJECT}'`);
          }
        } else {
          this.warnings.push({
            type: 'gcloud_no_project',
            message: 'No default project set in gcloud'
          });
          logWarning('No default project set in gcloud');
        }
      } catch (error) {
        logWarning(`Cannot check current project: ${error.message}`);
      }

    } catch (error) {
      this.issues.push({
        type: 'gcloud_not_installed',
        message: 'Google Cloud CLI is not installed'
      });
      log('❌ Google Cloud CLI is not installed', colors.red);
    }

    log('');
  }

  checkFirebaseProject() {
    log('🔥 Checking Firebase Project Access', colors.bright + colors.blue);
    log('==================================', colors.blue);

    const projectId = this.config.GOOGLE_CLOUD_PROJECT || this.config.FIREBASE_PROJECT_ID;
    
    if (!projectId) {
      log('❌ No project ID available to check', colors.red);
      log('');
      return;
    }

    try {
      // Check if project exists and is accessible
      execSync(`gcloud projects describe ${projectId}`, { 
        stdio: 'ignore' 
      });
      logSuccess(`Project '${projectId}' exists and is accessible`);

      // Check if Firestore API is enabled
      try {
        const enabledServices = execSync(`gcloud services list --enabled --filter="name:firestore.googleapis.com" --format="value(name)" --project=${projectId}`, { 
          encoding: 'utf8',
          stdio: 'pipe'
        }).trim();

        if (enabledServices) {
          logSuccess('Firestore API is enabled');
        } else {
          this.issues.push({
            type: 'firestore_api_not_enabled',
            projectId,
            message: `Firestore API is not enabled for project ${projectId}`
          });
          log('❌ Firestore API is not enabled', colors.red);
        }
      } catch (error) {
        logWarning(`Cannot check Firestore API status: ${error.message}`);
      }

    } catch (error) {
      this.issues.push({
        type: 'project_not_accessible',
        projectId,
        error: error.message,
        message: `Cannot access project '${projectId}': ${error.message}`
      });
      log(`❌ Cannot access project '${projectId}': ${error.message}`, colors.red);
    }

    log('');
  }

  generateSolutions() {
    log('💡 Solutions and Recommendations', colors.bright + colors.magenta);
    log('=================================', colors.magenta);

    if (this.issues.length === 0 && this.warnings.length === 0) {
      log('🎉 No issues found! Your Firebase configuration looks good.', colors.bright + colors.green);
      return;
    }

    // Group issues by type and provide solutions
    const solutions = new Map();

    this.issues.forEach(issue => {
      switch (issue.type) {
        case 'missing_env_var':
          solutions.set('env_setup', {
            title: 'Environment Variables Setup',
            steps: [
              'Edit your .env file and set the missing variables:',
              '  GOOGLE_CLOUD_PROJECT=your-project-id',
              '  FIREBASE_PROJECT_ID=your-project-id (usually same as above)',
              '  GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json'
            ]
          });
          break;

        case 'service_key_not_found':
        case 'invalid_service_key':
          solutions.set('service_account', {
            title: 'Service Account Key Setup',
            steps: [
              '1. Go to Google Cloud Console → IAM & Admin → Service Accounts',
              '2. Create a new service account or select existing one',
              '3. Grant these roles:',
              '   - Firebase Admin SDK Administrator Service Agent',
              '   - Cloud Datastore User',
              '   - Storage Admin (if using Cloud Storage)',
              '4. Create and download a JSON key',
              '5. Save it as service-account-key.json in your project root',
              '6. Update GOOGLE_APPLICATION_CREDENTIALS in .env'
            ]
          });
          break;

        case 'gcloud_not_installed':
          solutions.set('gcloud_install', {
            title: 'Install Google Cloud CLI',
            steps: [
              '1. Visit: https://cloud.google.com/sdk/docs/install',
              '2. Download and install for your operating system',
              '3. Run: gcloud init',
              '4. Authenticate: gcloud auth login'
            ]
          });
          break;

        case 'gcloud_not_authenticated':
          solutions.set('gcloud_auth', {
            title: 'Authenticate Google Cloud CLI',
            steps: [
              '1. Run: gcloud auth login',
              '2. Follow the browser authentication flow',
              '3. Set your project: gcloud config set project YOUR_PROJECT_ID'
            ]
          });
          break;

        case 'firestore_api_not_enabled':
          solutions.set('enable_apis', {
            title: 'Enable Required APIs',
            steps: [
              '1. Run these commands:',
              `   gcloud services enable firestore.googleapis.com --project=${issue.projectId}`,
              `   gcloud services enable firebase.googleapis.com --project=${issue.projectId}`,
              '2. Or enable via Google Cloud Console → APIs & Services → Library'
            ]
          });
          break;

        case 'project_not_accessible':
          solutions.set('project_access', {
            title: 'Project Access Issues',
            steps: [
              '1. Verify the project ID is correct',
              '2. Ensure you have access to the project',
              '3. Check if the project exists in Google Cloud Console',
              '4. If using a different project for Firebase, update FIREBASE_PROJECT_ID'
            ]
          });
          break;
      }
    });

    // Display solutions
    solutions.forEach((solution, key) => {
      log(`\n📋 ${solution.title}`, colors.bright + colors.cyan);
      log('─'.repeat(solution.title.length + 3), colors.cyan);
      solution.steps.forEach(step => {
        log(`   ${step}`, colors.yellow);
      });
    });

    // Display warnings
    if (this.warnings.length > 0) {
      log('\n⚠️  Warnings (may not be critical):', colors.bright + colors.yellow);
      this.warnings.forEach(warning => {
        log(`   • ${warning.message}`, colors.yellow);
      });
    }

    log('\n🔧 Quick Fix Commands:', colors.bright + colors.green);
    log('=====================', colors.green);
    log('# If you need to create a new Firebase project:', colors.cyan);
    log('firebase projects:create your-project-id', colors.yellow);
    log('');
    log('# If you need to enable APIs:', colors.cyan);
    log('gcloud services enable firestore.googleapis.com firebase.googleapis.com', colors.yellow);
    log('');
    log('# If you need to create a service account:', colors.cyan);
    log('gcloud iam service-accounts create smart-aac-api \\', colors.yellow);
    log('  --display-name="Smart AAC API Service Account"', colors.yellow);
    log('');
    log('gcloud iam service-accounts keys create service-account-key.json \\', colors.yellow);
    log('  --iam-account=smart-aac-api@YOUR_PROJECT_ID.iam.gserviceaccount.com', colors.yellow);
  }

  async runDiagnostic() {
    log('🔍 Firebase Configuration Diagnostic', colors.bright + colors.cyan);
    log('====================================', colors.cyan);
    log('');

    this.checkEnvironmentVariables();
    this.checkServiceAccountKey();
    this.checkGoogleCloudCLI();
    this.checkFirebaseProject();
    this.generateSolutions();

    log('\n📊 Diagnostic Summary', colors.bright + colors.magenta);
    log('====================', colors.magenta);
    log(`Issues found: ${this.issues.length}`, this.issues.length > 0 ? colors.red : colors.green);
    log(`Warnings: ${this.warnings.length}`, this.warnings.length > 0 ? colors.yellow : colors.green);

    return {
      issues: this.issues,
      warnings: this.warnings,
      hasIssues: this.issues.length > 0
    };
  }
}

async function main() {
  const diagnostic = new FirebaseDiagnostic();
  
  try {
    const result = await diagnostic.runDiagnostic();
    process.exit(result.hasIssues ? 1 : 0);
  } catch (error) {
    log(`💥 Diagnostic failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  log('Firebase Configuration Diagnostic Tool', colors.bright);
  log('');
  log('Usage: node scripts/diagnose-firebase.js', colors.cyan);
  log('');
  log('This script will check your Firebase configuration and help', colors.bright);
  log('identify and fix common setup issues.', colors.bright);
  process.exit(0);
}

// Run the main function
if (require.main === module) {
  main();
}