#!/usr/bin/env node

/**
 * Comprehensive AI Model Testing
 * 
 * This script tests both Gemini and Imagen models to verify
 * which ones are available in your Vertex AI project.
 */

require('dotenv').config();
const { testGeminiModel } = require('./test-gemini-models');
const { testImagenModel } = require('./test-imagen-models');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  log('🚀 Comprehensive AI Model Testing', colors.bright + colors.magenta);
  log('==================================', colors.magenta);
  
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  
  log(`\n📋 Configuration:`, colors.blue);
  log(`   Project ID: ${projectId}`, colors.cyan);
  log(`   Location: ${location}`, colors.cyan);
  
  // Test Gemini Models
  log(`\n🧠 Testing Gemini Models (Vision & Text):`, colors.yellow);
  log('==========================================', colors.yellow);
  
  const geminiModelsToTest = [
    // Latest Gemini 2.5 models (from environment)
    process.env.GEMINI_PRIMARY_MODEL || 'gemini-2.5-pro',
    process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash',
    
    // Gemini 1.5 models (stable aliases)
    'gemini-1.5-pro',         
    'gemini-1.5-flash',       
    'gemini-pro-vision',      
    
    // Versioned model names (fallback)
    'gemini-1.5-pro-001',     
    'gemini-1.5-flash-001',
    'gemini-1.0-pro-vision-001'
  ];
  
  const availableGeminiModels = [];
  
  for (const modelName of geminiModelsToTest) {
    const isAvailable = await testGeminiModel(modelName);
    if (isAvailable) {
      availableGeminiModels.push(modelName);
    }
  }
  
  // Test Imagen Models
  log(`\n🎨 Testing Imagen Models (Image Generation):`, colors.yellow);
  log('=============================================', colors.yellow);
  
  const imagenModelsToTest = [
    // Latest Imagen 4.0 models (from environment)
    process.env.IMAGEN_PRIMARY_MODEL || 'imagen-4.0-generate-001',
    process.env.IMAGEN_FAST_MODEL || 'imagen-4.0-fast-generate-001',
    process.env.IMAGEN_ULTRA_MODEL || 'imagen-4.0-ultra-generate-001',
    
    // Imagen 3.0 models (fallback)
    'imagen-3.0-generate-001',
    'imagen-3.0-fast-generate-001',
    
    // Legacy models
    'imagegeneration@006',
    'imagegeneration@005'
  ];
  
  const availableImagenModels = [];
  
  for (const modelName of imagenModelsToTest) {
    log(`\nTesting: ${modelName}...`);
    const isAvailable = await testImagenModel(modelName);
    if (isAvailable) {
      availableImagenModels.push(modelName);
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary Report
  log(`\n📊 COMPREHENSIVE RESULTS`, colors.bright + colors.magenta);
  log('========================', colors.magenta);
  
  // Gemini Results
  log(`\n🧠 Gemini Models (${availableGeminiModels.length} available):`, colors.blue);
  if (availableGeminiModels.length > 0) {
    availableGeminiModels.forEach((model, index) => {
      const priority = index === 0 ? ' (PRIMARY)' : index === 1 ? ' (FALLBACK)' : '';
      log(`   ✅ ${model}${priority}`, colors.green);
    });
  } else {
    log(`   ❌ No Gemini models available`, colors.red);
  }
  
  // Imagen Results
  log(`\n🎨 Imagen Models (${availableImagenModels.length} available):`, colors.blue);
  if (availableImagenModels.length > 0) {
    availableImagenModels.forEach((model, index) => {
      const priority = index === 0 ? ' (PRIMARY)' : index === 1 ? ' (FAST)' : index === 2 ? ' (ULTRA)' : '';
      log(`   ✅ ${model}${priority}`, colors.green);
    });
  } else {
    log(`   ❌ No Imagen models available`, colors.red);
  }
  
  // Environment Variable Recommendations
  if (availableGeminiModels.length > 0 || availableImagenModels.length > 0) {
    log(`\n🔧 RECOMMENDED ENVIRONMENT VARIABLES:`, colors.bright + colors.cyan);
    log('====================================', colors.cyan);
    
    if (availableGeminiModels.length > 0) {
      log(`\n# Gemini Models`, colors.yellow);
      log(`GEMINI_PRIMARY_MODEL=${availableGeminiModels[0]}`, colors.cyan);
      if (availableGeminiModels.length > 1) {
        log(`GEMINI_FALLBACK_MODEL=${availableGeminiModels[1]}`, colors.cyan);
      }
      if (availableGeminiModels.length > 2) {
        log(`GEMINI_LEGACY_MODEL=${availableGeminiModels[2]}`, colors.cyan);
      }
    }
    
    if (availableImagenModels.length > 0) {
      log(`\n# Imagen Models`, colors.yellow);
      log(`IMAGEN_PRIMARY_MODEL=${availableImagenModels[0]}`, colors.cyan);
      if (availableImagenModels.length > 1) {
        log(`IMAGEN_FAST_MODEL=${availableImagenModels[1]}`, colors.cyan);
      }
      if (availableImagenModels.length > 2) {
        log(`IMAGEN_ULTRA_MODEL=${availableImagenModels[2]}`, colors.cyan);
      }
    }
    
    log(`\n💡 Copy these to your .env file for optimal performance!`, colors.bright + colors.green);
  }
  
  // System Status
  const totalModels = availableGeminiModels.length + availableImagenModels.length;
  log(`\n🎯 SYSTEM STATUS:`, colors.bright);
  
  if (totalModels >= 4) {
    log(`🟢 EXCELLENT - ${totalModels} models available (fully operational)`, colors.green);
  } else if (totalModels >= 2) {
    log(`🟡 GOOD - ${totalModels} models available (basic functionality)`, colors.yellow);
  } else if (totalModels >= 1) {
    log(`🟠 LIMITED - ${totalModels} model available (reduced functionality)`, colors.yellow);
  } else {
    log(`🔴 CRITICAL - No AI models available (service non-functional)`, colors.red);
  }
  
  process.exit(totalModels > 0 ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  });
}