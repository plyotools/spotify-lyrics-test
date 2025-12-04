#!/usr/bin/env node
/**
 * Complete Verification Runner
 * Orchestrates all tests and generates proof pack
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { verificationLogger } from '../src/utils/verificationLogger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const proofDir = join(projectRoot, 'proof');

// Ensure proof directory exists
if (!existsSync(proofDir)) {
  mkdirSync(proofDir, { recursive: true });
}

// Clear previous log
verificationLogger.clear();

async function runCommand(command: string, description: string): Promise<{ success: boolean; output: string }> {
  console.log(`\n${description}...`);
  try {
    const output = execSync(command, { 
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: 'inherit',
    });
    return { success: true, output: output || '' };
  } catch (error: any) {
    console.error(`Failed: ${error.message}`);
    return { success: false, output: error.stdout || error.message };
  }
}

async function main() {
  const startTime = Date.now();
  
  // Boot start
  verificationLogger.bootStart('Spotify Lyrics Player Verification', '1.0.0');
  verificationLogger.ready('Test Infrastructure');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Run unit tests
  console.log('\n=== Running Unit Tests ===');
  const unitResult = await runCommand('npm run test', 'Unit Tests');
  
  if (unitResult.success) {
    console.log('✅ Unit tests passed');
  } else {
    console.error('❌ Unit tests failed');
    failedTests++;
  }
  passedTests += unitResult.success ? 1 : 0;
  totalTests++;

  // Run E2E tests
  console.log('\n=== Running E2E Tests ===');
  const e2eResult = await runCommand('npm run test:e2e', 'E2E Tests');
  
  if (e2eResult.success) {
    console.log('✅ E2E tests passed');
  } else {
    console.error('❌ E2E tests failed');
    failedTests++;
  }
  passedTests += e2eResult.success ? 1 : 0;
  totalTests++;

  // Generate proof pack
  console.log('\n=== Generating Proof Pack ===');
  const proofResult = await runCommand('npm run proof:generate', 'Proof Pack Generation');
  
  const duration = Date.now() - startTime;

  // Log completion
  verificationLogger.verifyComplete(totalTests, passedTests, failedTests, duration);

  if (failedTests === 0) {
    verificationLogger.verifyPass(`All ${totalTests} test suites passed in ${(duration / 1000).toFixed(2)}s`);
    console.log('\n✅ VERIFICATION PASSED');
    process.exit(0);
  } else {
    verificationLogger.verifyFail(`${failedTests} test suite(s) failed`, []);
    console.log('\n❌ VERIFICATION FAILED');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  verificationLogger.verifyFail('Fatal error during verification', [error.toString()]);
  process.exit(1);
});



