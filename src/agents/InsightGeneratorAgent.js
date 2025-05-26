const Agent = require('./Agent');
const { globalKnowledgeGraph } = require('../core/KnowledgeGraph');

/**
 * InsightGenerator Agent specialized in analyzing data and generating insights
 * This agent processes extracted data and comparisons to generate valuable insights,
 * patterns, and recommendations.
 */
class InsightGeneratorAgent extends Agent {
  /**
   * @param {import('../interfaces/AgentBlueprint').AgentBlueprint} blueprint - The blueprint for creating this agent
   */
  constructor(blueprint) {
    super({
      ...blueprint,
      role: blueprint.role || 'InsightGenerator'
    });
    
    this.insightTypes = {
      trend: {
        weight: 0.3,
        description: 'Identifies patterns and trends across tools or domains'
      },
      gap: {
        weight: 0.2,
        description: 'Identifies gaps and opportunities in the market'
      },
      recommendation: {
        weight: 0.25,
        description: 'Provides actionable recommendations based on analysis'
      },
      innovation: {
        weight: 0.15,
        description: 'Identifies innovative features or approaches'
      },
      risk: {
        weight: 0.1,
        description: 'Identifies potential risks or limitations'
      }
    };
    
    this.insightHistory = [];
  }

  /**
   * Initialize the InsightGenerator agent
   */
  async initialize() {
    await super.initialize();
    return this;
  }

  /**
   * Process a task for the InsightGenerator agent
   * @param {Object} task - The task to process
   * @private
   */
  async _processTask(task) {
    console.log(`InsightGenerator processing task: ${JSON.stringify(task)}`);
    
    switch (task.type) {
      case 'generate_insights':
        return this.generateInsights(task.data);
      case 'analyze_trends':
        return this.analyzeTrends(task.data);
      case 'identify_gaps':
        return this.identifyGaps(task.data);
      case 'generate_recommendations':
        return this.generateRecommendations(task.data);
      default:
        return { status: 'completed', message: `InsightGenerator handled general task: ${task.description}` };
    }
  }

  /**
   * Generate insights from provided data
   * @param {Object} data - Data to analyze
   * @returns {Promise<Object>} - Generated insights
   */
  async generateInsights(data) {
    console.log('Generating insights from data');
    
    const insights = {
      timestamp: new Date(),
      source: data.source || 'general',
      context: data.context || {},
      insights: [],
      metadata: {
        dataPoints: 0,
        confidenceScore: 0,
        insightTypes: {}
      }
    };
    
    // Process different types of input data
    if (data.comparisons) {
      await this._processComparisonInsights(data.comparisons, insights);
    }
    
    if (data.extractedData) {
      await this._processExtractedDataInsights(data.extractedData, insights);
    }
    
    if (data.marketData) {
      await this._processMarketDataInsights(data.marketData, insights);
    }
    
    // Calculate metadata
    insights.metadata.dataPoints = this._countDataPoints(data);
    insights.metadata.confidenceScore = this._calculateConfidenceScore(insights);
    
    // Store insights in knowledge graph
    const nodeId = await this._storeInKnowledgeGraph(insights);
    
    // Add to insight history
    this.insightHistory.push({
      id: nodeId,
      timestamp: insights.timestamp,
      source: insights.source,
      insightCount: insights.insights.length
    });
    
    return {
      status: 'completed',
      data: {
        insights,
        nodeId
      },
      message: `Generated ${insights.insights.length} insights from ${insights.source} data`
    };
  }

  /**
   * Analyze trends across multiple data points
   * @param {Object} data - Data to analyze for trends
   * @returns {Promise<Object>} - Identified trends
   */
  async analyzeTrends(data) {
    console.log('Analyzing trends in data');
    
    const trends = {
      timestamp: new Date(),
      timeframe: data.timeframe || 'current',
      trends: [],
      metadata: {
        dataPoints: 0,
        confidence: 0,
        categories: new Set()
      }
    };
    
    // Analyze different aspects
    if (data.features) {
      const featureTrends = this._analyzeFeatureTrends(data.features);
      trends.trends.push(...featureTrends);
      trends.metadata.categories.add('features');
    }
    
    if (data.pricing) {
      const pricingTrends = this._analyzePricingTrends(data.pricing);
      trends.trends.push(...pricingTrends);
      trends.metadata.categories.add('pricing');
    }
    
    if (data.adoption) {
      const adoptionTrends = this._analyzeAdoptionTrends(data.adoption);
      trends.trends.push(...adoptionTrends);
      trends.metadata.categories.add('adoption');
    }
    
    // Calculate metadata
    trends.metadata.dataPoints = this._countDataPoints(data);
    trends.metadata.confidence = this._calculateTrendConfidence(trends);
    trends.metadata.categories = Array.from(trends.metadata.categories);
    
    return {
      status: 'completed',
      data: trends,
      message: `Identified ${trends.trends.length} trends across ${trends.metadata.categories.length} categories`
    };
  }

