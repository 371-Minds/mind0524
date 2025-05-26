/**
 * KnowledgeGraph.js
 * 
 * This module implements a centralized knowledge graph that unifies agent memories,
 * documents, and insights. It supports both vector-based semantic search and
 * graph-based relational queries.
 */

const { globalRLManager } = require('./ReinforcementLearning');
const { MemoryFactory } = require('./Memory');

// For vector embeddings - in a real implementation, this would use a proper embedding model
class SimpleEmbedding {
  /**
   * Generate a simple embedding vector for text
   * In a real implementation, this would use a proper embedding model like OpenAI's
   * @param {string} text - Text to embed
   * @returns {Array<number>} - Embedding vector
   */
  static generateEmbedding(text) {
    // This is a placeholder implementation
    // In a real system, you would use a proper embedding model
    const vector = new Array(128).fill(0);
    
    // Simple hash-based approach for demo purposes
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      vector[i % vector.length] += charCode / 100;
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }
  
  /**
   * Calculate cosine similarity between two vectors
   * @param {Array<number>} vec1 - First vector
   * @param {Array<number>} vec2 - Second vector
   * @returns {number} - Similarity score (0-1)
   */
  static cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimensions');
    }
    
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }
    
    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    return dotProduct / (mag1 * mag2);
  }
}

/**
 * Represents a node in the knowledge graph
 */
class KnowledgeNode {
  /**
   * @param {Object} options - Node options
   * @param {string} options.id - Unique identifier for the node
   * @param {string} options.type - Type of node (e.g., 'concept', 'document', 'insight')
   * @param {string} options.content - The content of the node
   * @param {Object} options.metadata - Additional metadata
   * @param {string} options.source - Source of the information (e.g., agent ID)
   */
  constructor(options) {
    this.id = options.id;
    this.type = options.type;
    this.content = options.content;
    this.metadata = options.metadata || {};
    this.source = options.source;
    this.createdAt = options.createdAt || new Date();
    this.updatedAt = options.updatedAt || new Date();
    this.embedding = options.embedding || SimpleEmbedding.generateEmbedding(options.content);
    this.connections = new Map(); // Map of connected node IDs to relationship types
  }
  
  /**
   * Add a connection to another node
   * @param {string} nodeId - ID of the node to connect to
   * @param {string} relationship - Type of relationship
   * @param {number} weight - Weight of the connection (0-1)
   */
  addConnection(nodeId, relationship, weight = 1.0) {
    this.connections.set(nodeId, { relationship, weight });
  }
  
  /**
   * Remove a connection to another node
   * @param {string} nodeId - ID of the node to disconnect from
   */
  removeConnection(nodeId) {
    this.connections.delete(nodeId);
  }
  
  /**
   * Update the node's content and regenerate embedding
   * @param {string} content - New content
   */
  updateContent(content) {
    this.content = content;
    this.updatedAt = new Date();
    this.embedding = SimpleEmbedding.generateEmbedding(content);
  }
  
  /**
   * Get all connections for this node
   * @returns {Map} - Map of connections
   */
  getConnections() {
    return this.connections;
  }
  
  /**
   * Convert node to a serializable object
   * @returns {Object} - Serializable representation
   */
  toObject() {
    return {
      id: this.id,
      type: this.type,
      content: this.content,
      metadata: this.metadata,
      source: this.source,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      embedding: this.embedding,
      connections: Array.from(this.connections.entries()).map(([nodeId, data]) => ({
        nodeId,
        relationship: data.relationship,
        weight: data.weight
      }))
    };
  }
  
  /**
   * Create a node from a serialized object
   * @param {Object} obj - Serialized node
   * @returns {KnowledgeNode} - Reconstructed node
   */
  static fromObject(obj) {
    const node = new KnowledgeNode({
      id: obj.id,
      type: obj.type,
      content: obj.content,
      metadata: obj.metadata,
      source: obj.source,
      createdAt: new Date(obj.createdAt),
      updatedAt: new Date(obj.updatedAt),
      embedding: obj.embedding
    });
    
    // Restore connections
    if (obj.connections) {
      obj.connections.forEach(conn => {
        node.addConnection(conn.nodeId, conn.relationship, conn.weight);
      });
    }
    
    return node;
  }
}

