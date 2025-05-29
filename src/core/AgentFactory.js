/**
 * AgentFactory.js - Enhanced factory for creating agents with improved error handling
 * 
 * Improvements:
 * - Dynamic agent class loading
 * - Better error handling
 * - Agent validation
 * - Blueprint preprocessing
 * - Agent lifecycle management
 */

// Import Agent and config without Node.js modules
const Agent = require('../agents/Agent');
const config = require('../config');

/**
 * Factory class for creating different types of agents
 */
class AgentFactory {
  // Registry of agent classes
  static customAgentClasses = new Map();
  
  // Registry of created agents
  static agentRegistry = new Map();
  
  /**
   * Create an agent based on the provided blueprint
   * @param {import('../interfaces/AgentBlueprint').AgentBlueprint} blueprint - The blueprint for the agent
   * @returns {Promise<Agent>} - The created agent
   */
  static async createAgent(blueprint) {
    try {
      // Validate and preprocess blueprint
      const processedBlueprint = this._preprocessBlueprint(blueprint);
      
      // Get the appropriate agent class
      const AgentClass = await this._resolveAgentClass(processedBlueprint.role);
      
      // Create and initialize the agent
      const agent = new AgentClass(processedBlueprint);
      await agent.initialize();
      
      // Register the agent
      this._registerAgent(agent);
      
      return agent;
    } catch (error) {
      console.error(`Failed to create agent: ${error.message}`);
      throw new Error(`Agent creation failed: ${error.message}`);
    }
  }
  
  /**
   * Preprocess and validate the agent blueprint
   * @param {import('../interfaces/AgentBlueprint').AgentBlueprint} blueprint - The blueprint to process
   * @returns {import('../interfaces/AgentBlueprint').AgentBlueprint} - The processed blueprint
   * @private
   */
  static _preprocessBlueprint(blueprint) {
    // Validate required fields
    if (!blueprint || !blueprint.role) {
      throw new Error('Invalid agent blueprint: role is required');
    }
    
    // Create a copy to avoid modifying the original
    const processedBlueprint = { ...blueprint };
    
    // Apply role-specific defaults from config
    const roleDefaults = config.agents.roles[blueprint.role] || {};
    
    // Set default tools if not provided
    if (!processedBlueprint.tools) {
      processedBlueprint.tools = roleDefaults.defaultTools || config.agents.defaultTools;
    }
    
    // Set default LLM if not provided
    if (!processedBlueprint.llm) {
      processedBlueprint.llm = {
        provider: roleDefaults.defaultProvider || config.llm.defaultProvider,
        model: roleDefaults.defaultModel || config.llm.defaultModel
      };
    }
    
    return processedBlueprint;
  }
  
  /**
   * Resolve the agent class based on role
   * @param {string} role - The agent role
   * @returns {Promise<typeof Agent>} - The agent class
   * @private
   */
  static async _resolveAgentClass(role) {
    // First check custom registered classes
    if (this.customAgentClasses.has(role.toLowerCase())) {
      return this.customAgentClasses.get(role.toLowerCase());
    }
    
    // In browser environment, we can't dynamically load files
    // Instead, you should register all agent classes explicitly using registerAgentClass
    console.warn(`No agent class registered for role ${role}, falling back to generic Agent`);
    
    // Fall back to generic Agent class
    return Agent;
  }
  
  /**
   * Register a created agent in the registry
   * @param {Agent} agent - The agent to register
   * @private
   */
  static _registerAgent(agent) {
    this.agentRegistry.set(agent.id, {
      agent,
      role: agent.role,
      createdAt: new Date()
    });
  }

  /**
   * Register a custom agent class for a specific role
   * @param {string} role - The role for which to register the agent class
   * @param {typeof Agent} AgentClass - The agent class to register
   */
  static registerAgentClass(role, AgentClass) {
    if (!role || typeof role !== 'string') {
      throw new Error('Role must be a non-empty string');
    }

    if (!AgentClass || !(AgentClass.prototype instanceof Agent)) {
      throw new Error('AgentClass must be a subclass of Agent');
    }

    this.customAgentClasses.set(role.toLowerCase(), AgentClass);
  }

  /**
   * Get a registered agent class for a role
   * @param {string} role - The role to get the agent class for
   * @returns {typeof Agent|null} - The agent class or null if not found
   */
  static getAgentClass(role) {
    if (!role || typeof role !== 'string') {
      return null;
    }

    return this.customAgentClasses.get(role.toLowerCase()) || null;
  }
  
  /**
   * Get an agent by ID
   * @param {string} agentId - The agent ID
   * @returns {Agent|null} - The agent or null if not found
   */
  static getAgent(agentId) {
    const entry = this.agentRegistry.get(agentId);
    return entry ? entry.agent : null;
  }
  
  /**
   * Get all registered agents
   * @returns {Map<string, Object>} - Map of agent entries
   */
  static getAllAgents() {
    return this.agentRegistry;
  }
  
  /**
   * Get agents by role
   * @param {string} role - The role to filter by
   * @returns {Array<Agent>} - Array of agents with the specified role
   */
  static getAgentsByRole(role) {
    const agents = [];
    
    for (const [_, entry] of this.agentRegistry.entries()) {
      if (entry.role.toLowerCase() === role.toLowerCase()) {
        agents.push(entry.agent);
      }
    }
    
    return agents;
  }
  
  /**
   * Dispose of an agent and remove it from the registry
   * @param {string} agentId - The agent ID
   * @returns {boolean} - Whether the operation was successful
   */
  static disposeAgent(agentId) {
    const entry = this.agentRegistry.get(agentId);
    if (!entry) return false;
    
    try {
      // Call dispose on the agent if it has that method
      if (typeof entry.agent.dispose === 'function') {
        entry.agent.dispose();
      }
      
      // Remove from registry
      this.agentRegistry.delete(agentId);
      return true;
    } catch (error) {
      console.error(`Failed to dispose agent ${agentId}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Dispose of all agents
   */
  static disposeAllAgents() {
    for (const [agentId] of this.agentRegistry.entries()) {
      this.disposeAgent(agentId);
    }
  }
}

module.exports = AgentFactory;