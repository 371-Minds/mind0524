/**
 * Agent.js - Enhanced base agent class with improved error handling and capabilities
 * 
 * Improvements:
 * - Better error handling and recovery
 * - Improved task execution with timeouts
 * - Enhanced logging and monitoring
 * - Support for asynchronous tool execution
 * - Standardized messaging protocol
 * - Improved memory management
 */

const { v4: uuidv4 } = require('uuid');
const { globalKnowledgeGraph } = require('../core/KnowledgeGraph');
const { MemoryFactory } = require('../core/Memory');
const LLMIntegration = require('../core/LLMIntegration');
const config = require('../config');
const EventEmitter = require('events');

/**
 * Base Agent class that provides core functionality for all agents
 * @extends EventEmitter
 */
class Agent extends EventEmitter {
  /**
   * @param {import('../interfaces/AgentBlueprint').AgentBlueprint} blueprint - The blueprint for creating this agent
   */
  constructor(blueprint) {
    super();
    
    // Basic properties
    this.id = blueprint.id || `agent-${uuidv4()}`;
    this.role = blueprint.role || 'generic';
    this.tools = [];
    this.memory = null;
    this.llm = null;
    this.createdAt = new Date();
    this.tasks = [];
    this.status = 'initializing';
    this.mailbox = [];
    this.messageHandlers = new Map();
    
    // Process blueprint
    this._processBlueprint(blueprint);
    
    // Set up logging
    this.logger = this._setupLogger();
    
    // Task execution metrics
    this.metrics = {
      tasksExecuted: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    };
  }
  
  /**
   * Process the agent blueprint
   * @param {import('../interfaces/AgentBlueprint').AgentBlueprint} blueprint - The blueprint
   * @private
   */
  _processBlueprint(blueprint) {
    // Process LLM configuration
    if (typeof blueprint.llm === 'string') {
      // Simple string format (model name)
      this.llmConfig = {
        provider: 'openai',
        model: blueprint.llm,
        temperature: 0.7,
        maxTokens: 2048
      };
    } else if (blueprint.llm && typeof blueprint.llm === 'object') {
      // Full configuration object
      this.llmConfig = blueprint.llm;
    } else {
      // Default configuration from role-specific settings or global defaults
      const roleDefaults = config.agents.roles[this.role] || {};
      this.llmConfig = {
        provider: roleDefaults.defaultProvider || config.llm.defaultProvider,
        model: roleDefaults.defaultModel || config.llm.defaultModel,
        temperature: config.llm.temperature,
        maxTokens: config.llm.maxTokens
      };
    }
    
    // Process memory configuration
    if (typeof blueprint.memory === 'string') {
      // Simple string format (memory type)
      this.memoryConfig = {
        type: blueprint.memory,
        namespace: `agent-${this.id}`
      };
    } else if (blueprint.memory && typeof blueprint.memory === 'object') {
      // Full configuration object
      this.memoryConfig = {
        ...blueprint.memory,
        namespace: `agent-${this.id}`
      };
    } else {
      // Default to long-term memory
      this.memoryConfig = {
        type: 'long-term',
        namespace: `agent-${this.id}`
      };
    }
    
    // Process tools configuration
    this.toolNames = Array.isArray(blueprint.tools) 
      ? blueprint.tools 
      : (config.agents.roles[this.role]?.defaultTools || config.agents.defaultTools);
    
    // Store additional metadata
    this.metadata = blueprint.metadata || {};
  }
  
  /**
   * Set up the agent's logger
   * @private
   * @returns {Object} - Logger object
   */
  _setupLogger() {
    // Simple logger implementation
    return {
      debug: (message, ...args) => {
        if (config.logging.level === 'debug') {
          console.debug(`[${this.id}:${this.role}] ${message}`, ...args);
        }
      },
      info: (message, ...args) => {
        if (['debug', 'info'].includes(config.logging.level)) {
          console.info(`[${this.id}:${this.role}] ${message}`, ...args);
        }
      },
      warn: (message, ...args) => {
        if (['debug', 'info', 'warn'].includes(config.logging.level)) {
          console.warn(`[${this.id}:${this.role}] ${message}`, ...args);
        }
      },
      error: (message, ...args) => {
        console.error(`[${this.id}:${this.role}] ${message}`, ...args);
      }
    };
  }

  /**
   * Initialize the agent
   * @returns {Promise<Agent>} - The initialized agent
   */
  async initialize() {
    try {
      this.logger.info('Initializing agent');
      
      await this._setupMemory();
      await this._setupLLM();
      await this._setupTools();
      
      this.status = 'ready';
      this.emit('initialized', { agentId: this.id, role: this.role });
      this.logger.info('Agent initialized successfully');
      
      return this;
    } catch (error) {
      this.status = 'error';
      this.logger.error('Failed to initialize agent:', error);
      throw new Error(`Failed to initialize agent: ${error.message}`);
    }
  }

