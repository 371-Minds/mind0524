const Agent = require('./Agent');
const { globalKnowledgeGraph } = require('../core/KnowledgeGraph');

/**
 * ComparisonDrafter Agent specialized in creating structured comparisons between tools or products
 * This agent analyzes extracted data and creates comprehensive comparison reports
 * highlighting key differences, similarities, and recommendations.
 */
class ComparisonDrafterAgent extends Agent {
  /**
   * @param {import('../interfaces/AgentBlueprint').AgentBlueprint} blueprint - The blueprint for creating this agent
   */
  constructor(blueprint) {
    super({
      ...blueprint,
      role: blueprint.role || 'ComparisonDrafter'
    });
    
    this.comparisonTemplates = {};
    this.draftHistory = [];
    this.evaluationMetrics = {};
  }

  /**
   * Initialize the ComparisonDrafter agent with specialized tools
   */
  async initialize() {
    await super.initialize();
    
    // Add ComparisonDrafter-specific initialization
    this.comparisonTemplates = {
      standard: {
        sections: [
          'Introduction',
          'Overview',
          'Feature Comparison',
          'Pricing Comparison',
          'Strengths and Weaknesses',
          'Use Case Analysis',
          'Recommendation'
        ],
        format: 'markdown'
      },
      detailed: {
        sections: [
          'Executive Summary',
          'Introduction',
          'Methodology',
          'Product Overview',
          'Feature-by-Feature Analysis',
          'Pricing Structure Analysis',
          'Performance Evaluation',
          'User Experience Assessment',
          'Integration Capabilities',
          'Support and Documentation',
          'Strengths and Weaknesses',
          'Best-Fit Scenarios',
          'Conclusion and Recommendations'
        ],
        format: 'markdown'
      },
      brief: {
        sections: [
          'Overview',
          'Key Differences',
          'Pricing',
          'Recommendation'
        ],
        format: 'markdown'
      }
    };
    
    // Initialize evaluation metrics
    this.evaluationMetrics = {
      featureCompleteness: {
        weight: 0.3,
        description: 'Comprehensiveness of feature coverage'
      },
      pricingClarity: {
        weight: 0.2,
        description: 'Clarity and accuracy of pricing information'
      },
      useCaseAlignment: {
        weight: 0.25,
        description: 'Alignment with specific use cases'
      },
      objectivity: {
        weight: 0.15,
        description: 'Balanced presentation of strengths and weaknesses'
      },
      actionability: {
        weight: 0.1,
        description: 'Clear guidance for decision making'
      }
    };
    
    return this;
  }

  /**
   * Process a task for the ComparisonDrafter agent
   * @param {Object} task - The task to process
   * @private
   */
  async _processTask(task) {
    console.log(`ComparisonDrafter processing task: ${JSON.stringify(task)}`);
    
    switch (task.type) {
      case 'create_comparison':
        return this.createComparison(task.data);
      case 'update_comparison':
        return this.updateComparison(task.data);
      case 'generate_summary':
        return this.generateSummary(task.data);
      case 'evaluate_comparison':
        return this.evaluateComparison(task.data);
      default:
        return { status: 'completed', message: `ComparisonDrafter handled general task: ${task.description}` };
    }
  }

