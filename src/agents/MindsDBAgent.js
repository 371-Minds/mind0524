const Agent = require('./Agent');
const container = require('../core/container');

class MindsDBAgent extends Agent {
  constructor(blueprint) {
    super(blueprint);
    this.llmIntegration = container.get('LLMIntegration');
    this.agentName = blueprint.name || `mindsdb_agent_${Date.now()}`;
  }

  async _execute(task) {
    await this.llmIntegration.setActiveProvider('mindsdb');
    const result = await this.llmIntegration.generateCompletion(task.description, { agentName: this.agentName });
    return result;
  }
}

module.exports = MindsDBAgent;
