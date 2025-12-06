/**
 * Automatic logging system for Cursor AI actions
 * Logs to cursor.log at project root
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'cursor.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

function getTimestamp() {
  return new Date().toISOString();
}

function rotateLog() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        const rotatedFile = LOG_FILE + '.1';
        if (fs.existsSync(rotatedFile)) {
          fs.unlinkSync(rotatedFile);
        }
        fs.renameSync(LOG_FILE, rotatedFile);
      }
    }
  } catch (err) {
    // Silently handle rotation errors
  }
}

function writeLog(actionType, details, errors = null) {
  try {
    rotateLog();
    
    const timestamp = getTimestamp();
    let entry = `[${timestamp}] [${actionType}] ${details}`;
    
    if (errors) {
      entry += ` | ERROR: ${errors}`;
    }
    
    entry += '\n';
    
    fs.appendFileSync(LOG_FILE, entry, 'utf8');
  } catch (err) {
    // Silently fail - don't interrupt workflow
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { writeLog, getTimestamp };
}