  /**
   * Create a structured comparison between tools or products
   * @param {Object} data - Data containing the tools to compare
   * @returns {Promise<Object>} - The comparison draft
   */
  async createComparison(data) {
    console.log(`Creating comparison for tools: ${data.tools.map(t => t.name).join(', ')}`);
    
    // Select template based on detail level
    const templateKey = data.detailLevel || 'standard';
    const template = this.comparisonTemplates[templateKey] || this.comparisonTemplates.standard;
    
    // Create the comparison structure
    const comparison = {
      title: data.title || `Comparison: ${data.tools.map(t => t.name).join(' vs ')}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      template: templateKey,
      tools: data.tools,
      projectContext: data.projectContext || null,
      userPreferences: data.userPreferences || null,
      sections: {}
    };
    
    // Generate content for each section
    for (const section of template.sections) {
      comparison.sections[section] = await this._generateSectionContent(section, data.tools, data);
    }
    
    // Add to draft history
    this.draftHistory.push({
      id: `comparison_${Date.now()}`,
      title: comparison.title,
      toolCount: data.tools.length,
      timestamp: new Date(),
      template: templateKey
    });
    
    // Store in knowledge graph for future reference
    const nodeId = await this._storeInKnowledgeGraph(comparison);
    
    return {
      status: 'completed',
      data: {
        comparison,
        format: template.format,
        nodeId
      },
      message: `Created ${templateKey} comparison between ${data.tools.length} tools`
    };
  }

  /**
   * Update an existing comparison with new information
   * @param {Object} data - Data containing the comparison to update
   * @returns {Promise<Object>} - The updated comparison
   */
  async updateComparison(data) {
    console.log(`Updating comparison: ${data.comparisonId}`);
    
    // Retrieve the existing comparison
    let comparison;
    if (data.comparisonId) {
      const node = globalKnowledgeGraph.getNode(data.comparisonId);
      if (node) {
        comparison = JSON.parse(node.content);
      }
    }
    
    if (!comparison) {
      return {
        status: 'error',
        message: 'Comparison not found'
      };
    }
    
    // Update the comparison with new data
    comparison.updatedAt = new Date();
    
    // Update tools if provided
    if (data.tools) {
      comparison.tools = data.tools;
    }
    
    // Update specific sections if provided
    if (data.sections) {
      for (const [sectionName, content] of Object.entries(data.sections)) {
        comparison.sections[sectionName] = content;
      }
    }
    
    // Regenerate sections if requested
    if (data.regenerateSections && Array.isArray(data.regenerateSections)) {
      for (const section of data.regenerateSections) {
        comparison.sections[section] = await this._generateSectionContent(section, comparison.tools, data);
      }
    }
    
    // Update in knowledge graph
    const nodeId = await this._storeInKnowledgeGraph(comparison);
    
    return {
      status: 'completed',
      data: {
        comparison,
        nodeId
      },
      message: `Updated comparison ${data.comparisonId}`
    };
  }

  /**
   * Generate a summary of a comparison
   * @param {Object} data - Data containing the comparison to summarize
   * @returns {Promise<Object>} - The generated summary
   */
  async generateSummary(data) {
    console.log(`Generating summary for comparison: ${data.comparisonId || 'new'}`);
    
    let comparison;
    
    // Get existing comparison if ID provided
    if (data.comparisonId) {
      const node = globalKnowledgeGraph.getNode(data.comparisonId);
      if (node) {
        comparison = JSON.parse(node.content);
      }
    } else if (data.comparison) {
      comparison = data.comparison;
    } else if (data.tools) {
      // Create a minimal comparison object if just tools provided
      comparison = {
        title: `Comparison: ${data.tools.map(t => t.name).join(' vs ')}`,
        tools: data.tools,
        sections: {}
      };
    } else {
      return {
        status: 'error',
        message: 'No comparison data provided'
      };
    }
    
    // Generate the summary
    const summary = {
      title: `Summary: ${comparison.title}`,
      createdAt: new Date(),
      toolNames: comparison.tools.map(t => t.name),
      keyDifferences: [],
      keyStrengths: {},
      recommendation: '',
      format: 'markdown'
    };
    
    // Extract key differences
    if (comparison.sections['Key Differences']) {
      summary.keyDifferences = comparison.sections['Key Differences'];
    } else if (comparison.sections['Feature Comparison'] || comparison.sections['Feature-by-Feature Analysis']) {
      const featureSection = comparison.sections['Feature Comparison'] || comparison.sections['Feature-by-Feature Analysis'];
      // Extract key differences from feature comparison
      // This would be more sophisticated in a real implementation
      summary.keyDifferences = this._extractKeyPoints(featureSection, 3);
    }
    
    // Extract key strengths for each tool
    comparison.tools.forEach(tool => {
      summary.keyStrengths[tool.name] = tool.strengths?.slice(0, 3) || [];
    });
    
    // Extract recommendation
    if (comparison.sections['Recommendation']) {
      summary.recommendation = comparison.sections['Recommendation'];
    } else if (comparison.sections['Conclusion and Recommendations']) {
      summary.recommendation = this._extractKeyPoints(comparison.sections['Conclusion and Recommendations'], 1)[0] || '';
    }
    
    return {
      status: 'completed',
      data: summary,
      message: `Generated summary for ${summary.toolNames.join(' vs ')}`
    };
  }

  /**
   * Evaluate the quality of a comparison
   * @param {Object} data - Data containing the comparison to evaluate
   * @returns {Promise<Object>} - The evaluation results
   */
  async evaluateComparison(data) {
    console.log(`Evaluating comparison: ${data.comparisonId || 'provided comparison'}`);
    
    let comparison;
    
    // Get comparison to evaluate
    if (data.comparisonId) {
      const node = globalKnowledgeGraph.getNode(data.comparisonId);
      if (node) {
        comparison = JSON.parse(node.content);
      }
    } else if (data.comparison) {
      comparison = data.comparison;
    } else {
      return {
        status: 'error',
        message: 'No comparison data provided for evaluation'
      };
    }
    
    // Evaluate each metric
    const evaluation = {
      comparisonId: data.comparisonId || null,
      timestamp: new Date(),
      metrics: {},
      overallScore: 0,
      improvementSuggestions: []
    };
    
    // Calculate scores for each metric
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [metric, details] of Object.entries(this.evaluationMetrics)) {
      const score = this._evaluateMetric(metric, comparison);
      evaluation.metrics[metric] = {
        score,
        weight: details.weight,
        weightedScore: score * details.weight
      };
      
      totalScore += score * details.weight;
      totalWeight += details.weight;
      
      // Add improvement suggestions for low scores
      if (score < 0.7) {
        evaluation.improvementSuggestions.push(
          `Improve ${metric} (${details.description}): ${this._getImprovementSuggestion(metric)}`
        );
      }
    }
    
    // Calculate overall score
    evaluation.overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    return {
      status: 'completed',
      data: evaluation,
      message: `Evaluated comparison with overall score: ${evaluation.overallScore.toFixed(2)}`
    };
  }

  /**
   * Generate content for a specific section of the comparison
   * @param {string} section - The section name
   * @param {Array} tools - The tools being compared
   * @param {Object} data - Additional context data
   * @returns {Promise<string>} - The generated section content
   * @private
   */
  async _generateSectionContent(section, tools, data) {
    // This would use LLM in a real implementation
    // Here we'll create placeholder content based on the section type
    
    switch (section) {
      case 'Introduction':
      case 'Executive Summary':
        return `This comparison analyzes ${tools.map(t => t.name).join(' and ')} for ${data.projectContext || 'general use'}. ` +
               `The analysis is based on key features, pricing, and suitability for specific use cases.`;
        
      case 'Overview':
        return tools.map(tool => 
          `**${tool.name}**: ${tool.description || 'A tool for ' + data.projectContext}`
        ).join('\n\n');
        
      case 'Feature Comparison':
      case 'Feature-by-Feature Analysis':
        return this._generateFeatureComparisonTable(tools);
        
      case 'Pricing Comparison':
      case 'Pricing Structure Analysis':
        return this._generatePricingComparisonTable(tools);
        
      case 'Strengths and Weaknesses':
        return tools.map(tool => 
          `**${tool.name}**:\n` +
          `*Strengths*: ${(tool.strengths || []).join(', ') || 'None identified'}\n` +
          `*Weaknesses*: ${(tool.weaknesses || []).join(', ') || 'None identified'}`
        ).join('\n\n');
        
      case 'Use Case Analysis':
      case 'Best-Fit Scenarios':
        return `Based on the analysis, here are the best use cases for each tool:\n\n` +
               tools.map(tool => 
                 `**${tool.name}** is best suited for: ${this._generateUseCases(tool, data.projectContext)}`
               ).join('\n\n');
        
      case 'Recommendation':
      case 'Conclusion and Recommendations':
        return `Based on ${data.projectContext || 'general requirements'}, ` +
               `${this._generateRecommendation(tools, data.userPreferences)}`;
        
      default:
        return `Content for ${section} section.`;
    }
  }

  /**
   * Generate a feature comparison table
   * @param {Array} tools - The tools to compare
   * @returns {string} - Markdown table comparing features
   * @private
   */
  _generateFeatureComparisonTable(tools) {
    // Get all unique features
    const allFeatures = new Set();
    tools.forEach(tool => {
      (tool.features || []).forEach(feature => allFeatures.add(feature));
    });
    
    // Create table header
    let table = '| Feature | ' + tools.map(t => t.name).join(' | ') + ' |\n';
    table += '| --- | ' + tools.map(() => '---').join(' | ') + ' |\n';
    
    // Add rows for each feature
    Array.from(allFeatures).forEach(feature => {
      table += `| ${feature} | `;
      
      tools.forEach(tool => {
        const hasFeature = (tool.features || []).includes(feature);
        table += hasFeature ? '✅ | ' : '❌ | ';
      });
      
      table += '\n';
    });
    
    return table;
  }

  /**
   * Generate a pricing comparison table
   * @param {Array} tools - The tools to compare
   * @returns {string} - Markdown table comparing pricing
   * @private
   */
  _generatePricingComparisonTable(tools) {
    // Create table header
    let table = '| Pricing Aspect | ' + tools.map(t => t.name).join(' | ') + ' |\n';
    table += '| --- | ' + tools.map(() => '---').join(' | ') + ' |\n';
    
    // Add pricing model row
    table += '| Model | ';
    tools.forEach(tool => {
      table += `${tool.pricing?.model || 'Not specified'} | `;
    });
    table += '\n';
    
    // Add starting price row
    table += '| Starting Price | ';
    tools.forEach(tool => {
      table += `${tool.pricing?.startingPrice || 'Not specified'} | `;
    });
    table += '\n';
    
    // Add tiers row if any tool has tiers
    const hasTiers = tools.some(tool => tool.pricing?.tiers && tool.pricing.tiers.length > 0);
    if (hasTiers) {
      table += '| Tiers | ';
      tools.forEach(tool => {
        const tiers = tool.pricing?.tiers || [];
        table += `${tiers.length > 0 ? tiers.length + ' tiers' : 'No tiers'} | `;
      });
      table += '\n';
    }
    
    return table;
  }

  /**
   * Generate use cases for a tool based on its features and context
   * @param {Object} tool - The tool to generate use cases for
   * @param {string} projectContext - The project context
   * @returns {string} - Generated use cases
   * @private
   */
  _generateUseCases(tool, projectContext) {
    // This would be more sophisticated in a real implementation
    const useCases = [];
    
    // Generate based on strengths
    if (tool.strengths && tool.strengths.length > 0) {
      useCases.push(`Projects requiring ${tool.strengths[0].toLowerCase()}`);
    }
    
    // Generate based on features
    if (tool.features && tool.features.length > 0) {
      useCases.push(`Scenarios needing ${tool.features[0].toLowerCase()}`);
    }
    
    // Add project context if available
    if (projectContext) {
      useCases.push(`${projectContext} with ${tool.name}'s specific capabilities`);
    }
    
    return useCases.join(', ');
  }

