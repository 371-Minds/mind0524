/**
 * Security utilities for the Mind AI Framework
 * Provides functions for secure operations and security scanning
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Generate a secure random string for tokens, keys, etc.
 * @param {number} length - Length of the string to generate
 * @returns {string} - Secure random string
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a password or sensitive data with a salt
 * @param {string} data - Data to hash
 * @param {string} salt - Salt to use (will be generated if not provided)
 * @returns {Object} - Object containing hash and salt
 */
const hashData = (data, salt = null) => {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(data, useSalt, 10000, 64, 'sha512')
    .toString('hex');
  
  return {
    hash,
    salt: useSalt
  };
};

/**
 * Verify hashed data against a plain text input
 * @param {string} plainText - Plain text to verify
 * @param {string} hash - Stored hash
 * @param {string} salt - Salt used for hashing
 * @returns {boolean} - True if match, false otherwise
 */
const verifyHash = (plainText, hash, salt) => {
  const hashVerify = crypto
    .pbkdf2Sync(plainText, salt, 10000, 64, 'sha512')
    .toString('hex');
  
  return hash === hashVerify;
};

/**
 * Encrypt data using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @param {string} key - Encryption key (must be 32 bytes for AES-256)
 * @returns {Object} - Object containing iv, encrypted data, and auth tag
 */
const encryptData = (text, key) => {
  // Convert key to buffer if it's a string
  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');
  
  // Generate initialization vector
  const iv = crypto.randomBytes(16);
  
  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  
  // Encrypt the data
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get auth tag
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    iv: iv.toString('hex'),
    encrypted,
    authTag
  };
};

/**
 * Decrypt data encrypted with AES-256-GCM
 * @param {Object} encryptedData - Object containing iv, encrypted data, and auth tag
 * @param {string} key - Encryption key (must be 32 bytes for AES-256)
 * @returns {string} - Decrypted text
 */
const decryptData = (encryptedData, key) => {
  // Convert key to buffer if it's a string
  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');
  
  // Convert iv and auth tag to buffers
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');
  
  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt the data
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Run a security scan on the codebase
 * @param {string} scanType - Type of scan to run ('dependencies', 'code', 'all')
 * @returns {Object} - Scan results
 */
const runSecurityScan = (scanType = 'all') => {
  const results = {
    timestamp: new Date().toISOString(),
    scanType,
    issues: []
  };

  try {
    // Scan dependencies with npm audit
    if (scanType === 'dependencies' || scanType === 'all') {
      try {
        const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
        const auditResults = JSON.parse(auditOutput);
        
        if (auditResults.vulnerabilities) {
          Object.keys(auditResults.vulnerabilities).forEach(severity => {
            const vulns = auditResults.vulnerabilities[severity];
            Object.keys(vulns).forEach(pkg => {
              results.issues.push({
                type: 'dependency',
                severity,
                package: pkg,
                details: vulns[pkg]
              });
            });
          });
        }
      } catch (error) {
        // If the command fails but returns JSON, we can still parse the vulnerabilities
        if (error.stdout) {
          try {
            const auditResults = JSON.parse(error.stdout);
            if (auditResults.vulnerabilities) {
              Object.keys(auditResults.vulnerabilities).forEach(pkg => {
                const vuln = auditResults.vulnerabilities[pkg];
                results.issues.push({
                  type: 'dependency',
                  severity: vuln.severity,
                  package: pkg,
                  details: vuln
                });
              });
            }
          } catch (parseError) {
            results.issues.push({
              type: 'error',
              severity: 'high',
              details: 'Failed to parse npm audit results'
            });
          }
        } else {
          results.issues.push({
            type: 'error',
            severity: 'high',
            details: 'Failed to run npm audit'
          });
        }
      }
    }

    // Add more scan types as needed
    // For example, you could integrate with tools like ESLint security plugins
    
    return results;
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      scanType,
      error: error.message,
      issues: [{
        type: 'error',
        severity: 'high',
        details: 'Failed to complete security scan'
      }]
    };
  }
};

module.exports = {
  generateSecureToken,
  hashData,
  verifyHash,
  encryptData,
  decryptData,
  runSecurityScan
};