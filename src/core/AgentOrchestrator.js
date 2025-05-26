/**
 * Agent Orchestrator for fault tolerance and scaling
 * 
 * Provides:
 * 1. Agent evaluation and garbage collection based on RL performance
 * 2. Horizontal scaling capabilities using actor model principles
 * 3. Resource management and optimization
 */

const { globalRLManager } = require('./ReinforcementLearning');

// Default performance threshold for agent termination
const DEFAULT_PERFORMANCE_THRESHOLD = 0.3; // Agents with average reward below this are candidates for termination

/**
 * Manages agent lifecycle, scaling, and fault tolerance
 */
class AgentOrchestrator {
  constructor(config = {}) {
    this.performanceThreshold = config.performanceThreshold || DEFAULT_PERFORMANCE_THRESHOLD;
    this.evaluationPeriod = config.evaluationPeriod || 3600000; // Default: evaluate every hour
    this.agents = new Map(); // Map of all managed agents
    this.evaluationTimers = new Map(); // Timers for periodic evaluation
    this.terminatedAgents = []; // History of terminated agents
    
    // Actor model related properties
    this.nodeId = config.nodeId || `node-${Date.now()}`;
    this.clusterNodes = new Set(); // For distributed setup
    this.messageQueue = []; // Simple message queue for actor communication
  }

  /**
   * Register an agent with the orchestrator
   * @param {string} agentId - The agent ID
   * @param {Object} agent - The agent instance
   * @param {Object} options - Registration options
   */
  registerAgent(agentId, agent, options = {}) {
    this.agents.set(agentId, {
      instance: agent,
      role: agent.role,
      createdAt: Date.now(),
      options
    });
    
    // Set up periodic evaluation if enabled
    if (options.enableAutoEvaluation !== false) {
      this.scheduleEvaluation(agentId);
    }
    
    console.log(`AgentOrchestrator: Registered agent ${agent.role} with ID ${agentId}`);
    return agentId;
  }

  /**
   * Schedule periodic evaluation for an agent
   * @param {string} agentId - The agent ID
   * @private
   */
  scheduleEvaluation(agentId) {
    // Clear any existing timer
    if (this.evaluationTimers.has(agentId)) {
      clearInterval(this.evaluationTimers.get(agentId));
    }
    
    // Set up new evaluation timer
    const timerId = setInterval(() => {
      this.evaluateAgent(agentId).catch(err => {
        console.error(`Error evaluating agent ${agentId}:`, err);
      });
    }, this.evaluationPeriod);
    
    this.evaluationTimers.set(agentId, timerId);
  }

  /**
   * Evaluate an agent's performance and take action if needed
   * @param {string} agentId - The agent ID
   * @returns {Promise<Object>} - Evaluation results
   */
  async evaluateAgent(agentId) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Get performance metrics from RL manager
    const metrics = globalRLManager.getPerformanceMetrics(agentId);
    const score = metrics.averageReward;
    
    console.log(`AgentOrchestrator: Evaluated agent ${agentId}, score: ${score}`);
    
    // Check if agent should be terminated
    if (score < this.performanceThreshold && metrics.totalActions > 10) {
      // Only terminate if we have enough data and performance is poor
      return this.terminateAgent(agentId, {
        reason: 'poor_performance',
        score,
        metrics
      });
    }
    
