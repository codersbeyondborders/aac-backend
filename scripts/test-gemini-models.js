#!/usr/bin/env node

/**
 * Test Gemini Model Availability
 * 
 * This script tests different Gemini model names to find which ones
 * are available in your Vertex AI project.
 */

const { VertexAI } = require('@google-cloud/vertexai');
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

async function testGeminiModel(modelName) {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    
    // Initialize Vertex AI client for Gemini
    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
    });
    
    // Create generative model instance
    const generativeModel = vertexAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 100,
        topP: 0.8,
        topK: 40
      }
    });

    // Prepare test image (1x1 pixel test image)
    const imagePart = {
      inlineData: {
        data: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        mimeType: 'image/jpeg'
      }
    };

    const result = await generativeModel.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: 'Describe this image briefly.' },
          imagePart
        ]
      }]
    });
    
    if (result && result.response && result.response.text()) {
      log(`✅ ${modelName} - AVAILABLE`, colors.green);
      return true;
    } else {
      log(`❌ ${modelName} - NO RESPONSE`, colors.red);
      return false;
    }
    
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('NOT_FOUND')) {
      log(`❌ ${modelName} - NOT FOUND`, colors.red);
    } else if (error.message.includes('permission') || error.message.includes('PERMISSION_DENIED')) {
      log(`❌ ${modelName} - PERMISSION DENIED`, colors.red);
    } else if (error.message.includes('INVALID_ARGUMENT') || error.message.includes('validation')) {
      log(`✅ ${modelName} - AVAILABLE (validation error expected)`, colors.green);
      return true;
    } else {
      log(`❌ ${modelName} - ERROR: ${error.message}`, colors.red);
    }
    return false;
  }
}

async function main() {
  log('🧪 Testing Gemini Model Availability', colors.bright + colors.cyan);
  log('====================================', colors.cyan);
  
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  
  log(`\n📋 Configuration:`, colors.blue);
  log(`   Project ID: ${projectId}`, colors.cyan);
  log(`   Location: ${location}`, colors.cyan);
  
  log(`\n🔍 Testing Gemini Models:`, colors.yellow);
  
  // List of potential Gemini model names to test (prioritizing latest models)
  const modelsToTest = [
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
    'gemini-1.0-pro-vision-001',
    'gemini-1.5-flash-002'
  ];
  
  const availableModels = [];
  
  for (const modelName of modelsToTest) {
    const isAvailable = await testGeminiModel(modelName);
    if (isAvailable) {
      availableModels.push(modelName);
    }
  }
  
  log(`\n📊 Results:`, colors.bright);
  if (availableModels.length > 0) {
    log(`🎉 Found ${availableModels.length} available Gemini model(s):`, colors.green);
    availableModels.forEach(model => {
      log(`   • ${model}`, colors.cyan);
    });
    
    log(`\n💡 Recommendation:`, colors.yellow);
    log(`   Update your Vertex AI service to use: ${availableModels[0]}`, colors.cyan);
  } else {
    log(`❌ No Gemini models found. Check your project configuration.`, colors.red);
  }
  
  process.exit(availableModels.length > 0 ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  });
}

module.exports = { testGeminiModel };