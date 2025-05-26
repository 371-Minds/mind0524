/**
 * Basic example of using the Autonomous Agent Framework
 * 
 * This example demonstrates how to:
 * 1. Create a CEO agent
 * 2. Create sub-agents (CFO and CTO)
 * 3. Delegate tasks to sub-agents
 * 4. Execute strategic tasks with the CEO
 */

require('dotenv').config();
const CEOAgent = require('../src/agents/CEOAgent');
const AgentFactory = require('../src/core/AgentFactory');

async function runExample() {
  console.log('Starting Basic Example...');
  
  try {
    // Step 1: Create a CEO agent
    console.log('\nCreating CEO agent...');
    const ceoBlueprint = {
      role: 'CEO',
      tools: ['WebSearchTool', 'ContentGenerationTool'],
      memory: 'long-term',
      llm: 'gpt-4-turbo'
    };
    
    const ceoAgent = await AgentFactory.createAgent(ceoBlueprint);
    
    // Initialize with organization goals
    await ceoAgent.initialize([
      'Achieve 15% revenue growth',
      'Launch 2 new product lines',
      'Improve customer satisfaction by 10%'
    ]);
    
    console.log('CEO agent created successfully!');
    console.log('CEO Status:', ceoAgent.getStatus());
    
    // Step 2: Create sub-agents
    console.log('\nCreating sub-agents...');
    
    // Create CFO agent
    const cfoBlueprint = {
      role: 'CFO',
      tools: ['DataAnalysisTool'],
      memory: 'short-term',
      llm: 'gpt-4-turbo'
    };
    
    const cfoAgent = await ceoAgent.createSubAgent(cfoBlueprint);
    console.log('CFO agent created successfully!');
    
    // Create CTO agent
    const ctoBlueprint = {
      role: 'CTO',
      tools: ['WebSearchTool'],
      memory: 'short-term',
      llm: 'gpt-4-turbo'
    };
    
    const ctoAgent = await ceoAgent.createSubAgent(ctoBlueprint);
    console.log('CTO agent created successfully!');
    
    // Step 3: Delegate tasks to sub-agents
    console.log('\nDelegating tasks to sub-agents...');
    
    // Delegate a task to the CFO
    const cfoTask = {
      type: 'budget_analysis',
      description: 'Analyze the marketing department budget',
      data: {
        totalBudget: 500000,
        allocations: {
          advertising: 200000,
          events: 150000,
          content: 100000,
          research: 50000
        }
      }
    };
    
    console.log('Delegating budget analysis task to CFO...');
    const cfoResult = await ceoAgent.delegateTask(cfoAgent.id, cfoTask);
    console.log('CFO Task Result:', JSON.stringify(cfoResult, null, 2));
    
    // Delegate a task to the CTO
    const ctoTask = {
      type: 'tech_evaluation',
      description: 'Evaluate a new cloud provider',
      data: {
        name: 'Microsoft Azure',
        category: 'Cloud Infrastructure'
      }
    };
    
    console.log('\nDelegating technology evaluation task to CTO...');
    const ctoResult = await ceoAgent.delegateTask(ctoAgent.id, ctoTask);
    console.log('CTO Task Result:', JSON.stringify(ctoResult, null, 2));
    
    // Step 4: Execute a strategic task with the CEO
    console.log('\nExecuting strategic task with CEO...');
    const strategicTask = {
      type: 'strategic',
      description: 'Evaluate potential acquisition target',
      updateGoals: true,
      newGoals: ['Complete acquisition of XYZ Corp by Q4']
    };
    
    const strategicResult = await ceoAgent.executeTask(strategicTask);
    console.log('Strategic Task Result:', JSON.stringify(strategicResult, null, 2));
    
    // Display final organization goals
    console.log('\nUpdated Organization Goals:');
    console.log(strategicResult.updatedGoals);
    
    // Display delegated tasks status
    console.log('\nDelegated Tasks Status:');
    console.log(JSON.stringify(ceoAgent.getDelegatedTasksStatus(), null, 2));
    
    console.log('\nBasic Example completed successfully!');
  } catch (error) {
    console.error('Error in Basic Example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

module.exports = { runExample };