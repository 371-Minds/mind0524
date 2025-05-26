/**
 * Advanced example of using the Autonomous Agent Framework
 * 
 * This example demonstrates how to:
 * 1. Create custom agent types
 * 2. Create custom tools
 * 3. Use the communication system between agents
 * 4. Use the memory system for persistent data
 * 5. Create a more complex agent hierarchy
 */

require('dotenv').config();
const Agent = require('../src/agents/Agent');
const CEOAgent = require('../src/agents/CEOAgent');
const AgentFactory = require('../src/core/AgentFactory');
const { Tool, globalToolRegistry } = require('../src/core/Tools');
const { Message, globalCommunicationSystem } = require('../src/core/Communication');
const { MemoryFactory } = require('../src/core/Memory');

// Step 1: Create a custom agent type
class MarketingAgent extends Agent {
  constructor(blueprint) {
    super({
      ...blueprint,
      role: blueprint.role || 'Marketing'
    });
    
    this.campaigns = {};
    this.marketResearch = {};
    this.brandStrategy = {};
  }

  async initialize() {
    await super.initialize();
    
    // Add Marketing-specific initialization
    this.brandStrategy = {
      targetAudience: ['Professionals', 'Small Businesses', 'Enterprise'],
      positioning: 'Innovative and reliable technology solutions',
      values: ['Innovation', 'Reliability', 'Customer-centricity']
    };
    
    return this;
  }

  async _processTask(task) {
    console.log(`Marketing processing task: ${JSON.stringify(task)}`);
    
    switch (task.type) {
      case 'campaign_planning':
        return this.planCampaign(task.data);
      case 'market_research':
        return this.conductMarketResearch(task.data);
      case 'content_creation':
        return this.createContent(task.data);
      default:
        return { status: 'completed', message: `Marketing handled general task: ${task.description}` };
    }
  }

  async planCampaign(data) {
    console.log(`Marketing planning campaign: ${JSON.stringify(data)}`);
    
    const campaignId = `campaign-${Date.now()}`;
    const campaign = {
      id: campaignId,
      name: data.name,
      objective: data.objective,
      targetAudience: data.targetAudience || this.brandStrategy.targetAudience,
      channels: data.channels || ['Social Media', 'Email', 'Content Marketing'],
      budget: data.budget,
      timeline: {
        start: data.startDate || new Date().toISOString(),
        end: data.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      },
      kpis: data.kpis || ['Engagement', 'Conversion Rate', 'ROI'],
      status: 'planned',
      createdAt: new Date().toISOString()
    };
    
    this.campaigns[campaignId] = campaign;
    
    return {
      status: 'completed',
      campaignId,
      campaign
    };
  }

  async conductMarketResearch(data) {
    console.log(`Marketing conducting market research: ${JSON.stringify(data)}`);
    
    // Use the WebSearchTool if available
    let searchResult = null;
    try {
      searchResult = await globalToolRegistry.executeTool('WebSearchTool', {
        query: `${data.topic} market trends`
      });
    } catch (error) {
      console.error('Error using WebSearchTool:', error);
    }
    
    const researchId = `research-${Date.now()}`;
    const research = {
      id: researchId,
      topic: data.topic,
      targetMarket: data.targetMarket,
      competitors: data.competitors || [],
      findings: [
        'Market growing at 12% annually',
        'Competitors focusing on premium segment',
        'Opportunity in mid-market solutions'
      ],
      searchResults: searchResult?.results || [],
      createdAt: new Date().toISOString()
    };
    
    this.marketResearch[researchId] = research;
    
    return {
      status: 'completed',
      researchId,
      research
    };
  }

  async createContent(data) {
    console.log(`Marketing creating content: ${JSON.stringify(data)}`);
    
    // Use the ContentGenerationTool if available
    let contentResult = null;
    try {
      contentResult = await globalToolRegistry.executeTool('ContentGenerationTool', {
        prompt: `Create ${data.type} content about ${data.topic} for ${data.audience}`
      });
    } catch (error) {
      console.error('Error using ContentGenerationTool:', error);
    }
    
    return {
      status: 'completed',
      contentId: `content-${Date.now()}`,
      content: contentResult?.content || `Sample ${data.type} content about ${data.topic}`,
      metadata: {
        type: data.type,
        topic: data.topic,
        audience: data.audience,
        createdAt: new Date().toISOString()
      }
    };
  }

  getAllCampaigns() {
    return { ...this.campaigns };
  }

  getAllMarketResearch() {
    return { ...this.marketResearch };
  }
}

