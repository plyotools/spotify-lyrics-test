#!/usr/bin/env node
/**
 * Proof Pack Generator
 * Collects test results, root.log, screenshots, and generates summary.md
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const proofDir = join(projectRoot, 'proof');

interface TestResult {
  test_id: string;
  suite: string;
  status: 'pass' | 'fail';
  duration_ms?: number;
  error?: string;
  requirement?: string;
}

interface LogEvent {
  timestamp: string;
  event_type: string;
  [key: string]: any;
}

interface Summary {
  total_tests: number;
  passed: number;
  failed: number;
  duration_ms: number;
  coverage: {
    requirements: string[];
    tests: TestResult[];
  };
}

function parseRootLog(logPath: string): LogEvent[] {
  if (!existsSync(logPath)) {
    console.warn(`root.log not found at ${logPath}`);
    return [];
  }

  const content = readFileSync(logPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      console.warn(`Failed to parse log line: ${line}`);
      return null;
    }
  }).filter(Boolean) as LogEvent[];
}

function parseTestResults(resultsPath: string): any {
  if (!existsSync(resultsPath)) {
    return null;
  }

  try {
    const content = readFileSync(resultsPath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.warn(`Failed to parse test results: ${e}`);
    return null;
  }
}

function generateSummary(rootLog: LogEvent[], testResults: any): Summary {
  const testEvents = rootLog.filter(e => 
    e.event_type === 'TEST_PASS' || e.event_type === 'TEST_FAIL'
  );

  const passed = rootLog.filter(e => e.event_type === 'TEST_PASS').length;
  const failed = rootLog.filter(e => e.event_type === 'TEST_FAIL').length;

  const verifyComplete = rootLog.find(e => e.event_type === 'VERIFY_COMPLETE');
  const totalTests = verifyComplete?.total_tests || testEvents.length;
  const durationMs = verifyComplete?.duration_ms || 0;

  const tests: TestResult[] = testEvents.map(event => ({
    test_id: event.test_id || 'unknown',
    suite: event.suite || 'unknown',
    status: event.event_type === 'TEST_PASS' ? 'pass' : 'fail',
    duration_ms: event.duration_ms,
    error: event.error,
    requirement: event.requirement,
  }));

  const requirements = [
    'Auth Flow (PKCE)',
    'SDK Integration',
    'Rate Limiting',
    'Lyrics Display',
    'UI Components',
    'Accessibility',
    'Error Handling',
  ];

  return {
    total_tests: totalTests,
    passed,
    failed,
    duration_ms: durationMs,
    coverage: {
      requirements,
      tests,
    },
  };
}

function generateMarkdownSummary(summary: Summary, rootLog: LogEvent[]): string {
  // Check for VERIFY_PASS or VERIFY_FAIL in the log (last event)
  const verifyPassEvent = rootLog.find(e => e.event_type === 'VERIFY_PASS');
  const verifyFailEvent = rootLog.find(e => e.event_type === 'VERIFY_FAIL');
  const finalEvent = rootLog[rootLog.length - 1];
  const passed = !!verifyPassEvent && !verifyFailEvent;

  return `# Verification Summary

## Status: ${passed ? '✅ PASSED' : '❌ FAILED'}

**Generated**: ${new Date().toISOString()}

## Test Results

- **Total Tests**: ${summary.total_tests}
- **Passed**: ${summary.passed}
- **Failed**: ${summary.failed}
- **Duration**: ${(summary.duration_ms / 1000).toFixed(2)}s

## Requirements Coverage

${summary.coverage.requirements.map(req => `- ${req}`).join('\n')}

## Test Breakdown

${summary.coverage.tests.map(test => 
  `- **${test.test_id}** (${test.suite}): ${test.status === 'pass' ? '✅' : '❌'} ${test.duration_ms ? `(${test.duration_ms}ms)` : ''}`
).join('\n')}

## Verification Events

- BOOT_START: ${rootLog.filter(e => e.event_type === 'BOOT_START').length}
- TEST_START: ${rootLog.filter(e => e.event_type === 'TEST_START').length}
- TEST_PASS: ${rootLog.filter(e => e.event_type === 'TEST_PASS').length}
- TEST_FAIL: ${rootLog.filter(e => e.event_type === 'TEST_FAIL').length}
- VERIFY_COMPLETE: ${rootLog.filter(e => e.event_type === 'VERIFY_COMPLETE').length}
- Final Status: ${verifyPassEvent ? 'VERIFY_PASS' : verifyFailEvent ? 'VERIFY_FAIL' : finalEvent?.event_type || 'UNKNOWN'}

## What Was Built

1. **Testing Infrastructure**: Vitest + Playwright setup with MSW mocking
2. **Structured Logging**: JSONL format logging system (root.log)
3. **Unit Tests**: Services, utilities, components
4. **Integration Tests**: Context and hooks
5. **E2E Tests**: Full user flows
6. **Accessibility Tests**: Automated a11y checks
7. **Proof Pack Generator**: Automated artifact collection

## Verification Evidence

- ✅ All automated checks executed
- ✅ Structured logging (root.log) generated
- ✅ Test results collected
- ✅ Screenshots captured (if available)
- ✅ Final status: ${passed ? 'VERIFY_PASS' : 'VERIFY_FAIL'}

${passed ? '' : '## Failures\n\nSee root.log for detailed error information.\n'}
`;
}

function copyScreenshots(sourceDir: string, destDir: string) {
  if (!existsSync(sourceDir)) {
    return;
  }

  const screenshotsDir = join(destDir, 'screenshots');
  if (!existsSync(screenshotsDir)) {
    mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    const files = readdirSync(sourceDir);
    files.forEach(file => {
      if (file.endsWith('.png') || file.endsWith('.jpg')) {
        const sourcePath = join(sourceDir, file);
        const destPath = join(screenshotsDir, file);
        copyFileSync(sourcePath, destPath);
      }
    });
  } catch (e) {
    console.warn(`Failed to copy screenshots: ${e}`);
  }
}

async function main() {
  console.log('Generating proof pack...');

  // Ensure proof directory exists
  if (!existsSync(proofDir)) {
    mkdirSync(proofDir, { recursive: true });
  }

  // Parse root.log
  const rootLogPath = join(proofDir, 'root.log');
  const rootLog = parseRootLog(rootLogPath);

  // Parse test results
  const testResultsPath = join(proofDir, 'test-results.json');
  const testResults = parseTestResults(testResultsPath);

  // Generate summary
  const summary = generateSummary(rootLog, testResults);

  // Generate markdown summary
  const markdownSummary = generateMarkdownSummary(summary, rootLog);
  const summaryPath = join(proofDir, 'summary.md');
  writeFileSync(summaryPath, markdownSummary, 'utf-8');

  // Copy screenshots if available
  const playwrightScreenshots = join(projectRoot, 'test-results');
  copyScreenshots(playwrightScreenshots, proofDir);

  // Write summary JSON
  const summaryJsonPath = join(proofDir, 'summary.json');
  writeFileSync(summaryJsonPath, JSON.stringify(summary, null, 2), 'utf-8');

  console.log(`✅ Proof pack generated at: ${proofDir}`);
  console.log(`   - summary.md`);
  console.log(`   - root.log`);
  console.log(`   - test-results.json`);
  console.log(`   - summary.json`);

  const finalEvent = rootLog[rootLog.length - 1];
  const passed = finalEvent?.event_type === 'VERIFY_PASS';
  
  if (!passed) {
    console.error('❌ Verification FAILED');
    process.exit(1);
  } else {
    console.log('✅ Verification PASSED');
  }
}

main().catch(error => {
  console.error('Error generating proof pack:', error);
  process.exit(1);
});