  /**
   * Generate a recommendation based on tools and user preferences
   * @param {Array} tools - The tools being compared
   * @param {Object} userPreferences - User preferences
   * @returns {string} - Generated recommendation
   * @private
   */
  _generateRecommendation(tools, userPreferences) {
    // This would be more sophisticated in a real implementation
    if (!tools || tools.length === 0) return 'No recommendation can be made without tool data.';
    
    // Simple recommendation based on strengths count
    const toolScores = tools.map(tool => ({
      name: tool.name,
      score: (tool.strengths?.length || 0) - (tool.weaknesses?.length || 0)
    }));
    
    // Sort by score
    toolScores.sort((a, b) => b.score - a.score);
    
    // Generate recommendation
    if (toolScores[0].score > 0) {
      return `**${toolScores[0].name}** is recommended as the best overall option due to its favorable balance of strengths over weaknesses.`;
    } else if (tools.length > 1) {
      return `Both ${tools.map(t => t.name).join(' and ')} have trade-offs. Consider your specific priorities before making a decision.`;
    } else {
      return `${tools[0].name} may be suitable, but consider exploring additional options.`;
    }
  }

  /**
   * Extract key points from a text
   * @param {string} text - The text to extract from
   * @param {number} count - Number of points to extract
   * @returns {Array<string>} - Extracted key points
   * @private
   */
  _extractKeyPoints(text, count) {
    // This would be more sophisticated in a real implementation
    const sentences = text.split(/\.\s+/);
    return sentences.slice(0, count).map(s => s.trim() + '.');
  }

