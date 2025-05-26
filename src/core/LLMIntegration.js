/**
 * LLMIntegration provides a unified interface for different LLM backends
 */
class LLMIntegration {
  constructor(config = {}) {
    this.config = {
      defaultModel: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2048,
      ...config
    };
    
    this.modelProviders = new Map();
    this.activeProvider = null;
    
    // Initialize default providers
    this._initializeDefaultProviders();
  }

  /**
   * Initialize built-in model providers
   * @private
   */
  _initializeDefaultProviders() {
    // OpenAI (SOTA) provider
    this.registerModelProvider('openai', {
      models: ['gpt-4', 'gpt-3.5-turbo'],
      initialize: async (config) => {
        const { OpenAI } = await import('openai');
        return new OpenAI(config);
      },
      generateCompletion: async (client, prompt, options) => {
        const response = await client.chat.completions.create({
          model: options.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature,
          max_tokens: options.maxTokens
        });
        return response.choices[0].message.content;
      }
    });

    // Local LLaMA provider
    this.registerModelProvider('llama', {
      models: ['llama-2-7b', 'llama-2-13b', 'llama-2-70b'],
      initialize: async (config) => {
        
        return new LLaMAClient(config);
      },
      generateCompletion: async (client, prompt, options) => {
        return client.complete(prompt, {
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens
        });
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

    this.modelProviders.set(providerName, {
      client: null,
      ...provider
    });
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

    if (!provider.client) {
      provider.client = await provider.initialize(config);
    }

    this.activeProvider = providerName;
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

    const provider = this.modelProviders.get(this.activeProvider);
    const generationOptions = {
      model: options.model || this.config.defaultModel,
      temperature: options.temperature || this.config.temperature,
      maxTokens: options.maxTokens || this.config.maxTokens,
      ...options
    };

    return provider.generateCompletion(provider.client, prompt, generationOptions);
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
      metadata: {
        isCustom: true,
        creator: config.creator,
        version: config.version,
        description: config.description
      }
    };

    this.registerModelProvider(name, customProvider);
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
}

module.exports = LLMIntegration;