/**
 * Centralized Knowledge Graph for the autonomous agent framework
 */
class KnowledgeGraph {
  constructor() {
    this.nodes = new Map(); // Map of node ID to node object
    this.vectorIndex = []; // Simple vector index for semantic search
    this.typeIndices = new Map(); // Map of node type to array of node IDs
    this.sourceIndices = new Map(); // Map of source to array of node IDs
    this.persistentStorage = MemoryFactory.createMemory('long-term', { persistent: true });
    
    // Load persisted knowledge graph if available
    this._loadFromStorage();
  }
  
  /**
   * Add a node to the knowledge graph
   * @param {Object} nodeData - Data for the new node
   * @returns {KnowledgeNode} - The created node
   */
  addNode(nodeData) {
    if (!nodeData.id) {
      nodeData.id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Create the node
    const node = new KnowledgeNode(nodeData);
    
    // Add to main index
    this.nodes.set(node.id, node);
    
    // Add to vector index
    this.vectorIndex.push({
      id: node.id,
      embedding: node.embedding
    });
    
    // Add to type index
    if (!this.typeIndices.has(node.type)) {
      this.typeIndices.set(node.type, []);
    }
    this.typeIndices.get(node.type).push(node.id);
    
    // Add to source index
    if (node.source) {
      if (!this.sourceIndices.has(node.source)) {
        this.sourceIndices.set(node.source, []);
      }
      this.sourceIndices.get(node.source).push(node.id);
    }
    
    // Persist the updated graph
    this._saveToStorage();
    
    return node;
  }
  
  /**
   * Connect two nodes in the graph
   * @param {string} sourceNodeId - Source node ID
   * @param {string} targetNodeId - Target node ID
   * @param {string} relationship - Type of relationship
   * @param {number} weight - Weight of the connection (0-1)
   * @returns {boolean} - Whether the operation was successful
   */
  connectNodes(sourceNodeId, targetNodeId, relationship, weight = 1.0) {
    const sourceNode = this.nodes.get(sourceNodeId);
    const targetNode = this.nodes.get(targetNodeId);
    
    if (!sourceNode || !targetNode) {
      return false;
    }
    
    // Create bidirectional connection
    sourceNode.addConnection(targetNodeId, relationship, weight);
    targetNode.addConnection(sourceNodeId, `inverse_${relationship}`, weight);
    
    // Persist the updated graph
    this._saveToStorage();
    
    return true;
  }
  
  /**
   * Get a node by ID
   * @param {string} nodeId - The node ID
   * @returns {KnowledgeNode|null} - The node or null if not found
   */
  getNode(nodeId) {
    return this.nodes.get(nodeId) || null;
  }
  
  /**
   * Remove a node from the graph
   * @param {string} nodeId - The node ID to remove
   * @returns {boolean} - Whether the operation was successful
   */
  removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    
    // Remove from main index
    this.nodes.delete(nodeId);
    
    // Remove from vector index
    this.vectorIndex = this.vectorIndex.filter(item => item.id !== nodeId);
    
    // Remove from type index
    if (this.typeIndices.has(node.type)) {
      this.typeIndices.set(
        node.type,
        this.typeIndices.get(node.type).filter(id => id !== nodeId)
      );
    }
    
    // Remove from source index
    if (node.source && this.sourceIndices.has(node.source)) {
      this.sourceIndices.set(
        node.source,
        this.sourceIndices.get(node.source).filter(id => id !== nodeId)
      );
    }
    
    // Remove connections to this node from other nodes
    for (const otherNode of this.nodes.values()) {
      otherNode.removeConnection(nodeId);
    }
    
    // Persist the updated graph
    this._saveToStorage();
    
    return true;
  }
  
