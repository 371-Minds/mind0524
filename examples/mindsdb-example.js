const { AgentFactory } = require('../src');

async function main() {
  try {
    // Create a MindsDB agent
    const mindsdbAgent = await AgentFactory.createAgent({
      role: 'MindsDB',
      name: 'my_mindsdb_agent',
    });

    // Execute a task with the MindsDB agent
    const result = await mindsdbAgent.executeTask({
      description: 'What is the meaning of life?',
    });

    console.log('MindsDB Agent response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
