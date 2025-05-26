const Agent = require('./Agent');
const AgentFactory = require('../core/AgentFactory');
const { globalRLManager } = require('../core/ReinforcementLearning');

/**
 * CEO Agent that can create and manage sub-agents
 */
class CEOAgent extends Agent {
  /**
   * @param {import('../interfaces/AgentBlueprint').AgentBlueprint} blueprint - The blueprint for creating this CEO agent
   */
  constructor(blueprint) {
    super({
      ...blueprint,
      role: blueprint.role || 'CEO'
    });
    
    this.subAgents = {};
    this.organizationGoals = [];
    this.delegatedTasks = {};
    this.useReinforcementLearning = blueprint.useReinforcementLearning !== false; // Enable RL by default
  }

  /**
   * Initialize the CEO agent and set up organization goals
   * @param {Array} goals - Initial organization goals
   */
  async initialize(goals = []) {
    await super.initialize();
    this.organizationGoals = goals;
    return this;
  }

  /**
   * Create a new sub-agent with the specified blueprint
   * @param {import('../interfaces/AgentBlueprint').AgentBlueprint} blueprint - The blueprint for the sub-agent
   * @returns {Promise<Agent>} - The created sub-agent
   */
  async createSubAgent(blueprint) {
    const subAgent = await AgentFactory.createAgent(blueprint);
    this.subAgents[subAgent.id] = subAgent;
    console.log(`CEO created sub-agent: ${subAgent.role} with ID: ${subAgent.id}`);
    return subAgent;
  }

  /**
   * Get a sub-agent by ID
   * @param {string} agentId - The ID of the sub-agent
   * @returns {Agent|null} - The sub-agent or null if not found
   */
  getSubAgent(agentId) {
    return this.subAgents[agentId] || null;
  }

  /**
   * Get all sub-agents
   * @returns {Object} - Map of all sub-agents
   */
  getAllSubAgents() {
    return this.subAgents;
  }

  /**
   * Delegate a task to a specific sub-agent
   * @param {string} agentId - The ID of the sub-agent
   * @param {Object} task - The task to delegate
   * @returns {Promise<Object>} - The result of the delegated task
   */
  async delegateTask(agentId, task) {
    const subAgent = this.getSubAgent(agentId);
    if (!subAgent) {
      throw new Error(`Sub-agent with ID ${agentId} not found`);
    }

    const taskId = `task-${Date.now()}`;
    this.delegatedTasks[taskId] = {
      agentId,
      task,
      status: 'delegated',
      delegatedAt: new Date()
    };

    // If RL is enabled, check for tool masking
    if (this.useReinforcementLearning && task.tools) {
      // Filter out masked tools
      const availableTools = globalRLManager.getAvailableTools(agentId, task.tools);
      if (availableTools.length !== task.tools.length) {
        console.log(`CEO restricted tools for ${subAgent.role}: ${task.tools.filter(t => !availableTools.includes(t)).join(', ')}`);
        task.tools = availableTools;
      }
      
      // Record the action for RL
      globalRLManager.recordAction(agentId, {
        actionType: 'task_delegation',
        taskType: task.type,
        toolsProvided: task.tools
      });
    }

    try {
      const startTime = Date.now();
      const result = await subAgent.executeTask(task);
      const executionTime = Date.now() - startTime;
      
      this.delegatedTasks[taskId].status = 'completed';
      this.delegatedTasks[taskId].completedAt = new Date();
      this.delegatedTasks[taskId].result = result;
      this.delegatedTasks[taskId].executionTime = executionTime;
      
      // If RL is enabled, provide a reward signal based on task outcome
      if (this.useReinforcementLearning) {
        let rewardSignal = 0;
        
        // Calculate reward based on task outcome
        if (result.status === 'completed') {
          rewardSignal = 0.5; // Base reward for completion
          
          // Additional reward for quality/efficiency
          if (result.quality === 'high') rewardSignal += 0.3;
          if (executionTime < task.expectedTime) rewardSignal += 0.2;
        } else if (result.status === 'failed') {
          rewardSignal = -0.5; // Negative reward for failure
        }
        
        // Apply the reward to optimize the agent's policy
        await globalRLManager.optimize(agentId, rewardSignal, {
          taskType: task.type,
          toolUsed: result.toolUsed,
          executionTime: executionTime
        });
      }
      
      return result;
    } catch (error) {
      this.delegatedTasks[taskId].status = 'failed';
      this.delegatedTasks[taskId].error = error.message;
      
      // If RL is enabled, provide a negative reward signal for errors
      if (this.useReinforcementLearning) {
        await globalRLManager.optimize(agentId, -0.8, {
          taskType: task.type,
          error: error.message
        });
      }
      
      throw error;
    }
  }

  /**
   * Process a task for the CEO agent
   * @param {Object} task - The task to process
   * @private
   */
  async _processTask(task) {
    console.log(`CEO processing task: ${JSON.stringify(task)}`);
    
    // Analyze task and determine if it should be handled directly or delegated
    if (task.type === 'strategic') {
      // Handle strategic decisions directly
      return this._handleStrategicTask(task);
    } else if (task.type === 'delegation') {
      // Automatically delegate based on task requirements
      return this._autoDelegateTask(task);
    } else if (task.type === 'rl_optimization') {
      // Handle RL-specific tasks
      return this._handleRLOptimizationTask(task);
    } else {
      // Default handling
      return { status: 'completed', message: `CEO handled task: ${task.description}` };
    }
  }

