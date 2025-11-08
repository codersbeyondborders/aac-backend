#!/usr/bin/env node

/**
 * API Testing Script for Smart AAC API
 * 
 * This script tests all API endpoints to ensure they're working correctly
 * in your local development environment.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const TEST_TOKEN = process.env.TEST_TOKEN || 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwczovL2lkZW50aXR5dG9vbGtpdC5nb29nbGVhcGlzLmNvbS9nb29nbGUuaWRlbnRpdHkuaWRlbnRpdHl0b29sa2l0LnYxLklkZW50aXR5VG9vbGtpdCIsImlhdCI6MTc2MjQ1MTk0OSwiZXhwIjoxNzYyNDU1NTQ5LCJpc3MiOiJzbWFydC1hYWMtYXBpQGdlbi1sYW5nLWNsaWVudC0wNTgxMjI2Nzc0LmlhbS5nc2VydmljZWFjY291bnQuY29tIiwic3ViIjoic21hcnQtYWFjLWFwaUBnZW4tbGFuZy1jbGllbnQtMDU4MTIyNjc3NC5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsInVpZCI6InV4d01nVzljbWtma1BHVXl5dVNZb3BTMWxycTIifQ.YP3QLFUC1MQ519g9MSEo0gsz5I-vX4NDBkP-6cw9-CqReof1zGaR65r7IIt3IYcmiuI7_QYYPu8i95p2BQJ45twektHQGpBI4agPQcQRRpWA9T22vy48e-7AmGHriiz9wOmpNck4Mi5vhsI1Jec5s9ozKW1yMeOOst_Jf6ljfn1oOmoulU4kYCHayfJCyna24x4d3nPi07N1S2ibvOOGNO9ffYPi30AVtjGa2M8f8pwKOwxDkty3CcfWanBS9_xoB6zqh91P6N0dsW5EXjEAOItq1d4UdedkQ0bFvARb-TVK3OrkCseP6byqosHx0IRZsz-0G10ZI4A8sErWjNByTQ';

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

class APITester {
  constructor(baseUrl, token = null) {
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
  }

  async testHealthEndpoints() {
    log('\n📋 Testing Health Endpoints', colors.bright + colors.blue);
    log('================================', colors.blue);

    // Test basic health endpoint
    try {
      const response = await this.axios.get('/health');
      if (response.status === 200 && response.data.status) {
        logTest('Basic Health Check', 'PASS', `Status: ${response.data.status}`);
        this.testResults.passed++;
      } else {
        logTest('Basic Health Check', 'FAIL', 'Invalid response format');
        this.testResults.failed++;
      }
    } catch (error) {
      logTest('Basic Health Check', 'FAIL', error.message);
      this.testResults.failed++;
    }

    // Test API health endpoint
    try {
      const response = await this.axios.get('/api/v1/health');
      if (response.status === 200) {
        logTest('API Health Check', 'PASS', 'API is responding');
        this.testResults.passed++;
      } else {
        logTest('API Health Check', 'FAIL', `Status: ${response.status}`);
        this.testResults.failed++;
      }
    } catch (error) {
      logTest('API Health Check', 'FAIL', error.message);
      this.testResults.failed++;
    }
  }

  async testPublicEndpoints() {
    log('\n🌐 Testing Public Endpoints', colors.bright + colors.blue);
    log('================================', colors.blue);

    // Test public boards endpoint
    try {
      const response = await this.axios.get('/api/v1/boards/public');
      if (response.status === 200 && response.data.success !== undefined) {
        logTest('Public Boards', 'PASS', `Found ${response.data.data?.length || 0} public boards`);
        this.testResults.passed++;
      } else {
        logTest('Public Boards', 'FAIL', 'Invalid response format');
        this.testResults.failed++;
      }
    } catch (error) {
      logTest('Public Boards', 'FAIL', error.message);
      this.testResults.failed++;
    }
  }

  async testAuthenticatedEndpoints() {
    if (!this.token) {
      log('\n🔐 Skipping Authenticated Endpoints', colors.bright + colors.yellow);
      log('================================', colors.yellow);
      log('No authentication token provided. Use TEST_TOKEN environment variable.', colors.yellow);
      this.testResults.skipped += 5;
      return;
    }

    log('\n🔐 Testing Authenticated Endpoints', colors.bright + colors.blue);
    log('================================', colors.blue);

    let createdBoardId = null;

    // Test creating a board
    try {
      const boardData = {
        name: 'Test Board',
        description: 'A test board created by the API tester',
        isPublic: false
      };

      const response = await this.axios.post('/api/v1/boards', boardData);
      if (response.status === 201 && response.data.success) {
        createdBoardId = response.data.data.id;
        logTest('Create Board', 'PASS', `Board ID: ${createdBoardId}`);
        this.testResults.passed++;
      } else {
        logTest('Create Board', 'FAIL', 'Invalid response format');
        this.testResults.failed++;
      }
    } catch (error) {
      logTest('Create Board', 'FAIL', error.response?.data?.error || error.message);
      this.testResults.failed++;
    }

    // Test getting user boards
    try {
      const response = await this.axios.get('/api/v1/boards');
      if (response.status === 200 && response.data.success !== undefined) {
        logTest('Get User Boards', 'PASS', `Found ${response.data.data?.length || 0} boards`);
        this.testResults.passed++;
      } else {
        logTest('Get User Boards', 'FAIL', 'Invalid response format');
        this.testResults.failed++;
      }
    } catch (error) {
      logTest('Get User Boards', 'FAIL', error.response?.data?.error || error.message);
      this.testResults.failed++;
    }

    // Test getting specific board (if we created one)
    if (createdBoardId) {
      try {
        const response = await this.axios.get(`/api/v1/boards/${createdBoardId}`);
        if (response.status === 200 && response.data.success) {
          logTest('Get Specific Board', 'PASS', `Retrieved board: ${response.data.data.name}`);
          this.testResults.passed++;
        } else {
          logTest('Get Specific Board', 'FAIL', 'Invalid response format');
          this.testResults.failed++;
        }
      } catch (error) {
        logTest('Get Specific Board', 'FAIL', error.response?.data?.error || error.message);
        this.testResults.failed++;
      }

      // Test updating the board
      try {
        const updateData = {
          name: 'Updated Test Board',
          description: 'Updated description for testing'
        };

        const response = await this.axios.put(`/api/v1/boards/${createdBoardId}`, updateData);
        if (response.status === 200 && response.data.success) {
          logTest('Update Board', 'PASS', 'Board updated successfully');
          this.testResults.passed++;
        } else {
          logTest('Update Board', 'FAIL', 'Invalid response format');
          this.testResults.failed++;
        }
      } catch (error) {
        logTest('Update Board', 'FAIL', error.response?.data?.error || error.message);
        this.testResults.failed++;
      }

      // Test deleting the board
      try {
        const response = await this.axios.delete(`/api/v1/boards/${createdBoardId}`);
        if (response.status === 200 && response.data.success) {
          logTest('Delete Board', 'PASS', 'Board deleted successfully');
          this.testResults.passed++;
        } else {
          logTest('Delete Board', 'FAIL', 'Invalid response format');
          this.testResults.failed++;
        }
      } catch (error) {
        logTest('Delete Board', 'FAIL', error.response?.data?.error || error.message);
        this.testResults.failed++;
      }
    } else {
      logTest('Get Specific Board', 'SKIP', 'No board was created to test');
      logTest('Update Board', 'SKIP', 'No board was created to test');
      logTest('Delete Board', 'SKIP', 'No board was created to test');
      this.testResults.skipped += 3;
    }
  }

  async testIconGeneration() {
    if (!this.token) {
      log('\n🎨 Skipping Icon Generation Tests', colors.bright + colors.yellow);
      log('================================', colors.yellow);
      log('No authentication token provided. Use TEST_TOKEN environment variable.', colors.yellow);
      this.testResults.skipped += 2;
      return;
    }

    log('\n🎨 Testing Icon Generation', colors.bright + colors.blue);
    log('================================', colors.blue);

    // Test text-to-icon generation
    try {
      const textData = {
        text: 'happy cat'
      };

      const response = await this.axios.post('/api/v1/icons/generate-from-text', textData);
      if (response.status === 200 && response.data.success) {
        logTest('Text to Icon Generation', 'PASS', 'Icon generated successfully');
        this.testResults.passed++;
      } else {
        logTest('Text to Icon Generation', 'FAIL', 'Invalid response format');
        this.testResults.failed++;
      }
    } catch (error) {
      logTest('Text to Icon Generation', 'FAIL', error.response?.data?.error || error.message);
      this.testResults.failed++;
    }

    // Test image-to-icon generation (skip if no test image available)
    const testImagePath = path.join(__dirname, '..', 'test-image.jpg');
    if (fs.existsSync(testImagePath)) {
      try {
        const FormData = require('form-data');
        const form = new FormData();
        form.append('image', fs.createReadStream(testImagePath));

        const response = await this.axios.post('/api/v1/icons/generate-from-image', form, {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${this.token}`
          }
        });

        if (response.status === 200 && response.data.success) {
          logTest('Image to Icon Generation', 'PASS', 'Icon generated from image');
          this.testResults.passed++;
        } else {
          logTest('Image to Icon Generation', 'FAIL', 'Invalid response format');
          this.testResults.failed++;
        }
      } catch (error) {
        logTest('Image to Icon Generation', 'FAIL', error.response?.data?.error || error.message);
        this.testResults.failed++;
      }
    } else {
      logTest('Image to Icon Generation', 'SKIP', 'No test image found (test-image.jpg)');
      this.testResults.skipped++;
    }
  }

  async testErrorHandling() {
    log('\n⚠️  Testing Error Handling', colors.bright + colors.blue);
    log('================================', colors.blue);

    // Test 404 endpoint
    try {
      await this.axios.get('/api/v1/nonexistent');
      logTest('404 Error Handling', 'FAIL', 'Should have returned 404');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 404) {
        logTest('404 Error Handling', 'PASS', 'Correctly returned 404');
        this.testResults.passed++;
      } else {
        logTest('404 Error Handling', 'FAIL', `Unexpected status: ${error.response?.status}`);
        this.testResults.failed++;
      }
    }

    // Test invalid JSON
    try {
      await this.axios.post('/api/v1/boards', 'invalid json', {
        headers: { 'Content-Type': 'application/json' }
      });
      logTest('Invalid JSON Handling', 'FAIL', 'Should have returned 400');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 400) {
        logTest('Invalid JSON Handling', 'PASS', 'Correctly returned 400');
        this.testResults.passed++;
      } else {
        logTest('Invalid JSON Handling', 'FAIL', `Unexpected status: ${error.response?.status}`);
        this.testResults.failed++;
      }
    }

    // Test unauthorized access
    try {
      const unauthorizedAxios = axios.create({ baseURL: this.baseUrl });
      await unauthorizedAxios.post('/api/v1/boards', { name: 'Test' });
      logTest('Unauthorized Access', 'FAIL', 'Should have returned 401');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 401) {
        logTest('Unauthorized Access', 'PASS', 'Correctly returned 401');
        this.testResults.passed++;
      } else {
        logTest('Unauthorized Access', 'FAIL', `Unexpected status: ${error.response?.status}`);
        this.testResults.failed++;
      }
    }
  }

  async runAllTests() {
    log('🧪 Smart AAC API Testing Suite', colors.bright + colors.cyan);
    log('=====================================', colors.cyan);
    log(`Base URL: ${this.baseUrl}`, colors.blue);
    log(`Authentication: ${this.token ? 'Enabled' : 'Disabled'}`, colors.blue);
    log('');

    await this.testHealthEndpoints();
    await this.testPublicEndpoints();
    await this.testAuthenticatedEndpoints();
    await this.testIconGeneration();
    await this.testErrorHandling();

    // Print summary
    log('\n📊 Test Results Summary', colors.bright + colors.magenta);
    log('================================', colors.magenta);
    log(`✓ Passed: ${this.testResults.passed}`, colors.green);
    log(`✗ Failed: ${this.testResults.failed}`, colors.red);
    log(`⚠ Skipped: ${this.testResults.skipped}`, colors.yellow);
    
    const total = this.testResults.passed + this.testResults.failed + this.testResults.skipped;
    const successRate = total > 0 ? ((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1) : 0;
    
    log(`📈 Success Rate: ${successRate}%`, colors.cyan);
    
    if (this.testResults.failed === 0) {
      log('\n🎉 All tests passed! Your API is working correctly.', colors.bright + colors.green);
    } else {
      log('\n⚠️  Some tests failed. Please check the output above for details.', colors.bright + colors.yellow);
    }

    return this.testResults.failed === 0;
  }
}

async function main() {
  const tester = new APITester(BASE_URL, TEST_TOKEN);
  
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
  log('Smart AAC API Testing Suite', colors.bright);
  log('');
  log('Usage: node scripts/test-api.js [options]', colors.cyan);
  log('');
  log('Environment Variables:', colors.bright);
  log('  API_BASE_URL    Base URL for the API (default: http://localhost:8080)', colors.yellow);
  log('  TEST_TOKEN      Firebase ID token for authenticated tests', colors.yellow);
  log('');
  log('Options:', colors.bright);
  log('  --help, -h      Show this help message', colors.yellow);
  log('');
  log('Examples:', colors.bright);
  log('  node scripts/test-api.js', colors.cyan);
  log('  TEST_TOKEN="your-token" node scripts/test-api.js', colors.cyan);
  log('  API_BASE_URL="https://your-api.com" node scripts/test-api.js', colors.cyan);
  process.exit(0);
}

// Run the main function
if (require.main === module) {
  main();
}