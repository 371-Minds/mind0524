const { initializeFramework } = require('../../index');
const MockDatabaseIntegration = require('../mocks/DatabaseIntegration.mock');

jest.mock('../../core/DatabaseIntegration', () => MockDatabaseIntegration);

describe('Core Functionality Integration Test', () => {
  jest.setTimeout(30000); // Increase timeout for async operations

  test('initializeFramework runs successfully with mocked DB', async () => {
    await expect(initializeFramework()).resolves.not.toThrow();
  });
});
