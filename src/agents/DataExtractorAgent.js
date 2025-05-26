const Agent = require('./Agent');
const { globalToolRegistry } = require('../core/Tools');

/**
 * DataExtractor Agent specialized in processing unstructured text and extracting structured information
 * This agent serves as a research assistant that processes content from websites or comparison articles
 * and extracts key features, pricing details, strengths, and weaknesses.
 */
class DataExtractorAgent extends Agent {
  /**
   * @param {import('../interfaces/AgentBlueprint').AgentBlueprint} blueprint - The blueprint for creating this agent
   */
  constructor(blueprint) {
    super({
      ...blueprint,
      role: blueprint.role || 'DataExtractor'
    });
    
    this.extractionPatterns = {};
    this.dataSchemas = {};
    this.extractionHistory = [];
  }

  /**
   * Initialize the DataExtractor agent with specialized tools
   */
  async initialize() {
    await super.initialize();
    
    // Add DataExtractor-specific initialization
    this.extractionPatterns = {
      features: [
        '(?:key|main|core|primary)\\s+features?',
        'capabilities',
        'functionality'
      ],
      pricing: [
        'pricing',
        'cost',
        'subscription',
        'payment',
        'plan'
      ],
      strengths: [
        'strengths?',
        'pros',
        'advantages',
        'benefits'
      ],
      weaknesses: [
        'weaknesses?',
        'cons',
        'disadvantages',
        'limitations'
      ]
    };
    
    // Initialize data schemas for different extraction types
    this.dataSchemas = {
      tool: {
        name: '',
        description: '',
        features: [],
        pricing: {
          model: '',
          startingPrice: '',
          tiers: []
        },
        strengths: [],
        weaknesses: [],
        categories: [],
        lastUpdated: new Date()
      }
    };
    
    return this;
  }

  /**
   * Process a task for the DataExtractor agent
   * @param {Object} task - The task to process
   * @private
   */
  async _processTask(task) {
    console.log(`DataExtractor processing task: ${JSON.stringify(task)}`);
    
    switch (task.type) {
      case 'extract_tool_data':
        return this.extractToolData(task.data);
      case 'extract_comparison':
        return this.extractComparisonData(task.data);
      case 'extract_features':
        return this.extractFeatures(task.data);
      case 'extract_pricing':
        return this.extractPricing(task.data);
      default:
        return { status: 'completed', message: `DataExtractor handled general task: ${task.description}` };
    }
  }