  /**
   * Identify gaps and opportunities in the market
   * @param {Object} data - Market data to analyze
   * @returns {Promise<Object>} - Identified gaps
   */
  async identifyGaps(data) {
    console.log('Identifying gaps in market data');
    
    const gaps = {
      timestamp: new Date(),
      market: data.market || 'general',
      gaps: [],
      opportunities: [],
      metadata: {
        dataPoints: 0,
        confidence: 0,
        categories: new Set()
      }
    };
    
    // Analyze different aspects for gaps
    if (data.features) {
      const featureGaps = this._identifyFeatureGaps(data.features);
      gaps.gaps.push(...featureGaps.gaps);
      gaps.opportunities.push(...featureGaps.opportunities);
      gaps.metadata.categories.add('features');
    }
    
    if (data.pricing) {
      const pricingGaps = this._identifyPricingGaps(data.pricing);
      gaps.gaps.push(...pricingGaps.gaps);
      gaps.opportunities.push(...pricingGaps.opportunities);
      gaps.metadata.categories.add('pricing');
    }
    
    if (data.userNeeds) {
      const needGaps = this._identifyUserNeedGaps(data.userNeeds);
      gaps.gaps.push(...needGaps.gaps);
      gaps.opportunities.push(...needGaps.opportunities);
      gaps.metadata.categories.add('user_needs');
    }
    
    // Calculate metadata
    gaps.metadata.dataPoints = this._countDataPoints(data);
    gaps.metadata.confidence = this._calculateGapConfidence(gaps);
    gaps.metadata.categories = Array.from(gaps.metadata.categories);
    
    return {
      status: 'completed',
      data: gaps,
      message: `Identified ${gaps.gaps.length} gaps and ${gaps.opportunities.length} opportunities`
    };
  }

  /**
   * Generate recommendations based on analysis
   * @param {Object} data - Analysis data
   * @returns {Promise<Object>} - Generated recommendations
   */
  async generateRecommendations(data) {
    console.log('Generating recommendations from analysis');
    
    const recommendations = {
      timestamp: new Date(),
      context: data.context || {},
      recommendations: [],
      metadata: {
        dataPoints: 0,
        confidence: 0,
        categories: new Set()
      }
    };
    
    // Generate recommendations from different aspects
    if (data.insights) {
      const insightRecommendations = this._generateInsightRecommendations(data.insights);
      recommendations.recommendations.push(...insightRecommendations);
      recommendations.metadata.categories.add('insights');
    }
    
    if (data.trends) {
      const trendRecommendations = this._generateTrendRecommendations(data.trends);
      recommendations.recommendations.push(...trendRecommendations);
      recommendations.metadata.categories.add('trends');
    }
    
    if (data.gaps) {
      const gapRecommendations = this._generateGapRecommendations(data.gaps);
      recommendations.recommendations.push(...gapRecommendations);
      recommendations.metadata.categories.add('gaps');
    }
    
    // Calculate metadata
    recommendations.metadata.dataPoints = this._countDataPoints(data);
    recommendations.metadata.confidence = this._calculateRecommendationConfidence(recommendations);
    recommendations.metadata.categories = Array.from(recommendations.metadata.categories);
    
    return {
      status: 'completed',
      data: recommendations,
      message: `Generated ${recommendations.recommendations.length} recommendations across ${recommendations.metadata.categories.length} categories`
    };
  }

  /**
   * Process insights from comparison data
   * @param {Array} comparisons - Comparison data
   * @param {Object} insights - Insights object to update
   * @private
   */
  async _processComparisonInsights(comparisons, insights) {
    comparisons.forEach(comparison => {
      // Extract feature-based insights
      if (comparison.sections?.['Feature Comparison']) {
        const featureInsights = this._generateFeatureInsights(comparison);
        insights.insights.push(...featureInsights);
      }
      
      // Extract pricing-based insights
      if (comparison.sections?.['Pricing Comparison']) {
        const pricingInsights = this._generatePricingInsights(comparison);
        insights.insights.push(...pricingInsights);
      }
      
      // Extract use case insights
      if (comparison.sections?.['Use Case Analysis']) {
        const useCaseInsights = this._generateUseCaseInsights(comparison);
        insights.insights.push(...useCaseInsights);
      }
    });
  }

