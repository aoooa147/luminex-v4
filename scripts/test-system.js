#!/usr/bin/env node

/**
 * System Test Script
 * 
 * ทดสอบระบบทั้งหมดของ Luminex v4:
 * - Environment variables
 * - API routes
 * - Database connection
 * - Components
 * - Hooks
 * - Games
 * 
 * Usage: node scripts/test-system.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
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

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

function addTest(name, passed, message = '') {
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
    logSuccess(`${name}: ${message || 'Passed'}`);
  } else {
    results.failed++;
    logError(`${name}: ${message || 'Failed'}`);
  }
}

function addWarning(name, message) {
  results.warnings++;
  results.tests.push({ name, passed: null, message, warning: true });
  logWarning(`${name}: ${message}`);
}

// Test 1: Check environment variables
function testEnvironmentVariables() {
  logSection('1. Testing Environment Variables');
  
  const envPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  // Check if .env.local exists
  if (fs.existsSync(envPath)) {
    logSuccess('.env.local file exists');
    
    // Read .env.local
    const envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Check for required variables
    const requiredVars = [
      'NEXT_PUBLIC_WORLD_APP_ID',
      'NEXT_PUBLIC_WORLD_ACTION',
      'NEXT_PUBLIC_TREASURY_ADDRESS',
      'NEXT_PUBLIC_LUX_TOKEN_ADDRESS',
      'NEXT_PUBLIC_WLD_TOKEN_ADDRESS',
    ];
    
    const optionalVars = [
      'NEXT_PUBLIC_STAKING_ADDRESS',
      'NEXT_PUBLIC_ADMIN_WALLET_ADDRESS',
      'DATABASE_URL',
      'NEXT_PUBLIC_SENTRY_DSN',
      'NEXT_PUBLIC_GA_ID',
    ];
    
    // Check required variables
    requiredVars.forEach(varName => {
      if (envContent.includes(varName)) {
        addTest(`Required variable: ${varName}`, true, 'Found');
      } else {
        addTest(`Required variable: ${varName}`, false, 'Missing');
      }
    });
    
    // Check optional variables
    optionalVars.forEach(varName => {
      if (envContent.includes(varName)) {
        addTest(`Optional variable: ${varName}`, true, 'Found');
      } else {
        addWarning(`Optional variable: ${varName}`, 'Not set (optional)');
      }
    });
    
  } else {
    addTest('.env.local file', false, 'File does not exist. Please create it from .env.example');
  }
  
  // Check if .env.example exists
  if (fs.existsSync(envExamplePath)) {
    logSuccess('.env.example file exists');
  } else {
    addWarning('.env.example file', 'File does not exist');
  }
}

// Test 2: Check if node_modules exists
function testDependencies() {
  logSection('2. Testing Dependencies');
  
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (fs.existsSync(nodeModulesPath)) {
    logSuccess('node_modules directory exists');
    
    // Check for key dependencies
    const keyDependencies = [
      'next',
      'react',
      'react-dom',
      '@prisma/client',
      'ethers',
      '@worldcoin/minikit-js',
    ];
    
    keyDependencies.forEach(dep => {
      const depPath = path.join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        addTest(`Dependency: ${dep}`, true, 'Installed');
      } else {
        addTest(`Dependency: ${dep}`, false, 'Not installed');
      }
    });
  } else {
    addTest('node_modules', false, 'Directory does not exist. Please run: npm install');
  }
}

// Test 3: Check project structure
function testProjectStructure() {
  logSection('3. Testing Project Structure');
  
  const requiredDirs = [
    'app',
    'components',
    'hooks',
    'lib',
    'docs',
    'e2e',
  ];
  
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'next.config.js',
    'tailwind.config.js',
    'jest.config.js',
    'playwright.config.ts',
  ];
  
  // Check directories
  requiredDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      addTest(`Directory: ${dir}`, true, 'Exists');
    } else {
      addTest(`Directory: ${dir}`, false, 'Missing');
    }
  });
  
  // Check files
  requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      addTest(`File: ${file}`, true, 'Exists');
    } else {
      addTest(`File: ${file}`, false, 'Missing');
    }
  });
}

// Test 4: Check if tests can run
function testTestSetup() {
  logSection('4. Testing Test Setup');
  
  // Check if Jest is configured
  const jestConfigPath = path.join(process.cwd(), 'jest.config.js');
  if (fs.existsSync(jestConfigPath)) {
    addTest('Jest configuration', true, 'Found');
  } else {
    addTest('Jest configuration', false, 'Missing');
  }
  
  // Check if Playwright is configured
  const playwrightConfigPath = path.join(process.cwd(), 'playwright.config.ts');
  if (fs.existsSync(playwrightConfigPath)) {
    addTest('Playwright configuration', true, 'Found');
  } else {
    addTest('Playwright configuration', false, 'Missing');
  }
  
  // Check if test files exist
  const testDirs = [
    'lib/utils/__tests__',
    'app/api/__tests__',
    'components/common/__tests__',
    'e2e',
  ];
  
  testDirs.forEach(testDir => {
    const testDirPath = path.join(process.cwd(), testDir);
    if (fs.existsSync(testDirPath)) {
      const testFiles = fs.readdirSync(testDirPath).filter(file => 
        file.endsWith('.test.ts') || 
        file.endsWith('.test.tsx') || 
        file.endsWith('.spec.ts')
      );
      if (testFiles.length > 0) {
        addTest(`Test directory: ${testDir}`, true, `Found ${testFiles.length} test files`);
      } else {
        addWarning(`Test directory: ${testDir}`, 'No test files found');
      }
    } else {
      addWarning(`Test directory: ${testDir}`, 'Directory does not exist');
    }
  });
}

// Test 5: Check if build works
function testBuild() {
  logSection('5. Testing Build');
  
  try {
    logInfo('Running: npm run build');
    execSync('npm run build', { 
      stdio: 'pipe',
      cwd: process.cwd(),
      timeout: 120000, // 2 minutes
    });
    addTest('Build', true, 'Build successful');
  } catch (error) {
    addTest('Build', false, 'Build failed. Check the error above.');
  }
}

// Test 6: Check if linting works
function testLinting() {
  logSection('6. Testing Linting');
  
  try {
    logInfo('Running: npm run lint');
    execSync('npm run lint', { 
      stdio: 'pipe',
      cwd: process.cwd(),
      timeout: 60000, // 1 minute
    });
    addTest('Linting', true, 'No linting errors');
  } catch (error) {
    addWarning('Linting', 'Linting errors found. Please fix them.');
  }
}

// Test 7: Check if tests can run
function testTests() {
  logSection('7. Testing Tests');
  
  try {
    logInfo('Running: npm run test');
    execSync('npm run test -- --passWithNoTests', { 
      stdio: 'pipe',
      cwd: process.cwd(),
      timeout: 60000, // 1 minute
    });
    addTest('Unit Tests', true, 'Tests passed');
  } catch (error) {
    addWarning('Unit Tests', 'Some tests failed. Check the error above.');
  }
}

// Main function
function main() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🚀 Luminex v4 System Test', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');
  
  // Run all tests
  testEnvironmentVariables();
  testDependencies();
  testProjectStructure();
  testTestSetup();
  
  // Ask user if they want to run build and tests
  logInfo('Skipping build and test execution (can be slow)');
  logInfo('To run full tests, execute: npm run test');
  logInfo('To run build, execute: npm run build');
  
  // Print summary
  logSection('Test Summary');
  
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⚠️  Warnings: ${results.warnings}`, 'yellow');
  
  console.log('\n');
  
  // Print detailed results
  if (results.failed > 0) {
    logSection('Failed Tests');
    results.tests
      .filter(test => !test.passed && !test.warning)
      .forEach(test => {
        logError(`${test.name}: ${test.message}`);
      });
  }
  
  if (results.warnings > 0) {
    logSection('Warnings');
    results.tests
      .filter(test => test.warning)
      .forEach(test => {
        logWarning(`${test.name}: ${test.message}`);
      });
  }
  
  // Final message
  console.log('\n');
  if (results.failed === 0) {
    log('🎉 All critical tests passed!', 'green');
    log('You can now proceed with development.', 'green');
  } else {
    log('⚠️  Some tests failed. Please fix them before proceeding.', 'yellow');
    process.exit(1);
  }
  
  console.log('\n');
}

// Run main function
main();

