/**
 * Example demonstrating the centralized knowledge graph functionality
 */

const { globalKnowledgeGraph, KnowledgeNode } = require('../src/core/KnowledgeGraph');
const { AgentFactory } = require('../src/agents/AgentFactory');

async function runKnowledgeGraphExample() {
  console.log('Knowledge Graph Example');
  console.log('=======================');
  
  // Create some test agents
  const researchAgent = await AgentFactory.createAgent({
    role: 'ResearchAgent',
    tools: ['web-search', 'document-analysis'],
    memory: { type: 'long-term', persistent: true },
    llm: 'gpt-4'
  });
  
  const marketingAgent = await AgentFactory.createAgent({
    role: 'MarketingAgent',
    tools: ['content-generation', 'social-media'],
    memory: { type: 'long-term', persistent: true },
    llm: 'gpt-4'
  });
  
  // Add domain knowledge to the graph
  console.log('\nAdding domain knowledge to the graph...');
  
  // Add some documents
  const documentNodes = [
    {
      type: 'document',
      content: 'Machine learning models require significant data for training. The quality of data directly impacts model performance.',
      metadata: { domain: 'AI', category: 'machine-learning', importance: 'high' },
      source: 'research-database'
    },
    {
      type: 'document',
      content: 'Natural language processing has advanced significantly with transformer architectures like BERT and GPT.',
      metadata: { domain: 'AI', category: 'nlp', importance: 'high' },
      source: 'research-database'
    },
    {
      type: 'document',
      content: 'Marketing campaigns targeting specific customer segments show 25% higher engagement rates.',
      metadata: { domain: 'Marketing', category: 'segmentation', importance: 'medium' },
      source: 'marketing-database'
    }
  ];
  
  const documentNodeIds = documentNodes.map(doc => {
    const node = globalKnowledgeGraph.addNode(doc);
    console.log(`Added document: ${doc.content.substring(0, 50)}...`);
    return node.id;
  });
  
  // Connect related documents
  globalKnowledgeGraph.connectNodes(documentNodeIds[0], documentNodeIds[1], 'related_to', 0.7);
  console.log('Connected machine learning and NLP documents');
  
  // Simulate agents performing tasks and logging insights
  console.log('\nSimulating agent tasks and knowledge generation...');
  
  // Research agent task
  const researchTask = {
    id: 'research-001',
    type: 'research',
    description: 'Analyze recent advances in natural language processing',
    priority: 'medium'
  };
  
  console.log(`Research agent executing task: ${researchTask.description}`);
  const researchResult = await researchAgent.executeTask(researchTask);
  
  // Marketing agent task
  const marketingTask = {
    id: 'marketing-001',
    type: 'content-creation',
    description: 'Create content about AI applications in marketing',
    priority: 'high'
  };
  
  console.log(`Marketing agent executing task: ${marketingTask.description}`);
  const marketingResult = await marketingAgent.executeTask(marketingTask);
  
  // Manually add some insights (normally this would happen automatically during task execution)
  const insightNode = globalKnowledgeGraph.addNode({
    type: 'insight',
    content: JSON.stringify({
      observation: 'Combining NLP techniques with marketing segmentation creates highly personalized customer experiences',
      evidence: 'Cross-domain analysis of NLP capabilities and marketing campaign data',
      confidence: 0.85
    }),
    metadata: { 
      domains: ['AI', 'Marketing'],
      categories: ['nlp', 'personalization'],
      importance: 'high'
    },
    source: marketingAgent.id
  });
  
  console.log('Added cross-domain insight connecting NLP and marketing');
  
  // Connect the insight to related documents
  globalKnowledgeGraph.connectNodes(insightNode.id, documentNodeIds[1], 'derived_from', 0.9);
  globalKnowledgeGraph.connectNodes(insightNode.id, documentNodeIds[2], 'applied_to', 0.8);
  
  // Demonstrate semantic search
  console.log('\nPerforming semantic searches...');
  
  const nlpSearchResults = globalKnowledgeGraph.semanticSearch('natural language processing advancements', {
    limit: 2
  });
  
  console.log('\nSearch results for "natural language processing advancements":');
  nlpSearchResults.forEach((result, i) => {
    console.log(`${i+1}. ${result.node.type} (similarity: ${result.similarity.toFixed(2)})`);
    console.log(`   ${result.node.content.substring(0, 100)}...`);
  });
  
  const marketingSearchResults = globalKnowledgeGraph.semanticSearch('personalized marketing using AI', {
    limit: 2
  });
  
  console.log('\nSearch results for "personalized marketing using AI":');
  marketingSearchResults.forEach((result, i) => {
    console.log(`${i+1}. ${result.node.type} (similarity: ${result.similarity.toFixed(2)})`);
    console.log(`   ${result.node.content.substring(0, 100)}...`);
  });
  
  // Demonstrate graph traversal
  console.log('\nPerforming graph traversal from the insight node...');
  
  const relatedNodes = globalKnowledgeGraph.traverseGraph(insightNode.id, {
    maxDepth: 2,
    relationshipTypes: ['derived_from', 'applied_to', 'related_to']
  });
  
  console.log(`Found ${relatedNodes.length} nodes connected to the insight:`);
  relatedNodes.forEach((item, i) => {
    console.log(`${i+1}. ${item.node.type} (depth: ${item.depth})`);
    console.log(`   Path: ${formatPath(item.path)}`);
    console.log(`   ${item.node.content.substring(0, 100)}...`);
  });
  
  // Print knowledge graph statistics
  console.log('\nKnowledge Graph Statistics:');
  const stats = globalKnowledgeGraph.getStatistics();
  console.log(`- Total nodes: ${stats.totalNodes}`);
  console.log(`- Total connections: ${stats.totalConnections}`);
  console.log(`- Node types: ${JSON.stringify(stats.nodeTypes)}`);
  console.log(`- Average connections per node: ${stats.averageConnectionsPerNode.toFixed(2)}`);
}

/**
 * Format a path for display
 * @param {Array} path - Path array
 * @returns {string} - Formatted path
 */
function formatPath(path) {
  if (path.length === 0) return 'direct connection';
  
  return path.map(step => {
    return `${step.from.substring(0, 6)}...→${step.relationship}→${step.to.substring(0, 6)}...`;
  }).join(' → ');
}

// Run the example
runKnowledgeGraphExample().catch(error => {
  console.error('Error running knowledge graph example:', error);
});