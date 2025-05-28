const Agent = require('../Agent');
const { MemoryFactory } = require('../../core/Memory');
const LLMIntegration = require('../../core/LLMIntegration');
const { globalKnowledgeGraph } = require('../../core/KnowledgeGraph');
const EventEmitter = require('events');

// Mock dependencies
jest.mock('../../core/Memory', () => ({
  MemoryFactory: {
    createMemory: jest.fn().mockReturnValue({
      store: jest.fn().mockReturnValue(true),
      retrieve: jest.fn().mockReturnValue({ data: 'test data' }),
      getStats: jest.fn().mockReturnValue({ size: 10, items: 5 }),
      dispose: jest.fn()
    })
  }
}));

jest.mock('../../core/LLMIntegration', () => {
  return jest.fn().mockImplementation(() => ({
    setActiveProvider: jest.fn().mockResolvedValue(true),
    getActiveProvider: jest.fn().mockReturnValue('openai'),
    getRegisteredProviders: jest.fn().mockReturnValue(['openai', 'anthropic']),
    getMetrics: jest.fn().mockReturnValue({ totalCalls: 10, averageLatency: 200 }),
    registerCustomProvider: jest.fn()
  }));
});

jest.mock('../../core/KnowledgeGraph', () => ({
  globalKnowledgeGraph: {
    queryPreTask: jest.fn().mockResolvedValue({ relevantData: 'test data' }),
    logPostTask: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid')
}));

describe('Agent Class', () => {
  let agent;
  const mockBlueprint = {
    id: 'test-agent',
    role: 'tester',
    tools: ['search', 'analyze'],
    llm: {
      provider: 'openai',
      model: 'gpt-4'
    },
    memory: {
      type: 'short-term'
    }
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new agent instance
    agent = new Agent(mockBlueprint);
    
    // Mock console methods to prevent logging during tests
    global.console = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  });

  test('should initialize with correct properties', () => {
    expect(agent.id).toBe('test-agent');
    expect(agent.role).toBe('tester');
    expect(agent.status).toBe('initializing');
    expect(agent.tools).toEqual([]);
    expect(agent.mailbox).toEqual([]);
    expect(agent.tasks).toEqual([]);
    expect(agent.messageHandlers).toBeInstanceOf(Map);
    expect(agent.metrics).toEqual({
      tasksExecuted: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    });
  });

  test('should process blueprint correctly', () => {
    expect(agent.llmConfig).toEqual({
      provider: 'openai',
      model: 'gpt-4'
    });
    expect(agent.memoryConfig).toEqual({
      type: 'short-term',
      namespace: `agent-${agent.id}`
    });
    expect(agent.toolNames).toEqual(['search', 'analyze']);
  });

  test('should set up logger correctly', () => {
    expect(agent.logger).toBeDefined();
    expect(typeof agent.logger.debug).toBe('function');
    expect(typeof agent.logger.info).toBe('function');
    expect(typeof agent.logger.warn).toBe('function');
    expect(typeof agent.logger.error).toBe('function');
  });

  test('should initialize agent successfully', async () => {
    // Mock the setup methods
    agent._setupMemory = jest.fn().mockResolvedValue();
    agent._setupLLM = jest.fn().mockResolvedValue();
    agent._setupTools = jest.fn().mockResolvedValue();
    agent.emit = jest.fn();

    await agent.initialize();

    expect(agent._setupMemory).toHaveBeenCalled();
    expect(agent._setupLLM).toHaveBeenCalled();
    expect(agent._setupTools).toHaveBeenCalled();
    expect(agent.status).toBe('ready');
    expect(agent.emit).toHaveBeenCalledWith('initialized', { agentId: agent.id, role: agent.role });
  });

  test('should handle initialization errors', async () => {
    // Mock the setup methods to throw an error
    agent._setupMemory = jest.fn().mockRejectedValue(new Error('Memory setup failed'));
    agent._setupLLM = jest.fn().mockResolvedValue();
    agent._setupTools = jest.fn().mockResolvedValue();

    await expect(agent.initialize()).rejects.toThrow('Failed to initialize agent: Memory setup failed');
    expect(agent.status).toBe('error');
  });

  test('should set up tools correctly', async () => {
    await agent._setupTools();
    
    expect(agent.tools.length).toBe(2);
    expect(agent.tools[0].name).toBe('search');
    expect(agent.tools[1].name).toBe('analyze');
    expect(typeof agent.tools[0].execute).toBe('function');
  });

  test('should set up memory correctly', async () => {
    await agent._setupMemory();
    
    expect(MemoryFactory.createMemory).toHaveBeenCalledWith('short-term', agent.memoryConfig);
    expect(agent.memory).toBeDefined();
  });

  test('should set up LLM correctly', async () => {
    await agent._setupLLM();
    
    expect(LLMIntegration).toHaveBeenCalledWith(agent.llmConfig);
    expect(agent.llm.setActiveProvider).toHaveBeenCalledWith('openai', {});
  });

  test('should execute task successfully', async () => {
    // Mock the required methods
    agent._getTaskContext = jest.fn().mockResolvedValue({ context: 'test context' });
    agent._processTask = jest.fn().mockResolvedValue({ result: 'success' });
    agent._logTaskCompletion = jest.fn().mockResolvedValue();
    agent.emit = jest.fn();
    
    const task = { id: 'task-1', type: 'test', data: { input: 'test input' } };
    const result = await agent.executeTask(task);
    
    expect(result).toEqual({ result: 'success' });
    expect(agent._getTaskContext).toHaveBeenCalledWith(task);
    expect(agent._processTask).toHaveBeenCalledWith({ ...task, context: { context: 'test context' } });
    expect(agent._logTaskCompletion).toHaveBeenCalled();
    expect(agent.emit).toHaveBeenCalledWith('taskStart', expect.any(Object));
    expect(agent.emit).toHaveBeenCalledWith('taskComplete', expect.any(Object));
    expect(agent.metrics.tasksExecuted).toBe(1);
    expect(agent.metrics.tasksSucceeded).toBe(1);
  });

  test('should handle task execution errors', async () => {
    // Mock the required methods
    agent._getTaskContext = jest.fn().mockResolvedValue({ context: 'test context' });
    agent._processTask = jest.fn().mockRejectedValue(new Error('Task execution failed'));
    agent._logTaskFailure = jest.fn().mockResolvedValue();
    agent.emit = jest.fn();
    
    const task = { id: 'task-1', type: 'test', data: { input: 'test input' } };
    const result = await agent.executeTask(task);
    
    expect(result.status).toBe('failed');
    expect(result.error).toBe('Task execution failed');
    expect(agent._getTaskContext).toHaveBeenCalledWith(task);
    expect(agent._logTaskFailure).toHaveBeenCalled();
    expect(agent.emit).toHaveBeenCalledWith('taskStart', expect.any(Object));
    expect(agent.emit).toHaveBeenCalledWith('taskFailed', expect.any(Object));
    expect(agent.metrics.tasksExecuted).toBe(1);
    expect(agent.metrics.tasksFailed).toBe(1);
  });

  test('should handle task timeout', async () => {
    // Mock the required methods
    agent._getTaskContext = jest.fn().mockResolvedValue({ context: 'test context' });
    agent._processTask = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    agent._logTaskFailure = jest.fn().mockResolvedValue();
    agent.emit = jest.fn();
    
    const task = { id: 'task-1', type: 'test', data: { input: 'test input' } };
    
    // Mock setTimeout to immediately trigger the timeout
    jest.useFakeTimers();
    const executePromise = agent.executeTask(task, { timeout: 50 });
    jest.advanceTimersByTime(60);
    
    await expect(executePromise).resolves.toEqual(expect.objectContaining({
      status: 'failed',
      error: expect.stringContaining('timed out')
    }));
    
    jest.useRealTimers();
  });

  test('should get task context from knowledge graph', async () => {
    const task = { type: 'test', data: { input: 'test input' } };
    const context = await agent._getTaskContext(task);
    
    expect(globalKnowledgeGraph.queryPreTask).toHaveBeenCalledWith({
      agentId: agent.id,
      taskType: task.type,
      taskData: task.data
    });
    expect(context).toEqual({ relevantData: 'test data' });
  });

  test('should log task completion to knowledge graph', async () => {
    const task = { type: 'test', data: { input: 'test input' } };
    const result = { output: 'test output', insights: ['insight1'] };
    const executionTime = 100;
    
    await agent._logTaskCompletion(task, result, executionTime);
    
    expect(globalKnowledgeGraph.logPostTask).toHaveBeenCalledWith({
      agentId: agent.id,
      taskType: task.type,
      taskData: task.data,
      result,
      executionTime,
      insights: ['insight1'],
      status: 'completed'
    });
  });

  test('should log task failure to knowledge graph', async () => {
    const task = { type: 'test', data: { input: 'test input' } };
    const error = new Error('Task failed');
    const executionTime = 100;
    
    await agent._logTaskFailure(task, error, executionTime);
    
    expect(globalKnowledgeGraph.logPostTask).toHaveBeenCalledWith({
      agentId: agent.id,
      taskType: task.type,
      taskData: task.data,
      error: 'Task failed',
      executionTime,
      status: 'failed'
    });
  });

  test('should throw error when _processTask is not implemented', async () => {
    await expect(agent._processTask({})).rejects.toThrow('_processTask must be implemented by subclass');
  });

  test('should return correct agent status', () => {
    const status = agent.getStatus();
    
    expect(status).toEqual({
      id: agent.id,
      role: agent.role,
      status: agent.status,
      createdAt: agent.createdAt,
      tools: [],
      metrics: agent.metrics,
      taskCount: 0,
      activeTasks: 0,
      messageCount: 0
    });
  });

  test('should receive message correctly', async () => {
    agent.emit = jest.fn();
    
    const message = { type: 'test', data: 'test data' };
    const result = await agent.receiveMessage(message);
    
    expect(result.status).toBe('received');
    expect(result.messageId).toBeDefined();
    expect(agent.mailbox.length).toBe(1);
    expect(agent.emit).toHaveBeenCalledWith('messageReceived', expect.any(Object));
  });

  test('should handle message with registered handler', async () => {
    const handler = jest.fn().mockResolvedValue({ handled: true });
    agent.registerMessageHandler('test', handler);
    agent.emit = jest.fn();
    
    const message = { type: 'test', data: 'test data' };
    const result = await agent.receiveMessage(message);
    
    expect(handler).toHaveBeenCalledWith(message);
    expect(result.handlerResult).toEqual({ handled: true });
  });

  test('should register message handler correctly', () => {
    agent.registerMessageHandler('test', () => {});
    
    expect(agent.messageHandlers.has('test')).toBe(true);
    expect(typeof agent.messageHandlers.get('test')).toBe('function');
  });

  test('should throw error when registering invalid handler', () => {
    expect(() => agent.registerMessageHandler('test', 'not a function')).toThrow('Message handler must be a function');
  });

  test('should send message correctly', async () => {
    agent.emit = jest.fn();
    
    const recipientId = 'agent-2';
    const message = { type: 'test', data: 'test data' };
    const result = await agent.sendMessage(recipientId, message);
    
    expect(result.status).toBe('sent');
    expect(result.messageId).toBeDefined();
    expect(agent.emit).toHaveBeenCalledWith('messageSent', expect.any(Object));
  });

  test('should throw error when sending message without type', async () => {
    const recipientId = 'agent-2';
    const message = { data: 'test data' };
    
    await expect(agent.sendMessage(recipientId, message)).rejects.toThrow('Message must have a type');
  });

  test('should get messages with filters', () => {
    agent.mailbox = [
      { id: 'msg-1', type: 'test', senderId: 'agent-2', read: false },
      { id: 'msg-2', type: 'alert', senderId: 'agent-3', read: true },
      { id: 'msg-3', type: 'test', senderId: 'agent-2', read: true }
    ];
    
    expect(agent.getMessages()).toHaveLength(3);
    expect(agent.getMessages({ type: 'test' })).toHaveLength(2);
    expect(agent.getMessages({ senderId: 'agent-2' })).toHaveLength(2);
    expect(agent.getMessages({ unreadOnly: true })).toHaveLength(1);
    expect(agent.getMessages({ type: 'test', senderId: 'agent-2', unreadOnly: true })).toHaveLength(1);
  });

  test('should mark message as read', () => {
    agent.mailbox = [
      { id: 'msg-1', type: 'test', read: false }
    ];
    
    expect(agent.markMessageAsRead('msg-1')).toBe(true);
    expect(agent.mailbox[0].read).toBe(true);
    expect(agent.mailbox[0].readAt).toBeInstanceOf(Date);
    
    expect(agent.markMessageAsRead('non-existent')).toBe(false);
  });

  test('should switch LLM provider', async () => {
    const result = await agent.switchLLMProvider('anthropic', { apiKey: 'test-key' });
    
    expect(result).toBe(true);
    expect(agent.llm.setActiveProvider).toHaveBeenCalledWith('anthropic', { apiKey: 'test-key' });
  });

  test('should get LLM info', () => {
    const info = agent.getLLMInfo();
    
    expect(info).toEqual({
      provider: 'openai',
      availableProviders: ['openai', 'anthropic'],
      currentModel: 'gpt-4',
      metrics: { totalCalls: 10, averageLatency: 200 }
    });
  });

  test('should store data in memory', () => {
    const result = agent.storeMemory('key', 'value', { ttl: 3600 });
    
    expect(result).toBe(true);
    expect(agent.memory.store).toHaveBeenCalledWith('key', 'value', { ttl: 3600 });
  });

  test('should retrieve data from memory', () => {
    const result = agent.retrieveMemory('key');
    
    expect(result).toEqual({ data: 'test data' });
    expect(agent.memory.retrieve).toHaveBeenCalledWith('key');
  });

  test('should get memory stats', () => {
    const stats = agent.getMemoryStats();
    
    expect(stats).toEqual({ size: 10, items: 5 });
    expect(agent.memory.getStats).toHaveBeenCalled();
  });

  test('should execute tool by name', async () => {
    agent.tools = [
      {
        name: 'search',
        execute: jest.fn().mockResolvedValue({ results: ['result1', 'result2'] })
      }
    ];
    
    const result = await agent.executeTool('search', { query: 'test' });
    
    expect(result).toEqual({ results: ['result1', 'result2'] });
    expect(agent.tools[0].execute).toHaveBeenCalledWith({ query: 'test' });
  });

  test('should throw error when executing non-existent tool', async () => {
    await expect(agent.executeTool('non-existent')).rejects.toThrow('Tool non-existent not found');
  });

  test('should register custom LLM provider', () => {
    agent.registerCustomLLM('custom', { apiKey: 'test-key' });
    
    expect(agent.llm.registerCustomProvider).toHaveBeenCalledWith('custom', { apiKey: 'test-key' });
  });

  test('should dispose agent resources', () => {
    agent.emit = jest.fn();
    agent.removeAllListeners = jest.fn();
    
    agent.dispose();
    
    expect(agent.status).toBe('disposed');
    expect(agent.removeAllListeners).toHaveBeenCalled();
    expect(agent.memory.dispose).toHaveBeenCalled();
  });
});