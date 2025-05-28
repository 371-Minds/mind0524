/**
 * Main entry point for the autonomous agent framework
 * 
 * This file initializes the framework and provides the main API for creating
 * and managing agents, as well as executing tasks.
 */

const AgentFactory = require('./core/AgentFactory');
const { globalKnowledgeGraph } = require('./core/KnowledgeGraph');
const config = require('./config');
const EventEmitter = require('events');

// Create a global event bus for inter-agent communication
const eventBus = new EventEmitter();
eventBus.setMaxListeners(100); // Allow many listeners

/**
 * Framework class that provides the main API for the autonomous agent framework
 */
class Framework {
  constructor() {
    this.initialized = false;
    this.startTime = null;
    
    // Set up event listeners for agent communication
    this._setupEventListeners();
  }
  
  /**
   * Initialize the framework
   * @param {Object} options - Initialization options
   * @returns {Promise<Framework>} - The initialized framework
   */
  async initialize(options = {}) {
    console.log('Initializing autonomous agent framework...');
    this.startTime = Date.now();
    
    try {
      // Seed the knowledge graph with initial domain knowledge
      if (options.seedKnowledge !== false) {
        await this._seedKnowledgeGraph();
      }
      
      // Create default agents if specified
      if (options.createDefaultAgents !== false) {
        await this._createDefaultAgents();
      }
      
      this.initialized = true;
      console.log(`Framework initialized in ${Date.now() - this.startTime}ms`);
      
      return this;
    } catch (error) {
      console.error('Error initializing framework:', error);
      throw new Error(`Framework initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Set up event listeners for agent communication
   * @private
   */
  _setupEventListeners() {
    // Listen for agent messages
    eventBus.on('messageSent', async ({ agentId, recipientId, message }) => {
      try {
        const recipient = AgentFactory.getAgent(recipientId);
        if (recipient) {
          await recipient.receiveMessage(message);
        } else {
          console.warn(`Message sent to unknown agent: ${recipientId}`);
        }
      } catch (error) {
        console.error(`Error delivering message from ${agentId} to ${recipientId}:`, error);
      }
    });
    
    // Listen for agent initialization
    eventBus.on('agentInitialized', ({ agentId, role }) => {
      console.log(`Agent ${agentId} (${role}) initialized`);
    });
    
    // Listen for task completion
    eventBus.on('taskComplete', ({ agentId, taskId, result }) => {
      console.log(`Task ${taskId} completed by agent ${agentId}`);
    });
    
    // Listen for task failure
    eventBus.on('taskFailed', ({ agentId, taskId, error }) => {
      console.warn(`Task ${taskId} failed by agent ${agentId}: ${error}`);
    });
  }
  
  /**
   * Seed the knowledge graph with initial domain knowledge
   * @private
   */
  async _seedKnowledgeGraph() {
    console.log('Seeding knowledge graph with initial domain knowledge...');
    
    // Add some initial domain knowledge
    const concepts = [
      {
        type: 'concept',
        content: 'Autonomous agents are AI systems that can perform tasks with minimal human supervision.',
        metadata: { domain: 'AI', category: 'agents' },
        source: 'system'
      },
      {
        type: 'concept',
        content: 'Reinforcement learning is a machine learning approach where agents learn by interacting with an environment.',
        metadata: { domain: 'AI', category: 'learning' },
        source: 'system'
      },
      {
        type: 'document',
        content: 'Distributed architectures improve scalability by distributing workloads across multiple nodes, but introduce complexity in coordination and consistency.',
        metadata: { domain: 'Architecture', category: 'distributed-systems' },
        source: 'system'
      },
      {
        type: 'document',
        content: 'Actor model is a mathematical model of concurrent computation that treats actors as the universal primitives of computation.',
        metadata: { domain: 'Computer Science', category: 'concurrency' },
        source: 'system'
      }
    ];
    
    // Add concepts to knowledge graph
    const nodeIds = [];
    for (const concept of concepts) {
      const node = await globalKnowledgeGraph.addNode(concept);
      nodeIds.push(node.id);
    }
    
    // Connect related concepts
    await globalKnowledgeGraph.connectNodes(nodeIds[0], nodeIds[1], 'related_to', 0.8);
    await globalKnowledgeGraph.connectNodes(nodeIds[2], nodeIds[3], 'related_to', 0.7);
    
    console.log(`Seeded knowledge graph with ${concepts.length} concepts`);
  }
  
  /**
   * Create default agents
   * @private
   */
  async _createDefaultAgents() {
    console.log('Creating default agents...');
    
    // Create the CEO agent
    const ceo = await this.createAgent({
      role: 'CEO',
      tools: ['planning', 'delegation', 'evaluation'],
      memory: { type: 'long-term', persistent: true },
      llm: 'gpt-4-turbo'
    });
    
    // Create sub-agents
    const cfo = await this.createAgent({
      role: 'CFO',
      tools: ['financial-analysis', 'budgeting', 'forecasting'],
      memory: { type: 'long-term', persistent: true },
      llm: 'gpt-4'
    });
    
    const cto = await this.createAgent({
      role: 'CTO',
      tools: ['code-review', 'architecture', 'tech-evaluation'],
      memory: { type: 'long-term', persistent: true },
      llm: 'gpt-4'
    });
    
    // Connect agents in the knowledge graph
    await globalKnowledgeGraph.addNode({
      type: 'agent',
      content: JSON.stringify(ceo.getStatus()),
      metadata: { role: 'CEO' },
      source: 'system'
    });
    
    await globalKnowledgeGraph.addNode({
      type: 'agent',
      content: JSON.stringify(cfo.getStatus()),
      metadata: { role: 'CFO' },
      source: 'system'
    });
    
    await globalKnowledgeGraph.addNode({
      type: 'agent',
      content: JSON.stringify(cto.getStatus()),
      metadata: { role: 'CTO' },
      source: 'system'
    });
    
    console.log('Default agents created');
    
    return { ceo, cfo, cto };
  }
  
  /**
   * Create an agent
   * @param {import('./interfaces/AgentBlueprint').AgentBlueprint} blueprint - The blueprint for the agent
   * @returns {Promise<import('./agents/Agent')>} - The created agent
   */
  async createAgent(blueprint) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const agent = await AgentFactory.createAgent(blueprint);
    
    // Connect the agent to the event bus
    agent.on('messageSent', data => eventBus.emit('messageSent', data));
    agent.on('initialized', data => eventBus.emit('agentInitialized', data));
    agent.on('taskComplete', data => eventBus.emit('taskComplete', data));
    agent.on('taskFailed', data => eventBus.emit('taskFailed', data));
    
    return agent;
  }
  
  /**
   * Get an agent by ID
   * @param {string} agentId - The agent ID
   * @returns {import('./agents/Agent')|null} - The agent or null if not found
   */
  getAgent(agentId) {
    return AgentFactory.getAgent(agentId);
  }
  
  /**
   * Get all agents
   * @returns {Map<string, Object>} - Map of agent entries
   */
  getAllAgents() {
    return AgentFactory.getAllAgents();
  }
  
  /**
   * Get agents by role
   * @param {string} role - The role to filter by
   * @returns {Array<import('./agents/Agent')>} - Array of agents with the specified role
   */
  getAgentsByRole(role) {
    return AgentFactory.getAgentsByRole(role);
  }
  
  /**
   * Execute a task with an agent
   * @param {string} agentId - The agent ID
   * @param {Object} task - The task to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Task execution result
   */
  async executeTask(agentId, task, options = {}) {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    return agent.executeTask(task, options);
  }
  
  /**
   * Send a message between agents
   * @param {string} fromAgentId - The sender agent ID
   * @param {string} toAgentId - The recipient agent ID
   * @param {Object} message - The message to send
   * @returns {Promise<Object>} - Message sending result
   */
  async sendMessage(fromAgentId, toAgentId, message) {
    const sender = this.getAgent(fromAgentId);
    if (!sender) {
      throw new Error(`Sender agent ${fromAgentId} not found`);
    }
    
    return sender.sendMessage(toAgentId, message);
  }
  
  /**
   * Query the knowledge graph
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Promise<Array<Object>>} - Search results
   */
  async queryKnowledge(query, options = {}) {
    return globalKnowledgeGraph.semanticSearch(query, options);
  }
  
  /**
   * Add knowledge to the knowledge graph
   * @param {Object} knowledge - The knowledge to add
   * @returns {Promise<Object>} - The added node
   */
  async addKnowledge(knowledge) {
    return globalKnowledgeGraph.addNode(knowledge);
  }
  
  /**
   * Shutdown the framework and clean up resources
   */
  async shutdown() {
    console.log('Shutting down framework...');
    
    // Dispose of all agents
    AgentFactory.disposeAllAgents();
    
    // Clean up event listeners
    eventBus.removeAllListeners();
    
    this.initialized = false;
    console.log('Framework shutdown complete');
  }
  
  /**
   * Get framework status
   * @returns {Object} - Framework status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      agentCount: AgentFactory.getAllAgents().size,
      knowledgeGraphStats: globalKnowledgeGraph.getStatistics()
    };
  }
  
  /**
   * Run a demo scenario
   */
  async runDemo() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    console.log('Running demo scenario...');
    
    // Get the CEO and CTO agents
    const ceoAgents = AgentFactory.getAgentsByRole('CEO');
    const ctoAgents = AgentFactory.getAgentsByRole('CTO');
    
    if (ceoAgents.length === 0 || ctoAgents.length === 0) {
      throw new Error('Demo requires CEO and CTO agents');
    }
    
    const ceo = ceoAgents[0];
    const cto = ctoAgents[0];
    
    // Execute a strategic task with the CEO
    const strategicTask = {
      id: 'task-001',
      type: 'strategic-planning',
      description: 'Develop a 3-month roadmap for the autonomous agent framework',
      priority: 'high',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };
    
    console.log('Executing strategic planning task with CEO...');
    const result = await ceo.executeTask(strategicTask);
    console.log('Strategic task result:', result);
    
    // Example of auto-delegation based on requirements
    const techEvaluationTask = {
      id: 'task-002',
      type: 'tech-evaluation',
      description: 'Evaluate the performance implications of switching to a distributed architecture',
      requirements: ['tech-expertise', 'architecture-knowledge']
    };
    
    // This would typically be handled by the CEO's delegation logic
    // For this example, we'll directly delegate to the CTO
    console.log('Delegating tech evaluation task to CTO...');
    const techResult = await cto.executeTask(techEvaluationTask);
    console.log('Tech evaluation result:', techResult);
    
    // Demonstrate knowledge graph querying
    console.log('Querying knowledge graph for "distributed architecture performance"...');
    const knowledgeResults = await this.queryKnowledge('distributed architecture performance', {
      limit: 3
    });
    
    console.log('Knowledge graph results:');
    knowledgeResults.forEach(result => {
      console.log(`- ${result.node.type} (${result.similarity.toFixed(2)}): ${result.node.content.substring(0, 100)}...`);
    });
    
    // Print knowledge graph statistics
    console.log('Knowledge Graph Statistics:', globalKnowledgeGraph.getStatistics());
    
    // Final status
    console.log('Framework status:', this.getStatus());
    console.log('CEO status:', ceo.getStatus());
    console.log('CTO status:', cto.getStatus());
    
    return {
      strategicResult: result,
      techResult: techResult,
      knowledgeResults
    };
  }
}

// Create and export a singleton instance
const framework = new Framework();

// For backward compatibility
async function initializeFramework() {
  await framework.initialize();
  return framework;
}

module.exports = {
  framework,
  initializeFramework,
  AgentFactory,
  globalKnowledgeGraph,
  config,
  eventBus
};