  /**
   * Perform a semantic search using vector similarity
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @param {number} options.limit - Maximum number of results
   * @param {string} options.type - Filter by node type
   * @param {string} options.source - Filter by source
   * @returns {Array<Object>} - Search results with similarity scores
   */
  semanticSearch(query, options = {}) {
    const limit = options.limit || 10;
    const queryEmbedding = SimpleEmbedding.generateEmbedding(query);
    
    // Calculate similarities
    let results = this.vectorIndex.map(item => {
      const node = this.nodes.get(item.id);
      
      // Apply filters
      if (options.type && node.type !== options.type) return null;
      if (options.source && node.source !== options.source) return null;
      
      const similarity = SimpleEmbedding.cosineSimilarity(queryEmbedding, item.embedding);
      
      return {
        node,
        similarity
      };
    }).filter(Boolean);
    
    // Sort by similarity (descending)
    results.sort((a, b) => b.similarity - a.similarity);
    
    // Limit results
    results = results.slice(0, limit);
    
    return results;
  }
  
  /**
   * Perform a graph traversal to find related nodes
   * @param {string} startNodeId - Starting node ID
   * @param {Object} options - Traversal options
   * @param {number} options.maxDepth - Maximum traversal depth
   * @param {Array<string>} options.relationshipTypes - Types of relationships to follow
   * @param {Array<string>} options.nodeTypes - Types of nodes to include
   * @returns {Array<Object>} - Traversal results
   */
  traverseGraph(startNodeId, options = {}) {
    const maxDepth = options.maxDepth || 2;
    const relationshipTypes = options.relationshipTypes || [];
    const nodeTypes = options.nodeTypes || [];
    
    const startNode = this.nodes.get(startNodeId);
    if (!startNode) return [];
    
    // BFS traversal
    const visited = new Set([startNodeId]);
    const queue = [{ node: startNode, depth: 0, path: [] }];
    const results = [];
    
    while (queue.length > 0) {
      const { node, depth, path } = queue.shift();
      
      // Add to results if it's not the start node
      if (node.id !== startNodeId) {
        // Filter by node type if specified
        if (nodeTypes.length === 0 || nodeTypes.includes(node.type)) {
          results.push({
            node,
            depth,
            path: [...path]
          });
        }
      }
      
      // Stop traversing if we've reached max depth
      if (depth >= maxDepth) continue;
      
      // Traverse connections
      for (const [connectedNodeId, connection] of node.connections.entries()) {
        // Filter by relationship type if specified
        if (relationshipTypes.length > 0 && !relationshipTypes.includes(connection.relationship)) {
          continue;
        }
        
        // Skip already visited nodes
        if (visited.has(connectedNodeId)) continue;
        
        const connectedNode = this.nodes.get(connectedNodeId);
        if (!connectedNode) continue;
        
        visited.add(connectedNodeId);
        queue.push({
          node: connectedNode,
          depth: depth + 1,
          path: [...path, { from: node.id, to: connectedNodeId, relationship: connection.relationship }]
        });
      }
    }
    
    return results;
  }
  
  /**
   * Query the knowledge graph before a task to provide context
   * @param {string} agentId - The agent ID
   * @param {Object} task - The task to be performed
   * @returns {Object} - Relevant knowledge for the task
   */
  queryPreTask(agentId, task) {
    // Extract key terms from the task
    const taskDescription = task.description || '';
    const taskType = task.type || '';
    const combinedText = `${taskType} ${taskDescription}`;
    
    // Perform semantic search
    const semanticResults = this.semanticSearch(combinedText, {
      limit: 5
    });
    
    // Get agent-specific knowledge
    const agentKnowledge = this.getAgentKnowledge(agentId);
    
    // Combine results
    return {
      relevantKnowledge: semanticResults.map(result => ({
        content: result.node.content,
        type: result.node.type,
        similarity: result.similarity,
        metadata: result.node.metadata
      })),
      agentKnowledge: agentKnowledge.slice(0, 3) // Limit to 3 most recent items
    };
  }
  
