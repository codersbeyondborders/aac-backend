#!/usr/bin/env node

/**
 * Test Vertex AI Permissions
 * 
 * This script tests if the service account has proper permissions
 * to access Vertex AI services for icon generation.
 */

const { PredictionServiceClient } = require('@google-cloud/aiplatform');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testVertexAIPermissions() {
  try {
    log('🧪 Testing Vertex AI Permissions', colors.bright + colors.cyan);
    log('=================================', colors.cyan);
    
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    
    log(`\n📋 Configuration:`, colors.blue);
    log(`   Project ID: ${projectId}`, colors.cyan);
    log(`   Location: ${location}`, colors.cyan);
    log(`   Service Account: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`, colors.cyan);
    
    // Initialize Prediction Service Client
    log(`\n🔧 Initializing Vertex AI client...`, colors.yellow);
    const predictionClient = new PredictionServiceClient({
      apiEndpoint: `${location}-aiplatform.googleapis.com`,
    });
    log(`✅ Client initialized successfully`, colors.green);
    
    // Test basic connectivity
    log(`\n🌐 Testing API connectivity...`, colors.yellow);
    
    // Create a simple request to test permissions
    const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/imagegeneration@006`;
    
    log(`   Testing endpoint: ${endpoint}`, colors.cyan);
    
    // Create a minimal test request
    const instances = [{
      prompt: "simple test icon"
    }];
    
    const parameters = {
      sampleCount: 1,
      aspectRatio: "1:1",
      safetyFilterLevel: "block_some",
      personGeneration: "dont_allow"
    };
    
    const request = {
      endpoint: endpoint,
      instances: instances,
      parameters: parameters
    };
    
    log(`\n🎯 Testing Imagen model access...`, colors.yellow);
    
    try {
      // This will test if we have permission to access the model
      const [response] = await predictionClient.predict(request);
      
      if (response && response.predictions) {
        log(`✅ SUCCESS: Vertex AI permissions are working!`, colors.green);
        log(`   Model responded with ${response.predictions.length} prediction(s)`, colors.cyan);
        log(`   Your service account has proper access to Imagen`, colors.green);
        return true;
      } else {
        log(`⚠️  WARNING: Model responded but with unexpected format`, colors.yellow);
        log(`   Response: ${JSON.stringify(response, null, 2)}`, colors.cyan);
        return false;
      }
      
    } catch (modelError) {
      if (modelError.code === 7) { // PERMISSION_DENIED
        log(`❌ PERMISSION DENIED: ${modelError.message}`, colors.red);
        log(`\n🔧 Troubleshooting steps:`, colors.yellow);
        log(`   1. Verify service account has aiplatform.user or aiplatform.admin role`, colors.cyan);
        log(`   2. Check if Vertex AI API is enabled in your project`, colors.cyan);
        log(`   3. Ensure the model exists in the specified location`, colors.cyan);
        log(`   4. Wait a few minutes for IAM changes to propagate`, colors.cyan);
        return false;
      } else if (modelError.code === 3) { // INVALID_ARGUMENT
        log(`✅ PERMISSIONS OK: Got validation error (expected for test request)`, colors.green);
        log(`   Error: ${modelError.message}`, colors.cyan);
        log(`   This means permissions are working, just the test request format needs adjustment`, colors.green);
        return true;
      } else {
        log(`❌ UNEXPECTED ERROR: ${modelError.message}`, colors.red);
        log(`   Code: ${modelError.code}`, colors.cyan);
        return false;
      }
    }
    
  } catch (error) {
    log(`❌ SETUP ERROR: ${error.message}`, colors.red);
    log(`\n🔧 Check your configuration:`, colors.yellow);
    log(`   1. GOOGLE_CLOUD_PROJECT environment variable is set`, colors.cyan);
    log(`   2. GOOGLE_APPLICATION_CREDENTIALS points to valid service account key`, colors.cyan);
    log(`   3. Service account has necessary permissions`, colors.cyan);
    return false;
  }
}

async function main() {
  const success = await testVertexAIPermissions();
  
  log(`\n📊 Test Result:`, colors.bright);
  if (success) {
    log(`🎉 Vertex AI permissions are properly configured!`, colors.green);
    log(`   Your Smart AAC API should now be able to generate icons.`, colors.cyan);
  } else {
    log(`❌ Vertex AI permissions need to be fixed.`, colors.red);
    log(`   Follow the troubleshooting steps above.`, colors.yellow);
  }
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  });
}

module.exports = { testVertexAIPermissions };