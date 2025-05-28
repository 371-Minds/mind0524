const { Memory, ShortTermMemory, LongTermMemory, MemoryFactory } = require('../Memory');
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn()
}));

jest.mock('../config', () => ({
  memory: {
    shortTerm: {
      defaultExpiryTime: 60000 // 1 minute
    },
    longTerm: {
      storageType: 'file',
      storagePath: '/tmp/memory'
    }
  }
}));

describe('Memory Module', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset timers
    jest.useRealTimers();
  });

  describe('Base Memory Class', () => {
    let memory;

    beforeEach(() => {
      memory = new Memory({ namespace: 'test' });
    });

    test('should initialize with correct properties', () => {
      expect(memory.data).toBeInstanceOf(Map);
      expect(memory.data.size).toBe(0);
      expect(memory.stats).toEqual({
        reads: 0,
        writes: 0,
        hits: 0,
        misses: 0,
        lastAccess: null
      });
      expect(memory.options.namespace).toBe('test');
    });

    test('should store and retrieve values', () => {
      memory.store('key1', 'value1');
      
      expect(memory.data.size).toBe(1);
      expect(memory.retrieve('key1')).toBe('value1');
      expect(memory.stats.writes).toBe(1);
      expect(memory.stats.reads).toBe(1);
      expect(memory.stats.hits).toBe(1);
      expect(memory.stats.misses).toBe(0);
    });

    test('should handle non-existent keys', () => {
      expect(memory.retrieve('non-existent')).toBeNull();
      expect(memory.stats.reads).toBe(1);
      expect(memory.stats.misses).toBe(1);
    });

    test('should check if key exists', () => {
      memory.store('key1', 'value1');
      
      expect(memory.has('key1')).toBe(true);
      expect(memory.has('non-existent')).toBe(false);
    });

    test('should remove keys', () => {
      memory.store('key1', 'value1');
      expect(memory.has('key1')).toBe(true);
      
      memory.remove('key1');
      expect(memory.has('key1')).toBe(false);
    });

    test('should clear all keys', () => {
      memory.store('key1', 'value1');
      memory.store('key2', 'value2');
      expect(memory.data.size).toBe(2);
      
      memory.clear();
      expect(memory.data.size).toBe(0);
    });

    test('should get all keys', () => {
      memory.store('key1', 'value1');
      memory.store('key2', 'value2');
      
      const keys = memory.keys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    test('should get all entries', () => {
      memory.store('key1', 'value1');
      memory.store('key2', 'value2');
      
      const entries = memory.getAll();
      expect(entries).toBeInstanceOf(Map);
      expect(entries.size).toBe(2);
    });

    test('should get memory statistics', () => {
      memory.store('key1', 'value1');
      memory.retrieve('key1');
      memory.retrieve('non-existent');
      
      const stats = memory.getStats();
      expect(stats.reads).toBe(2);
      expect(stats.writes).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should find entries by predicate', () => {
      memory.store('key1', 'value1');
      memory.store('key2', 'value2');
      memory.store('key3', 'value3');
      
      const results = memory.find(value => value.includes('2'));
      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('key2');
      expect(results[0].value).toBe('value2');
    });

    test('should handle TTL for entries', () => {
      jest.useFakeTimers();
      
      memory.store('key1', 'value1', { ttl: 1000 }); // 1 second TTL
      expect(memory.has('key1')).toBe(true);
      
      // Advance time by 1.5 seconds
      jest.advanceTimersByTime(1500);
      
      expect(memory.has('key1')).toBe(false);
      expect(memory.retrieve('key1')).toBeNull();
    });

    test('should throw error for invalid key', () => {
      expect(() => memory.store(null, 'value')).toThrow('Key must be a non-empty string');
      expect(() => memory.store('', 'value')).toThrow('Key must be a non-empty string');
      expect(() => memory.store(123, 'value')).toThrow('Key must be a non-empty string');
    });
  });

  describe('ShortTermMemory Class', () => {
    let memory;

    beforeEach(() => {
      memory = new ShortTermMemory({ namespace: 'test', expiryTime: 5000 });
    });

    afterEach(() => {
      if (memory.cleanupInterval) {
        memory.dispose();
      }
    });

    test('should initialize with correct properties', () => {
      expect(memory).toBeInstanceOf(Memory);
      expect(memory.expiryTime).toBe(5000);
      expect(memory.cleanupInterval).toBeDefined();
    });

    test('should store values with default TTL', () => {
      memory.store('key1', 'value1');
      
      const entry = memory.data.get('key1');
      expect(entry.value).toBe('value1');
      expect(entry.ttl).toBe(5000);
    });

    test('should store values with custom TTL', () => {
      memory.store('key1', 'value1', { ttl: 10000 });
      
      const entry = memory.data.get('key1');
      expect(entry.value).toBe('value1');
      expect(entry.ttl).toBe(10000);
    });

    test('should clean up expired entries', () => {
      jest.useFakeTimers();
      
      memory.store('key1', 'value1', { ttl: 1000 });
      memory.store('key2', 'value2', { ttl: 10000 });
      expect(memory.data.size).toBe(2);
      
      // Advance time by 1.5 seconds
      jest.advanceTimersByTime(1500);
      
      const removed = memory.cleanup();
      expect(removed).toBe(1);
      expect(memory.data.size).toBe(1);
      expect(memory.has('key1')).toBe(false);
      expect(memory.has('key2')).toBe(true);
    });

    test('should dispose resources', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      memory.dispose();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(memory.cleanupInterval).toBeNull();
    });
  });

  describe('LongTermMemory Class', () => {
    let memory;
    const testNamespace = 'test-namespace';
    const testHash = createHash('md5').update(testNamespace).digest('hex');
    const testFilePath = path.join('/tmp/memory', `memory_${testHash}.json`);

    beforeEach(() => {
      memory = new LongTermMemory({ 
        namespace: testNamespace,
        persistent: true,
        storageType: 'file',
        storagePath: '/tmp/memory'
      });
    });

    test('should initialize with correct properties', () => {
      expect(memory).toBeInstanceOf(Memory);
      expect(memory.persistent).toBe(true);
      expect(memory.storageType).toBe('file');
      expect(memory.storagePath).toBe('/tmp/memory');
      expect(memory.namespace).toBe(testNamespace);
    });

    test('should create storage directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      new LongTermMemory({ namespace: testNamespace });
      
      expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/memory', { recursive: true });
    });

    test('should load data from storage on initialization', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        key1: {
          value: 'value1',
          timestamp: Date.now(),
          ttl: null,
          metadata: {}
        }
      }));
      
      const memory = new LongTermMemory({ namespace: testNamespace });
      
      expect(fs.readFileSync).toHaveBeenCalledWith(testFilePath, 'utf8');
      expect(memory.retrieve('key1')).toBe('value1');
    });

    test('should save data to storage when storing', () => {
      memory.store('key1', 'value1');
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.any(String)
      );
    });

    test('should save data to storage when removing', () => {
      memory.store('key1', 'value1');
      fs.writeFileSync.mockClear();
      
      memory.remove('key1');
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.any(String)
      );
    });

    test('should save data to storage when clearing', () => {
      memory.store('key1', 'value1');
      fs.writeFileSync.mockClear();
      
      memory.clear();
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.any(String)
      );
    });

    test('should handle special types serialization', () => {
      const date = new Date();
      memory.store('date', date);
      
      // Extract the serialized value from the writeFileSync call
      const writeCall = fs.writeFileSync.mock.calls[0];
      const serializedData = JSON.parse(writeCall[1]);
      
      expect(serializedData.date.value.__type).toBe('Date');
      expect(serializedData.date.value.value).toBe(date.toISOString());
    });

    test('should handle special types deserialization', () => {
      const date = new Date();
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        date: {
          value: { __type: 'Date', value: date.toISOString() },
          timestamp: Date.now(),
          ttl: null,
          metadata: {}
        }
      }));
      
      const memory = new LongTermMemory({ namespace: testNamespace });
      const retrievedDate = memory.retrieve('date');
      
      expect(retrievedDate).toBeInstanceOf(Date);
      expect(retrievedDate.getTime()).toBe(date.getTime());
    });
  });

  describe('MemoryFactory Class', () => {
    test('should create ShortTermMemory by string type', () => {
      const memory = MemoryFactory.createMemory('short-term', { namespace: 'test' });
      
      expect(memory).toBeInstanceOf(ShortTermMemory);
      expect(memory.options.namespace).toBe('test');
    });

    test('should create LongTermMemory by string type', () => {
      const memory = MemoryFactory.createMemory('long-term', { namespace: 'test' });
      
      expect(memory).toBeInstanceOf(LongTermMemory);
      expect(memory.options.namespace).toBe('test');
    });

    test('should create ShortTermMemory by config object', () => {
      const memory = MemoryFactory.createMemory({ type: 'short-term', namespace: 'test' });
      
      expect(memory).toBeInstanceOf(ShortTermMemory);
      expect(memory.options.namespace).toBe('test');
    });

    test('should create LongTermMemory by config object', () => {
      const memory = MemoryFactory.createMemory({ type: 'long-term', namespace: 'test' });
      
      expect(memory).toBeInstanceOf(LongTermMemory);
      expect(memory.options.namespace).toBe('test');
    });

    test('should default to ShortTermMemory for unknown type', () => {
      const memory = MemoryFactory.createMemory('unknown-type');
      
      expect(memory).toBeInstanceOf(ShortTermMemory);
    });

    test('should default to ShortTermMemory when no type is provided', () => {
      const memory = MemoryFactory.createMemory();
      
      expect(memory).toBeInstanceOf(ShortTermMemory);
    });
  });
});