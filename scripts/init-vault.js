#!/usr/bin/env node

/**
 * Initialize dotenv-vault for secrets management
 * This script helps set up the dotenv-vault environment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

console.log('Initializing dotenv-vault for secrets management...');

// Check if .env file exists
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.log('Creating .env file from .env.example...');
  const exampleEnvPath = path.join(__dirname, '../.env.example');
  if (fs.existsSync(exampleEnvPath)) {
    const exampleEnv = fs.readFileSync(exampleEnvPath, 'utf8');
    fs.writeFileSync(envPath, exampleEnv);
    console.log('.env file created successfully.');
  } else {
    console.error('Error: .env.example file not found.');
    process.exit(1);
  }
}

// Generate a secure encryption key if not present
const envContent = fs.readFileSync(envPath, 'utf8');
if (!envContent.includes('ENCRYPTION_KEY=') || envContent.includes('ENCRYPTION_KEY=generate_a_32_byte_key_and_store_securely')) {
  console.log('Generating secure encryption key...');
  const encryptionKey = crypto.randomBytes(32).toString('hex');
  const updatedEnvContent = envContent.replace(
    /ENCRYPTION_KEY=.*/,
    `ENCRYPTION_KEY=${encryptionKey}`
  );
  fs.writeFileSync(envPath, updatedEnvContent);
  console.log('Encryption key generated and saved to .env file.');
}

// Initialize dotenv-vault
try {
  console.log('Initializing dotenv-vault...');
  execSync('npx dotenv-vault new', { stdio: 'inherit' });
  console.log('dotenv-vault initialized successfully.');
  
  console.log('\nNext steps:');
  console.log('1. Run "npm run vault:login" to log in to dotenv-vault');
  console.log('2. Run "npm run vault:push" to push your .env file to the vault');
  console.log('3. Run "npm run vault:build" to build the encrypted .env.vault file');
  console.log('\nFor more information, visit https://www.dotenv.org/docs/');
} catch (error) {
  console.error('Error initializing dotenv-vault:', error.message);
  console.log('Please try running "npx dotenv-vault new" manually.');
}