  /**
   * Process insights from extracted data
   * @param {Object} extractedData - Extracted tool data
   * @param {Object} insights - Insights object to update
   * @private
   */
  async _processExtractedDataInsights(extractedData, insights) {
    // Process feature patterns
    if (extractedData.features) {
      const featurePatterns = this._analyzeFeaturePatterns(extractedData.features);
      insights.insights.push(...featurePatterns);
    }
    
    // Process pricing patterns
    if (extractedData.pricing) {
      const pricingPatterns = this._analyzePricingPatterns(extractedData.pricing);
      insights.insights.push(...pricingPatterns);
    }
    
    // Process market positioning
    if (extractedData.strengths && extractedData.weaknesses) {
      const positioningInsights = this._analyzeMarketPositioning(extractedData);
      insights.insights.push(...positioningInsights);
    }
  }

  /**
   * Process insights from market data
   * @param {Object} marketData - Market trend data
   * @param {Object} insights - Insights object to update
   * @private
   */
  async _processMarketDataInsights(marketData, insights) {
    // Analyze market trends
    if (marketData.trends) {
      const marketTrends = this._analyzeMarketTrends(marketData.trends);
      insights.insights.push(...marketTrends);
    }
    
    // Analyze competition
    if (marketData.competition) {
      const competitionInsights = this._analyzeCompetition(marketData.competition);
      insights.insights.push(...competitionInsights);
    }
    
    // Analyze user needs
    if (marketData.userNeeds) {
      const userNeedInsights = this._analyzeUserNeeds(marketData.userNeeds);
      insights.insights.push(...userNeedInsights);
    }
  }

  /**
   * Generate feature-based insights from comparison
   * @param {Object} comparison - Comparison data
   * @returns {Array} - Feature insights
   * @private
   */
  _generateFeatureInsights(comparison) {
    const insights = [];
    const featureSection = comparison.sections['Feature Comparison'];
    
    // This would be more sophisticated in a real implementation
    // Here we'll generate some basic insights
    insights.push({
      type: 'trend',
      category: 'features',
      insight: `Common features across tools: ${this._identifyCommonFeatures(comparison)}`,
      confidence: 0.8
    });
    
    insights.push({
      type: 'innovation',
      category: 'features',
      insight: `Unique features: ${this._identifyUniqueFeatures(comparison)}`,
      confidence: 0.7
    });
    
    return insights;
  }

  /**
   * Generate pricing-based insights from comparison
   * @param {Object} comparison - Comparison data
   * @returns {Array} - Pricing insights
   * @private
   */
  _generatePricingInsights(comparison) {
    const insights = [];
    const pricingSection = comparison.sections['Pricing Comparison'];
    
    // This would be more sophisticated in a real implementation
    insights.push({
      type: 'trend',
      category: 'pricing',
      insight: `Pricing models trend: ${this._identifyPricingTrend(comparison)}`,
      confidence: 0.75
    });
    
    insights.push({
      type: 'gap',
      category: 'pricing',
      insight: `Market positioning gaps: ${this._identifyPricingGaps(comparison)}`,
      confidence: 0.7
    });
    
    return insights;
  }

  /**
   * Generate use case insights from comparison
   * @param {Object} comparison - Comparison data
   * @returns {Array} - Use case insights
   * @private
   */
  _generateUseCaseInsights(comparison) {
    const insights = [];
    const useCaseSection = comparison.sections['Use Case Analysis'];
    
    // This would be more sophisticated in a real implementation
    insights.push({
      type: 'recommendation',
      category: 'use_cases',
      insight: `Best-fit scenarios: ${this._identifyBestFitScenarios(comparison)}`,
      confidence: 0.8
    });
    
    insights.push({
      type: 'gap',
      category: 'use_cases',
      insight: `Underserved scenarios: ${this._identifyUnderservedScenarios(comparison)}`,
      confidence: 0.6
    });
    
    return insights;
  }

  /**
   * Analyze feature patterns in extracted data
   * @param {Object} features - Feature data
   * @returns {Array} - Feature pattern insights
   * @private
   */
  _analyzeFeaturePatterns(features) {
    // This would be more sophisticated in a real implementation
    return [
      {
        type: 'trend',
        category: 'features',
        insight: 'Feature pattern insight',
        confidence: 0.7
      }
    ];
  }

  /**
   * Analyze pricing patterns in extracted data
   * @param {Object} pricing - Pricing data
   * @returns {Array} - Pricing pattern insights
   * @private
   */
  _analyzePricingPatterns(pricing) {
    // This would be more sophisticated in a real implementation
    return [
      {
        type: 'trend',
        category: 'pricing',
        insight: 'Pricing pattern insight',
        confidence: 0.7
      }
    ];
  }