    return {
      status: 'evaluated',
      agentId,
      score,
      metrics,
      action: 'none'
    };
  }

  /**
   * Terminate an agent and free resources
   * @param {string} agentId - The agent ID
   * @param {Object} context - Termination context
   * @returns {Promise<Object>} - Termination results
   */
  async terminateAgent(agentId, context = {}) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    const agent = this.agents.get(agentId);
    
    // Stop evaluation timer
    if (this.evaluationTimers.has(agentId)) {
      clearInterval(this.evaluationTimers.get(agentId));
      this.evaluationTimers.delete(agentId);
    }
    
    // Record termination
    this.terminatedAgents.push({
      agentId,
      role: agent.role,
      terminatedAt: Date.now(),
      ...context
    });
    
    // Remove from active agents
    this.agents.delete(agentId);
    
    console.log(`AgentOrchestrator: Terminated agent ${agentId} (${agent.role}) due to ${context.reason || 'manual termination'}`);
    
    return {
      status: 'terminated',
      agentId,
      role: agent.role,
      reason: context.reason || 'manual_termination'
    };
  }

  /**
   * Get a replacement for a terminated agent
   * @param {string} terminatedAgentId - The ID of the terminated agent
   * @param {Object} blueprint - Blueprint for the new agent
   * @returns {Promise<Object>} - The new agent
   */
  async getReplacementAgent(terminatedAgentId, blueprint) {
    // This would create a new agent with similar capabilities
    // but potentially different parameters or implementation
    const terminatedInfo = this.terminatedAgents.find(a => a.agentId === terminatedAgentId);
    
    if (!terminatedInfo) {
      throw new Error(`No termination record found for agent ${terminatedAgentId}`);
    }
    
    // In a real implementation, this would use AgentFactory to create a new agent
    // with potentially improved parameters based on what we learned
    console.log(`AgentOrchestrator: Creating replacement for terminated ${terminatedInfo.role} agent`);
    
    // For now, we just return the blueprint that would be used
    return {
      status: 'replacement_ready',
      originalAgentId: terminatedAgentId,
      blueprint: {
        ...blueprint,
        role: terminatedInfo.role,
        // Potentially adjust parameters based on what we learned
        adjustedParameters: true
      }
    };
  }

  /**
   * Send a message to an agent (actor model implementation)
   * @param {string} targetAgentId - The target agent ID
   * @param {Object} message - The message to send
   * @returns {Promise<string>} - Message ID
   */
  async sendMessage(targetAgentId, message) {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.messageQueue.push({
      id: messageId,
      sender: this.nodeId,
      target: targetAgentId,
      message,
      timestamp: Date.now(),
      status: 'queued'
    });
    
    // In a real implementation, this would use proper message passing
    // and potentially distribute across nodes in a cluster
    
    // Process the message queue (in a real system, this would be more sophisticated)
    setTimeout(() => this.processMessageQueue(), 0);
    
    return messageId;
  }

  /**
   * Process the message queue (simple actor model implementation)
   * @private
   */
  async processMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    const message = this.messageQueue.shift();
    message.status = 'processing';
    
    try {
      // Check if target agent exists locally
      if (this.agents.has(message.target)) {
        const agent = this.agents.get(message.target).instance;
        
        // Deliver message to agent
        if (typeof agent.receiveMessage === 'function') {
          await agent.receiveMessage(message.message, message.sender);
          message.status = 'delivered';
        } else {
          message.status = 'failed';
          message.error = 'Agent does not implement receiveMessage';
        }
      } else {
        // In a distributed system, would check other nodes
        message.status = 'failed';
        message.error = 'Agent not found';
      }
    } catch (error) {
      message.status = 'failed';
      message.error = error.message;
    }
    
    // Continue processing queue
    if (this.messageQueue.length > 0) {
      setTimeout(() => this.processMessageQueue(), 0);
    }
  }

  /**
   * Get statistics about managed agents
   * @returns {Object} - Orchestrator statistics
   */
  getStatistics() {
    return {
      activeAgents: this.agents.size,
      terminatedAgents: this.terminatedAgents.length,
      messageQueueSize: this.messageQueue.length,
      nodeId: this.nodeId,
      clusterSize: this.clusterNodes.size + 1, // Include self
      performanceThreshold: this.performanceThreshold
    };
  }

  /**
   * Clean up resources when shutting down
   */
  shutdown() {
    // Clear all evaluation timers
    for (const timerId of this.evaluationTimers.values()) {
      clearInterval(timerId);
    }
    
    this.evaluationTimers.clear();
    this.messageQueue = [];
    
    console.log('AgentOrchestrator: Shutdown complete');
  }
}

// Create a global instance for use throughout the application
const globalAgentOrchestrator = new AgentOrchestrator();

module.exports = {
  AgentOrchestrator,
  globalAgentOrchestrator
};