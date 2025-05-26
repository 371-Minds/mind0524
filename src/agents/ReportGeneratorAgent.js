const Agent = require('./Agent');
const { globalKnowledgeGraph } = require('../core/KnowledgeGraph');

/**
 * ReportGenerator Agent specialized in creating comprehensive reports
 * This agent compiles data from various sources and generates well-structured reports
 */
class ReportGeneratorAgent extends Agent {
  /**
   * @param {import('../interfaces/AgentBlueprint').AgentBlueprint} blueprint - The blueprint for creating this agent
   */
  constructor(blueprint) {
    super({
      ...blueprint,
      role: blueprint.role || 'ReportGenerator'
    });
    
    this.reportTemplates = {
      comprehensive: {
        sections: [
          'Executive Summary',
          'Introduction',
          'Market Analysis',
          'Competitive Landscape',
          'Feature Analysis',
          'User Needs Assessment',
          'Technical Evaluation',
          'Recommendations',
          'Conclusion',
          'Appendices'
        ],
        format: 'markdown'
      },
      summary: {
        sections: [
          'Overview',
          'Key Findings',
          'Recommendations'
        ],
        format: 'markdown'
      },
      technical: {
        sections: [
          'Technical Overview',
          'Feature Comparison',
          'Performance Analysis',
          'Integration Considerations',
          'Technical Recommendations'
        ],
        format: 'markdown'
      }
    };
    
    this.reportHistory = [];
  }

  /**
   * Initialize the ReportGenerator agent
   */
  async initialize() {
    await super.initialize();
    return this;
  }

  /**
   * Process a task for the ReportGenerator agent
   * @param {Object} task - The task to process
   * @private
   */
  async _processTask(task) {
    console.log(`ReportGenerator processing task: ${JSON.stringify(task)}`);
    
    switch (task.type) {
      case 'generate_report':
        return this.generateReport(task.data);
      case 'update_report':
        return this.updateReport(task.data);
      case 'create_summary':
        return this.createSummary(task.data);
      case 'format_report':
        return this.formatReport(task.data);
      default:
        return { status: 'completed', message: `ReportGenerator handled general task: ${task.description}` };
    }
  }

  /**
   * Generate a comprehensive report
   * @param {Object} data - Report generation parameters
   * @returns {Promise<Object>} - Generated report
   */
  async generateReport(data) {
    console.log(`Generating ${data.type || 'comprehensive'} report`);
    
    const reportType = data.type || 'comprehensive';
    const template = this.reportTemplates[reportType] || this.reportTemplates.comprehensive;
    
    const report = {
      title: data.title || 'Comprehensive Analysis Report',
      type: reportType,
      createdAt: new Date(),
      updatedAt: new Date(),
      sections: {},
      metadata: {
        sources: new Set(),
        dataPoints: 0,
        confidence: 0
      }
    };
    
    // Generate content for each section
    for (const section of template.sections) {
      report.sections[section] = await this._generateSectionContent(section, data);
      
      // Track sources
      if (report.sections[section].sources) {
        report.sections[section].sources.forEach(source => {
          report.metadata.sources.add(source);
        });
      }
    }
    
    // Calculate metadata
    report.metadata.dataPoints = this._countDataPoints(report);
    report.metadata.confidence = this._calculateReportConfidence(report);
    report.metadata.sources = Array.from(report.metadata.sources);
    
    // Store in knowledge graph
    const nodeId = await this._storeInKnowledgeGraph(report);
    
    // Add to report history
    this.reportHistory.push({
      id: nodeId,
      title: report.title,
      type: report.type,
      timestamp: report.createdAt
    });
    
    return {
      status: 'completed',
      data: {
        report,
        format: template.format,
        nodeId
      },
      message: `Generated ${reportType} report with ${Object.keys(report.sections).length} sections`
    };
  }

  /**
   * Update an existing report
   * @param {Object} data - Report update parameters
   * @returns {Promise<Object>} - Updated report
   */
  async updateReport(data) {
    console.log(`Updating report: ${data.reportId}`);
    
    // Retrieve existing report
    let report;
    if (data.reportId) {
      const node = globalKnowledgeGraph.getNode(data.reportId);
      if (node) {
        report = JSON.parse(node.content);
      }
    }
    
    if (!report) {
      return {
        status: 'error',
        message: 'Report not found'
      };
    }
    
    // Update report
    report.updatedAt = new Date();
    
    // Update specific sections if provided
    if (data.sections) {
      for (const [sectionName, content] of Object.entries(data.sections)) {
        report.sections[sectionName] = content;
      }
    }
    
    // Regenerate sections if requested
    if (data.regenerateSections && Array.isArray(data.regenerateSections)) {
      for (const section of data.regenerateSections) {
        report.sections[section] = await this._generateSectionContent(section, data);
      }
    }
    
    // Recalculate metadata
    report.metadata.dataPoints = this._countDataPoints(report);
    report.metadata.confidence = this._calculateReportConfidence(report);
    
    // Update in knowledge graph
    const nodeId = await this._storeInKnowledgeGraph(report);
    
    return {
      status: 'completed',
      data: {
        report,
        nodeId
      },
      message: `Updated report ${data.reportId}`
    };
  }

