const { KnowledgeGraph } = require('../KnowledgeGraph');

describe('KnowledgeGraph Module', () => {
  let kg;

  beforeEach(() => {
    kg = new KnowledgeGraph();
  });

  test('should add and retrieve nodes', () => {
    const node = {
      type: 'concept',
      content: 'Test concept',
      metadata: { domain: 'test' },
      source: 'unit-test'
    };
    const addedNode = kg.addNode(node);
    expect(addedNode).toHaveProperty('id');
    expect(kg.nodes.has(addedNode.id)).toBe(true);
  });

  test('should connect nodes', () => {
    const node1 = kg.addNode({ type: 'concept', content: 'Node 1' });
    const node2 = kg.addNode({ type: 'concept', content: 'Node 2' });
    kg.connectNodes(node1.id, node2.id, 'related_to', 0.9);
    expect(node1.getConnections().size).toBeGreaterThan(0);
  });

  test('should perform semantic search', () => {
    kg.addNode({ type: 'concept', content: 'Test search content' });
    const results = kg.semanticSearch('search');
    expect(Array.isArray(results)).toBe(true);
  });
});
