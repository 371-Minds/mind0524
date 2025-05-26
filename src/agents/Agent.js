const { globalKnowledgeGraph } = require('../core/KnowledgeGraph');
const { MemoryFactory } = require('../core/Memory');
const LLMIntegration = require('../core/LLMIntegration');

/**
 * Base Agent class that provides core functionality for all agents
 */
class Agent {
  /**
   * @param {import('../interfaces/AgentBlueprint').AgentBlueprint} blueprint - The blueprint for creating this agent
   */
  constructor(blueprint) {
    this.id = blueprint.id;
    this.role = blueprint.role;
    this.tools = [];
    this.memory = null;
    this.llm = null;
    this.createdAt = new Date();
    this.tasks = [];
    this.status = 'initializing';
    this.mailbox = [];
    this.messageHandlers = new Map();
    this.llmConfig = blueprint.llmConfig || {};
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    await this._setupTools();
    await this._setupMemory();
    await this._setupLLM();
    this.status = 'ready';
    return this;
  }

  /**
   * Set up agent tools
   * @private
   */
  async _setupTools() {
    // Implement in subclasses
  }

  /**
   * Set up agent memory
   * @private
   */
  async _setupMemory() {
    const memoryFactory = new MemoryFactory();
    this.memory = memoryFactory.createMemory('long_term');
  }

  /**
   * Set up LLM integration
   * @private
   */
  async _setupLLM() {
    this.llm = new LLMIntegration(this.llmConfig);
    
    // Set up default provider based on config
    const provider = this.llmConfig.provider || 'openai';
    const providerConfig = this.llmConfig.providerConfig || {};
    
    await this.llm.setActiveProvider(provider, providerConfig);
  }

  /**
   * Execute a task
   * @param {Object} task - The task to execute
   */
  async executeTask(task) {
    console.log(`Agent ${this.id} executing task: ${JSON.stringify(task)}`);
    
    try {
      // Query knowledge graph for relevant context
      const context = await globalKnowledgeGraph.queryPreTask({
        agentId: this.id,
        taskType: task.type,
        taskData: task.data
      });

      // Process task with context
      const result = await this._processTask({ ...task, context });

      // Log insights to knowledge graph
      await globalKnowledgeGraph.logPostTask({
        agentId: this.id,
        taskType: task.type,
        taskData: task.data,
        result,
        insights: result.insights || []
      });

      return result;
    } catch (error) {
      console.error(`Task execution failed: ${error.message}`);
      
      // Log failure to knowledge graph
      await globalKnowledgeGraph.logPostTask({
        agentId: this.id,
        taskType: task.type,
        taskData: task.data,
        error: error.message,
        status: 'failed'
      });

      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Process a task - to be implemented by subclasses
   * @param {Object} task - The task to process
   * @private
   */
  async _processTask(task) {
    throw new Error('_processTask must be implemented by subclass');
  }

  /**
   * Get agent status
   * @returns {string} Current status
   */
  getStatus() {
    return this.status;
  }

  /**
   * Receive a message from another agent
   * @param {Object} message - The message to receive
   */
  async receiveMessage(message) {
    this.mailbox.push(message);
    
    // Handle message if handler exists
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      await handler(message);
    }
  }

  /**
   * Register a message handler
   * @param {string} messageType - Type of message to handle
   * @param {Function} handler - Handler function
   */
  registerMessageHandler(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Get all messages in the mailbox
   * @returns {Array} Array of messages
   */
  getMessages() {
    return this.mailbox;
  }

  /**
   * Switch LLM provider
   * @param {string} provider - Provider name
   * @param {Object} config - Provider configuration
   */
  async switchLLMProvider(provider, config = {}) {
    await this.llm.setActiveProvider(provider, config);
  }

  /**
   * Get current LLM provider info
   * @returns {Object} Provider information
   */
  getLLMInfo() {
    return {
      provider: this.llm.getActiveProvider(),
      availableProviders: this.llm.getRegisteredProviders(),
      currentModel: this.llmConfig.model || this.llm.config.defaultModel
    };
  }

  /**
   * Register a custom LLM provider
   * @param {string} name - Provider name
   * @param {Object} config - Provider configuration
   */
  registerCustomLLM(name, config) {
    this.llm.registerCustomProvider(name, config);
  }
}

module.exports = Agent;