  /**
   * Log insights after a task is completed
   * @param {string} agentId - The agent ID
   * @param {Object} task - The completed task
   * @param {Object} result - The task result
   * @returns {string} - ID of the created insight node
   */
  logPostTask(agentId, task, result) {
    // Create an insight node
    const insightNode = this.addNode({
      type: 'insight',
      content: JSON.stringify({
        task: task,
        result: result,
        timestamp: new Date().toISOString()
      }),
      metadata: {
        taskType: task.type,
        success: result.success || false,
        executionTime: result.executionTime || 0
      },
      source: agentId
    });
    
    // Connect to related nodes
    const relatedNodes = this.semanticSearch(task.description, {
      limit: 3
    });
    
    relatedNodes.forEach(related => {
      this.connectNodes(insightNode.id, related.node.id, 'related_to', related.similarity);
    });
    
    // Update RL system with knowledge-based context
    if (result.success !== undefined) {
      const rewardSignal = result.success ? 0.5 : -0.3;
      globalRLManager.optimize(agentId, rewardSignal, {
        taskType: task.type,
        knowledgeContext: true,
        insightId: insightNode.id
      });
    }
    
    return insightNode.id;
  }
  
  /**
   * Get knowledge specific to an agent
   * @param {string} agentId - The agent ID
   * @returns {Array<Object>} - Agent-specific knowledge
   */
  getAgentKnowledge(agentId) {
    const nodeIds = this.sourceIndices.get(agentId) || [];
    return nodeIds.map(id => this.nodes.get(id))
      .filter(Boolean)
      .map(node => node.toObject())
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  
  /**
   * Save the knowledge graph to persistent storage
   * @private
   */
  _saveToStorage() {
    const serialized = {
      nodes: Array.from(this.nodes.values()).map(node => node.toObject()),
      version: '1.0',
      timestamp: new Date().toISOString()
    };
    
    this.persistentStorage.store('knowledge_graph', serialized);
  }
  
  /**
   * Load the knowledge graph from persistent storage
   * @private
   */
  _loadFromStorage() {
    const stored = this.persistentStorage.retrieve('knowledge_graph');
    if (!stored) return;
    
    try {
      // Clear current state
      this.nodes.clear();
      this.vectorIndex = [];
      this.typeIndices.clear();
      this.sourceIndices.clear();
      
      // Restore nodes
      stored.nodes.forEach(nodeData => {
        const node = KnowledgeNode.fromObject(nodeData);
        
        // Add to main index
        this.nodes.set(node.id, node);
        
        // Add to vector index
        this.vectorIndex.push({
          id: node.id,
          embedding: node.embedding
        });
        
        // Add to type index
        if (!this.typeIndices.has(node.type)) {
          this.typeIndices.set(node.type, []);
        }
        this.typeIndices.get(node.type).push(node.id);
        
        // Add to source index
        if (node.source) {
          if (!this.sourceIndices.has(node.source)) {
            this.sourceIndices.set(node.source, []);
          }
          this.sourceIndices.get(node.source).push(node.id);
        }
      });
      
      console.log(`Loaded knowledge graph with ${this.nodes.size} nodes`);
    } catch (error) {
      console.error('Error loading knowledge graph:', error);
    }
  }
  
  /**
   * Get statistics about the knowledge graph
   * @returns {Object} - Statistics
   */
  getStatistics() {
    const nodeTypes = {};
    const sourceStats = {};
    let totalConnections = 0;
    
    // Count node types
    for (const node of this.nodes.values()) {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
      sourceStats[node.source] = (sourceStats[node.source] || 0) + 1;
      totalConnections += node.connections.size;
    }
    
    return {
      totalNodes: this.nodes.size,
      totalConnections,
      nodeTypes,
      sourceStats,
      averageConnectionsPerNode: this.nodes.size > 0 ? totalConnections / this.nodes.size : 0
    };
  }
}

// Create a global instance for use throughout the application
const globalKnowledgeGraph = new KnowledgeGraph();

module.exports = {
  KnowledgeNode,
  KnowledgeGraph,
  globalKnowledgeGraph,
  SimpleEmbedding
};