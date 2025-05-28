/**
 * Example usage of the DatabaseIntegration class
 */
const DatabaseIntegration = require('../core/DatabaseIntegration');

async function main() {
  try {
    // Initialize the database with default configuration
    const db = new DatabaseIntegration({
      defaultProvider: 'local',
      database: 'mind0524_example',
      autoConnect: true,
      providerConfig: {
        url: 'mongodb://localhost:27017'
      }
    });

    console.log('Available providers:', db.getRegisteredProviders());
    
    // Wait for connection to be established
    // This is only needed because we're using the auto-connect feature
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Active provider:', db.getActiveProvider());
    
    // Initialize a users collection with some default data
    const usersInitialized = await db.initializeCollection('users', [
      { name: 'John Doe', email: 'john@example.com', role: 'admin' },
      { name: 'Jane Smith', email: 'jane@example.com', role: 'user' }
    ]);
    
    console.log('Users collection initialized:', usersInitialized);
    
    // Get the users collection
    const users = db.getCollection('users');
    
    // Find all users
    const allUsers = await users.find({}).toArray();
    console.log('All users:', allUsers);
    
    // Find users with specific role
    const admins = await users.find({ role: 'admin' }).toArray();
    console.log('Admin users:', admins);
    
    // Insert a new user
    const insertResult = await users.insertOne({
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'user'
    });
    console.log('Insert result:', insertResult);
    
    // Update a user
    const updateResult = await users.updateOne(
      { email: 'jane@example.com' },
      { $set: { role: 'editor' } }
    );
    console.log('Update result:', updateResult);
    
    // Find the updated user
    const updatedUser = await users.findOne({ email: 'jane@example.com' });
    console.log('Updated user:', updatedUser);
    
    // Close all database connections
    await db.closeAll();
    console.log('Database connections closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
main();