const fs = require('fs');
const path = require('path');
const { safeMerge } = require('../utils/safeUtils');

// Load default config
const defaultConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../config.json'), 'utf-8'));

// Environment variable mappings
const envConfig = {
    llm: {
        defaultProvider: process.env.LLM_DEFAULT_PROVIDER,
        defaultModel: process.env.LLM_DEFAULT_MODEL,
        temperature: process.env.LLM_TEMPERATURE ? parseFloat(process.env.LLM_TEMPERATURE) : undefined,
        maxTokens: process.env.LLM_MAX_TOKENS ? parseInt(process.env.LLM_MAX_TOKENS, 10) : undefined,
    },
    logging: {
        level: process.env.LOG_LEVEL,
        format: process.env.LOG_FORMAT,
        destination: process.env.LOG_DESTINATION,
    },
};

// Clean undefined values from envConfig
Object.keys(envConfig).forEach(key => {
    Object.keys(envConfig[key]).forEach(subKey => {
        if (envConfig[key][subKey] === undefined) {
            delete envConfig[key][subKey];
        }
    });
    if (Object.keys(envConfig[key]).length === 0) {
        delete envConfig[key];
    }
});

module.exports = safeMerge(defaultConfig, envConfig);