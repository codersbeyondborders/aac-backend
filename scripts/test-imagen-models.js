#!/usr/bin/env node

/**
 * Test Imagen Model Availability
 * 
 * This script tests different Imagen model names to find which ones
 * are available in your Vertex AI project.
 */

const { PredictionServiceClient } = require('@google-cloud/aiplatform');
const { helpers } = require('@google-cloud/aiplatform');
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

async function testImagenModel(modelName) {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    
    const predictionClient = new PredictionServiceClient({
      apiEndpoint: `${location}-aiplatform.googleapis.com`,
    });
    
    const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${modelName}`;
    
    // Create a simple test request for image generation
    const instanceValue = helpers.toValue({
      prompt: 'A simple test icon of a house',
      sampleCount: 1,
      aspectRatio: "1:1",
      safetyFilterLevel: "block_some",
      personGeneration: "dont_allow"
    });

    const instances = [instanceValue];
    const parameter = helpers.toValue({
      sampleCount: 1,
    });

    const request = {
      endpoint,
      instances,
      parameters: parameter,
    };

    const [response] = await predictionClient.predict(request);
    
    if (response && response.predictions && response.predictions.length > 0) {
      const prediction = helpers.fromValue(response.predictions[0]);
      if (prediction.bytesBase64Encoded) {
        log(`✅ ${modelName} - AVAILABLE (generated image)`, colors.green);
        return true;
      }
    }
    
    log(`❌ ${modelName} - NO IMAGE GENERATED`, colors.red);
    return false;
    
  } catch (error) {
    if (error.code === 5) { // NOT_FOUND
      log(`❌ ${modelName} - NOT FOUND`, colors.red);
    } else if (error.code === 7) { // PERMISSION_DENIED
      log(`❌ ${modelName} - PERMISSION DENIED`, colors.red);
    } else if (error.code === 3) { // INVALID_ARGUMENT
      log(`⚠️  ${modelName} - VALIDATION ERROR (may still be available)`, colors.yellow);
      return true;
    } else {
      log(`❌ ${modelName} - ERROR: ${error.message}`, colors.red);
    }
    return false;
  }
}

async function main() {
  log('🎨 Testing Imagen Model Availability', colors.bright + colors.cyan);
  log('===================================', colors.cyan);
  
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  
  log(`\n📋 Configuration:`, colors.blue);
  log(`   Project ID: ${projectId}`, colors.cyan);
  log(`   Location: ${location}`, colors.cyan);
  
  log(`\n🔍 Testing Imagen Models:`, colors.yellow);
  
  // List of potential Imagen model names to test
  const modelsToTest = [
    // Latest Imagen 4.0 models (from environment)
    process.env.IMAGEN_PRIMARY_MODEL || 'imagen-4.0-generate-001',
    process.env.IMAGEN_FAST_MODEL || 'imagen-4.0-fast-generate-001',
    process.env.IMAGEN_ULTRA_MODEL || 'imagen-4.0-ultra-generate-001',
    
    // Imagen 3.0 models (fallback)
    'imagen-3.0-generate-001',
    'imagen-3.0-fast-generate-001',
    
    // Legacy models
    'imagegeneration@006',
    'imagegeneration@005',
    'imagegeneration@002'
  ];
  
  const availableModels = [];
  
  for (const modelName of modelsToTest) {
    log(`\nTesting: ${modelName}...`);
    const isAvailable = await testImagenModel(modelName);
    if (isAvailable) {
      availableModels.push(modelName);
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  log(`\n📊 Results:`, colors.bright);
  if (availableModels.length > 0) {
    log(`🎉 Found ${availableModels.length} available Imagen model(s):`, colors.green);
    availableModels.forEach(model => {
      log(`   • ${model}`, colors.cyan);
    });
    
    log(`\n💡 Recommendation:`, colors.yellow);
    log(`   Primary model: ${availableModels[0]}`, colors.cyan);
    if (availableModels.length > 1) {
      log(`   Fallback model: ${availableModels[1]}`, colors.cyan);
    }
    
    log(`\n🔧 Environment Variables:`, colors.blue);
    log(`   IMAGEN_PRIMARY_MODEL=${availableModels[0]}`, colors.cyan);
    if (availableModels.length > 1) {
      log(`   IMAGEN_FAST_MODEL=${availableModels[1]}`, colors.cyan);
    }
  } else {
    log(`❌ No Imagen models found. Check your project configuration.`, colors.red);
  }
  
  process.exit(availableModels.length > 0 ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  });
}

module.exports = { testImagenModel };