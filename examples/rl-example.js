/**
 * Reinforcement Learning Example for the Autonomous Agent Framework
 * 
 * This example demonstrates how to:
 * 1. Create a CEO agent with reinforcement learning enabled
 * 2. Create sub-agents that will be optimized through RL
 * 3. Delegate tasks and provide feedback for learning
 * 4. Use action masking to restrict tool usage
 * 5. Monitor agent performance over time
 */

require('dotenv').config();
const CEOAgent = require('../src/agents/CEOAgent');
const { globalRLManager } = require('../src/core/ReinforcementLearning');
const { globalToolRegistry } = require('../src/core/Tools');

async function runRLExample() {
  console.log('Starting Reinforcement Learning Example...');
  
  try {
    // Step 1: Create a CEO agent with RL enabled
    console.log('\nCreating CEO agent with reinforcement learning...');
    const ceoBlueprint = {
      role: 'CEO',
      tools: ['WebSearchTool', 'SchedulingTool'],
      memory: 'long-term',
      llm: 'gpt-4-turbo',
      useReinforcementLearning: true // Explicitly enable RL
    };
    
    const ceoAgent = new CEOAgent(ceoBlueprint);
    await ceoAgent.initialize([
      'Optimize agent performance through reinforcement learning',
      'Identify and restrict misused tools',
      'Improve task delegation efficiency'
    ]);
    
    console.log('CEO agent created successfully!');
    
    // Step 2: Create sub-agents for different roles
    console.log('\nCreating sub-agents...');
    
    // Create CFO agent
    const cfoBlueprint = {
      role: 'CFO',
      tools: ['DataAnalysisTool'],
      memory: 'short-term',
      llm: 'gpt-4-turbo'
    };
    const cfoAgent = await ceoAgent.createSubAgent(cfoBlueprint);
    
    // Create CTO agent
    const ctoBlueprint = {
      role: 'CTO',
      tools: ['WebSearchTool'],
      memory: 'short-term',
      llm: 'gpt-4-turbo'
    };
    const ctoAgent = await ceoAgent.createSubAgent(ctoBlueprint);
    
    // Create Marketing agent
    const marketingBlueprint = {
      role: 'Marketing',
      tools: ['ContentGenerationTool', 'WebSearchTool'],
      memory: 'short-term',
      llm: 'gpt-4-turbo'
    };
    const marketingAgent = await ceoAgent.createSubAgent(marketingBlueprint);
    
    console.log('Sub-agents created successfully!');
    
    // Step 3: Simulate task delegation with feedback
    console.log('\nSimulating task delegation with feedback...');
    
    // Simulate multiple task delegations to build up learning data
    for (let i = 0; i < 5; i++) {
      console.log(`\nIteration ${i+1}:`);
      
      // Delegate a financial analysis task to CFO
      const cfoTask = {
        type: 'financial_analysis',
        description: 'Analyze quarterly budget performance',
        tools: ['DataAnalysisTool'],
        expectedTime: 5000, // 5 seconds
        data: {
          quarter: `Q${i+1}`,
          year: '2023',
          departments: ['Marketing', 'Engineering', 'Sales']
        }
      };
      
      try {
        console.log(`Delegating financial analysis task to CFO...`);
        const cfoResult = await ceoAgent.delegateTask(cfoAgent.id, cfoTask);
        console.log(`CFO task result:`, cfoResult.status);
        
        // Provide additional feedback based on simulated human evaluation
        const humanFeedback = Math.random() > 0.3 ? 0.7 : -0.3; // Mostly positive feedback
        await ceoAgent.executeTask({
          type: 'rl_optimization',
          action: 'provide_feedback',
          agentId: cfoAgent.id,
          rewardSignal: humanFeedback,
          context: {
            source: 'human_evaluation',
            taskId: cfoTask.id
          }
        });
        console.log(`Provided human feedback to CFO: ${humanFeedback}`);
      } catch (error) {
        console.error(`Error with CFO task:`, error.message);
      }
      
      // Delegate a technical task to CTO
      const ctoTask = {
        type: 'technical_evaluation',
        description: 'Evaluate new cloud provider options',
        tools: ['WebSearchTool'],
        expectedTime: 5000, // 5 seconds
        data: {
          providers: ['AWS', 'Azure', 'GCP'],
          requirements: ['Cost', 'Scalability', 'Security']
        }
      };
      
      try {
        console.log(`Delegating technical evaluation task to CTO...`);
        const ctoResult = await ceoAgent.delegateTask(ctoAgent.id, ctoTask);
        console.log(`CTO task result:`, ctoResult.status);
        
        // Simulate tool misuse for demonstration purposes (on iteration 3)
        if (i === 2) {
          console.log(`Simulating tool misuse by CTO...`);
          await ceoAgent.executeTask({
            type: 'rl_optimization',
            action: 'provide_feedback',
            agentId: ctoAgent.id,
            rewardSignal: -0.8, // Strong negative feedback
            context: {
              source: 'security_audit',
              toolUsed: 'WebSearchTool',
              reason: 'Excessive API usage'
            }
          });
        }
      } catch (error) {
        console.error(`Error with CTO task:`, error.message);
      }
      
      // Delegate a marketing task
      const marketingTask = {
        type: 'content_creation',
        description: 'Create social media campaign for product launch',
        tools: ['ContentGenerationTool', 'WebSearchTool'],
        expectedTime: 5000, // 5 seconds
        data: {
          product: `Product ${i+1}`,
          channels: ['Twitter', 'LinkedIn', 'Instagram'],
          targetAudience: 'Tech professionals'
        }
      };
      
      try {
        console.log(`Delegating content creation task to Marketing...`);
        const marketingResult = await ceoAgent.delegateTask(marketingAgent.id, marketingTask);
        console.log(`Marketing task result:`, marketingResult.status);
      } catch (error) {
        console.error(`Error with Marketing task:`, error.message);
      }
      
      // Short delay between iterations
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Step 4: Demonstrate auto-delegation with RL
    console.log('\nDemonstrating auto-delegation with reinforcement learning...');
    
    const autoTask = {
      type: 'delegation',
      description: 'Automatically delegate task to the most appropriate agent',
      delegatedTask: {
        type: 'content_creation',
        description: 'Create product launch materials',
        tools: ['ContentGenerationTool'],
        data: {
          product: 'New AI Assistant',
          audience: 'Enterprise customers'
        }
      }
    };
    
    const autoResult = await ceoAgent.executeTask(autoTask);
    console.log(`Auto-delegation result:`, autoResult.status);
    
    // Step 5: Check for tool masking
    console.log('\nChecking for tool masking effects...');
    
    // Check if WebSearchTool is masked for CTO
    const isWebSearchMasked = globalRLManager.isToolMasked(ctoAgent.id, 'WebSearchTool');
    console.log(`WebSearchTool is ${isWebSearchMasked ? 'masked' : 'available'} for CTO`);
    
    // Get available tools for CTO
    const availableTools = globalRLManager.getAvailableTools(ctoAgent.id, ['WebSearchTool', 'DataAnalysisTool']);
    console.log(`Available tools for CTO:`, availableTools);
    
    // Step 6: Get performance metrics
    console.log('\nGetting performance metrics for all agents...');
    
    const performanceResult = await ceoAgent.executeTask({
      type: 'rl_optimization',
      action: 'get_performance'
    });
    
    console.log('Agent performance metrics:');
    for (const [agentId, metrics] of Object.entries(performanceResult.performance)) {
      console.log(`- ${metrics.role}:`);
      console.log(`  Average reward: ${metrics.averageReward.toFixed(2)}`);
      console.log(`  Success rate: ${(metrics.successRate * 100).toFixed(2)}%`);
      console.log(`  Total actions: ${metrics.totalActions}`);
      console.log(`  Masked tools: ${metrics.maskedTools.length > 0 ? metrics.maskedTools.join(', ') : 'None'}`);
    }
    
    // Step 7: Demonstrate policy state
    console.log('\nExamining policy state for CFO agent...');
    
    const cfoPolicy = globalRLManager.getPolicy(cfoAgent.id);
    console.log('CFO policy state:', cfoPolicy.getState());
    
    console.log('\nReinforcement Learning Example completed successfully!');
  } catch (error) {
    console.error('Error in RL Example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runRLExample().catch(console.error);
}

module.exports = { runRLExample };