  /**
   * Store a comparison in the knowledge graph
   * @param {Object} comparison - The comparison to store
   * @returns {Promise<string>} - The node ID
   * @private
   */
  async _storeInKnowledgeGraph(comparison) {
    // Create or update a node in the knowledge graph
    const nodeContent = JSON.stringify(comparison);
    
    // Check if this is an update to an existing comparison
    let nodeId = null;
    if (comparison.nodeId) {
      const existingNode = globalKnowledgeGraph.getNode(comparison.nodeId);
      if (existingNode) {
        nodeId = comparison.nodeId;
        existingNode.updateContent(nodeContent);
      }
    }
    
    // Create a new node if not updating
    if (!nodeId) {
      const node = globalKnowledgeGraph.addNode({
        type: 'comparison',
        content: nodeContent,
        metadata: {
          title: comparison.title,
          toolCount: comparison.tools.length,
          template: comparison.template,
          createdAt: comparison.createdAt
        },
        source: this.id
      });
      nodeId = node.id;
      
      // Connect to tool nodes if they exist
      comparison.tools.forEach(tool => {
        if (tool.nodeId) {
          globalKnowledgeGraph.connectNodes(nodeId, tool.nodeId, 'compares');
        }
      });
    }
    
    return nodeId;
  }

  /**
   * Evaluate a specific metric for a comparison
   * @param {string} metric - The metric to evaluate
   * @param {Object} comparison - The comparison to evaluate
   * @returns {number} - Score between 0 and 1
   * @private
   */
  _evaluateMetric(metric, comparison) {
    // This would be more sophisticated in a real implementation
    switch (metric) {
      case 'featureCompleteness':
        // Check if feature comparison exists and is comprehensive
        const featureSection = comparison.sections['Feature Comparison'] || comparison.sections['Feature-by-Feature Analysis'];
        return featureSection ? Math.min(featureSection.length / 500, 1) : 0;
        
      case 'pricingClarity':
        // Check if pricing comparison exists and is clear
        const pricingSection = comparison.sections['Pricing Comparison'] || comparison.sections['Pricing Structure Analysis'];
        return pricingSection ? Math.min(pricingSection.length / 300, 1) : 0;
        
      case 'useCaseAlignment':
        // Check if use cases are aligned with project context
        const useCaseSection = comparison.sections['Use Case Analysis'] || comparison.sections['Best-Fit Scenarios'];
        return useCaseSection && comparison.projectContext ? 0.8 : 0.4;
        
      case 'objectivity':
        // Check if strengths and weaknesses are balanced
        const strengthsWeaknessesSection = comparison.sections['Strengths and Weaknesses'];
        return strengthsWeaknessesSection ? 0.7 : 0.3;
        
      case 'actionability':
        // Check if recommendation is clear and actionable
        const recommendationSection = comparison.sections['Recommendation'] || comparison.sections['Conclusion and Recommendations'];
        return recommendationSection ? Math.min(recommendationSection.length / 200, 1) : 0;
        
      default:
        return 0.5; // Default score
    }
  }

  /**
   * Get improvement suggestion for a metric
   * @param {string} metric - The metric to get suggestion for
   * @returns {string} - Improvement suggestion
   * @private
   */
  _getImprovementSuggestion(metric) {
    // This would be more sophisticated in a real implementation
    const suggestions = {
      featureCompleteness: 'Add more detailed feature comparisons with specific examples',
      pricingClarity: 'Include more specific pricing details and tier comparisons',
      useCaseAlignment: 'Better align tool recommendations with specific project requirements',
      objectivity: 'Ensure balanced coverage of both strengths and weaknesses',
      actionability: 'Provide more specific and actionable recommendations'
    };
    
    return suggestions[metric] || 'Improve overall quality';
  }
}

module.exports = ComparisonDrafterAgent;