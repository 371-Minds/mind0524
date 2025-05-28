#!/usr/bin/env node

/**
 * Automated security scanning script
 * Runs various security checks and generates a report
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { runSecurityScan } = require('../src/utils/security');

// Configuration
const REPORT_DIR = path.join(__dirname, '../security-reports');
const REPORT_FILE = path.join(REPORT_DIR, `security-scan-${new Date().toISOString().split('T')[0]}.json`);

// Ensure reports directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Run the security scan
console.log('Starting security scan...');
const scanResults = runSecurityScan('all');

// Save the results to a file
fs.writeFileSync(REPORT_FILE, JSON.stringify(scanResults, null, 2));
console.log(`Security scan complete. Report saved to ${REPORT_FILE}`);

// Check if there are any high severity issues
const highSeverityIssues = scanResults.issues.filter(issue => issue.severity === 'high');
if (highSeverityIssues.length > 0) {
  console.error(`WARNING: Found ${highSeverityIssues.length} high severity issues!`);
  highSeverityIssues.forEach(issue => {
    console.error(`- ${issue.type}: ${issue.package || ''} ${issue.details.title || issue.details}`);
  });
  process.exit(1);
} else {
  console.log('No high severity issues found.');
}

// Additional security checks can be added here
// For example, running static code analysis tools

// Try to run npm audit fix if there are vulnerabilities
try {
  if (scanResults.issues.length > 0) {
    console.log('Attempting to fix vulnerabilities with npm audit fix...');
    execSync('npm audit fix', { stdio: 'inherit' });
    console.log('Fixes applied. Please review changes and test thoroughly.');
  }
} catch (error) {
  console.error('Failed to automatically fix vulnerabilities:', error.message);
  console.log('Please review the security report and fix issues manually.');
}