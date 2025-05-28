const { initializeFramework } = require('../../index');

describe('Core Functionality Integration Test', () => {
  jest.setTimeout(30000); // Increase timeout for async operations

  test('initializeFramework runs successfully', async () => {
    await expect(initializeFramework()).resolves.not.toThrow();
  });
});
