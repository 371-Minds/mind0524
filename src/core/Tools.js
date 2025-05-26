/**
 * Base Tool class that all tools will extend
 */
class Tool {
  /**
   * @param {Object} config - Configuration for the tool
   */
  constructor(config = {}) {
    this.name = this.constructor.name;
    this.description = config.description || 'A tool for agents';
    this.config = config;
    this.enabled = true;
  }

  /**
   * Execute the tool with the given parameters
   * @param {Object} params - Parameters for the tool execution
   * @param {Object} context - Context for the tool execution
   * @returns {Promise<Object>} - Result of the tool execution
   */
  async execute(params, context = {}) {
    if (!this.enabled) {
      throw new Error(`Tool ${this.name} is disabled`);
    }
    
    try {
      return await this._run(params, context);
    } catch (error) {
      console.error(`Error executing tool ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Run the tool implementation (to be implemented by subclasses)
   * @param {Object} params - Parameters for the tool execution
   * @param {Object} context - Context for the tool execution
   * @private
   */
  async _run(params, context) {
    throw new Error(`_run method must be implemented by ${this.name}`);
  }

  /**
   * Enable the tool
   */
  enable() {
    this.enabled = true;
    return this;
  }

  /**
   * Disable the tool
   */
  disable() {
    this.enabled = false;
    return this;
  }

  /**
   * Get the tool's metadata
   * @returns {Object} - Tool metadata
   */
  getMetadata() {
    return {
      name: this.name,
      description: this.description,
      enabled: this.enabled,
      config: { ...this.config }
    };
  }
}

/**
 * Tool for searching the web
 */
class WebSearchTool extends Tool {
  constructor(config = {}) {
    super({
      description: 'Search the web for information',
      ...config
    });
  }

  async _run(params, context) {
    // In a real implementation, this would use a search API
    console.log(`Searching the web for: ${params.query}`);
    
    // Simulate a web search result
    return {
      status: 'success',
      results: [
        { title: 'Example result 1', url: 'https://example.com/1', snippet: 'This is an example search result.' },
        { title: 'Example result 2', url: 'https://example.com/2', snippet: 'Another example search result.' }
      ]
    };
  }
}

/**
 * Tool for analyzing data
 */
class DataAnalysisTool extends Tool {
  constructor(config = {}) {
    super({
      description: 'Analyze data and generate insights',
      ...config
    });
  }

  async _run(params, context) {
    // In a real implementation, this would use data analysis libraries
    console.log(`Analyzing data: ${JSON.stringify(params.data)}`);
    
    // Simulate data analysis result
    return {
      status: 'success',
      analysis: {
        summary: 'Data analysis summary',
        insights: ['Insight 1', 'Insight 2'],
        recommendations: ['Recommendation 1', 'Recommendation 2']
      }
    };
  }
}

/**
 * Tool for generating content
 */
class ContentGenerationTool extends Tool {
  constructor(config = {}) {
    super({
      description: 'Generate content based on prompts',
      ...config
    });
  }

  async _run(params, context) {
    // In a real implementation, this would use a language model API
    console.log(`Generating content for prompt: ${params.prompt}`);
    
    // Simulate content generation result
    return {
      status: 'success',
      content: `Generated content based on: ${params.prompt}`,
      metadata: {
        tokens: 150,
        model: 'gpt-4-turbo'
      }
    };
  }
}

/**
 * Tool for sending emails
 */
class EmailTool extends Tool {
  constructor(config = {}) {
    super({
      description: 'Send emails to recipients',
      ...config
    });
  }

  async _run(params, context) {
    // In a real implementation, this would use an email API
    console.log(`Sending email to: ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log(`Body: ${params.body}`);
    
    // Simulate email sending result
    return {
      status: 'success',
      messageId: `email-${Date.now()}`,
      sentAt: new Date().toISOString()
    };
  }
}

/**
 * Tool for scheduling tasks
 */
class SchedulingTool extends Tool {
  constructor(config = {}) {
    super({
      description: 'Schedule tasks and appointments',
      ...config
    });
    this.scheduledTasks = [];
  }

  async _run(params, context) {
    const taskId = `task-${Date.now()}`;
    
    const task = {
      id: taskId,
      title: params.title,
      description: params.description,
      scheduledFor: params.scheduledFor,
      assignedTo: params.assignedTo,
      createdAt: new Date().toISOString()
    };
    
    this.scheduledTasks.push(task);
    console.log(`Scheduled task: ${task.title} for ${task.scheduledFor}`);
    
    return {
      status: 'success',
      taskId,
      task
    };
  }

  /**
   * Get all scheduled tasks
   * @returns {Array} - List of scheduled tasks
   */
  getScheduledTasks() {
    return [...this.scheduledTasks];
  }

  /**
   * Cancel a scheduled task
   * @param {string} taskId - ID of the task to cancel
   * @returns {boolean} - Whether the task was successfully canceled
   */
  cancelTask(taskId) {
    const index = this.scheduledTasks.findIndex(task => task.id === taskId);
    if (index !== -1) {
      this.scheduledTasks.splice(index, 1);
      return true;
    }
    return false;
  }
}

/**
 * Registry for managing available tools
 */
class ToolRegistry {
  constructor() {
    this.tools = {};
  }

  /**
   * Register a tool
   * @param {Tool} tool - The tool to register
   * @returns {ToolRegistry} - The registry instance for chaining
   */
  registerTool(tool) {
    if (!(tool instanceof Tool)) {
      throw new Error('Only Tool instances can be registered');
    }
    
    this.tools[tool.name] = tool;
    return this;
  }

  /**
   * Get a tool by name
   * @param {string} name - Name of the tool to get
   * @returns {Tool|null} - The tool or null if not found
   */
  getTool(name) {
    return this.tools[name] || null;
  }

  /**
   * Get all registered tools
   * @returns {Object} - Map of all registered tools
   */
  getAllTools() {
    return { ...this.tools };
  }

  /**
   * Get tool names
   * @returns {string[]} - Array of tool names
   */
  getToolNames() {
    return Object.keys(this.tools);
  }

  /**
   * Unregister a tool
   * @param {string} name - Name of the tool to unregister
   * @returns {boolean} - Whether the tool was successfully unregistered
   */
  unregisterTool(name) {
    if (this.tools[name]) {
      delete this.tools[name];
      return true;
    }
    return false;
  }

  /**
   * Execute a tool by name
   * @param {string} name - Name of the tool to execute
   * @param {Object} params - Parameters for the tool execution
   * @param {Object} context - Context for the tool execution
   * @returns {Promise<Object>} - Result of the tool execution
   */
  async executeTool(name, params, context = {}) {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    
    return tool.execute(params, context);
  }
}

// Create a global tool registry
const globalToolRegistry = new ToolRegistry();

// Register default tools
globalToolRegistry.registerTool(new WebSearchTool());
globalToolRegistry.registerTool(new DataAnalysisTool());
globalToolRegistry.registerTool(new ContentGenerationTool());
globalToolRegistry.registerTool(new EmailTool());
globalToolRegistry.registerTool(new SchedulingTool());

module.exports = {
  Tool,
  WebSearchTool,
  DataAnalysisTool,
  ContentGenerationTool,
  EmailTool,
  SchedulingTool,
  ToolRegistry,
  globalToolRegistry
};