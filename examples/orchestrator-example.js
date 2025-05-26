/**
 * Agent Orchestrator Example for Fault Tolerance & Scaling
 * 
 * This example demonstrates how to:
 * 1. Use the AgentOrchestrator for agent lifecycle management
 * 2. Implement fault tolerance through agent evaluation and termination
 * 3. Replace terminated agents with improved versions
 * 4. Use basic actor model communication between agents
 * 5. Monitor orchestrator statistics
 */

require('dotenv').config();
const CEOAgent = require('../src/agents/CEOAgent');
const { globalRLManager } = require('../src/core/ReinforcementLearning');
const { globalAgentOrchestrator } = require('../src/core/AgentOrchestrator');

async function runOrchestratorExample() {
  console.log('Starting Agent Orchestrator Example...');
  
  try {
    // Configure the orchestrator with custom settings
    // Lower threshold and evaluation period for demonstration purposes
    globalAgentOrchestrator.performanceThreshold = 0.2; // More lenient threshold
    globalAgentOrchestrator.evaluationPeriod = 10000; // 10 seconds for demo
    
    console.log('Orchestrator configured with:');
    console.log(`- Performance threshold: ${globalAgentOrchestrator.performanceThreshold}`);
    console.log(`- Evaluation period: ${globalAgentOrchestrator.evaluationPeriod}ms`);
    
    // Step 1: Create a CEO agent with RL enabled
    console.log('\nCreating CEO agent with reinforcement learning...');
    const ceoBlueprint = {
      role: 'CEO',
      tools: ['WebSearchTool', 'SchedulingTool'],
      memory: 'long-term',
      llm: 'gpt-4-turbo',
      useReinforcementLearning: true
    };
    
    const ceoAgent = new CEOAgent(ceoBlueprint);
    await ceoAgent.initialize([
      'Optimize agent performance through reinforcement learning',
      'Identify and terminate underperforming agents',
      'Scale agent operations efficiently'
    ]);
    
    // Register CEO with orchestrator
    globalAgentOrchestrator.registerAgent(ceoAgent.id, ceoAgent, {
      critical: true, // Mark as critical to prevent auto-termination
      enableAutoEvaluation: false // We'll manually evaluate the CEO
    });
    
    console.log(`CEO agent created and registered with ID: ${ceoAgent.id}`);
    
    // Step 2: Create sub-agents for different roles
    console.log('\nCreating and registering sub-agents...');
    
    // Create and register multiple agents with different performance profiles
    const subAgents = {};
    const roles = ['CFO', 'CTO', 'Marketing', 'HR', 'Sales'];
    
    for (const role of roles) {
      const blueprint = {
        role,
        tools: ['WebSearchTool', 'DataAnalysisTool'],
        memory: 'short-term',
        llm: 'gpt-4-turbo'
      };
      
      const agent = await ceoAgent.createSubAgent(blueprint);
      console.log(`Created ${role} agent with ID: ${agent.id}`);
      
      // Register with orchestrator
      globalAgentOrchestrator.registerAgent(agent.id, agent, {
        critical: false,
        enableAutoEvaluation: true
      });
      
      subAgents[role] = agent;
    }
    
    // Step 3: Simulate task execution and performance feedback
    console.log('\nSimulating task execution with varying performance...');
    
    // Function to simulate task execution with controlled performance
    async function simulateTaskExecution(agentId, role, performanceLevel) {
      const task = {
        type: role.toLowerCase() + '_task',
        description: `Execute ${role} responsibilities`,
        tools: ['WebSearchTool', 'DataAnalysisTool'],
        expectedTime: 2000
      };
      
      try {
        console.log(`Delegating task to ${role} agent...`);
        const result = await ceoAgent.delegateTask(agentId, task);
        
        // Provide synthetic feedback based on performanceLevel
        await ceoAgent.executeTask({
          type: 'rl_optimization',
          action: 'provide_feedback',
          agentId: agentId,
          rewardSignal: performanceLevel, // Control performance with this value
          context: {
            source: 'simulation',
            taskId: task.id
          }
        });
        
        console.log(`${role} task completed with simulated performance: ${performanceLevel.toFixed(2)}`);
        return result;
      } catch (error) {
        console.error(`Error with ${role} task:`, error.message);
        return { status: 'error', error: error.message };
      }
    }
    
    // Simulate varying performance levels for different agents
    const performanceMap = {
      'CFO': 0.8,     // Good performer
      'CTO': 0.6,     // Decent performer
      'Marketing': 0.4, // Mediocre performer
      'HR': 0.1,      // Poor performer (candidate for termination)
      'Sales': -0.2   // Very poor performer (definite termination)
    };
    
    // Run multiple task iterations to build up performance history
    for (let i = 0; i < 3; i++) {
      console.log(`\nTask iteration ${i+1}:`);
      
      for (const [role, agent] of Object.entries(subAgents)) {
        // Add some randomness to performance but maintain the general trend
        const basePerformance = performanceMap[role];
        const jitter = (Math.random() * 0.2) - 0.1; // +/- 0.1 randomness
        const actualPerformance = Math.min(1, Math.max(-1, basePerformance + jitter));
        
        await simulateTaskExecution(agent.id, role, actualPerformance);
      }
      
      // Short delay between iterations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Step 4: Manually evaluate all agents
    console.log('\nManually evaluating all agents...');
    
    const evaluationResults = [];
    
    for (const [role, agent] of Object.entries(subAgents)) {
      try {
        const result = await globalAgentOrchestrator.evaluateAgent(agent.id);
        evaluationResults.push(result);
        console.log(`${role} evaluation:`, 
          result.status === 'terminated' 
            ? `TERMINATED (reason: ${result.reason})` 
            : `Score: ${result.score.toFixed(2)}`);
      } catch (error) {
        console.error(`Error evaluating ${role}:`, error.message);
      }
    }
    
    // Step 5: Get replacement for terminated agents
    console.log('\nGetting replacements for terminated agents...');
    
    const terminatedResults = evaluationResults.filter(r => r.status === 'terminated');
    
    for (const result of terminatedResults) {
      try {
        // Create an improved blueprint for the replacement
        const replacementBlueprint = {
          tools: ['WebSearchTool', 'DataAnalysisTool', 'ImprovedAnalysisTool'],
          memory: 'enhanced',
          llm: 'gpt-4-turbo'
        };
        
        const replacement = await globalAgentOrchestrator.getReplacementAgent(
          result.agentId, 
          replacementBlueprint
        );
        
        console.log(`Replacement ready for ${result.role}:`, replacement.status);
        console.log(`- Original agent ID: ${replacement.originalAgentId}`);
        console.log(`- Adjusted parameters: ${replacement.blueprint.adjustedParameters ? 'Yes' : 'No'}`);
      } catch (error) {
        console.error(`Error getting replacement:`, error.message);
      }
    }
    
    // Step 6: Demonstrate actor model communication
    console.log('\nDemonstrating actor model communication...');
    
    // Find a surviving agent to communicate with
    const survivingAgentIds = Object.values(subAgents)
      .map(a => a.id)
      .filter(id => !terminatedResults.some(r => r.agentId === id));
    
    if (survivingAgentIds.length > 0) {
      const targetAgentId = survivingAgentIds[0];
      
      // Send a message from CEO to the surviving agent
      const messageId = await globalAgentOrchestrator.sendMessage(targetAgentId, {
        type: 'command',
        action: 'prepare_report',
        priority: 'high',
        deadline: Date.now() + 3600000 // 1 hour from now
      });
      
      console.log(`Message sent to agent ${targetAgentId}, message ID: ${messageId}`);
      
      // In a real implementation, the agent would process this message
      // and potentially send a response back
    } else {
      console.log('No surviving agents to communicate with!');
    }
    
    // Step 7: Get orchestrator statistics
    console.log('\nGetting orchestrator statistics...');
    
    const stats = globalAgentOrchestrator.getStatistics();
    console.log('Orchestrator statistics:');
    console.log(`- Active agents: ${stats.activeAgents}`);
    console.log(`- Terminated agents: ${stats.terminatedAgents}`);
    console.log(`- Message queue size: ${stats.messageQueueSize}`);
    console.log(`- Node ID: ${stats.nodeId}`);
    console.log(`- Cluster size: ${stats.clusterSize}`);
    console.log(`- Performance threshold: ${stats.performanceThreshold}`);
    
    // Step 8: Clean up
    console.log('\nCleaning up resources...');
    globalAgentOrchestrator.shutdown();
    
    console.log('\nAgent Orchestrator Example completed successfully!');
  } catch (error) {
    console.error('Error in Orchestrator Example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runOrchestratorExample().catch(console.error);
}

module.exports = { runOrchestratorExample };