// Step 2: Create a custom tool
class SocialMediaTool extends Tool {
  constructor(config = {}) {
    super({
      description: 'Manage social media posts and analytics',
      ...config
    });
    
    this.posts = [];
    this.analytics = {};
  }

  async _run(params, context) {
    console.log(`Running SocialMediaTool with params: ${JSON.stringify(params)}`);
    
    switch (params.action) {
      case 'post':
        return this._createPost(params.content, params.platforms, context);
      case 'analyze':
        return this._getAnalytics(params.postId, params.metrics, context);
      default:
        throw new Error(`Unknown action: ${params.action}`);
    }
  }

  async _createPost(content, platforms, context) {
    const postId = `post-${Date.now()}`;
    const post = {
      id: postId,
      content,
      platforms: platforms || ['Twitter', 'LinkedIn', 'Facebook'],
      createdAt: new Date().toISOString(),
      status: 'published',
      createdBy: context.agentId || 'unknown'
    };
    
    this.posts.push(post);
    
    // Simulate analytics data
    this.analytics[postId] = {
      impressions: Math.floor(Math.random() * 10000),
      engagements: Math.floor(Math.random() * 1000),
      clicks: Math.floor(Math.random() * 500),
      shares: Math.floor(Math.random() * 100)
    };
    
    return {
      status: 'success',
      postId,
      post
    };
  }

  async _getAnalytics(postId, metrics, context) {
    if (!postId) {
      // Return overall analytics
      return {
        status: 'success',
        analytics: {
          totalPosts: this.posts.length,
          platforms: {
            Twitter: this.posts.filter(p => p.platforms.includes('Twitter')).length,
            LinkedIn: this.posts.filter(p => p.platforms.includes('LinkedIn')).length,
            Facebook: this.posts.filter(p => p.platforms.includes('Facebook')).length
          },
          overallPerformance: {
            impressions: this.posts.reduce((sum, post) => sum + (this.analytics[post.id]?.impressions || 0), 0),
            engagements: this.posts.reduce((sum, post) => sum + (this.analytics[post.id]?.engagements || 0), 0),
            clicks: this.posts.reduce((sum, post) => sum + (this.analytics[post.id]?.clicks || 0), 0),
            shares: this.posts.reduce((sum, post) => sum + (this.analytics[post.id]?.shares || 0), 0)
          }
        }
      };
    }
    
    const postAnalytics = this.analytics[postId];
    if (!postAnalytics) {
      throw new Error(`Analytics not found for post: ${postId}`);
    }
    
    return {
      status: 'success',
      postId,
      analytics: postAnalytics
    };
  }
}

