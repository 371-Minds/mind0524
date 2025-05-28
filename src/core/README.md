# Database Integration

This module provides a unified interface for working with different database backends, including MongoDB and Cloudflare KV.

## Features

- Unified API for different database providers
- Support for MongoDB (local and DigitalOcean)
- Support for Cloudflare KV with MongoDB-like interface
- Easy provider registration and switching
- Automatic connection to default provider
- Collection initialization with default data

## Installation

Make sure you have the required dependencies installed:

```bash
npm install mongodb @cloudflare/workers-types
```

## Basic Usage

```javascript
const DatabaseIntegration = require('./DatabaseIntegration');

// Create a database instance with default configuration
const db = new DatabaseIntegration();

// Connect to the default provider (local MongoDB)
await db.setActiveProvider('local');

// Get a collection
const users = db.getCollection('users');

// Perform database operations
const allUsers = await users.find({}).toArray();
const user = await users.findOne({ email: 'user@example.com' });
await users.insertOne({ name: 'New User', email: 'new@example.com' });
```

## Configuration

You can configure the database integration with various options:

```javascript
const db = new DatabaseIntegration({
  // Default provider to use
  defaultProvider: 'local',
  
  // Database name to use
  database: 'my_database',
  
  // Connection timeout in milliseconds
  connectionTimeout: 5000,
  
  // Automatically connect to default provider
  autoConnect: true,
  
  // Configuration for the default provider
  providerConfig: {
    url: 'mongodb://localhost:27017',
    options: {
      // MongoDB connection options
    }
  }
});
```

## Supported Providers

### Local MongoDB

```javascript
await db.setActiveProvider('local', {
  url: 'mongodb://localhost:27017',
  database: 'my_database',
  options: {
    // MongoDB connection options
  }
});
```

### DigitalOcean MongoDB

```javascript
await db.setActiveProvider('digitalocean', {
  url: 'mongodb+srv://username:password@cluster.digitalocean.com/database',
  database: 'my_database',
  options: {
    // MongoDB connection options
  }
});
```

### Cloudflare KV

```javascript
await db.setActiveProvider('cloudflare-kv', {
  namespaceId: 'your-namespace-id',
  accountId: 'your-account-id'
});
```

## Custom Providers

You can register custom database providers:

```javascript
db.registerProvider('custom-provider', {
  connect: async (config) => {
    // Connect to your database
    return client;
  },
  disconnect: async (client) => {
    // Disconnect from your database
  },
  getCollection: (client, name) => {
    // Return a collection-like object with MongoDB-compatible methods
    return {
      find: async (query) => { /* ... */ },
      findOne: async (query) => { /* ... */ },
      insertOne: async (document) => { /* ... */ },
      updateOne: async (query, update) => { /* ... */ },
      deleteOne: async (query) => { /* ... */ }
    };
  }
});
```

## API Reference

### Constructor

- `new DatabaseIntegration(config)`: Create a new database integration instance

### Methods

- `registerProvider(providerName, provider)`: Register a new database provider
- `setActiveProvider(providerName, config)`: Set the active database provider
- `getCollection(collectionName)`: Get a collection from the active provider
- `getRegisteredProviders()`: Get all registered providers
- `getActiveProvider()`: Get the current active provider
- `isProviderAvailable(providerName)`: Check if a provider is available
- `initializeCollection(collectionName, defaultData)`: Initialize a collection with default data if it's empty
- `closeAll()`: Close all database connections

## Example

See the `examples/database-example.js` file for a complete example of using the DatabaseIntegration class.