const AgentFactory = require('../AgentFactory');
const Agent = require('../../agents/Agent');
const config = require('../../config');
const path = require('path');
const fs = require('fs');

// Mock dependencies
jest.mock('../../agents/Agent');
jest.mock('../../config', () => ({
  agents: {
    roles: {
      CEO: {
        defaultTools: ['strategy', 'decision'],
        defaultProvider: 'openai',
        defaultModel: 'gpt-4'
      }
    },
    defaultTools: ['search', 'analyze'],
    llm: {
      defaultProvider: 'openai',
      defaultModel: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2048
    }
  }
}));

jest.mock('fs', () => ({
  existsSync: jest.fn()
}));

describe('AgentFactory Module', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset static properties
    AgentFactory.customAgentClasses = new Map();
    AgentFactory.agentRegistry = new Map();
    
    // Mock Agent class implementation
    Agent.mockImplementation((blueprint) => {
      return {
        id: blueprint.id || 'mock-agent-id',
        role: blueprint.role,
        initialize: jest.fn().mockResolvedValue({ id: blueprint.id, role: blueprint.role }),
        dispose: jest.fn()
      };
    });
  });

  test('should throw error if blueprint is invalid', async () => {
    await expect(AgentFactory.createAgent(null)).rejects.toThrow('Invalid agent blueprint: role is required');
    await expect(AgentFactory.createAgent({})).rejects.toThrow('Invalid agent blueprint: role is required');
  });

  test('should preprocess blueprint correctly', () => {
    const blueprint = { role: 'CEO' };
    const processed = AgentFactory._preprocessBlueprint(blueprint);
    
    expect(processed).toEqual({
      role: 'CEO',
      tools: ['strategy', 'decision'],
      llm: {
        provider: 'openai',
        model: 'gpt-4'
      }
    });
  });

  test('should preprocess blueprint with custom values', () => {
    const blueprint = {
      role: 'CEO',
      tools: ['custom-tool'],
      llm: {
        provider: 'anthropic',
        model: 'claude-2'
      }
    };
    const processed = AgentFactory._preprocessBlueprint(blueprint);
    
    expect(processed).toEqual(blueprint);
  });

  test('should create CEO agent', async () => {
    const blueprint = { role: 'CEO' };
    const agent = await AgentFactory.createAgent(blueprint);
    expect(agent).toBeDefined();
    expect(agent.role.toLowerCase()).toBe('ceo');
  });

  test('should create generic agent for unknown role', async () => {
    const blueprint = { role: 'UnknownRole' };
    const agent = await AgentFactory.createAgent(blueprint);
    expect(agent).toBeDefined();
  });

  test('should resolve agent class for known role', async () => {
    // Mock a custom agent class
    class CEOAgent extends Agent {}
    AgentFactory.customAgentClasses.set('ceo', CEOAgent);
    
    const AgentClass = await AgentFactory._resolveAgentClass('CEO');
    expect(AgentClass).toBe(CEOAgent);
  });

  test('should dynamically load agent class if file exists', async () => {
    // Mock file existence and require
    fs.existsSync.mockReturnValue(true);
    
    // Mock a dynamic require
    const mockCEOAgent = class CEOAgent extends Agent {};
    jest.mock('../../agents/CEOAgent', () => mockCEOAgent, { virtual: true });
    
    const AgentClass = await AgentFactory._resolveAgentClass('CEO');
    
    expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('CEOAgent.js'));
  });

  test('should fall back to generic Agent class', async () => {
    fs.existsSync.mockReturnValue(false);
    
    const AgentClass = await AgentFactory._resolveAgentClass('Unknown');
    
    expect(AgentClass).toBe(Agent);
  });

  test('should register agent in registry', () => {
    const agent = { id: 'test-agent', role: 'tester' };
    
    AgentFactory._registerAgent(agent);
    
    expect(AgentFactory.agentRegistry.size).toBe(1);
    expect(AgentFactory.agentRegistry.get('test-agent')).toEqual({
      agent,
      role: 'tester',
      createdAt: expect.any(Date)
    });
  });

  test('should register custom agent class', () => {
    class CustomAgent extends Agent {}
    
    AgentFactory.registerAgentClass('custom', CustomAgent);
    
    expect(AgentFactory.customAgentClasses.size).toBe(1);
    expect(AgentFactory.customAgentClasses.get('custom')).toBe(CustomAgent);
  });

  test('should throw error when registering invalid agent class', () => {
    expect(() => AgentFactory.registerAgentClass('custom', {})).toThrow('AgentClass must be a subclass of Agent');
    expect(() => AgentFactory.registerAgentClass('', Agent)).toThrow('Role must be a non-empty string');
  });

  test('should get agent class by role', () => {
    class CustomAgent extends Agent {}
    AgentFactory.customAgentClasses.set('custom', CustomAgent);
    
    expect(AgentFactory.getAgentClass('custom')).toBe(CustomAgent);
    expect(AgentFactory.getAgentClass('unknown')).toBeNull();
    expect(AgentFactory.getAgentClass('')).toBeNull();
  });

  test('should get agent by ID', () => {
    const agent = { id: 'test-agent', role: 'tester' };
    AgentFactory.agentRegistry.set('test-agent', { agent, role: 'tester', createdAt: new Date() });
    
    expect(AgentFactory.getAgent('test-agent')).toBe(agent);
    expect(AgentFactory.getAgent('unknown')).toBeNull();
  });

  test('should get all agents', () => {
    const agent1 = { id: 'agent-1', role: 'role-1' };
    const agent2 = { id: 'agent-2', role: 'role-2' };
    
    AgentFactory.agentRegistry.set('agent-1', { agent: agent1, role: 'role-1', createdAt: new Date() });
    AgentFactory.agentRegistry.set('agent-2', { agent: agent2, role: 'role-2', createdAt: new Date() });
    
    const allAgents = AgentFactory.getAllAgents();
    
    expect(allAgents).toBe(AgentFactory.agentRegistry);
    expect(allAgents.size).toBe(2);
  });

  test('should get agents by role', () => {
    const agent1 = { id: 'agent-1', role: 'role-1' };
    const agent2 = { id: 'agent-2', role: 'role-2' };
    const agent3 = { id: 'agent-3', role: 'role-1' };
    
    AgentFactory.agentRegistry.set('agent-1', { agent: agent1, role: 'role-1', createdAt: new Date() });
    AgentFactory.agentRegistry.set('agent-2', { agent: agent2, role: 'role-2', createdAt: new Date() });
    AgentFactory.agentRegistry.set('agent-3', { agent: agent3, role: 'role-1', createdAt: new Date() });
    
    const role1Agents = AgentFactory.getAgentsByRole('role-1');
    
    expect(role1Agents).toHaveLength(2);
    expect(role1Agents).toContain(agent1);
    expect(role1Agents).toContain(agent3);
    expect(role1Agents).not.toContain(agent2);
  });

  test('should dispose agent', () => {
    const agent = { id: 'test-agent', role: 'tester', dispose: jest.fn() };
    AgentFactory.agentRegistry.set('test-agent', { agent, role: 'tester', createdAt: new Date() });
    
    const result = AgentFactory.disposeAgent('test-agent');
    
    expect(result).toBe(true);
    expect(agent.dispose).toHaveBeenCalled();
    expect(AgentFactory.agentRegistry.size).toBe(0);
  });

  test('should return false when disposing non-existent agent', () => {
    const result = AgentFactory.disposeAgent('non-existent');
    
    expect(result).toBe(false);
  });

  test('should dispose all agents', () => {
    const agent1 = { id: 'agent-1', role: 'role-1', dispose: jest.fn() };
    const agent2 = { id: 'agent-2', role: 'role-2', dispose: jest.fn() };
    
    AgentFactory.agentRegistry.set('agent-1', { agent: agent1, role: 'role-1', createdAt: new Date() });
    AgentFactory.agentRegistry.set('agent-2', { agent: agent2, role: 'role-2', createdAt: new Date() });
    
    AgentFactory.disposeAllAgents();
    
    expect(agent1.dispose).toHaveBeenCalled();
    expect(agent2.dispose).toHaveBeenCalled();
    expect(AgentFactory.agentRegistry.size).toBe(0);
  });
});
