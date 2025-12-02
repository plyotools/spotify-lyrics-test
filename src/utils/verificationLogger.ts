/**
 * Structured JSONL Logger for Verification
 * Writes structured logs in JSONL format to proof/root.log
 */

import { writeFileSync, mkdirSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

type LogEventType =
  | 'BOOT_START'
  | 'TEST_START'
  | 'TEST_PASS'
  | 'TEST_FAIL'
  | 'READY'
  | 'HEALTHCHECK_OK'
  | 'VERIFY_COMPLETE'
  | 'VERIFY_PASS'
  | 'VERIFY_FAIL';

interface BaseLogEvent {
  timestamp: string;
  event_type: LogEventType;
}

interface BootStartEvent extends BaseLogEvent {
  event_type: 'BOOT_START';
  test_harness: string;
  version?: string;
}

interface TestStartEvent extends BaseLogEvent {
  event_type: 'TEST_START';
  test_id: string;
  suite: string;
  requirement?: string;
}

interface TestPassEvent extends BaseLogEvent {
  event_type: 'TEST_PASS';
  test_id: string;
  duration_ms: number;
}

interface TestFailEvent extends BaseLogEvent {
  event_type: 'TEST_FAIL';
  test_id: string;
  error: string;
  duration_ms: number;
  stack?: string;
}

interface ReadyEvent extends BaseLogEvent {
  event_type: 'READY';
  component: string;
}

interface HealthcheckOkEvent extends BaseLogEvent {
  event_type: 'HEALTHCHECK_OK';
  service: string;
}

interface VerifyCompleteEvent extends BaseLogEvent {
  event_type: 'VERIFY_COMPLETE';
  total_tests: number;
  passed: number;
  failed: number;
  duration_ms: number;
}

interface VerifyPassEvent extends BaseLogEvent {
  event_type: 'VERIFY_PASS';
  summary: string;
}

interface VerifyFailEvent extends BaseLogEvent {
  event_type: 'VERIFY_FAIL';
  reason: string;
  failed_tests: string[];
}

type LogEvent =
  | BootStartEvent
  | TestStartEvent
  | TestPassEvent
  | TestFailEvent
  | ReadyEvent
  | HealthcheckOkEvent
  | VerifyCompleteEvent
  | VerifyPassEvent
  | VerifyFailEvent;

class VerificationLogger {
  private logPath: string;
  private buffer: LogEvent[] = [];
  private isInitialized = false;

  constructor() {
    // Determine log path - use proof/root.log in project root
    const projectRoot = process.cwd();
    const proofDir = join(projectRoot, 'proof');
    this.logPath = join(proofDir, 'root.log');

    // Ensure proof directory exists
    if (!existsSync(proofDir)) {
      mkdirSync(proofDir, { recursive: true });
    }
  }

  private writeEvent(event: LogEvent): void {
    const jsonLine = JSON.stringify(event) + '\n';
    
    try {
      appendFileSync(this.logPath, jsonLine, 'utf-8');
    } catch (error) {
      // Fallback to buffer if file write fails
      this.buffer.push(event);
      console.error('Failed to write to root.log:', error);
    }
  }

  bootStart(testHarness: string, version?: string): void {
    const event: BootStartEvent = {
      timestamp: new Date().toISOString(),
      event_type: 'BOOT_START',
      test_harness: testHarness,
      version,
    };
    this.writeEvent(event);
    this.isInitialized = true;
  }

  testStart(testId: string, suite: string, requirement?: string): void {
    const event: TestStartEvent = {
      timestamp: new Date().toISOString(),
      event_type: 'TEST_START',
      test_id: testId,
      suite,
      requirement,
    };
    this.writeEvent(event);
  }

  testPass(testId: string, durationMs: number): void {
    const event: TestPassEvent = {
      timestamp: new Date().toISOString(),
      event_type: 'TEST_PASS',
      test_id: testId,
      duration_ms: durationMs,
    };
    this.writeEvent(event);
  }

  testFail(testId: string, error: string, durationMs: number, stack?: string): void {
    const event: TestFailEvent = {
      timestamp: new Date().toISOString(),
      event_type: 'TEST_FAIL',
      test_id: testId,
      error,
      duration_ms: durationMs,
      stack,
    };
    this.writeEvent(event);
  }

  ready(component: string): void {
    const event: ReadyEvent = {
      timestamp: new Date().toISOString(),
      event_type: 'READY',
      component,
    };
    this.writeEvent(event);
  }

  healthcheckOk(service: string): void {
    const event: HealthcheckOkEvent = {
      timestamp: new Date().toISOString(),
      event_type: 'HEALTHCHECK_OK',
      service,
    };
    this.writeEvent(event);
  }

  verifyComplete(totalTests: number, passed: number, failed: number, durationMs: number): void {
    const event: VerifyCompleteEvent = {
      timestamp: new Date().toISOString(),
      event_type: 'VERIFY_COMPLETE',
      total_tests: totalTests,
      passed,
      failed,
      duration_ms: durationMs,
    };
    this.writeEvent(event);
  }

  verifyPass(summary: string): void {
    const event: VerifyPassEvent = {
      timestamp: new Date().toISOString(),
      event_type: 'VERIFY_PASS',
      summary,
    };
    this.writeEvent(event);
  }

  verifyFail(reason: string, failedTests: string[]): void {
    const event: VerifyFailEvent = {
      timestamp: new Date().toISOString(),
      event_type: 'VERIFY_FAIL',
      reason,
      failed_tests: failedTests,
    };
    this.writeEvent(event);
  }

  getLogPath(): string {
    return this.logPath;
  }

  clear(): void {
    if (existsSync(this.logPath)) {
      writeFileSync(this.logPath, '', 'utf-8');
    }
    this.buffer = [];
  }
}

// Export singleton instance
export const verificationLogger = new VerificationLogger();