  /**
   * Handle a strategic task
   * @param {Object} task - The strategic task
   * @private
   */
  async _handleStrategicTask(task) {
    // Implementation for strategic decision making
    console.log(`CEO handling strategic task: ${task.description}`);
    
    // Update organization goals if needed
    if (task.updateGoals) {
      this.organizationGoals = [...this.organizationGoals, ...task.newGoals];
    }
    
    return {
      status: 'completed',
      result: 'strategic decision made',
      updatedGoals: this.organizationGoals
    };
  }

  /**
   * Automatically delegate a task to the most appropriate sub-agent
   * @param {Object} task - The task to delegate
   * @private
   */
  async _autoDelegateTask(task) {
    // Find the most appropriate agent for the task based on role and capabilities
    const subAgentEntries = Object.entries(this.subAgents);
    
    if (subAgentEntries.length === 0) {
      throw new Error('No sub-agents available for delegation');
    }
    
    let bestAgentId, bestAgent;
    
    if (this.useReinforcementLearning) {
      // Use RL to select the best agent for this task type
      const agentIds = subAgentEntries.map(([id]) => id);
      const taskContext = { taskType: task.delegatedTask?.type || 'unknown' };
      
      // Get policy for CEO (for agent selection decisions)
      const policy = globalRLManager.getPolicy(this.id);
      
      // Select best agent based on past performance
      bestAgentId = policy.selectAction(agentIds, taskContext);
      bestAgent = this.subAgents[bestAgentId];
      
      console.log(`RL selected ${bestAgent.role} for task type: ${taskContext.taskType}`);
    } else {
      // Simple matching logic - can be enhanced with more sophisticated matching
      [bestAgentId, bestAgent] = subAgentEntries.find(([_, agent]) => 
        agent.role.toLowerCase() === task.requiredRole?.toLowerCase()
      ) || subAgentEntries[0]; // Default to first agent if no match
    }
    
    console.log(`Auto-delegating task to ${bestAgent.role}`);
    return this.delegateTask(bestAgentId, task.delegatedTask);
  }

  /**
   * Handle RL optimization tasks
   * @param {Object} task - The RL optimization task
   * @private
   */
  async _handleRLOptimizationTask(task) {
    if (!this.useReinforcementLearning) {
      return { status: 'skipped', message: 'Reinforcement learning is disabled' };
    }
    
    switch (task.action) {
      case 'provide_feedback':
        return this._processRLFeedback(task.agentId, task.rewardSignal, task.context);
      case 'get_performance':
        return this._getAgentPerformance(task.agentId);
      case 'toggle_rl':
        this.useReinforcementLearning = task.enabled !== false;
        return { 
          status: 'completed', 
          reinforcementLearning: this.useReinforcementLearning ? 'enabled' : 'disabled' 
        };
      default:
        return { status: 'error', message: `Unknown RL action: ${task.action}` };
    }
  }

  /**
   * Process feedback for reinforcement learning
   * @param {string} agentId - The agent ID to provide feedback for
   * @param {number} rewardSignal - The reward signal (-1 to 1)
   * @param {Object} context - Additional context
   * @private
   */
  async _processRLFeedback(agentId, rewardSignal, context = {}) {
    if (!agentId) {
      return { status: 'error', message: 'Agent ID is required for feedback' };
    }
    
    if (typeof rewardSignal !== 'number' || rewardSignal < -1 || rewardSignal > 1) {
      return { status: 'error', message: 'Reward signal must be a number between -1 and 1' };
    }
    
    try {
      const result = await globalRLManager.optimize(agentId, rewardSignal, context);
      return { 
        status: 'completed', 
        message: `Feedback processed for ${this.subAgents[agentId]?.role || 'unknown agent'}`,
        policyState: result
      };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Get performance metrics for an agent
   * @param {string} agentId - The agent ID
   * @private
   */
  _getAgentPerformance(agentId) {
    if (!agentId) {
      // Get performance for all agents
      const performance = {};
      for (const [id, agent] of Object.entries(this.subAgents)) {
        performance[id] = {
          role: agent.role,
          ...globalRLManager.getPerformanceMetrics(id)
        };
      }
      return { status: 'completed', performance };
    }
    
    // Get performance for specific agent
    const agent = this.subAgents[agentId];
    if (!agent) {
      return { status: 'error', message: `Agent with ID ${agentId} not found` };
    }
    
    return { 
      status: 'completed', 
      agentId,
      role: agent.role,
      performance: globalRLManager.getPerformanceMetrics(agentId)
    };
  }

  /**
   * Remove a sub-agent
   * @param {string} agentId - The ID of the sub-agent to remove
   * @returns {boolean} - Whether the agent was successfully removed
   */
  removeSubAgent(agentId) {
    if (this.subAgents[agentId]) {
      delete this.subAgents[agentId];
      return true;
    }
    return false;
  }

  /**
   * Get the status of all delegated tasks
   * @returns {Object} - Status of all delegated tasks
   */
  getDelegatedTasksStatus() {
    return this.delegatedTasks;
  }
}

module.exports = CEOAgent;