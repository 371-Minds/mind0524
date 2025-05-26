/**
 * Message class for agent communication
 */
class Message {
  /**
   * @param {string} from - ID of the sender agent
   * @param {string} to - ID of the recipient agent
   * @param {string} content - Content of the message
   * @param {Object} metadata - Additional metadata for the message
   */
  constructor(from, to, content, metadata = {}) {
    this.id = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.from = from;
    this.to = to;
    this.content = content;
    this.metadata = metadata;
    this.timestamp = new Date();
    this.status = 'sent';
  }

  /**
   * Mark the message as delivered
   */
  markDelivered() {
    this.status = 'delivered';
    this.deliveredAt = new Date();
    return this;
  }

  /**
   * Mark the message as read
   */
  markRead() {
    this.status = 'read';
    this.readAt = new Date();
    return this;
  }

  /**
   * Create a reply to this message
   * @param {string} content - Content of the reply
   * @param {Object} metadata - Additional metadata for the reply
   * @returns {Message} - The reply message
   */
  createReply(content, metadata = {}) {
    const reply = new Message(
      this.to,
      this.from,
      content,
      {
        ...metadata,
        inReplyTo: this.id
      }
    );
    return reply;
  }

  /**
   * Convert the message to a plain object
   * @returns {Object} - Plain object representation of the message
   */
  toObject() {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      content: this.content,
      metadata: this.metadata,
      timestamp: this.timestamp,
      status: this.status,
      deliveredAt: this.deliveredAt,
      readAt: this.readAt
    };
  }
}

/**
 * Communication system for agents
 */
class CommunicationSystem {
  constructor() {
    this.messages = [];
    this.subscribers = {};
  }

  /**
   * Send a message from one agent to another
   * @param {string} from - ID of the sender agent
   * @param {string} to - ID of the recipient agent
   * @param {string} content - Content of the message
   * @param {Object} metadata - Additional metadata for the message
   * @returns {Message} - The sent message
   */
  sendMessage(from, to, content, metadata = {}) {
    const message = new Message(from, to, content, metadata);
    this.messages.push(message);
    
    // Notify subscribers
    this._notifySubscribers(to, message);
    
    return message;
  }

  /**
   * Get all messages for an agent
   * @param {string} agentId - ID of the agent
   * @param {Object} options - Options for filtering messages
   * @param {boolean} options.unreadOnly - Whether to return only unread messages
   * @param {number} options.limit - Maximum number of messages to return
   * @returns {Message[]} - Array of messages
   */
  getMessages(agentId, options = {}) {
    let filteredMessages = this.messages.filter(msg => 
      msg.to === agentId || msg.from === agentId
    );
    
    if (options.unreadOnly) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.to === agentId && msg.status !== 'read'
      );
    }
    
    // Sort by timestamp (newest first)
    filteredMessages.sort((a, b) => b.timestamp - a.timestamp);
    
    if (options.limit && options.limit > 0) {
      filteredMessages = filteredMessages.slice(0, options.limit);
    }
    
    return filteredMessages;
  }

  /**
   * Get conversation history between two agents
   * @param {string} agent1Id - ID of the first agent
   * @param {string} agent2Id - ID of the second agent
   * @param {Object} options - Options for filtering messages
   * @param {number} options.limit - Maximum number of messages to return
   * @returns {Message[]} - Array of messages in the conversation
   */
  getConversation(agent1Id, agent2Id, options = {}) {
    let conversation = this.messages.filter(msg => 
      (msg.from === agent1Id && msg.to === agent2Id) ||
      (msg.from === agent2Id && msg.to === agent1Id)
    );
    
    // Sort by timestamp (oldest first for conversations)
    conversation.sort((a, b) => a.timestamp - b.timestamp);
    
    if (options.limit && options.limit > 0) {
      conversation = conversation.slice(-options.limit);
    }
    
    return conversation;
  }

  /**
   * Mark messages as read for an agent
   * @param {string} agentId - ID of the agent
   * @param {string|string[]} messageIds - ID(s) of the message(s) to mark as read
   * @returns {number} - Number of messages marked as read
   */
  markMessagesAsRead(agentId, messageIds) {
    const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
    let count = 0;
    
    this.messages.forEach(msg => {
      if (msg.to === agentId && ids.includes(msg.id) && msg.status !== 'read') {
        msg.markRead();
        count++;
      }
    });
    
    return count;
  }

  /**
   * Subscribe to receive notifications when messages are sent to an agent
   * @param {string} agentId - ID of the agent to subscribe for
   * @param {Function} callback - Callback function to call when a message is received
   * @returns {string} - Subscription ID
   */
  subscribe(agentId, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    const subscriptionId = `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    this.subscribers[agentId] = this.subscribers[agentId] || {};
    this.subscribers[agentId][subscriptionId] = callback;
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from message notifications
   * @param {string} agentId - ID of the agent
   * @param {string} subscriptionId - ID of the subscription to cancel
   * @returns {boolean} - Whether the unsubscription was successful
   */
  unsubscribe(agentId, subscriptionId) {
    if (
      this.subscribers[agentId] && 
      this.subscribers[agentId][subscriptionId]
    ) {
      delete this.subscribers[agentId][subscriptionId];
      return true;
    }
    return false;
  }

  /**
   * Notify subscribers of a new message
   * @param {string} agentId - ID of the agent receiving the message
   * @param {Message} message - The message that was sent
   * @private
   */
  _notifySubscribers(agentId, message) {
    if (this.subscribers[agentId]) {
      Object.values(this.subscribers[agentId]).forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in message subscriber callback:', error);
        }
      });
    }
  }

  /**
   * Clear all messages
   */
  clearMessages() {
    this.messages = [];
  }
}

// Singleton instance for global communication
const globalCommunicationSystem = new CommunicationSystem();

module.exports = {
  Message,
  CommunicationSystem,
  globalCommunicationSystem
};