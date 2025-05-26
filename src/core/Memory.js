/**
 * Base Memory class for agent memory systems
 */
class Memory {
  constructor() {
    this.data = {};
  }

  /**
   * Store a value in memory
   * @param {string} key - The key to store the value under
   * @param {any} value - The value to store
   * @returns {boolean} - Whether the operation was successful
   */
  store(key, value) {
    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }
    
    this.data[key] = {
      value,
      timestamp: Date.now()
    };
    
    return true;
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
    
    const entry = this.data[key];
    return entry ? entry.value : null;
  }

  /**
   * Check if a key exists in memory
   * @param {string} key - The key to check
   * @returns {boolean} - Whether the key exists
   */
  has(key) {
    return Boolean(this.data[key]);
  }

  /**
   * Remove a value from memory
   * @param {string} key - The key to remove
   * @returns {boolean} - Whether the operation was successful
   */
  remove(key) {
    if (this.has(key)) {
      delete this.data[key];
      return true;
    }
    return false;
  }

  /**
   * Clear all values from memory
   * @returns {boolean} - Whether the operation was successful
   */
  clear() {
    this.data = {};
    return true;
  }

  /**
   * Get all keys in memory
   * @returns {string[]} - Array of all keys
   */
  keys() {
    return Object.keys(this.data);
  }

  /**
   * Get all entries in memory
   * @returns {Object} - All memory entries
   */
  getAll() {
    return this.data;
  }
}

/**
 * Short-term memory implementation
 * Automatically expires entries after a specified time
 */
class ShortTermMemory extends Memory {
  /**
   * @param {number} expiryTime - Time in milliseconds after which entries expire
   */
  constructor(expiryTime = 1000 * 60 * 30) { // Default: 30 minutes
    super();
    this.expiryTime = expiryTime;
  }

  /**
   * Retrieve a value, checking for expiry
   * @param {string} key - The key to retrieve
   * @returns {any|null} - The retrieved value or null if not found or expired
   */
  retrieve(key) {
    if (!key || typeof key !== 'string') {
      return null;
    }
    
    const entry = this.data[key];
    if (!entry) {
      return null;
    }
    
    // Check if the entry has expired
    if (Date.now() - entry.timestamp > this.expiryTime) {
      this.remove(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Clean up expired entries
   * @returns {number} - Number of entries removed
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = Object.entries(this.data)
      .filter(([_, entry]) => now - entry.timestamp > this.expiryTime)
      .map(([key]) => key);
    
    expiredKeys.forEach(key => this.remove(key));
    return expiredKeys.length;
  }
}

/**
 * Long-term memory implementation
 * Persists data and never expires automatically
 */
class LongTermMemory extends Memory {
  /**
   * @param {Object} options - Options for long-term memory
   * @param {boolean} options.persistent - Whether to persist memory to storage
   */
  constructor(options = { persistent: true }) {
    super();
    this.persistent = options.persistent;
    
    // Load persisted data if available and persistence is enabled
    if (this.persistent) {
      this._loadFromStorage();
    }
  }

  /**
   * Store a value and persist if enabled
   * @param {string} key - The key to store the value under
   * @param {any} value - The value to store
   * @returns {boolean} - Whether the operation was successful
   */
  store(key, value) {
    const result = super.store(key, value);
    
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
    // In a real implementation, this would save to a database or file
    // For this example, we'll just log that it would be saved
    console.log('Saving long-term memory to persistent storage');
    
    // Example implementation using localStorage in a browser environment
    // if (typeof localStorage !== 'undefined') {
    //   localStorage.setItem('agent_long_term_memory', JSON.stringify(this.data));
    // }
  }

  /**
   * Load memory data from persistent storage
   * @private
   */
  _loadFromStorage() {
    // In a real implementation, this would load from a database or file
    console.log('Loading long-term memory from persistent storage');
    
    // Example implementation using localStorage in a browser environment
    // if (typeof localStorage !== 'undefined') {
    //   const stored = localStorage.getItem('agent_long_term_memory');
    //   if (stored) {
    //     try {
    //       this.data = JSON.parse(stored);
    //     } catch (e) {
    //       console.error('Failed to parse stored memory data', e);
    //     }
    //   }
    // }
  }
}

/**
 * Factory for creating memory systems
 */
class MemoryFactory {
  /**
   * Create a memory system based on the specified type
   * @param {string} type - The type of memory to create ('short-term' or 'long-term')
   * @param {Object} options - Options for the memory system
   * @returns {Memory} - The created memory system
   */
  static createMemory(type, options = {}) {
    switch (type.toLowerCase()) {
      case 'short-term':
        return new ShortTermMemory(options.expiryTime);
      case 'long-term':
        return new LongTermMemory(options);
      default:
        // Default to short-term memory
        return new ShortTermMemory();
    }
  }
}

module.exports = {
  Memory,
  ShortTermMemory,
  LongTermMemory,
  MemoryFactory
};