  /**
   * Analyze market positioning from strengths and weaknesses
   * @param {Object} data - Tool data
   * @returns {Array} - Market positioning insights
   * @private
   */
  _analyzeMarketPositioning(data) {
    // This would be more sophisticated in a real implementation
    return [
      {
        type: 'recommendation',
        category: 'positioning',
        insight: 'Market positioning insight',
        confidence: 0.7
      }
    ];
  }

  /**
   * Store insights in the knowledge graph
   * @param {Object} insights - Insights to store
   * @returns {Promise<string>} - The node ID
   * @private
   */
  async _storeInKnowledgeGraph(insights) {
    const nodeContent = JSON.stringify(insights);
    
    const node = globalKnowledgeGraph.addNode({
      type: 'insights',
      content: nodeContent,
      metadata: {
        timestamp: insights.timestamp,
        source: insights.source,
        insightCount: insights.insights.length,
        confidence: insights.metadata.confidenceScore
      },
      source: this.id
    });
    
    // Connect to related nodes
    if (insights.context.relatedNodes) {
      insights.context.relatedNodes.forEach(relatedNodeId => {
        globalKnowledgeGraph.connectNodes(node.id, relatedNodeId, 'derived_from');
      });
    }
    
    return node.id;
  }

  /**
   * Count data points in input data
   * @param {Object} data - Input data
   * @returns {number} - Number of data points
   * @private
   */
  _countDataPoints(data) {
    let count = 0;
    
    // Count comparison data points
    if (data.comparisons) {
      count += data.comparisons.length;
      data.comparisons.forEach(comparison => {
        count += Object.keys(comparison.sections || {}).length;
      });
    }
    
    // Count extracted data points
    if (data.extractedData) {
      count += Object.keys(data.extractedData).length;
      if (data.extractedData.features) count += data.extractedData.features.length;
      if (data.extractedData.strengths) count += data.extractedData.strengths.length;
      if (data.extractedData.weaknesses) count += data.extractedData.weaknesses.length;
    }
    
    // Count market data points
    if (data.marketData) {
      count += Object.keys(data.marketData).length;
      if (data.marketData.trends) count += data.marketData.trends.length;
      if (data.marketData.competition) count += data.marketData.competition.length;
    }
    
    return count;
  }

  /**
   * Calculate confidence score for insights
   * @param {Object} insights - Generated insights
   * @returns {number} - Confidence score between 0 and 1
   * @private
   */
  _calculateConfidenceScore(insights) {
    if (!insights.insights.length) return 0;
    
    // Calculate weighted average of insight confidences
    let totalWeight = 0;
    let weightedSum = 0;
    
    insights.insights.forEach(insight => {
      const weight = this.insightTypes[insight.type]?.weight || 0.1;
      weightedSum += (insight.confidence || 0.5) * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Calculate confidence score for trends
   * @param {Object} trends - Identified trends
   * @returns {number} - Confidence score between 0 and 1
   * @private
   */
  _calculateTrendConfidence(trends) {
    // This would be more sophisticated in a real implementation
    return trends.trends.length > 0 ? 0.7 : 0;
  }

  /**
   * Calculate confidence score for gaps
   * @param {Object} gaps - Identified gaps
   * @returns {number} - Confidence score between 0 and 1
   * @private
   */
  _calculateGapConfidence(gaps) {
    // This would be more sophisticated in a real implementation
    return (gaps.gaps.length + gaps.opportunities.length) > 0 ? 0.7 : 0;
  }

  /**
   * Calculate confidence score for recommendations
   * @param {Object} recommendations - Generated recommendations
   * @returns {number} - Confidence score between 0 and 1
   * @private
   */
  _calculateRecommendationConfidence(recommendations) {
    // This would be more sophisticated in a real implementation
    return recommendations.recommendations.length > 0 ? 0.7 : 0;
  }

  /**
   * Helper methods for feature analysis
   * These would be more sophisticated in a real implementation
   * @private
   */
  _identifyCommonFeatures(comparison) {
    return 'Common features identified';
  }
  
  _identifyUniqueFeatures(comparison) {
    return 'Unique features identified';
  }
  
  _identifyPricingTrend(comparison) {
    return 'Pricing trend identified';
  }
  
  _identifyPricingGaps(comparison) {
    return 'Pricing gaps identified';
  }
  
  _identifyBestFitScenarios(comparison) {
    return 'Best-fit scenarios identified';
  }
  
  _identifyUnderservedScenarios(comparison) {
    return 'Underserved scenarios identified';
  }
}

module.exports = InsightGeneratorAgent;