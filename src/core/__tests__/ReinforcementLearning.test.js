const { Policy } = require('../ReinforcementLearning');

describe('ReinforcementLearning Module', () => {
  let rl;

  beforeEach(() => {
    rl = new Policy();
  });

  test('should initialize with empty action weights', () => {
    expect(rl.actionWeights.size).toBe(0);
  });

  test('should update action weights on reward', () => {
    const actionContext = { actionType: 'testAction' };
    rl.adjustWeights(1, actionContext);
    expect(rl.actionWeights.get('testAction')).toBeGreaterThan(0);
  });

  test('should choose best action based on weights', () => {
    const availableActions = ['action1', 'action2'];
    rl.actionWeights.set('action1', 10);
    rl.actionWeights.set('action2', 5);
    const bestAction = rl.selectAction(availableActions);
    expect(bestAction).toBe('action1');
  });
});