  /**
   * Create a summary of a report
   * @param {Object} data - Summary generation parameters
   * @returns {Promise<Object>} - Generated summary
   */
  async createSummary(data) {
    console.log(`Creating summary for report: ${data.reportId || 'new'}`);
    
    let report;
    
    // Get existing report if ID provided
    if (data.reportId) {
      const node = globalKnowledgeGraph.getNode(data.reportId);
      if (node) {
        report = JSON.parse(node.content);
      }
    } else if (data.report) {
      report = data.report;
    } else {
      return {
        status: 'error',
        message: 'No report data provided'
      };
    }
    
    // Generate summary using summary template
    const template = this.reportTemplates.summary;
    const summary = {
      title: `Summary: ${report.title}`,
      type: 'summary',
      createdAt: new Date(),
      sections: {},
      metadata: {
        sourceReport: data.reportId,
        confidence: 0
      }
    };
    
    // Generate summary sections
    for (const section of template.sections) {
      summary.sections[section] = await this._generateSummarySectionContent(section, report);
    }
    
    // Calculate confidence
    summary.metadata.confidence = this._calculateSummaryConfidence(summary);
    
    return {
      status: 'completed',
      data: summary,
      message: `Generated summary with ${Object.keys(summary.sections).length} sections`
    };
  }

  /**
   * Format a report according to specified parameters
   * @param {Object} data - Formatting parameters
   * @returns {Promise<Object>} - Formatted report
   */
  async formatReport(data) {
    console.log(`Formatting report: ${data.reportId || 'provided report'}`);
    
    let report;
    
    // Get report to format
    if (data.reportId) {
      const node = globalKnowledgeGraph.getNode(data.reportId);
      if (node) {
        report = JSON.parse(node.content);
      }
    } else if (data.report) {
      report = data.report;
    } else {
      return {
        status: 'error',
        message: 'No report data provided for formatting'
      };
    }
    
    const format = data.format || 'markdown';
    const formatted = {
      content: '',
      metadata: {
        format,
        originalReport: data.reportId,
        timestamp: new Date()
      }
    };
    
    // Format report content
    formatted.content = await this._formatReportContent(report, format);
    
    return {
      status: 'completed',
      data: formatted,
      message: `Formatted report in ${format} format`
    };
  }

  /**
   * Generate content for a specific section
   * @param {string} section - Section name
   * @param {Object} data - Report data
   * @returns {Promise<Object>} - Section content
   * @private
   */
  async _generateSectionContent(section, data) {
    // This would be more sophisticated in a real implementation
    const content = {
      content: '',
      sources: new Set(),
      confidence: 0.7
    };
    
    switch (section) {
      case 'Executive Summary':
        content.content = this._generateExecutiveSummary(data);
        break;
        
      case 'Market Analysis':
        content.content = this._generateMarketAnalysis(data);
        break;
        
      case 'Competitive Landscape':
        content.content = this._generateCompetitiveAnalysis(data);
        break;
        
      case 'Feature Analysis':
        content.content = this._generateFeatureAnalysis(data);
        break;
        
      case 'Recommendations':
        content.content = this._generateRecommendations(data);
        break;
        
      default:
        content.content = `Content for ${section}`;
    }
    
    return content;
  }

  /**
   * Generate content for a summary section
   * @param {string} section - Section name
   * @param {Object} report - Original report
   * @returns {Promise<string>} - Summary section content
   * @private
   */
  async _generateSummarySectionContent(section, report) {
    switch (section) {
      case 'Overview':
        return this._summarizeOverview(report);
        
      case 'Key Findings':
        return this._summarizeKeyFindings(report);
        
      case 'Recommendations':
        return report.sections['Recommendations']?.content || 'No recommendations available.';
        
      default:
        return `Summary content for ${section}`;
    }
  }

  /**
   * Format report content in specified format
   * @param {Object} report - Report to format
   * @param {string} format - Target format
   * @returns {Promise<string>} - Formatted content
   * @private
   */
  async _formatReportContent(report, format) {
    let formatted = '';
    
    // Add title
    formatted += `# ${report.title}\n\n`;
    
    // Add metadata
    formatted += `Generated: ${report.createdAt}\n`;
    if (report.updatedAt) {
      formatted += `Last Updated: ${report.updatedAt}\n`;
    }
    formatted += '\n---\n\n';
    
    // Add sections
    for (const [sectionName, section] of Object.entries(report.sections)) {
      formatted += `## ${sectionName}\n\n`;
      formatted += `${section.content}\n\n`;
    }
    
    return formatted;
  }