async function runAdvancedExample() {
  console.log('Starting Advanced Example...');
  
  try {
    // Register the custom agent class
    AgentFactory.registerAgentClass('marketing', MarketingAgent);
    
    // Register the custom tool
    const socialMediaTool = new SocialMediaTool();
    globalToolRegistry.registerTool(socialMediaTool);
    
    // Step 3: Create a CEO agent with long-term memory
    console.log('\nCreating CEO agent with long-term memory...');
    const ceoBlueprint = {
      role: 'CEO',
      tools: ['WebSearchTool', 'ContentGenerationTool', 'SchedulingTool'],
      memory: 'long-term',
      llm: 'gpt-4-turbo'
    };
    
    const ceoAgent = await AgentFactory.createAgent(ceoBlueprint);
    await ceoAgent.initialize([
      'Become market leader in our industry',
      'Achieve 30% year-over-year growth',
      'Launch international expansion'
    ]);
    
    console.log('CEO agent created successfully!');
    
    // Step 4: Create a hierarchy of sub-agents
    console.log('\nCreating sub-agents hierarchy...');
    
    // Create CFO agent
    const cfoBlueprint = {
      role: 'CFO',
      tools: ['DataAnalysisTool'],
      memory: 'long-term',
      llm: 'gpt-4-turbo'
    };
    const cfoAgent = await ceoAgent.createSubAgent(cfoBlueprint);
    
    // Create CTO agent
    const ctoBlueprint = {
      role: 'CTO',
      tools: ['WebSearchTool'],
      memory: 'long-term',
      llm: 'gpt-4-turbo'
    };
    const ctoAgent = await ceoAgent.createSubAgent(ctoBlueprint);
    
    // Create Marketing agent using our custom class
    const marketingBlueprint = {
      role: 'Marketing',
      tools: ['ContentGenerationTool', 'SocialMediaTool'],
      memory: 'short-term',
      llm: 'gpt-4-turbo'
    };
    const marketingAgent = await ceoAgent.createSubAgent(marketingBlueprint);
    
    console.log('Sub-agents created successfully!');
    console.log('Total sub-agents:', Object.keys(ceoAgent.getAllSubAgents()).length);
    
    // Step 5: Demonstrate inter-agent communication
    console.log('\nDemonstrating inter-agent communication...');
    
    // CEO sends a message to the Marketing agent
    const message = new Message(
      ceoAgent.id,
      marketingAgent.id,
      'We need to prepare a marketing campaign for our new product launch.',
      { priority: 'high', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
    );
    
    globalCommunicationSystem.sendMessage(
      ceoAgent.id,
      marketingAgent.id,
      'We need to prepare a marketing campaign for our new product launch.',
      { priority: 'high', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
    );
    
    // Marketing agent receives the message
    const marketingMessages = globalCommunicationSystem.getMessages(marketingAgent.id, { unreadOnly: true });
    console.log(`Marketing agent has ${marketingMessages.length} unread messages`);
    
    if (marketingMessages.length > 0) {
      const firstMessage = marketingMessages[0];
      console.log('Message content:', firstMessage.content);
      console.log('Message metadata:', firstMessage.metadata);
      
      // Marketing agent marks the message as read
      globalCommunicationSystem.markMessagesAsRead(marketingAgent.id, firstMessage.id);
      
      // Marketing agent replies to the CEO
      const reply = firstMessage.createReply(
        'I will start working on the campaign plan right away. When is the product launch date?',
        { status: 'in_progress' }
      );
      
      globalCommunicationSystem.sendMessage(
        reply.from,
        reply.to,
        reply.content,
        reply.metadata
      );
    }
    
    // Get the conversation between CEO and Marketing
    const conversation = globalCommunicationSystem.getConversation(ceoAgent.id, marketingAgent.id);
    console.log('Conversation history:');
    conversation.forEach(msg => {
      console.log(`[${msg.from} -> ${msg.to}]: ${msg.content}`);
    });
    
    // Step 6: Use the custom tool with the Marketing agent
    console.log('\nUsing custom SocialMediaTool with Marketing agent...');
    
    const marketingTask = {
      type: 'content_creation',
      description: 'Create social media content for product launch',
      data: {
        type: 'social media post',
        topic: 'New product launch',
        audience: 'Tech professionals'
      }
    };
    
    const contentResult = await ceoAgent.delegateTask(marketingAgent.id, marketingTask);
    console.log('Content creation result:', JSON.stringify(contentResult, null, 2));
    
    // Use the social media tool to post the content
    const postResult = await globalToolRegistry.executeTool('SocialMediaTool', {
      action: 'post',
      content: contentResult.content,
      platforms: ['Twitter', 'LinkedIn']
    }, { agentId: marketingAgent.id });
    
    console.log('Social media post result:', JSON.stringify(postResult, null, 2));
    
    // Get analytics for the post
    const analyticsResult = await globalToolRegistry.executeTool('SocialMediaTool', {
      action: 'analyze',
      postId: postResult.postId
    });
    
    console.log('Social media analytics:', JSON.stringify(analyticsResult, null, 2));
    
    // Step 7: Demonstrate campaign planning with the Marketing agent
    console.log('\nDelegating campaign planning task to Marketing agent...');
    
    const campaignTask = {
      type: 'campaign_planning',
      description: 'Plan the product launch campaign',
      data: {
        name: 'Q4 Product Launch Campaign',
        objective: 'Generate awareness and leads for the new product',
        targetAudience: ['Enterprise IT Managers', 'CTOs', 'System Administrators'],
        channels: ['Social Media', 'Email', 'Webinars', 'Industry Events'],
        budget: 250000,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        kpis: ['Leads Generated', 'Website Traffic', 'Demo Requests']
      }
    };
    
    const campaignResult = await ceoAgent.delegateTask(marketingAgent.id, campaignTask);
    console.log('Campaign planning result:', JSON.stringify(campaignResult, null, 2));
    
    // Step 8: CEO reviews all delegated tasks
    console.log('\nCEO reviewing all delegated tasks:');
    const delegatedTasks = ceoAgent.getDelegatedTasksStatus();
    console.log(JSON.stringify(delegatedTasks, null, 2));
    
    console.log('\nAdvanced Example completed successfully!');
  } catch (error) {
    console.error('Error in Advanced Example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runAdvancedExample().catch(console.error);
}

module.exports = { runAdvancedExample, MarketingAgent, SocialMediaTool };