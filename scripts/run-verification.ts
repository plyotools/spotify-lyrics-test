#!/usr/bin/env node
/**
 * Complete Verification Runner with Structured Logging
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const proofDir = join(projectRoot, 'proof');

// Ensure proof directory exists
if (!existsSync(proofDir)) {
  mkdirSync(proofDir, { recursive: true });
}

// Initialize root.log
const rootLogPath = join(proofDir, 'root.log');
if (existsSync(rootLogPath)) {
  writeFileSync(rootLogPath, '', 'utf-8'); // Clear previous log
}

function logEvent(event: any) {
  const jsonLine = JSON.stringify(event) + '\n';
  writeFileSync(rootLogPath, jsonLine, { flag: 'a' });
}

const startTime = Date.now();

// BOOT_START
logEvent({
  timestamp: new Date().toISOString(),
  event_type: 'BOOT_START',
  test_harness: 'Spotify Lyrics Verification',
  version: '1.0.0',
});

console.log('🚀 Starting verification...');

// READY
logEvent({
  timestamp: new Date().toISOString(),
  event_type: 'READY',
  component: 'Test Infrastructure',
});

try {
  // Run unit tests
  console.log('\n📋 Running unit tests...');
  logEvent({
    timestamp: new Date().toISOString(),
    event_type: 'TEST_START',
    test_id: 'unit-tests',
    suite: 'unit',
  });

  const unitStart = Date.now();
  execSync('npm run test', { 
    cwd: projectRoot,
    stdio: 'inherit',
  });
  const unitDuration = Date.now() - unitStart;

  logEvent({
    timestamp: new Date().toISOString(),
    event_type: 'TEST_PASS',
    test_id: 'unit-tests',
    duration_ms: unitDuration,
  });

  console.log('✅ Unit tests passed');

  // Run E2E tests
  console.log('\n🌐 Running E2E tests...');
  logEvent({
    timestamp: new Date().toISOString(),
    event_type: 'TEST_START',
    test_id: 'e2e-tests',
    suite: 'e2e',
  });

  let e2ePassed = false;
  const e2eStart = Date.now();
  try {
    execSync('npm run test:e2e', { 
      cwd: projectRoot,
      stdio: 'inherit',
    });
    const e2eDuration = Date.now() - e2eStart;
    
    logEvent({
      timestamp: new Date().toISOString(),
      event_type: 'TEST_PASS',
      test_id: 'e2e-tests',
      duration_ms: e2eDuration,
    });
    console.log('✅ E2E tests passed');
    e2ePassed = true;
  } catch (e: any) {
    const e2eDuration = Date.now() - e2eStart;
    logEvent({
      timestamp: new Date().toISOString(),
      event_type: 'TEST_FAIL',
      test_id: 'e2e-tests',
      duration_ms: e2eDuration,
      error: e.message || 'E2E tests failed',
    });
    console.log('⚠️ E2E tests failed (continuing...)');
  }

  const totalDuration = Date.now() - startTime;
  const allPassed = e2ePassed;

  // VERIFY_COMPLETE (write before generating proof pack)
  logEvent({
    timestamp: new Date().toISOString(),
    event_type: 'VERIFY_COMPLETE',
    total_tests: 2,
    passed: allPassed ? 2 : 1,
    failed: allPassed ? 0 : 1,
    duration_ms: totalDuration,
  });

  if (allPassed) {
    // VERIFY_PASS (write before generating proof pack)
    logEvent({
      timestamp: new Date().toISOString(),
      event_type: 'VERIFY_PASS',
      summary: 'All tests passed. Verification complete.',
    });
  } else {
    // VERIFY_FAIL (write before generating proof pack)
    logEvent({
      timestamp: new Date().toISOString(),
      event_type: 'VERIFY_FAIL',
      reason: 'E2E tests failed',
      failed_tests: ['e2e-tests'],
    });
  }

  // Generate proof pack AFTER writing final events
  console.log('\n📦 Generating proof pack...');
  try {
    execSync('npm run proof:generate', { 
      cwd: projectRoot,
      stdio: 'inherit',
    });
    console.log('✅ Proof pack generated');
  } catch (e) {
    console.log('⚠️ Proof pack generation had issues (continuing...)');
  }

  if (allPassed) {
    console.log('\n✅ VERIFICATION PASSED');
  } else {
    console.log('\n❌ VERIFICATION FAILED');
    process.exit(1);
  }
  
  console.log(`📊 Total duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`📝 Log file: ${rootLogPath}`);

} catch (error: any) {
  const totalDuration = Date.now() - startTime;

  logEvent({
    timestamp: new Date().toISOString(),
    event_type: 'VERIFY_COMPLETE',
    total_tests: 2,
    passed: 0,
    failed: 1,
    duration_ms: totalDuration,
  });

  logEvent({
    timestamp: new Date().toISOString(),
    event_type: 'VERIFY_FAIL',
    reason: error.message || 'Verification failed',
    failed_tests: ['unit-tests'],
  });

  console.error('\n❌ VERIFICATION FAILED');
  process.exit(1);
}

