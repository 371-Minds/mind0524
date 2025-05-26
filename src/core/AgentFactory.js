const Agent = require('../agents/Agent');
const CEOAgent = require('../agents/CEOAgent');

/**
 * Factory class for creating different types of agents
 */
class AgentFactory {
  /**
   * Create an agent based on the provided blueprint
   * @param {import('../interfaces/AgentBlueprint').AgentBlueprint} blueprint - The blueprint for the agent
   * @returns {Promise<Agent>} - The created agent
   */
  static async createAgent(blueprint) {
    // Validate blueprint
    if (!blueprint || !blueprint.role) {
      throw new Error('Invalid agent blueprint: role is required');
    }

    let agent;

    // Create the appropriate agent type based on role
    switch (blueprint.role.toLowerCase()) {
      case 'ceo':
        agent = new CEOAgent(blueprint);
        break;
      case 'cfo':
        // We'll implement these specialized agents later
        agent = new Agent({...blueprint, role: 'CFO'});
        break;
      case 'cto':
        agent = new Agent({...blueprint, role: 'CTO'});
        break;
      case 'cmo':
        agent = new Agent({...blueprint, role: 'CMO'});
        break;
      case 'coo':
        agent = new Agent({...blueprint, role: 'COO'});
        break;
      default:
        // For any other role, create a generic agent
        agent = new Agent(blueprint);
    }

    // Initialize the agent
    await agent.initialize();
    return agent;
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

    this.customAgentClasses = this.customAgentClasses || {};
    this.customAgentClasses[role.toLowerCase()] = AgentClass;
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

    this.customAgentClasses = this.customAgentClasses || {};
    return this.customAgentClasses[role.toLowerCase()] || null;
  }
}

module.exports = AgentFactory;