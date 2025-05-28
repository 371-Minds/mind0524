/**
 * LLMIntegration.js - Enhanced LLM integration with better error handling and async support
 * 
 * Improvements:
 * - Proper error handling with retries
 * - Streaming support
 * - Caching for cost optimization
 * - Rate limiting to prevent API abuse
 * - Fallback mechanisms for reliability
 * - Metrics collection for performance monitoring
 */

const fetch = require('node-fetch');
const config = require('../config');
const { MemoryFactory } = require('./Memory');

/**
 * LLMIntegration provides a unified interface for different LLM backends
 */
class LLMIntegration {
  /**
   * @param {Object} config - Configuration for the LLM integration
   */
  constructor(userConfig = {}) {
    this.config = {
      defaultProvider: config.llm.defaultProvider,
      defaultModel: config.llm.defaultModel,
      temperature: config.llm.temperature,
      maxTokens: config.llm.maxTokens,
      retryAttempts: 3,
      retryDelay: 1000,
      cacheEnabled: true,
      rateLimitPerMinute: 60,
      ...userConfig
    };
    
    this.modelProviders = new Map();
    this.activeProvider = null;
    this.requestCount = 0;
    this.lastRequestTime = Date.now();
    
    // Set up caching
    this.cache = this.config.cacheEnabled 
      ? MemoryFactory.createMemory('short-term', { 
          expiryTime: 1000 * 60 * 60, // 1 hour cache
          namespace: 'llm_cache'
        })
      : null;
    
    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalLatency: 0,
      requestsPerProvider: {}
    };
    
