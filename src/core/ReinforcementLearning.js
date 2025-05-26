/**
 * Reinforcement Learning module for agent optimization
 * Provides policy-based learning to improve agent performance over time
 */

/**
 * Represents a policy for an agent, containing action weights and preferences
 */
class Policy {
  constructor() {
    this.actionWeights = new Map();
    this.toolPreferences = new Map();
    this.learningRate = 0.01;
    this.discountFactor = 0.95;
    this.explorationRate = 0.1; // For epsilon-greedy exploration
  }

  /**
   * Adjust weights based on reward signal
   * @param {number} rewardSignal - The reward signal (-1 to 1)
   * @param {Object} actionContext - Context of the action that led to this reward
   */
  adjustWeights(rewardSignal, actionContext = {}) {
    if (!actionContext.actionType) return;

    // Get current weight or initialize to 0
    const currentWeight = this.actionWeights.get(actionContext.actionType) || 0;
    
    // Update weight using policy gradient approach
    const newWeight = currentWeight + this.learningRate * rewardSignal;
    this.actionWeights.set(actionContext.actionType, newWeight);

    // If tool was used, update tool preference
    if (actionContext.toolUsed) {
      const currentToolPref = this.toolPreferences.get(actionContext.toolUsed) || 0;
      const newToolPref = currentToolPref + this.learningRate * rewardSignal;
      this.toolPreferences.set(actionContext.toolUsed, newToolPref);
    }

    // Gradually reduce exploration rate as learning progresses
    this.explorationRate = Math.max(0.01, this.explorationRate * 0.999);
  }

