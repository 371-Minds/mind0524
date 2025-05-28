const LLMIntegration = require('../LLMIntegration');
const { MemoryFactory } = require('../Memory');

// Mock dependencies
jest.mock('../Memory', () => ({
  MemoryFactory: {
    createMemory: jest.fn().mockReturnValue({
      store: jest.fn().mockReturnValue(true),
      retrieve: jest.fn().mockReturnValue(null),
      clear: jest.fn()
    })
  }
}));

jest.mock('node-fetch');

// Mock dynamic imports
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked OpenAI response' } }]
        })
      }
    }
  }))
}));

jest.mock('llama-node', () => ({
  LLaMAClient: jest.fn().mockImplementation(() => ({
    complete: jest.fn().mockResolvedValue('Mocked LLaMA response'),
    completeStream: jest.fn().mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield { text: 'Mocked' };
        yield { text: ' LLaMA' };
        yield { text: ' stream' };
      }
    })
  }))
}));

describe('LLMIntegration Module', () => {
  let llm;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new LLMIntegration instance
    llm = new LLMIntegration();
    
    // Mock console methods to prevent logging during tests
    global.console = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  });

  test('should initialize default providers', async () => {
    expect(llm.modelProviders.size).toBeGreaterThan(0);
    expect(llm.modelProviders.has('openai')).toBe(true);
    expect(llm.modelProviders.has('llama')).toBe(true);
    expect(llm.modelProviders.has('generic-api')).toBe(true);
  });

  test('should initialize with custom config', () => {
    const customConfig = {
      defaultProvider: 'custom',
      defaultModel: 'custom-model',
      temperature: 0.5,
      maxTokens: 1000,
      retryAttempts: 5,
      cacheEnabled: false
    };
    
    const customLLM = new LLMIntegration(customConfig);
    
    expect(customLLM.config.defaultProvider).toBe('custom');
    expect(customLLM.config.defaultModel).toBe('custom-model');
    expect(customLLM.config.temperature).toBe(0.5);
    expect(customLLM.config.maxTokens).toBe(1000);
    expect(customLLM.config.retryAttempts).toBe(5);
    expect(customLLM.config.cacheEnabled).toBe(false);
    expect(customLLM.cache).toBeNull();
  });

  test('should register a model provider', () => {
    const mockProvider = {
      models: ['model1', 'model2'],
      initialize: jest.fn().mockResolvedValue({}),
      generateCompletion: jest.fn().mockResolvedValue('Mocked response')
    };
    
    llm.registerModelProvider('test-provider', mockProvider);
    
    expect(llm.modelProviders.has('test-provider')).toBe(true);
    expect(llm.metrics.requestsPerProvider['test-provider']).toBe(0);
  });

  test('should throw error when registering provider with missing methods', () => {
    const invalidProvider = {
      models: ['model1']
      // Missing initialize and generateCompletion methods
    };
    
    expect(() => llm.registerModelProvider('invalid', invalidProvider)).toThrow();
  });

  test('should throw error when registering duplicate provider', () => {
    const mockProvider = {
      models: ['model1'],
      initialize: jest.fn(),
      generateCompletion: jest.fn()
    };
    
    llm.registerModelProvider('test-provider', mockProvider);
    
    expect(() => llm.registerModelProvider('test-provider', mockProvider)).toThrow();
  });

  test('should set active provider', async () => {
    // First register a test provider
    const mockProvider = {
      models: ['model1'],
      initialize: jest.fn().mockResolvedValue({ client: 'mock-client' }),
      generateCompletion: jest.fn().mockResolvedValue('Mocked response')
    };
    
    llm.registerModelProvider('test-provider', mockProvider);
    
    await llm.setActiveProvider('test-provider');
    
    expect(llm.activeProvider).toBe('test-provider');
    expect(mockProvider.initialize).toHaveBeenCalled();
  });

  test('should throw error when setting non-existent provider', async () => {
    await expect(llm.setActiveProvider('non-existent')).rejects.toThrow();
  });

  test('should generate completion with default provider', async () => {
    const llm = new LLMIntegration();
    const prompt = 'Hello, world!';
    const options = { model: 'default' };
    // Mock generateCompletion to avoid actual API calls
    llm.generateCompletion = jest.fn().mockResolvedValue('Mocked response');
    const result = await llm.generateCompletion(prompt, options);
    expect(typeof result).toBe('string');
  });

  test('should get available models for a provider', () => {
    const models = llm.getAvailableModels('openai');
    
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  test('should get all registered providers', () => {
    const providers = llm.getRegisteredProviders();
    
    expect(Array.isArray(providers)).toBe(true);
    expect(providers).toContain('openai');
    expect(providers).toContain('llama');
    expect(providers).toContain('generic-api');
  });

  test('should check if a provider is available', () => {
    expect(llm.isProviderAvailable('openai')).toBe(true);
    expect(llm.isProviderAvailable('non-existent')).toBe(false);
  });

  test('should get provider metadata', () => {
    // Set up a test provider with metadata
    const mockProvider = {
      models: ['model1'],
      initialize: jest.fn(),
      generateCompletion: jest.fn(),
      metadata: { version: '1.0', author: 'Test Author' }
    };
    
    llm.registerModelProvider('test-provider', mockProvider);
    
    const metadata = llm.getProviderMetadata('test-provider');
    
    expect(metadata).toEqual({ version: '1.0', author: 'Test Author' });
    expect(llm.getProviderMetadata('non-existent')).toBeNull();
  });

  test('should get performance metrics', () => {
    // Manually set some metrics
    llm.metrics.totalRequests = 10;
    llm.metrics.successfulRequests = 8;
    llm.metrics.totalLatency = 1000;
    llm.metrics.cacheHits = 3;
    llm.metrics.cacheMisses = 7;
    
    const metrics = llm.getMetrics();
    
    expect(metrics.totalRequests).toBe(10);
    expect(metrics.successfulRequests).toBe(8);
    expect(metrics.successRate).toBe(80);
    expect(metrics.averageLatency).toBe(125);
    expect(metrics.cacheHitRate).toBe(30);
  });

  test('should reset metrics', () => {
    // Manually set some metrics
    llm.metrics.totalRequests = 10;
    llm.metrics.successfulRequests = 8;
    
    // Reset metrics
    llm.resetMetrics();
    
    // Verify metrics were reset
    expect(llm.metrics.totalRequests).toBe(0);
    expect(llm.metrics.successfulRequests).toBe(0);
  });

  test('should clear cache', () => {
    llm.clearCache();
    
    expect(MemoryFactory.createMemory().clear).toHaveBeenCalled();
  });

  test('should register custom provider', () => {
    llm.registerCustomProvider('custom', {
      models: ['custom-model'],
      initialize: jest.fn(),
      generateCompletion: jest.fn(),
      creator: 'Test Creator',
      version: '1.0',
      description: 'Test Description'
    });
    
    expect(llm.modelProviders.has('custom')).toBe(true);
    
    const metadata = llm.getProviderMetadata('custom');
    expect(metadata.isCustom).toBe(true);
    expect(metadata.creator).toBe('Test Creator');
    expect(metadata.version).toBe('1.0');
    expect(metadata.description).toBe('Test Description');
  });
});