    // Initialize default providers
    this._initializeDefaultProviders();
  }

  /**
   * Initialize built-in model providers
   * @private
   */
  _initializeDefaultProviders() {
    // OpenAI provider
    this.registerModelProvider('openai', {
      models: config.llm.providers.openai.models,
      initialize: async (config) => {
        try {
          const { OpenAI } = await import('openai');
          return new OpenAI(config);
        } catch (error) {
          console.error('Failed to initialize OpenAI client:', error.message);
          throw new Error('OpenAI client initialization failed. Please check your API key and network connection.');
        }
      },
      generateCompletion: async (client, prompt, options) => {
        try {
          const response = await client.chat.completions.create({
            model: options.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: options.temperature,
            max_tokens: options.maxTokens
          });
          return response.choices[0].message.content;
        } catch (error) {
          throw new LLMError('OpenAI completion failed', error, { provider: 'openai', model: options.model });
        }
      },
      generateStream: async function* (client, prompt, options) {
        try {
          const stream = await client.chat.completions.create({
            model: options.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            stream: true
          });
          
          for await (const chunk of stream) {
            if (chunk.choices[0]?.delta?.content) {
              yield chunk.choices[0].delta.content;
            }
          }
        } catch (error) {
          throw new LLMError('OpenAI stream failed', error, { provider: 'openai', model: options.model });
        }
      }
    });

    // Local LLaMA provider
    this.registerModelProvider('llama', {
      models: config.llm.providers.llama.models,
      initialize: async (config) => {
        try {
          const { LLaMAClient } = await import('llama-node');
          return new LLaMAClient(config);
        } catch (error) {
          console.error('Failed to initialize LLaMA client:', error.message);
          throw new Error('LLaMA client is not available. Please install llama-node package.');
        }
      },
      generateCompletion: async (client, prompt, options) => {
        try {
          return await client.complete(prompt, {
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens
          });
        } catch (error) {
          throw new LLMError('LLaMA completion failed', error, { provider: 'llama', model: options.model });
        }
      },
      generateStream: async function* (client, prompt, options) {
        try {
          const stream = await client.completeStream(prompt, {
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens
          });
          
          for await (const chunk of stream) {
            yield chunk.text;
          }
        } catch (error) {
          throw new LLMError('LLaMA stream failed', error, { provider: 'llama', model: options.model });
        }
      }
    });

    // Generic API provider template
    this.registerModelProvider('generic-api', {
      models: ['default'],
      initialize: async (config) => {
        // Validate required config
        if (!config.apiKey || !config.endpoint) {
          throw new Error('Generic API provider requires apiKey and endpoint in config');
        }
        return config;
      },
      generateCompletion: async (clientConfig, prompt, options) => {
        try {
          const response = await fetch(clientConfig.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${clientConfig.apiKey}`
            },
            body: JSON.stringify({
              prompt,
              model: options.model,
              temperature: options.temperature,
              max_tokens: options.maxTokens
            })
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          return data.choices?.[0]?.text || data.text || '';
        } catch (error) {
          throw new LLMError('Generic API completion failed', error, { provider: 'generic-api' });
        }
      }
    });
  }

  /**
   * Register a new model provider
   * @param {string} providerName - Unique identifier for the provider
   * @param {Object} provider - Provider configuration and methods
   */
  registerModelProvider(providerName, provider) {
    if (this.modelProviders.has(providerName)) {
      throw new Error(`Provider ${providerName} already registered`);
    }

    // Validate required methods
    if (!provider.initialize || typeof provider.initialize !== 'function') {
      throw new Error(`Provider ${providerName} must have an initialize method`);
    }
    
    if (!provider.generateCompletion || typeof provider.generateCompletion !== 'function') {
      throw new Error(`Provider ${providerName} must have a generateCompletion method`);
    }

    this.modelProviders.set(providerName, {
      client: null,
      models: provider.models || ['default'],
      initialize: provider.initialize,
      generateCompletion: provider.generateCompletion,
      generateStream: provider.generateStream || null,
      metadata: provider.metadata || {}
    });
    
    // Initialize metrics for this provider
    this.metrics.requestsPerProvider[providerName] = 0;
  }

  /**
   * Set active model provider
   * @param {string} providerName - Name of the provider to activate
   * @param {Object} config - Provider-specific configuration
   */
  async setActiveProvider(providerName, config = {}) {
    const provider = this.modelProviders.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    try {
      if (!provider.client) {
        provider.client = await provider.initialize(config);
      }

      this.activeProvider = providerName;
      return true;
    } catch (error) {
      console.error(`Failed to set active provider ${providerName}:`, error.message);
      throw new Error(`Failed to initialize provider ${providerName}: ${error.message}`);
    }
  }

  /**
   * Generate completion using the active provider
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated completion
   */
  async generateCompletion(prompt, options = {}) {
    if (!this.activeProvider) {
      throw new Error('No active provider set');
    }

    // Check rate limiting
    this._checkRateLimit();
    
    // Update metrics
    this.metrics.totalRequests++;
    this.metrics.requestsPerProvider[this.activeProvider]++;
    
    const generationOptions = {
      model: options.model || this.config.defaultModel,
      temperature: options.temperature || this.config.temperature,
      maxTokens: options.maxTokens || this.config.maxTokens,
      ...options
    };
    
    // Check cache if enabled
    const cacheKey = this._generateCacheKey(prompt, generationOptions);
    if (this.cache && !options.skipCache) {
      const cachedResult = this.cache.retrieve(cacheKey);
      if (cachedResult) {
        this.metrics.cacheHits++;
        return cachedResult;
      }
      this.metrics.cacheMisses++;
    }

    const provider = this.modelProviders.get(this.activeProvider);
    
    // Implement retry logic
    let attempts = 0;
    let lastError = null;
    
    const startTime = Date.now();
    
    while (attempts < this.config.retryAttempts) {
      try {
        const result = await provider.generateCompletion(
          provider.client, 
          prompt, 
          generationOptions
        );
        
        // Update metrics
        this.metrics.successfulRequests++;
        this.metrics.totalLatency += (Date.now() - startTime);
        
        // Cache the result if caching is enabled
        if (this.cache && !options.skipCache) {
          this.cache.store(cacheKey, result);
        }
        
        return result;
      } catch (error) {
        attempts++;
        this.metrics.retries++;
        lastError = error;
        
        // If we have more attempts, wait before retrying
        if (attempts < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempts));
        }
      }
    }
    
    // All attempts failed
    this.metrics.failedRequests++;
    
    // Try fallback provider if specified
    if (options.fallbackProvider && options.fallbackProvider !== this.activeProvider) {
      try {
        console.log(`Falling back to provider ${options.fallbackProvider}`);
        const originalProvider = this.activeProvider;
        await this.setActiveProvider(options.fallbackProvider);
        const result = await this.generateCompletion(prompt, { ...options, fallbackProvider: null });
        await this.setActiveProvider(originalProvider);
        return result;
      } catch (fallbackError) {
        console.error('Fallback provider also failed:', fallbackError);
      }
    }
    
    throw new LLMError(
      `Failed to generate completion after ${attempts} attempts`, 
      lastError,
      { provider: this.activeProvider, model: generationOptions.model }
    );
  }
  
  /**
   * Generate a streaming completion
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {AsyncGenerator<string>} Stream of generated text chunks
   */
  async *generateCompletionStream(prompt, options = {}) {
    if (!this.activeProvider) {
      throw new Error('No active provider set');
    }
    
    const provider = this.modelProviders.get(this.activeProvider);
    if (!provider.generateStream) {
      throw new Error(`Provider ${this.activeProvider} does not support streaming`);
    }
    
    // Check rate limiting
    this._checkRateLimit();
    
    // Update metrics
    this.metrics.totalRequests++;
    this.metrics.requestsPerProvider[this.activeProvider]++;
    
    const generationOptions = {
      model: options.model || this.config.defaultModel,
      temperature: options.temperature || this.config.temperature,
      maxTokens: options.maxTokens || this.config.maxTokens,
      ...options
    };
    
    try {
      const startTime = Date.now();
      const stream = provider.generateStream(provider.client, prompt, generationOptions);
      
      for await (const chunk of stream) {
        yield chunk;
      }
      
      // Update metrics
      this.metrics.successfulRequests++;
      this.metrics.totalLatency += (Date.now() - startTime);
    } catch (error) {
      this.metrics.failedRequests++;
      throw new LLMError(
        'Stream generation failed', 
        error,
        { provider: this.activeProvider, model: generationOptions.model }
      );
    }
  }
  
  /**
   * Check if we're exceeding the rate limit
   * @private
   */
  _checkRateLimit() {
    const now = Date.now();
    const timeWindow = 60 * 1000; // 1 minute in milliseconds
    
    // Reset counter if we're in a new time window
    if (now - this.lastRequestTime > timeWindow) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }
    
    // Check if we're over the limit
    if (this.requestCount >= this.config.rateLimitPerMinute) {
      const waitTime = timeWindow - (now - this.lastRequestTime);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    // Increment the counter
    this.requestCount++;
  }
  
  /**
   * Generate a cache key for a prompt and options
   * @private
   * @param {string} prompt - The prompt
   * @param {Object} options - The generation options
   * @returns {string} - Cache key
   */
  _generateCacheKey(prompt, options) {
    const keyParts = [
      this.activeProvider,
      options.model,
      options.temperature.toString(),
      options.maxTokens.toString(),
      prompt
    ];
    
    return keyParts.join('::');
  }

  /**
   * Get available models for a provider
   * @param {string} providerName - Name of the provider
   * @returns {Array<string>} List of available models
   */
  getAvailableModels(providerName) {
    const provider = this.modelProviders.get(providerName);
    return provider ? provider.models : [];
  }

  /**
   * Get all registered providers
   * @returns {Array<string>} List of provider names
   */
  getRegisteredProviders() {
    return Array.from(this.modelProviders.keys());
  }

  /**
   * Check if a provider is available
   * @param {string} providerName - Name of the provider to check
   * @returns {boolean} Whether the provider is available
   */
  isProviderAvailable(providerName) {
    return this.modelProviders.has(providerName);
  }

  /**
   * Get the current active provider
   * @returns {string|null} Name of the active provider
   */
  getActiveProvider() {
    return this.activeProvider;
  }

  /**
   * Get provider metadata
   * @param {string} providerName - Name of the provider
   * @returns {Object} Provider metadata
   */
  getProviderMetadata(providerName) {
    const provider = this.modelProviders.get(providerName);
    return provider ? provider.metadata || {} : null;
  }
  
  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    const avgLatency = this.metrics.successfulRequests > 0 
      ? this.metrics.totalLatency / this.metrics.successfulRequests 
      : 0;
    
    return {
      ...this.metrics,
      averageLatency: avgLatency,
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0,
      cacheHitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
        ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100
        : 0
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalLatency: 0,
      requestsPerProvider: {}
    };
    
    // Reinitialize provider-specific metrics
    for (const providerName of this.modelProviders.keys()) {
      this.metrics.requestsPerProvider[providerName] = 0;
    }
  }
  
  /**
   * Clear the completion cache
   */
  clearCache() {
    if (this.cache) {
      this.cache.clear();
    }
  }
  
  /**
   * Register a custom model provider
   * @param {string} name - Provider name
   * @param {Object} config - Provider configuration
   */
  registerCustomProvider(name, config) {
    const customProvider = {
      models: config.models || ['default'],
      initialize: config.initialize || (async () => null),
      generateCompletion: config.generateCompletion || (async () => ''),
      generateStream: config.generateStream || null,
      metadata: {
        isCustom: true,
        creator: config.creator,
        version: config.version,
        description: config.description
      }
    };

    this.registerModelProvider(name, customProvider);
  }
}

/**
 * Custom error class for LLM-related errors
 */
class LLMError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Error} originalError - Original error that caused this
   * @param {Object} context - Additional context
   */
  constructor(message, originalError, context = {}) {
    super(message);
    this.name = 'LLMError';
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date();
  }
  
  /**
   * Get a string representation of the error
   * @returns {string} String representation
   */
  toString() {
    return `${this.name}: ${this.message}\nContext: ${JSON.stringify(this.context)}\nOriginal error: ${this.originalError?.message || 'None'}`;
  }
}

module.exports = LLMIntegration;
module.exports.LLMError = LLMError;
