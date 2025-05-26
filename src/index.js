/**
 * Main entry point for the autonomous agent framework
 */

const AgentFactory = require('./core/AgentFactory');
const { globalKnowledgeGraph } = require('./core/KnowledgeGraph');
const { globalRLManager } = require('./core/ReinforcementLearning');

// Initialize the framework
async function initializeFramework() {
  console.log('Initializing autonomous agent framework...');
  
  // Create the CEO agent
  const ceo = await AgentFactory.createAgent({
    role: 'CEO',
    tools: ['planning', 'delegation', 'evaluation'],
    memory: { type: 'long-term', persistent: true },
    llm: 'gpt-4-turbo'
  });
  
  // Create sub-agents
  const cfo = await AgentFactory.createAgent({
    role: 'CFO',
    tools: ['financial-analysis', 'budgeting', 'forecasting'],
    memory: { type: 'long-term', persistent: true },
    llm: 'gpt-4'
  });
  
  const cto = await AgentFactory.createAgent({
    role: 'CTO',
    tools: ['code-review', 'architecture', 'tech-evaluation'],
    memory: { type: 'long-term', persistent: true },
    llm: 'gpt-4'
  });
  
  // Seed the knowledge graph with initial domain knowledge
  seedKnowledgeGraph();
  
  // Connect agents in the knowledge graph
  globalKnowledgeGraph.addNode({
    type: 'agent',
    content: JSON.stringify(ceo.getStatus()),
    metadata: { role: 'CEO' },
    source: 'system'
  });
  
  globalKnowledgeGraph.addNode({
    type: 'agent',
    content: JSON.stringify(cfo.getStatus()),
    metadata: { role: 'CFO' },
    source: 'system'
  });
  
  globalKnowledgeGraph.addNode({
    type: 'agent',
    content: JSON.stringify(cto.getStatus()),
    metadata: { role: 'CTO' },
    source: 'system'
  });
  
  // Execute a strategic task with the CEO
  const strategicTask = {
    id: 'task-001',
    type: 'strategic-planning',
    description: 'Develop a 3-month roadmap for the autonomous agent framework',
    priority: 'high',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  };
  
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
  const knowledgeResults = globalKnowledgeGraph.semanticSearch('distributed architecture performance', {
    limit: 3
  });
  
  console.log('Knowledge graph results for "distributed architecture performance":');
  knowledgeResults.forEach(result => {
    console.log(`- ${result.node.type} (${result.similarity.toFixed(2)}): ${result.node.content.substring(0, 100)}...`);
  });
  
  // Print knowledge graph statistics
  console.log('Knowledge Graph Statistics:', globalKnowledgeGraph.getStatistics());
  
  // Final status
  console.log('CEO status:', ceo.getStatus());
  console.log('Sub-agents:', [cfo.getStatus(), cto.getStatus()]);
  console.log('Delegated task status:', techResult);
}

/**
 * Seed the knowledge graph with initial domain knowledge
 */
function seedKnowledgeGraph() {
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
  const nodeIds = concepts.map(concept => {
    const node = globalKnowledgeGraph.addNode(concept);
    return node.id;
  });
  
  // Connect related concepts
  globalKnowledgeGraph.connectNodes(nodeIds[0], nodeIds[1], 'related_to', 0.8);
  globalKnowledgeGraph.connectNodes(nodeIds[2], nodeIds[3], 'related_to', 0.7);
  
  console.log(`Seeded knowledge graph with ${concepts.length} concepts`);
}

// Run the framework
initializeFramework().catch(error => {
  console.error('Error initializing framework:', error);
});