  /**
   * Set up agent tools
   * @private
   */
  async _setupTools() {
    try {
      this.logger.debug('Setting up tools:', this.toolNames);
      
      // In a real implementation, this would dynamically load tools
      // For now, we'll just create placeholder tool objects
      this.tools = this.toolNames.map(toolName => ({
        name: toolName,
        description: `Tool for ${toolName}`,
        execute: async (params) => {
          this.logger.debug(`Executing tool ${toolName} with params:`, params);
          // This would be replaced with actual tool implementation
          return { success: true, result: `Executed ${toolName}` };
        }
      }));
      
      this.logger.debug(`Set up ${this.tools.length} tools`);
    } catch (error) {
      this.logger.error('Error setting up tools:', error);
      throw new Error(`Failed to set up tools: ${error.message}`);
    }
  }

  /**
   * Set up agent memory
   * @private
   */
  async _setupMemory() {
    try {
      this.logger.debug('Setting up memory with config:', this.memoryConfig);
      this.memory = MemoryFactory.createMemory(this.memoryConfig.type, this.memoryConfig);
      this.logger.debug('Memory setup complete');
    } catch (error) {
      this.logger.error('Error setting up memory:', error);
      throw new Error(`Failed to set up memory: ${error.message}`);
    }
  }

  /**
   * Set up LLM integration
   * @private
   */
  async _setupLLM() {
    try {
      this.logger.debug('Setting up LLM with config:', this.llmConfig);
      
      this.llm = new LLMIntegration(this.llmConfig);
      
      // Set up default provider based on config
      const provider = this.llmConfig.provider || 'openai';
      const providerConfig = this.llmConfig.providerConfig || {};
      
      await this.llm.setActiveProvider(provider, providerConfig);
      this.logger.debug('LLM setup complete');
    } catch (error) {
      this.logger.error('Error setting up LLM:', error);
      throw new Error(`Failed to set up LLM: ${error.message}`);
    }
  }

