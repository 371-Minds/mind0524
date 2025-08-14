class MockCollection {
  constructor() {
    this.data = [];
  }

  async find() {
    return {
      toArray: async () => this.data,
    };
  }

  async findOne() {
    return this.data.length > 0 ? this.data[0] : null;
  }

  async insertOne(doc) {
    this.data.push(doc);
    return { acknowledged: true, insertedId: doc._id };
  }

  async updateOne(query, update) {
    return { acknowledged: true, modifiedCount: 1 };
  }

  async deleteOne(query) {
    return { acknowledged: true, deletedCount: 1 };
  }

  async countDocuments() {
    return this.data.length;
  }

  async createIndex() {
    return true;
  }
}

class MockDatabaseIntegration {
  constructor() {
    this.collections = new Map();
  }

  async setActiveProvider() {
    return true;
  }

  getCollection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection());
    }
    return this.collections.get(name);
  }

  async closeAll() {
    return true;
  }
}

module.exports = MockDatabaseIntegration;