  /**
   * Get the best action for a given context
   * @param {Array<string>} availableActions - List of available actions
   * @param {Object} context - Context for decision making
   * @returns {string} - The selected action
   */
  selectAction(availableActions, context = {}) {
    // Epsilon-greedy exploration
    if (Math.random() < this.explorationRate) {
      // Explore: choose random action
      const randomIndex = Math.floor(Math.random() * availableActions.length);
      return availableActions[randomIndex];
    }

    // Exploit: choose best action based on weights
    let bestAction = availableActions[0];
    let bestWeight = this.actionWeights.get(bestAction) || 0;

    for (const action of availableActions) {
      const weight = this.actionWeights.get(action) || 0;
      if (weight > bestWeight) {
        bestWeight = weight;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Get the best tool for a given task
   * @param {Array<string>} availableTools - List of available tools
   * @param {Object} taskContext - Context of the task
   * @returns {string} - The selected tool
   */
  selectTool(availableTools, taskContext = {}) {
    // Similar to selectAction but for tools
    if (Math.random() < this.explorationRate) {
      const randomIndex = Math.floor(Math.random() * availableTools.length);
      return availableTools[randomIndex];
    }

    let bestTool = availableTools[0];
    let bestWeight = this.toolPreferences.get(bestTool) || 0;

    for (const tool of availableTools) {
      const weight = this.toolPreferences.get(tool) || 0;
      if (weight > bestWeight) {
        bestWeight = weight;
        bestTool = tool;
      }
    }

    return bestTool;
  }

  /**
   * Get the current policy state
   * @returns {Object} - The policy state
   */
  getState() {
    return {
      actionWeights: Object.fromEntries(this.actionWeights),
      toolPreferences: Object.fromEntries(this.toolPreferences),
      learningRate: this.learningRate,
      explorationRate: this.explorationRate
    };
  }

  /**
   * Load policy state from saved data
   * @param {Object} state - The policy state to load
   */
  loadState(state) {
    if (state.actionWeights) {
      this.actionWeights = new Map(Object.entries(state.actionWeights));
    }
    if (state.toolPreferences) {
      this.toolPreferences = new Map(Object.entries(state.toolPreferences));
    }
    if (state.learningRate) this.learningRate = state.learningRate;
    if (state.explorationRate) this.explorationRate = state.explorationRate;
  }
}

/**
 * Manages reinforcement learning for agents
 */
class RLManager {
  constructor() {
    this.policies = new Map();
    this.actionHistory = new Map();
    this.rewardHistory = new Map();
    this.maskedTools = new Map();
  }

  /**
   * Get or create a policy for an agent
   * @param {string} agentId - The agent ID
   * @returns {Policy} - The agent's policy
   */
  getPolicy(agentId) {
    if (!this.policies.has(agentId)) {
      this.policies.set(agentId, new Policy());
    }
    return this.policies.get(agentId);
  }

  /**
   * Record an action taken by an agent
   * @param {string} agentId - The agent ID
   * @param {Object} action - The action taken
   */
  recordAction(agentId, action) {
    if (!this.actionHistory.has(agentId)) {
      this.actionHistory.set(agentId, []);
    }
    
    const history = this.actionHistory.get(agentId);
    history.push({
      ...action,
      timestamp: Date.now()
    });
    
    // Keep history manageable
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Optimize agent performance based on reward signal
   * @param {string} agentId - The agent ID
   * @param {number} rewardSignal - The reward signal (-1 to 1)
   * @param {Object} context - Additional context for the optimization
   */
  async optimize(agentId, rewardSignal, context = {}) {
    // Get the agent's policy
    const policy = this.getPolicy(agentId);
    
    // Record the reward
    if (!this.rewardHistory.has(agentId)) {
      this.rewardHistory.set(agentId, []);
    }
    
    const rewardHistory = this.rewardHistory.get(agentId);
    rewardHistory.push({
      reward: rewardSignal,
      context,
      timestamp: Date.now()
    });
    
    // Keep history manageable
    if (rewardHistory.length > 1000) {
      rewardHistory.shift();
    }
    
    // Get the most recent action as context for the adjustment
    const actionHistory = this.actionHistory.get(agentId) || [];
    const recentAction = actionHistory.length > 0 ? actionHistory[actionHistory.length - 1] : {};
    
    // Adjust policy weights based on reward
    policy.adjustWeights(rewardSignal, {
      ...recentAction,
      ...context
    });
    
    // Apply action masking if needed
    if (rewardSignal < -0.5 && context.toolUsed) {
      this.maskTool(agentId, context.toolUsed, context.duration || 3600000); // Default 1 hour
    }
    
    return policy.getState();
  }

  /**
   * Mask a tool for an agent (prevent its use)
   * @param {string} agentId - The agent ID
   * @param {string} toolName - The tool to mask
   * @param {number} duration - Duration in milliseconds
   */
  maskTool(agentId, toolName, duration = 3600000) {
    if (!this.maskedTools.has(agentId)) {
      this.maskedTools.set(agentId, new Map());
    }
    
    const agentMasks = this.maskedTools.get(agentId);
    agentMasks.set(toolName, {
      until: Date.now() + duration,
      reason: 'Negative reward received for tool usage'
    });
  }

  /**
   * Check if a tool is masked for an agent
   * @param {string} agentId - The agent ID
   * @param {string} toolName - The tool to check
   * @returns {boolean} - Whether the tool is masked
   */
  isToolMasked(agentId, toolName) {
    const agentMasks = this.maskedTools.get(agentId);
    if (!agentMasks) return false;
    
    const mask = agentMasks.get(toolName);
    if (!mask) return false;
    
    // Check if mask has expired
    if (mask.until < Date.now()) {
      agentMasks.delete(toolName);
      return false;
    }
    
    return true;
  }

  /**
   * Get available tools for an agent (excluding masked ones)
   * @param {string} agentId - The agent ID
   * @param {Array<string>} allTools - All possible tools
   * @returns {Array<string>} - Available tools
   */
  getAvailableTools(agentId, allTools) {
    return allTools.filter(tool => !this.isToolMasked(agentId, tool));
  }

  /**
   * Deploy an updated policy to an agent
   * @param {string} agentId - The agent ID
   * @param {Policy} policy - The policy to deploy
   */
  async deployUpdatedPolicy(agentId, policy) {
    // This would integrate with the agent system to update its behavior
    // For now, we just update our stored policy
    this.policies.set(agentId, policy);
    
    // In a real implementation, this might involve:
    // 1. Updating the agent's decision-making parameters
    // 2. Adjusting tool preferences
    // 3. Modifying task delegation strategies
    
    return true;
  }

  /**
   * Get performance metrics for an agent
   * @param {string} agentId - The agent ID
   * @returns {Object} - Performance metrics
   */
  getPerformanceMetrics(agentId) {
    const rewards = this.rewardHistory.get(agentId) || [];
    const actions = this.actionHistory.get(agentId) || [];
    
    // Calculate average reward
    const avgReward = rewards.length > 0
      ? rewards.reduce((sum, r) => sum + r.reward, 0) / rewards.length
      : 0;
    
    // Calculate success rate
    const successfulActions = actions.filter(a => a.success).length;
    const successRate = actions.length > 0
      ? successfulActions / actions.length
      : 0;
    
    return {
      averageReward: avgReward,
      successRate: successRate,
      totalActions: actions.length,
      totalRewards: rewards.length,
      maskedTools: Array.from(this.maskedTools.get(agentId)?.keys() || [])
    };
  }
}

// Create a global instance for use throughout the application
const globalRLManager = new RLManager();

module.exports = {
  Policy,
  RLManager,
  globalRLManager
};