  /**
   * Store report in the knowledge graph
   * @param {Object} report - Report to store
   * @returns {Promise<string>} - The node ID
   * @private
   */
  async _storeInKnowledgeGraph(report) {
    const nodeContent = JSON.stringify(report);
    
    // Check if this is an update to an existing report
    let nodeId = null;
    if (report.nodeId) {
      const existingNode = globalKnowledgeGraph.getNode(report.nodeId);
      if (existingNode) {
        nodeId = report.nodeId;
        existingNode.updateContent(nodeContent);
      }
    }
    
    // Create a new node if not updating
    if (!nodeId) {
      const node = globalKnowledgeGraph.addNode({
        type: 'report',
        content: nodeContent,
        metadata: {
          title: report.title,
          type: report.type,
          createdAt: report.createdAt,
          confidence: report.metadata.confidence
        },
        source: this.id
      });
      nodeId = node.id;
      
      // Connect to source nodes
      if (report.metadata.sourceNodes) {
        report.metadata.sourceNodes.forEach(sourceId => {
          globalKnowledgeGraph.connectNodes(nodeId, sourceId, 'derived_from');
        });
      }
    }
    
    return nodeId;
  }

  /**
   * Count data points in a report
   * @param {Object} report - Report to analyze
   * @returns {number} - Number of data points
   * @private
   */
  _countDataPoints(report) {
    let count = 0;
    
    // Count sections
    count += Object.keys(report.sections).length;
    
    // Count content in each section
    Object.values(report.sections).forEach(section => {
      if (section.content) {
        // Rough estimate: count paragraphs and lists
        count += section.content.split('\n\n').length;
        count += (section.content.match(/^[\-\*]/gm) || []).length;
      }
      if (section.sources) {
        count += section.sources.size;
      }
    });
    
    return count;
  }

  /**
   * Calculate report confidence score
   * @param {Object} report - Report to evaluate
   * @returns {number} - Confidence score between 0 and 1
   * @private
   */
  _calculateReportConfidence(report) {
    if (!Object.keys(report.sections).length) return 0;
    
    // Average confidence across sections
    let totalConfidence = 0;
    let sectionCount = 0;
    
    Object.values(report.sections).forEach(section => {
      if (section.confidence) {
        totalConfidence += section.confidence;
        sectionCount++;
      }
    });
    
    return sectionCount > 0 ? totalConfidence / sectionCount : 0;
  }

  /**
   * Calculate summary confidence score
   * @param {Object} summary - Summary to evaluate
   * @returns {number} - Confidence score between 0 and 1
   * @private
   */
  _calculateSummaryConfidence(summary) {
    // This would be more sophisticated in a real implementation
    return Object.keys(summary.sections).length > 0 ? 0.7 : 0;
  }

  /**
   * Generate executive summary content
   * @param {Object} data - Report data
   * @returns {string} - Executive summary content
   * @private
   */
  _generateExecutiveSummary(data) {
    // This would be more sophisticated in a real implementation
    return 'Executive summary content';
  }

  /**
   * Generate market analysis content
   * @param {Object} data - Report data
   * @returns {string} - Market analysis content
   * @private
   */
  _generateMarketAnalysis(data) {
    // This would be more sophisticated in a real implementation
    return 'Market analysis content';
  }

  /**
   * Generate competitive analysis content
   * @param {Object} data - Report data
   * @returns {string} - Competitive analysis content
   * @private
   */
  _generateCompetitiveAnalysis(data) {
    // This would be more sophisticated in a real implementation
    return 'Competitive analysis content';
  }

  /**
   * Generate feature analysis content
   * @param {Object} data - Report data
   * @returns {string} - Feature analysis content
   * @private
   */
  _generateFeatureAnalysis(data) {
    // This would be more sophisticated in a real implementation
    return 'Feature analysis content';
  }

  /**
   * Generate recommendations content
   * @param {Object} data - Report data
   * @returns {string} - Recommendations content
   * @private
   */
  _generateRecommendations(data) {
    // This would be more sophisticated in a real implementation
    return 'Recommendations content';
  }

  /**
   * Summarize report overview
   * @param {Object} report - Original report
   * @returns {string} - Overview summary
   * @private
   */
  _summarizeOverview(report) {
    // This would be more sophisticated in a real implementation
    return `Overview of ${report.title}`;
  }

  /**
   * Summarize key findings
   * @param {Object} report - Original report
   * @returns {string} - Key findings summary
   * @private
   */
  _summarizeKeyFindings(report) {
    // This would be more sophisticated in a real implementation
    return 'Key findings summary';
  }
}

module.exports = ReportGeneratorAgent;