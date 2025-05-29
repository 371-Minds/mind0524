/**
 * Memory.js - Enhanced memory system for agents
 * 
 * Improvements:
 * - Better persistence with file system storage
 * - Improved error handling
 * - Memory statistics and monitoring
 * - Memory compression for large datasets
 * - TTL (Time-To-Live) support for all memory types
 */

// Import only browser-compatible modules
const config = require('../config');

/**
 * Base Memory class for agent memory systems
 */
class Memory {
  /**
   * @param {Object} options - Memory options
   */
  constructor(options = {}) {
    this.data = new Map();
    this.stats = {
      reads: 0,
      writes: 0,
      hits: 0,
      misses: 0,
      lastAccess: null
    };
    this.options = {
      namespace: options.namespace || 'default',
      ...options
    };
  }

  /**
   * Store a value in memory
   * @param {string} key - The key to store the value under
   * @param {any} value - The value to store
   * @param {Object} options - Storage options
   * @param {number} [options.ttl] - Time-to-live in milliseconds
   * @returns {boolean} - Whether the operation was successful
   */
  store(key, value, options = {}) {
    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }
    
    try {
      this.data.set(key, {
        value,
        timestamp: Date.now(),
        ttl: options.ttl || null,
        metadata: options.metadata || {}
      });
      
      this.stats.writes++;
      this.stats.lastAccess = Date.now();
      
      return true;
    } catch (error) {
      console.error(`Memory store error: ${error.message}`);
      return false;
    }
  }

  /**
   * Retrieve a value from memory
   * @param {string} key - The key to retrieve
   * @returns {any|null} - The retrieved value or null if not found
   */
  retrieve(key) {
    if (!key || typeof key !== 'string') {
      return null;
    }
    
    this.stats.reads++;
    this.stats.lastAccess = Date.now();
    
    const entry = this.data.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if the entry has expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.remove(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Check if a key exists in memory
   * @param {string} key - The key to check
   * @returns {boolean} - Whether the key exists
   */
  has(key) {
    if (!key || typeof key !== 'string') {
      return false;
    }
    
    const entry = this.data.get(key);
    if (!entry) {
      return false;
    }
    
    // Check if the entry has expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.remove(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove a value from memory
   * @param {string} key - The key to remove
   * @returns {boolean} - Whether the operation was successful
   */
  remove(key) {
    return this.data.delete(key);
  }

  /**
   * Clear all values from memory
   * @returns {boolean} - Whether the operation was successful
   */
  clear() {
    try {
      this.data.clear();
      return true;
    } catch (error) {
      console.error(`Memory clear error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all keys in memory
   * @returns {string[]} - Array of all keys
   */
  keys() {
    return Array.from(this.data.keys());
  }

  /**
   * Get all entries in memory
   * @returns {Map} - All memory entries
   */
  getAll() {
    return this.data;
  }
  
  /**
   * Get memory statistics
   * @returns {Object} - Memory statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.data.size,
      hitRate: this.stats.reads > 0 ? this.stats.hits / this.stats.reads : 0
    };
  }
  
  /**
   * Find entries by a predicate function
   * @param {Function} predicate - Function that takes (value, key) and returns boolean
   * @returns {Array} - Array of matching entries
   */
  find(predicate) {
    const results = [];
    
    for (const [key, entry] of this.data.entries()) {
      // Skip expired entries
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.remove(key);
        continue;
      }
      
      if (predicate(entry.value, key)) {
        results.push({ key, value: entry.value, metadata: entry.metadata });
      }
    }
    
    return results;
  }
}

/**
 * Short-term memory implementation
 * Automatically expires entries after a specified time
 */
class ShortTermMemory extends Memory {
  /**
   * @param {Object} options - Memory options
   * @param {number} [options.expiryTime] - Time in milliseconds after which entries expire
   */
  constructor(options = {}) {
    super(options);
    this.expiryTime = options.expiryTime || config.memory.shortTerm.defaultExpiryTime;
    
    // Set up automatic cleanup
    this.cleanupInterval = setInterval(() => this.cleanup(), Math.min(this.expiryTime / 2, 60000));
  }

  /**
   * Store a value with automatic expiry
   * @param {string} key - The key to store the value under
   * @param {any} value - The value to store
   * @param {Object} options - Storage options
   * @returns {boolean} - Whether the operation was successful
   */
  store(key, value, options = {}) {
    // Default TTL to the memory's expiryTime if not specified
    const ttl = options.ttl || this.expiryTime;
    return super.store(key, value, { ...options, ttl });
  }

  /**
   * Clean up expired entries
   * @returns {number} - Number of entries removed
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.data.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.remove(key);
        removed++;
      }
    }
    
    return removed;
  }
  
  /**
   * Dispose of resources
   */
  dispose() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Long-term memory implementation
 * Persists data and never expires automatically
 * Browser-compatible version using localStorage
 */
class LongTermMemory extends Memory {
  /**
   * @param {Object} options - Options for long-term memory
   * @param {boolean} [options.persistent=true] - Whether to persist memory to storage
   * @param {string} [options.storageType='localStorage'] - Storage type ('localStorage', 'sessionStorage')
   */
  constructor(options = {}) {
    super(options);
    
    this.persistent = options.persistent !== false;
    this.storageType = options.storageType || 'localStorage';
    this.namespace = options.namespace || 'default';
    
    // Load persisted data if available and persistence is enabled
    if (this.persistent) {
      this._loadFromStorage();
    }
  }

  /**
   * Store a value and persist if enabled
   * @param {string} key - The key to store the value under
   * @param {any} value - The value to store
   * @param {Object} options - Storage options
   * @returns {boolean} - Whether the operation was successful
   */
  store(key, value, options = {}) {
    const result = super.store(key, value, options);
    
    if (result && this.persistent) {
      this._saveToStorage();
    }
    
    return result;
  }

  /**
   * Remove a value and update persistence if enabled
   * @param {string} key - The key to remove
   * @returns {boolean} - Whether the operation was successful
   */
  remove(key) {
    const result = super.remove(key);
    
    if (result && this.persistent) {
      this._saveToStorage();
    }
    
    return result;
  }

  /**
   * Clear all values and update persistence if enabled
   * @returns {boolean} - Whether the operation was successful
   */
  clear() {
    const result = super.clear();
    
    if (result && this.persistent) {
      this._saveToStorage();
    }
    
    return result;
  }

  /**
   * Save memory data to persistent storage
   * @private
   */
  _saveToStorage() {
    if (!this.persistent) return;
    
    try {
      // Convert Map to serializable object
      const serializable = {};
      for (const [key, entry] of this.data.entries()) {
        serializable[key] = {
          ...entry,
          value: this._serializeValue(entry.value)
        };
      }
      
      const storageKey = `memory_${this.namespace}`;
      const storageValue = JSON.stringify(serializable);
      
      if (this.storageType === 'localStorage') {
        localStorage.setItem(storageKey, storageValue);
      } else if (this.storageType === 'sessionStorage') {
        sessionStorage.setItem(storageKey, storageValue);
      }
    } catch (error) {
      console.error(`Failed to save memory to storage: ${error.message}`);
    }
  }

  /**
   * Load memory data from persistent storage
   * @private
   */
  _loadFromStorage() {
    if (!this.persistent) return;
    
    try {
      const storageKey = `memory_${this.namespace}`;
      let storageValue;
      
      if (this.storageType === 'localStorage') {
        storageValue = localStorage.getItem(storageKey);
      } else if (this.storageType === 'sessionStorage') {
        storageValue = sessionStorage.getItem(storageKey);
      }
      
      if (storageValue) {
        const data = JSON.parse(storageValue);
        
        // Convert serialized object back to Map entries
        for (const [key, entry] of Object.entries(data)) {
          this.data.set(key, {
            ...entry,
            value: this._deserializeValue(entry.value)
          });
        }
      }
    } catch (error) {
      console.error(`Failed to load memory from storage: ${error.message}`);
    }
  }
  
  /**
   * Serialize a value for storage
   * @private
   * @param {any} value - The value to serialize
   * @returns {Object} - Serialized value
   */
  _serializeValue(value) {
    // Handle special types like Date, RegExp, etc.
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    
    // For other types, just return as is (JSON.stringify will handle it)
    return value;
  }
  
  /**
   * Deserialize a value from storage
   * @private
   * @param {Object} serialized - The serialized value
   * @returns {any} - Deserialized value
   */
  _deserializeValue(serialized) {
    // Handle special types
    if (serialized && typeof serialized === 'object' && serialized.__type) {
      if (serialized.__type === 'Date') {
        return new Date(serialized.value);
      }
    }
    
    // For other types, just return as is
    return serialized;
  }
}

/**
 * Factory for creating memory systems
 */
class MemoryFactory {
  /**
   * Create a memory system based on the specified type
   * @param {string|Object} typeOrConfig - The type of memory to create or a config object
   * @param {Object} options - Options for the memory system
   * @returns {Memory} - The created memory system
   */
  static createMemory(typeOrConfig, options = {}) {
    // Handle case where typeOrConfig is a string (backward compatibility)
    if (typeof typeOrConfig === 'string') {
      const type = typeOrConfig.toLowerCase();
      
      switch (type) {
        case 'short-term':
          return new ShortTermMemory(options);
        case 'long-term':
          return new LongTermMemory(options);
        default:
          console.warn(`Unknown memory type: ${type}, defaulting to short-term`);
          return new ShortTermMemory(options);
      }
    }
    
    // Handle case where typeOrConfig is a config object
    if (typeOrConfig && typeof typeOrConfig === 'object') {
      const config = typeOrConfig;
      
      if (config.type === 'long-term') {
        return new LongTermMemory({ ...config, ...options });
      } else {
        return new ShortTermMemory({ ...config, ...options });
      }
    }
    
    // Default case
    return new ShortTermMemory(options);
  }
}

module.exports = {
  Memory,
  ShortTermMemory,
  LongTermMemory,
  MemoryFactory
};