  /**
   * Execute a task with timeout and error handling
   * @param {Object} task - The task to execute
   * @param {Object} options - Execution options
   * @param {number} [options.timeout] - Timeout in milliseconds
   * @returns {Promise<Object>} - Task execution result
   */
  async executeTask(task, options = {}) {
    const taskId = task.id || `task-${uuidv4()}`;
    const startTime = Date.now();
    
    this.logger.info(`Executing task ${taskId}: ${task.type || 'unknown'}`);
    this.logger.debug('Task details:', task);
    
    // Update metrics
    this.metrics.tasksExecuted++;
    
    // Add task to history
    this.tasks.push({
      id: taskId,
      type: task.type,
      status: 'executing',
      startTime: new Date(startTime),
      task
    });
    
    // Emit task start event
    this.emit('taskStart', { 
      agentId: this.id, 
      taskId, 
      task 
    });
    
    try {
      // Query knowledge graph for relevant context
      const context = await this._getTaskContext(task);
      
      // Create a timeout promise if timeout is specified
      let timeoutId;
      const timeoutPromise = options.timeout 
        ? new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error(`Task execution timed out after ${options.timeout}ms`));
            }, options.timeout);
          })
        : null;
      
      // Execute the task with timeout if specified
      const executionPromise = this._processTask({ ...task, context });
      
      // Wait for execution or timeout
      const result = timeoutPromise
        ? await Promise.race([executionPromise, timeoutPromise])
        : await executionPromise;
      
      // Clear timeout if it was set
      if (timeoutId) clearTimeout(timeoutId);
      
      // Calculate execution time
      const executionTime = Date.now() - startTime;
      
      // Update metrics
      this.metrics.tasksSucceeded++;
      this.metrics.totalExecutionTime += executionTime;
      this.metrics.averageExecutionTime = this.metrics.totalExecutionTime / this.metrics.tasksSucceeded;
      
      // Update task history
      const taskIndex = this.tasks.findIndex(t => t.id === taskId);
      if (taskIndex >= 0) {
        this.tasks[taskIndex] = {
          ...this.tasks[taskIndex],
          status: 'completed',
          endTime: new Date(),
          executionTime,
          result
        };
      }
      
      // Log insights to knowledge graph
      await this._logTaskCompletion(task, result, executionTime);
      
      // Emit task complete event
      this.emit('taskComplete', { 
        agentId: this.id, 
        taskId, 
        executionTime,
        result 
      });
      
      this.logger.info(`Task ${taskId} completed in ${executionTime}ms`);
      this.logger.debug('Task result:', result);
      
      return result;
    } catch (error) {
      // Calculate execution time even for failed tasks
      const executionTime = Date.now() - startTime;
      
      // Update metrics
      this.metrics.tasksFailed++;
      
      // Update task history
      const taskIndex = this.tasks.findIndex(t => t.id === taskId);
      if (taskIndex >= 0) {
        this.tasks[taskIndex] = {
          ...this.tasks[taskIndex],
          status: 'failed',
          endTime: new Date(),
          executionTime,
          error: error.message
        };
      }
      
      // Log failure to knowledge graph
      await this._logTaskFailure(task, error, executionTime);
      
      // Emit task failure event
      this.emit('taskFailed', { 
        agentId: this.id, 
        taskId, 
        executionTime,
        error: error.message 
      });
      
      this.logger.error(`Task ${taskId} failed after ${executionTime}ms:`, error);
      
      return {
        status: 'failed',
        error: error.message,
        taskId
      };
    }
  }
  
  /**
   * Get context for a task from the knowledge graph
   * @param {Object} task - The task
   * @private
   * @returns {Promise<Object>} - Task context
   */
  async _getTaskContext(task) {
    try {
      return await globalKnowledgeGraph.queryPreTask({
        agentId: this.id,
        taskType: task.type,
        taskData: task.data
      });
    } catch (error) {
      this.logger.warn('Failed to get task context from knowledge graph:', error);
      return { error: error.message };
    }
  }
  
  /**
   * Log task completion to knowledge graph
   * @param {Object} task - The task
   * @param {Object} result - The task result
   * @param {number} executionTime - Execution time in milliseconds
   * @private
   */
  async _logTaskCompletion(task, result, executionTime) {
    try {
      await globalKnowledgeGraph.logPostTask({
        agentId: this.id,
        taskType: task.type,
        taskData: task.data,
        result,
        executionTime,
        insights: result.insights || [],
        status: 'completed'
      });
    } catch (error) {
      this.logger.warn('Failed to log task completion to knowledge graph:', error);
    }
  }
  
  /**
   * Log task failure to knowledge graph
   * @param {Object} task - The task
   * @param {Error} error - The error
   * @param {number} executionTime - Execution time in milliseconds
   * @private
   */
  async _logTaskFailure(task, error, executionTime) {
    try {
      await globalKnowledgeGraph.logPostTask({
        agentId: this.id,
        taskType: task.type,
        taskData: task.data,
        error: error.message,
        executionTime,
        status: 'failed'
      });
    } catch (logError) {
      this.logger.warn('Failed to log task failure to knowledge graph:', logError);
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
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      id: this.id,
      role: this.role,
      status: this.status,
      createdAt: this.createdAt,
      tools: this.tools.map(tool => tool.name),
      metrics: this.metrics,
      taskCount: this.tasks.length,
      activeTasks: this.tasks.filter(task => task.status === 'executing').length,
      messageCount: this.mailbox.length
    };
  }

  /**
   * Receive a message from another agent
   * @param {Object} message - The message to receive
   * @returns {Promise<Object>} - Message receipt confirmation
   */
  async receiveMessage(message) {
    if (!message.id) {
      message.id = `msg-${uuidv4()}`;
    }
    
    if (!message.timestamp) {
      message.timestamp = new Date();
    }
    
    this.logger.debug(`Received message ${message.id} of type ${message.type}`, message);
    
    // Add to mailbox
    this.mailbox.push(message);
    
    // Emit message received event
    this.emit('messageReceived', { 
      agentId: this.id, 
      messageId: message.id,
      message 
    });
    
    // Handle message if handler exists
    const handler = this.messageHandlers.get(message.type);
    let handlerResult = null;
    
    if (handler) {
      try {
        handlerResult = await handler(message);
        this.logger.debug(`Handled message ${message.id} with result:`, handlerResult);
      } catch (error) {
        this.logger.error(`Error handling message ${message.id}:`, error);
        handlerResult = { error: error.message };
      }
    }
    
    return { 
      status: 'received',
      messageId: message.id,
      handlerResult
    };
  }

  /**
   * Register a message handler
   * @param {string} messageType - Type of message to handle
   * @param {Function} handler - Handler function
   */
  registerMessageHandler(messageType, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Message handler must be a function');
    }
    
    this.messageHandlers.set(messageType, handler);
    this.logger.debug(`Registered handler for message type: ${messageType}`);
  }

  /**
   * Send a message to another agent
   * @param {string} recipientId - ID of the recipient agent
   * @param {Object} message - The message to send
   * @returns {Promise<Object>} - Message sending result
   */
  async sendMessage(recipientId, message) {
    if (!message.type) {
      throw new Error('Message must have a type');
    }
    
    const fullMessage = {
      id: message.id || `msg-${uuidv4()}`,
      senderId: this.id,
      senderRole: this.role,
      recipientId,
      timestamp: new Date(),
      ...message
    };
    
    this.logger.debug(`Sending message ${fullMessage.id} to ${recipientId}`, fullMessage);
    
    // In a real implementation, this would use a message bus or direct communication
    // For now, we'll just emit an event
    this.emit('messageSent', { 
      agentId: this.id, 
      recipientId,
      message: fullMessage 
    });
    
    return { 
      status: 'sent',
      messageId: fullMessage.id
    };
  }

  /**
   * Get all messages in the mailbox
   * @param {Object} options - Filter options
   * @param {string} [options.type] - Filter by message type
   * @param {string} [options.senderId] - Filter by sender ID
   * @param {boolean} [options.unreadOnly=false] - Only return unread messages
   * @returns {Array} Array of messages
   */
  getMessages(options = {}) {
    let messages = [...this.mailbox];
    
    // Apply filters
    if (options.type) {
      messages = messages.filter(msg => msg.type === options.type);
    }
    
    if (options.senderId) {
      messages = messages.filter(msg => msg.senderId === options.senderId);
    }
    
    if (options.unreadOnly) {
      messages = messages.filter(msg => !msg.read);
    }
    
    return messages;
  }

  /**
   * Mark a message as read
   * @param {string} messageId - ID of the message to mark
   * @returns {boolean} - Whether the operation was successful
   */
  markMessageAsRead(messageId) {
    const index = this.mailbox.findIndex(msg => msg.id === messageId);
    if (index >= 0) {
      this.mailbox[index] = {
        ...this.mailbox[index],
        read: true,
        readAt: new Date()
      };
      return true;
    }
    return false;
  }

  /**
   * Switch LLM provider
   * @param {string} provider - Provider name
   * @param {Object} config - Provider configuration
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async switchLLMProvider(provider, config = {}) {
    try {
      await this.llm.setActiveProvider(provider, config);
      this.logger.info(`Switched LLM provider to ${provider}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to switch LLM provider to ${provider}:`, error);
      return false;
    }
  }

  /**
   * Get current LLM provider info
   * @returns {Object} Provider information
   */
  getLLMInfo() {
    return {
      provider: this.llm.getActiveProvider(),
      availableProviders: this.llm.getRegisteredProviders(),
      currentModel: this.llmConfig.model || this.llm.config.defaultModel,
      metrics: this.llm.getMetrics()
    };
  }

  /**
   * Store data in agent's memory
   * @param {string} key - The key to store under
   * @param {any} value - The value to store
   * @param {Object} options - Storage options
   * @returns {boolean} - Whether the operation was successful
   */
  storeMemory(key, value, options = {}) {
    return this.memory.store(key, value, options);
  }
  
  /**
   * Retrieve data from agent's memory
   * @param {string} key - The key to retrieve
   * @returns {any} - The retrieved value
   */
  retrieveMemory(key) {
    return this.memory.retrieve(key);
  }
  
  /**
   * Get memory statistics
   * @returns {Object} - Memory statistics
   */
  getMemoryStats() {
    return this.memory.getStats();
  }
  
  /**
   * Execute a tool by name
   * @param {string} toolName - Name of the tool to execute
   * @param {Object} params - Tool parameters
   * @returns {Promise<Object>} - Tool execution result
   */
  async executeTool(toolName, params = {}) {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    this.logger.debug(`Executing tool ${toolName} with params:`, params);
    
    try {
      const result = await tool.execute(params);
      this.logger.debug(`Tool ${toolName} execution result:`, result);
      return result;
    } catch (error) {
      this.logger.error(`Error executing tool ${toolName}:`, error);
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }
  
  /**
   * Register a custom LLM provider
   * @param {string} name - Provider name
   * @param {Object} config - Provider configuration
   */
  registerCustomLLM(name, config) {
    this.llm.registerCustomProvider(name, config);
  }
  
  /**
   * Dispose of agent resources
   */
  dispose() {
    this.logger.info('Disposing agent resources');
    
    // Clear all event listeners
    this.removeAllListeners();
    
    // Clean up any resources
    if (this.memory && typeof this.memory.dispose === 'function') {
      this.memory.dispose();
    }
    
    this.status = 'disposed';
  }
}

module.exports = Agent;