const { AgentOrchestrator } = require('../AgentOrchestrator');

describe('AgentOrchestrator Module', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new AgentOrchestrator({ evaluationPeriod: 10000 });
  });

  test('should register an agent', () => {
    const agentId = 'agent1';
    const agent = { role: 'TestAgent' };
    const result = orchestrator.registerAgent(agentId, agent);
    expect(result).toBe(agentId);
    expect(orchestrator.agents.has(agentId)).toBe(true);
  });

  test('should schedule and evaluate agent', async () => {
    const agentId = 'agent2';
    const agent = { role: 'TestAgent' };
    orchestrator.registerAgent(agentId, agent);
    const evaluation = await orchestrator.evaluateAgent(agentId);
    expect(evaluation).toHaveProperty('status', 'evaluated');
  });

  test('should terminate agent', async () => {
    const agentId = 'agent3';
    const agent = { role: 'TestAgent' };
    orchestrator.registerAgent(agentId, agent);
    const termination = await orchestrator.terminateAgent(agentId, { reason: 'test' });
    expect(termination).toHaveProperty('status', 'terminated');
    expect(orchestrator.agents.has(agentId)).toBe(false);
  });
});
