/**
 * DatabaseIntegration.js
 *
 * This module provides a unified interface for working with different database backends,
 * including MongoDB and Cloudflare KV.
 */

const { MongoClient } = require('mongodb');

class DatabaseIntegration {
  constructor(config = {}) {
    this.providers = new Map();
    this.activeProvider = null;
    this.activeClient = null;
    this.activeDb = null;
    this.config = {
      defaultProvider: 'local',
      database: 'mind-ai-framework',
      connectionTimeout: 5000,
      autoConnect: true,
      ...config,
    };

    this._registerDefaultProviders();

    if (this.config.autoConnect) {
      this.setActiveProvider(this.config.defaultProvider, this.config.providerConfig).catch(console.error);
    }
  }

  _registerDefaultProviders() {
    // Local MongoDB Provider
    this.registerProvider('local', {
      connect: async (config) => {
        const client = new MongoClient(config.url, {
          serverSelectionTimeoutMS: this.config.connectionTimeout,
          ...config.options,
        });
        await client.connect();
        return client;
      },
      disconnect: async (client) => {
        await client.close();
      },
      getCollection: (client, dbName, collectionName) => {
        const db = client.db(dbName);
        return db.collection(collectionName);
      },
    });

    // DigitalOcean MongoDB Provider (same as local, just a different name for clarity)
    this.registerProvider('digitalocean', this.providers.get('local'));

    // Cloudflare KV Provider (a mock implementation for now)
    this.registerProvider('cloudflare-kv', {
        connect: async (config) => {
            // In a real implementation, this would use the Cloudflare API
            console.log(`Connecting to Cloudflare KV namespace: ${config.namespaceId}`);
            return {
                kv: true,
                namespaceId: config.namespaceId,
                accountId: config.accountId,
                collections: new Map(),
            };
        },
        disconnect: async (client) => {
            console.log(`Disconnecting from Cloudflare KV namespace: ${client.namespaceId}`);
        },
        getCollection: (client, dbName, collectionName) => {
            if (!client.collections.has(collectionName)) {
                client.collections.set(collectionName, new Map());
            }
            const collection = client.collections.get(collectionName);
            // This is a mock implementation of a MongoDB-like collection interface
            return {
                find: async (query) => {
                    const results = [];
                    for (const [key, value] of collection.entries()) {
                        let match = true;
                        for (const qKey in query) {
                            if (value[qKey] !== query[qKey]) {
                                match = false;
                                break;
                            }
                        }
                        if (match) {
                            results.push(value);
                        }
                    }
                    return {
                        toArray: async () => results,
                    };
                },
                findOne: async (query) => {
                    for (const [key, value] of collection.entries()) {
                        let match = true;
                        for (const qKey in query) {
                            if (value[qKey] !== query[qKey]) {
                                match = false;
                                break;
                            }
                        }
                        if (match) {
                            return value;
                        }
                    }
                    return null;
                },
                insertOne: async (doc) => {
                    const id = doc._id || `kv_${Date.now()}`;
                    collection.set(id, { ...doc, _id: id });
                    return { acknowledged: true, insertedId: id };
                },
                updateOne: async (query, update) => {
                    const item = await this.findOne(query);
                    if (item) {
                        const updatedItem = { ...item, ...update.$set };
                        collection.set(item._id, updatedItem);
                        return { acknowledged: true, modifiedCount: 1 };
                    }
                    return { acknowledged: true, modifiedCount: 0 };
                },
                deleteOne: async (query) => {
                    const item = await this.findOne(query);
                    if (item) {
                        collection.delete(item._id);
                        return { acknowledged: true, deletedCount: 1 };
                    }
                    return { acknowledged: true, deletedCount: 0 };
                },
            };
        },
    });
  }

  registerProvider(providerName, provider) {
    if (this.providers.has(providerName)) {
      throw new Error(`Provider ${providerName} already registered.`);
    }
    this.providers.set(providerName, provider);
  }

  async setActiveProvider(providerName, config = {}) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found.`);
    }

    if (this.activeClient) {
      await this.providers.get(this.activeProvider).disconnect(this.activeClient);
    }

    this.activeProvider = providerName;
    const connectionConfig = { ...this.config.providerConfig, ...config };
    this.activeClient = await provider.connect(connectionConfig);
    this.activeDb = connectionConfig.database || this.config.database;
  }

  getCollection(collectionName) {
    if (!this.activeClient) {
      throw new Error('No active provider set. Please call setActiveProvider first.');
    }
    const provider = this.providers.get(this.activeProvider);
    return provider.getCollection(this.activeClient, this.activeDb, collectionName);
  }

  getRegisteredProviders() {
    return Array.from(this.providers.keys());
  }

  getActiveProvider() {
    return this.activeProvider;
  }

  isProviderAvailable(providerName) {
    return this.providers.has(providerName);
  }

  async initializeCollection(collectionName, defaultData = []) {
    const collection = this.getCollection(collectionName);
    const count = await collection.countDocuments ? await collection.countDocuments() : (await collection.find({}).toArray()).length;
    if (count === 0) {
      await collection.insertMany(defaultData);
      return true;
    }
    return false;
  }

  async closeAll() {
    if (this.activeClient) {
      const provider = this.providers.get(this.activeProvider);
      await provider.disconnect(this.activeClient);
      this.activeClient = null;
      this.activeProvider = null;
    }
  }
}

module.exports = DatabaseIntegration;
