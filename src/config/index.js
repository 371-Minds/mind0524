/**
 * Central configuration for the autonomous agent framework
 */
module.exports = {
  // Default LLM configuration
  llm: {
    defaultProvider: 'openai',
    defaultModel: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    providers: {
      openai: {
        models: ['gpt-4', 'gpt-3.5-turbo']
      },
      llama: {
        models: ['llama-2-7b', 'llama-2-13b', 'llama-2-70b']
      }
    }
  },
  
  // Memory configuration
  memory: {
    shortTerm: {
      defaultExpiryTime: 1000 * 60 * 30 // 30 minutes
    },
    longTerm: {
      persistent: true,
      storageType: 'file', // 'file', 'database', etc.
      storagePath: './data/memory'
    }
  },
  
  // Knowledge graph configuration
  knowledgeGraph: {
    embeddingDimension: 128,
    similarityThreshold: 0.7,
    persistent: true,
    storagePath: './data/knowledge'
  },
  
  // Agent configuration
  agents: {
    defaultTools: ['search', 'analyze', 'communicate'],
    roles: {
      CEO: {
        defaultTools: ['planning', 'delegation', 'evaluation'],
        defaultModel: 'gpt-4-turbo'
      },
      CFO: {
        defaultTools: ['financial-analysis', 'budgeting', 'forecasting'],
        defaultModel: 'gpt-4'
      },
      CTO: {
        defaultTools: ['code-review', 'architecture', 'tech-evaluation'],
        defaultModel: 'gpt-4'
      }
    }
  },
  
  // Reinforcement learning configuration
  reinforcementLearning: {
    enabled: true,
    learningRate: 0.01,
    discountFactor: 0.9,
    explorationRate: 0.1
  },
  
  // Logging configuration
  logging: {
    level: 'info', // 'debug', 'info', 'warn', 'error'
    format: 'json', // 'json', 'text'
    destination: 'console' // 'console', 'file'
  }
};