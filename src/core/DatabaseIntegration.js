const { MongoClient } = require('mongodb');
const { KVNamespace } = require('@cloudflare/workers-types');

/**
 * DatabaseIntegration provides a unified interface for different database backends
 */
class DatabaseIntegration {
  constructor(config = {}) {
    this.config = {
      defaultProvider: 'local',
      connectionTimeout: 5000,
      ...config
    };
    
    this.providers = new Map();
    this.activeProvider = null;
    
    // Initialize default providers
    this._initializeDefaultProviders();
  }

  /**
   * Initialize built-in database providers
   * @private
   */
  _initializeDefaultProviders() {
    // Local MongoDB provider
    this.registerProvider('local', {
      connect: async (config) => {
        const client = await MongoClient.connect(
          config.url || 'mongodb://localhost:27017',
          { 
            serverSelectionTimeoutMS: this.config.connectionTimeout,
            ...config.options
          }
        );
        return client;
      },
      disconnect: async (client) => {
        await client.close();
      },
      getCollection: (client, name) => {
        const db = client.db(this.config.database || 'mind0524');
        return db.collection(name);
      }
    });

    // DigitalOcean MongoDB provider
    this.registerProvider('digitalocean', {
      connect: async (config) => {
        if (!config.url) {
          throw new Error('DigitalOcean MongoDB connection URL is required');
        }
        
        const client = await MongoClient.connect(
          config.url,
          {
            ssl: true,
            serverSelectionTimeoutMS: this.config.connectionTimeout,
            ...config.options
          }
        );
        return client;
      },
      disconnect: async (client) => {
        await client.close();
      },
      getCollection: (client, name) => {
        const db = client.db(config.database);
        return db.collection(name);
      }
    });

    // Cloudflare KV provider
    this.registerProvider('cloudflare-kv', {
      connect: async (config) => {
        if (!config.namespaceId || !config.accountId) {
          throw new Error('Cloudflare KV namespace and account IDs are required');
        }
        
        // Initialize Cloudflare KV client
        const namespace = new KVNamespace(config.namespaceId);
        return { namespace, config };
      },
      disconnect: async () => {
        // No disconnect needed for KV
      },
      getCollection: (client, name) => {
        return {
          // Implement MongoDB-like interface for KV
          find: async (query) => {
            const prefix = `${name}:`;
            const list = await client.namespace.list({ prefix });
            const results = [];
            
            for (const key of list.keys) {
              const value = await client.namespace.get(key.name, 'json');
              if (this._matchesQuery(value, query)) {
                results.push(value);
              }
            }
            
            return results;
          },
          findOne: async (query) => {
            const results = await this.find(query);
            return results[0] || null;
          },
          insertOne: async (document) => {
            const id = document._id || Date.now().toString();
            const key = `${name}:${id}`;
            await client.namespace.put(key, JSON.stringify(document));
            return { insertedId: id };
          },
          updateOne: async (query, update) => {
            const doc = await this.findOne(query);
            if (doc) {
              const updated = { ...doc, ...update.$set };
              await client.namespace.put(
                `${name}:${doc._id}`,
                JSON.stringify(updated)
              );
              return { modifiedCount: 1 };
            }
            return { modifiedCount: 0 };
          },
          deleteOne: async (query) => {
            const doc = await this.findOne(query);
            if (doc) {
              await client.namespace.delete(`${name}:${doc._id}`);
              return { deletedCount: 1 };
            }
            return { deletedCount: 0 };
          }
        };
      }
    });
  }

  /**
   * Register a new database provider
   * @param {string} providerName - Unique identifier for the provider
   * @param {Object} provider - Provider configuration and methods
   */
  registerProvider(providerName, provider) {
    if (this.providers.has(providerName)) {
      throw new Error(`Provider ${providerName} already registered`);
    }

    this.providers.set(providerName, {
      client: null,
      ...provider
    });
  }

  /**
   * Set active database provider
   * @param {string} providerName - Name of the provider to activate
   * @param {Object} config - Provider-specific configuration
   */
  async setActiveProvider(providerName, config = {}) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    // Disconnect from current provider if exists
    if (this.activeProvider) {
      const currentProvider = this.providers.get(this.activeProvider);
      if (currentProvider.client) {
        await currentProvider.disconnect(currentProvider.client);
        currentProvider.client = null;
      }
    }

    // Connect to new provider
    provider.client = await provider.connect(config);
    this.activeProvider = providerName;
  }

  /**
   * Get a collection from the active provider
   * @param {string} collectionName - Name of the collection
   * @returns {Object} Collection interface
   */
  getCollection(collectionName) {
    if (!this.activeProvider) {
      throw new Error('No active provider set');
    }

    const provider = this.providers.get(this.activeProvider);
    return provider.getCollection(provider.client, collectionName);
  }

  /**
   * Check if a document matches a query
   * @param {Object} document - Document to check
   * @param {Object} query - Query to match against
   * @returns {boolean} Whether the document matches
   * @private
   */
  _matchesQuery(document, query) {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'object') {
        // Handle operators
        if ('$eq' in value) {
          if (document[key] !== value.$eq) return false;
        }
        if ('$gt' in value) {
          if (document[key] <= value.$gt) return false;
        }
        if ('$lt' in value) {
          if (document[key] >= value.$lt) return false;
        }
        // Add more operators as needed
      } else {
        // Direct value comparison
        if (document[key] !== value) return false;
      }
    }
    return true;
  }

  /**
   * Get all registered providers
   * @returns {Array<string>} List of provider names
   */
  getRegisteredProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Get the current active provider
   * @returns {string|null} Name of the active provider
   */
  getActiveProvider() {
    return this.activeProvider;
  }

  /**
   * Check if a provider is available
   * @param {string} providerName - Name of the provider to check
   * @returns {boolean} Whether the provider is available
   */
  isProviderAvailable(providerName) {
    return this.providers.has(providerName);
  }

  /**
   * Close all database connections
   */
  async closeAll() {
    for (const [name, provider] of this.providers.entries()) {
      if (provider.client) {
        await provider.disconnect(provider.client);
        provider.client = null;
      }
    }
    this.activeProvider = null;
  }
}

module.exports = DatabaseIntegration;