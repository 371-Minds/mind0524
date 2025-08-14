/**
 * container.js
 *
 * This module acts as a simple dependency injection container for the core
 * components of the application. It is responsible for creating and managing
 * the instances of the core components and their dependencies.
 */

const DatabaseIntegration = require('./DatabaseIntegration');
const LLMIntegration = require('./LLMIntegration');
const KnowledgeGraph = require('./KnowledgeGraph');
const AgentOrchestrator = require('./AgentOrchestrator');
const { ReinforcementLearningManager } = require('./ReinforcementLearning');

class Container {
  constructor() {
    this.instances = new Map();
  }

  get(key) {
    if (!this.instances.has(key)) {
      const instance = this._createInstance(key);
      this.instances.set(key, instance);
    }
    return this.instances.get(key);
  }

  _createInstance(key) {
    switch (key) {
      case 'DatabaseIntegration':
        return new DatabaseIntegration();
      case 'LLMIntegration':
        return new LLMIntegration({
          db: this.get('DatabaseIntegration'),
        });
      case 'KnowledgeGraph':
        return new KnowledgeGraph({
          db: this.get('DatabaseIntegration'),
          llmIntegration: this.get('LLMIntegration'),
        });
      case 'ReinforcementLearningManager':
        return new ReinforcementLearningManager();
      case 'AgentOrchestrator':
        return new AgentOrchestrator({
          db: this.get('DatabaseIntegration'),
          rlManager: this.get('ReinforcementLearningManager'),
        });
      default:
        throw new Error(`Unknown dependency: ${key}`);
    }
  }
}

const container = new Container();

module.exports = container;