  /**
   * Extract structured data about a tool from unstructured text
   * @param {Object} data - Data containing the unstructured text
   * @returns {Promise<Object>} - Structured tool data
   */
  async extractToolData(data) {
    console.log(`Extracting tool data from text: ${data.text.substring(0, 100)}...`);
    
    // Create a structured data object based on the tool schema
    const toolData = { ...this.dataSchemas.tool };
    
    // Extract tool name (usually appears at the beginning or in headings)
    const nameMatch = data.text.match(/^\s*([\w\s-]+)(?:\n|\.|:)/m) || 
                     data.text.match(/#{1,3}\s*([\w\s-]+)/m);
    if (nameMatch) {
      toolData.name = nameMatch[1].trim();
    } else if (data.toolName) {
      toolData.name = data.toolName;
    }
    
    // Extract description (usually appears in the first paragraph)
    const descriptionMatch = data.text.match(/^(?:.*\n){0,3}(.*?(?:\.|\n))/m);
    if (descriptionMatch) {
      toolData.description = descriptionMatch[1].trim();
    }
    
    // Extract features
    toolData.features = this._extractListItems(data.text, this.extractionPatterns.features);
    
    // Extract pricing information
    const pricingText = this._extractSection(data.text, this.extractionPatterns.pricing);
    if (pricingText) {
      // Determine pricing model
      if (pricingText.match(/free/i)) {
        toolData.pricing.model = 'Freemium';
      } else if (pricingText.match(/subscription|monthly|annual/i)) {
        toolData.pricing.model = 'Subscription';
      } else if (pricingText.match(/one[ -]time|perpetual/i)) {
        toolData.pricing.model = 'One-time';
      }
      
      // Extract starting price
      const priceMatch = pricingText.match(/\$\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*(?:USD|\$)/i);
      if (priceMatch) {
        toolData.pricing.startingPrice = priceMatch[0];
      }
      
      // Extract pricing tiers
      const tierMatches = pricingText.match(/(?:free|basic|standard|premium|pro|enterprise)\s+(?:tier|plan|package)?[:\s].*?(?=\n\n|$)/gis);
      if (tierMatches) {
        toolData.pricing.tiers = tierMatches.map(tier => tier.trim());
      }
    }
    
    // Extract strengths and weaknesses
    toolData.strengths = this._extractListItems(data.text, this.extractionPatterns.strengths);
    toolData.weaknesses = this._extractListItems(data.text, this.extractionPatterns.weaknesses);
    
    // Extract categories if available
    const categoryMatches = data.text.match(/categor(?:y|ies)\s*[:\-]\s*([^\n]+)/i);
    if (categoryMatches) {
      toolData.categories = categoryMatches[1].split(/[,\/]/).map(cat => cat.trim());
    }
    
    // Update extraction history
    this.extractionHistory.push({
      timestamp: new Date(),
      toolName: toolData.name,
      source: data.source || 'unknown',
      extractionType: 'tool_data'
    });
    
    return {
      status: 'completed',
      data: toolData,
      confidence: this._calculateExtractionConfidence(toolData)
    };
  }

  /**
   * Extract comparison data between multiple tools
   * @param {Object} data - Data containing the comparison text
   * @returns {Promise<Object>} - Structured comparison data
   */
  async extractComparisonData(data) {
    console.log(`Extracting comparison data from text: ${data.text.substring(0, 100)}...`);
    
    // Identify the tools being compared
    const toolNames = [];
    const toolNameMatches = data.text.match(/(?:comparing|comparison of|vs\.?|versus)\s+([\w\s]+)\s+(?:and|vs\.?|versus|with)\s+([\w\s]+)/i);
    
    if (toolNameMatches) {
      toolNames.push(toolNameMatches[1].trim(), toolNameMatches[2].trim());
    } else if (data.toolNames && Array.isArray(data.toolNames)) {
      toolNames.push(...data.toolNames);
    }
    
    // Extract data for each tool
    const toolsData = [];
    for (const toolName of toolNames) {
      // Try to find sections specific to this tool
      const toolRegex = new RegExp(`(?:^|\n)(?:#+\s*)?${toolName}[:\s]([\s\S]*?)(?=\n#+\s*|$)`, 'i');
      const toolSection = data.text.match(toolRegex);
      
      const toolData = { ...this.dataSchemas.tool, name: toolName };
      
      if (toolSection) {
        const sectionText = toolSection[1];
        toolData.features = this._extractListItems(sectionText, this.extractionPatterns.features);
        toolData.strengths = this._extractListItems(sectionText, this.extractionPatterns.strengths);
        toolData.weaknesses = this._extractListItems(sectionText, this.extractionPatterns.weaknesses);
      } else {
        // If no specific section, try to extract mentions throughout the text
        const toolMentionRegex = new RegExp(`${toolName}[^\n.]*?(?:\.|\n)`, 'gi');
        const mentions = data.text.match(toolMentionRegex) || [];
        
        // Analyze mentions for features, strengths, and weaknesses
        for (const mention of mentions) {
          if (this._containsAny(mention, this.extractionPatterns.features)) {
            const feature = mention.replace(new RegExp(`${toolName}\s*`, 'i'), '').trim();
            if (feature && !toolData.features.includes(feature)) {
              toolData.features.push(feature);
            }
          } else if (this._containsAny(mention, this.extractionPatterns.strengths)) {
            const strength = mention.replace(new RegExp(`${toolName}\s*`, 'i'), '').trim();
            if (strength && !toolData.strengths.includes(strength)) {
              toolData.strengths.push(strength);
            }
          } else if (this._containsAny(mention, this.extractionPatterns.weaknesses)) {
            const weakness = mention.replace(new RegExp(`${toolName}\s*`, 'i'), '').trim();
            if (weakness && !toolData.weaknesses.includes(weakness)) {
              toolData.weaknesses.push(weakness);
            }
          }
        }
      }
      
      toolsData.push(toolData);
    }
    
    // Extract direct comparison points
    const comparisonPoints = [];
    const comparisonRegex = /(?:compared to|in contrast to|unlike|similar to|better than|worse than)[^.]*\./gi;
    const comparisonMatches = data.text.match(comparisonRegex) || [];
    
    for (const match of comparisonMatches) {
      comparisonPoints.push(match.trim());
    }
    
    // Update extraction history
    this.extractionHistory.push({
      timestamp: new Date(),
      toolNames,
      source: data.source || 'unknown',
      extractionType: 'comparison_data'
    });
    
    return {
      status: 'completed',
      data: {
        tools: toolsData,
        comparisonPoints,
        projectType: data.projectType || null
      },
      confidence: this._calculateExtractionConfidence({ tools: toolsData, comparisonPoints })
    };
  }

  /**
   * Extract features from text
   * @param {Object} data - Data containing the text to extract features from
   * @returns {Promise<Object>} - Extracted features
   */
  async extractFeatures(data) {
    console.log(`Extracting features from text: ${data.text.substring(0, 100)}...`);
    
    const features = this._extractListItems(data.text, this.extractionPatterns.features);
    
    // Categorize features if possible
    const categorizedFeatures = {};
    
    // Look for feature categories in the text
    const categoryRegex = /(?:^|\n)#+\s*([\w\s]+)\s*features?[:\s]([\s\S]*?)(?=\n#+\s*|$)/gi;
    let categoryMatch;
    
    while ((categoryMatch = categoryRegex.exec(data.text)) !== null) {
      const category = categoryMatch[1].trim();
      const categoryText = categoryMatch[2];
      
      categorizedFeatures[category] = this._extractListItems(categoryText, ['']);
    }
    
    // If no categories found, use uncategorized features
    if (Object.keys(categorizedFeatures).length === 0) {
      categorizedFeatures['General'] = features;
    }
    
    // Update extraction history
    this.extractionHistory.push({
      timestamp: new Date(),
      toolName: data.toolName || 'unknown',
      source: data.source || 'unknown',
      extractionType: 'features'
    });
    
    return {
      status: 'completed',
      data: {
        features: categorizedFeatures,
        count: Object.values(categorizedFeatures).reduce((total, list) => total + list.length, 0)
      },
      confidence: this._calculateExtractionConfidence({ features: categorizedFeatures })
    };
  }

  /**
   * Extract pricing information from text
   * @param {Object} data - Data containing the text to extract pricing from
   * @returns {Promise<Object>} - Extracted pricing information
   */
  async extractPricing(data) {
    console.log(`Extracting pricing from text: ${data.text.substring(0, 100)}...`);
    
    // Extract pricing section
    const pricingText = this._extractSection(data.text, this.extractionPatterns.pricing);
    
    const pricingData = {
      model: '',
      startingPrice: '',
      tiers: [],
      details: ''
    };
    
    if (pricingText) {
      // Determine pricing model
      if (pricingText.match(/free/i)) {
        pricingData.model = 'Freemium';
      } else if (pricingText.match(/subscription|monthly|annual/i)) {
        pricingData.model = 'Subscription';
      } else if (pricingText.match(/one[ -]time|perpetual/i)) {
        pricingData.model = 'One-time';
      }
      
      // Extract starting price
      const priceMatch = pricingText.match(/\$\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*(?:USD|\$)/i);
      if (priceMatch) {
        pricingData.startingPrice = priceMatch[0];
      }
      
      // Extract pricing tiers
      const tierMatches = pricingText.match(/(?:free|basic|standard|premium|pro|enterprise)\s+(?:tier|plan|package)?[:\s].*?(?=\n\n|$)/gis);
      if (tierMatches) {
        pricingData.tiers = tierMatches.map(tier => tier.trim());
      }
      
      // Store full pricing details
      pricingData.details = pricingText.trim();
    }
    
    // Update extraction history
    this.extractionHistory.push({
      timestamp: new Date(),
      toolName: data.toolName || 'unknown',
      source: data.source || 'unknown',
      extractionType: 'pricing'
    });
    
    return {
      status: 'completed',
      data: pricingData,
      confidence: this._calculateExtractionConfidence(pricingData)
    };
  }

  /**
   * Extract a section from text based on patterns
   * @param {string} text - The text to extract from
   * @param {string[]} patterns - Patterns to match section headers
   * @returns {string|null} - Extracted section text or null if not found
   * @private
   */
  _extractSection(text, patterns) {
    // Create a regex pattern to match section headers
    const patternRegex = patterns.map(p => `(?:^|\n)(?:#+\s*)?(?:${p})[:\s]`).join('|');
    const sectionRegex = new RegExp(`(${patternRegex})([\s\S]*?)(?=\n(?:#+\s*|\n)|$)`, 'i');
    
    const match = text.match(sectionRegex);
    return match ? match[2].trim() : null;
  }

  /**
   * Extract list items from text based on patterns
   * @param {string} text - The text to extract from
   * @param {string[]} patterns - Patterns to match section headers
   * @returns {string[]} - Extracted list items
   * @private
   */
  _extractListItems(text, patterns) {
    const items = [];
    
    // First try to find a section with the given patterns
    const sectionText = this._extractSection(text, patterns) || text;
    
    // Extract bullet points or numbered lists
    const listItemRegex = /(?:^|\n)\s*(?:[\*\-•]|\d+\.)\s*([^\n]+)/g;
    let match;
    
    while ((match = listItemRegex.exec(sectionText)) !== null) {
      items.push(match[1].trim());
    }
    
    // If no bullet points found, try to extract sentences
    if (items.length === 0) {
      const sentenceRegex = /[^.!?]+[.!?]+/g;
      while ((match = sentenceRegex.exec(sectionText)) !== null) {
        items.push(match[0].trim());
      }
    }
    
    return items;
  }

  /**
   * Check if a string contains any of the patterns
   * @param {string} text - The text to check
   * @param {string[]} patterns - Patterns to check for
   * @returns {boolean} - True if the text contains any of the patterns
   * @private
   */
  _containsAny(text, patterns) {
    for (const pattern of patterns) {
      if (text.match(new RegExp(pattern, 'i'))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate confidence score for extraction results
   * @param {Object} data - The extracted data
   * @returns {number} - Confidence score between 0 and 1
   * @private
   */
  _calculateExtractionConfidence(data) {
    let score = 0;
    let totalFields = 0;
    
    // Check for presence and quality of different fields
    if (data.name && data.name.length > 0) {
      score += 1;
      totalFields += 1;
    }
    
    if (data.description && data.description.length > 10) {
      score += 1;
      totalFields += 1;
    }
    
    if (data.features && data.features.length > 0) {
      score += Math.min(data.features.length / 5, 1);
      totalFields += 1;
    }
    
    if (data.pricing && data.pricing.model) {
      score += 0.5;
      if (data.pricing.startingPrice) score += 0.25;
      if (data.pricing.tiers && data.pricing.tiers.length > 0) score += 0.25;
      totalFields += 1;
    }
    
    if (data.strengths && data.strengths.length > 0) {
      score += Math.min(data.strengths.length / 3, 1);
      totalFields += 1;
    }
    
    if (data.weaknesses && data.weaknesses.length > 0) {
      score += Math.min(data.weaknesses.length / 3, 1);
      totalFields += 1;
    }
    
    // If we're dealing with comparison data
    if (data.tools && data.tools.length > 0) {
      score += Math.min(data.tools.length / 2, 1);
      totalFields += 1;
      
      if (data.comparisonPoints && data.comparisonPoints.length > 0) {
        score += Math.min(data.comparisonPoints.length / 3, 1);
        totalFields += 1;
      }
    }
    
    // Calculate final confidence score
    return totalFields > 0 ? score / totalFields : 0;
  }
}

module.exports = DataExtractorAgent;