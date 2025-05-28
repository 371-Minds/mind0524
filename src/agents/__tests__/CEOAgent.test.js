const CEOAgent = require('../CEOAgent');

describe('CEOAgent Class', () => {
  let ceoAgent;

  beforeEach(() => {
    ceoAgent = new CEOAgent({ role: 'CEO', id: 'test-ceo' });
  });

  test('should initialize with role CEO', () => {
    expect(ceoAgent.role).toBe('CEO');
  });

  test('should have executeTask method', async () => {
    expect(typeof ceoAgent.executeTask).toBe('function');
  });

  test('executeTask should return a result object', async () => {
    const task = {
      id: 'test-task',
      type: 'strategic',
      description: 'Test task'
    };
    const result = await ceoAgent.executeTask(task);
    expect(result).toBeDefined();
  });
});
