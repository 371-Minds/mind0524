/**
 * @typedef {Object} MemoryConfig
 * @property {('short-term'|'long-term')} type - Type of memory for the agent
 * @property {boolean} [persistent=false] - Whether the memory should persist across sessions
 * @property {number} [expiryTime] - Time in milliseconds after which entries expire (for short-term memory)
 */

/**
 * @typedef {Object} LLMConfig
 * @property {string} [provider='openai'] - The LLM provider to use
 * @property {string} [model] - The specific model to use
 * @property {number} [temperature=0.7] - Temperature for generation (0-1)
 * @property {number} [maxTokens=2048] - Maximum tokens for generation
 * @property {Object} [providerConfig] - Provider-specific configuration
 */

/**
 * @typedef {Object} AgentBlueprint
 * @property {string} [id] - Optional ID for the agent (generated if not provided)
 * @property {string} role - The role of the agent (e.g., CEO, CFO, CTO)
 * @property {string[]} [tools] - Array of tool names that the agent can use
 * @property {MemoryConfig|string} [memory] - Memory configuration or type string
 * @property {LLMConfig|string} [llm] - LLM configuration or model string
 * @property {Object} [metadata] - Additional metadata for the agent
 * @property {boolean} [useReinforcementLearning=true] - Whether to use reinforcement learning
 */

/**
 * @typedef {Object} TaskDefinition
 * @property {string} id - Unique identifier for the task
 * @property {string} type - Type of task (e.g., 'strategic', 'delegation', 'analysis')
 * @property {string} description - Human-readable description of the task
 * @property {string} [priority='medium'] - Priority level ('low', 'medium', 'high')
 * @property {Date} [deadline] - Deadline for task completion
 * @property {string[]} [requirements] - Required capabilities or knowledge
 * @property {Object} [data] - Additional task-specific data
 * @property {number} [expectedTime] - Expected execution time in milliseconds
 */

module.exports = {}; // Just exporting the JSDoc type definitions