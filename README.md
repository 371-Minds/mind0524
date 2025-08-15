# Autonomous Agent Framework

## Overview

This framework provides a robust architecture for creating autonomous AI agents that can perform complex tasks, delegate work to specialized sub-agents, and continuously learn from their experiences. It supports multiple LLM providers, database integrations, and specialized agents for various business functions.

## Core Architecture

The framework is built around a hierarchical agent structure, with a CEO agent at the top that can create and manage sub-agents with specialized roles (e.g., CFO, CTO). Each agent has access to tools, memory systems, and configurable language models for decision-making.

## Key Components

### Agents

Agents are the core entities in the framework. Each agent has:
- A unique ID and role
- Access to specialized tools
- Memory systems (short-term and long-term)
- Task execution capabilities
- Communication abilities (actor model)
- Configurable LLM integration

#### Specialized Agents

- **CEO Agent**: Top-level decision maker and task delegator
- **CFO Agent**: Financial analysis and resource management
- **CTO Agent**: Technical oversight and architecture decisions
- **Data Extractor Agent**: Structured information extraction from unstructured text
- **Comparison Drafter Agent**: Creates detailed product/tool comparisons
- **Insight Generator Agent**: Analyzes data to generate actionable insights
- **Market Research Agent**: Gathers and analyzes market trends
- **Report Generator Agent**: Creates comprehensive formatted reports

### LLM Integration

Supports multiple language model providers:
- State-of-the-Art Models (e.g., OpenAI GPT)
- Local Models (e.g., LLaMA)
- Custom Model Integration
- MindsDB Integration

### Database Integration

Flexible database support for both local and cloud environments:
- Local MongoDB
- DigitalOcean MongoDB
- Cloudflare KV
- Provider-agnostic interface
- MindsDB as an MCP Server

### Tools

Tools provide agents with capabilities to interact with the world. Examples include:
- Web search
- Content generation
- Data analysis
- Code generation
- Database operations
- Report generation

### Memory Systems

Agents have access to different types of memory:
- Short-term memory: For temporary information during task execution
- Long-term memory: For persistent knowledge across multiple tasks
- Database-backed storage options

### Reinforcement Learning

The framework includes a reinforcement learning system that allows agents to improve over time by:
- Learning from successful and unsuccessful task executions
- Adjusting tool selection based on past performance
- Optimizing decision-making processes
- Incorporating knowledge graph insights

### Knowledge Graph

A centralized knowledge graph unifies agent memories, documents, and insights:
- Agents query the graph before tasks for relevant context
- Agents log insights after tasks for continuous learning
- Supports both vector-based semantic search and graph-based relational queries
- Integrates with the RL system to optimize policies based on accumulated knowledge
- Persistent storage with database integration

### Agent Orchestrator

The Agent Orchestrator provides fault tolerance and scaling capabilities:
- Monitors agent performance and health
- Terminates underperforming agents
- Creates replacement agents when needed
- Facilitates horizontal scaling by distributing workloads
- Manages LLM provider switching

## Project Structure

```
src/
  ├── agents/
  │   ├── Agent.js             # Base Agent class
  │   ├── CEOAgent.js          # CEO Agent implementation
  │   ├── CFOAgent.js          # CFO Agent implementation
  │   ├── CTOAgent.js          # CTO Agent implementation
  │   ├── ComparisonDrafterAgent.js  # Comparison creation agent
  │   ├── DataExtractorAgent.js      # Data extraction agent
  │   ├── InsightGeneratorAgent.js    # Insight generation agent
  │   ├── MarketResearchAgent.js      # Market research agent
  │   └── ReportGeneratorAgent.js     # Report generation agent
  ├── core/
  │   ├── AgentFactory.js      # Factory for creating agents
  │   ├── AgentOrchestrator.js # Orchestrator for management
  │   ├── Communication.js     # Inter-agent communication
  │   ├── DatabaseIntegration.js # Database provider system
  │   ├── KnowledgeGraph.js    # Centralized knowledge graph
  │   ├── LLMIntegration.js    # LLM provider system
  │   ├── Memory.js            # Memory implementations
  │   ├── ReinforcementLearning.js # RL system
  │   └── Tools.js             # Tool registry
  ├── interfaces/
  │   └── AgentBlueprint.js    # Agent creation interface
  └── index.js                 # Main entry point
examples/
  ├── basic-example.js         # Simple usage example
  ├── advanced-example.js      # Advanced features demo
  ├── knowledge-graph-example.js # Knowledge graph usage
  ├── orchestrator-example.js  # Fault tolerance demo
  └── rl-example.js           # RL system example
```

## Getting Started

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file based on `.env.example` with your configuration:

```env
# LLM Configuration
OPENAI_API_KEY=your_openai_api_key
LLAMA_MODEL_PATH=/path/to/llama/model

# Database Configuration
MONGODB_LOCAL_URI=mongodb://localhost:27017
MONGODB_DO_URI=your_digitalocean_mongodb_uri
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_KV_NAMESPACE=your_kv_namespace

# Framework Configuration
PERSISTENT_STORAGE_PATH=./storage
DEFAULT_DB_PROVIDER=local
DB_CONNECTION_TIMEOUT=5000
```

### Basic Usage

```javascript
const { AgentFactory, AgentOrchestrator } = require('./src');

// Create and configure agents
const factory = new AgentFactory();
const orchestrator = new AgentOrchestrator();

// Create a CEO agent
const ceoAgent = factory.createAgent('CEO', {
  llmConfig: {
    provider: 'openai',
    model: 'gpt-4'
  },
  dbConfig: {
    provider: 'mongodb-local'
  }
});

// Execute tasks
await ceoAgent.executeTask({
  type: 'market_analysis',
  parameters: {
    industry: 'AI',
    timeframe: '2024'
  }
});
```

Refer to the examples directory for more detailed usage scenarios.

### MindsDB Integration

The framework now supports integration with MindsDB, allowing you to create and query MindsDB agents directly from the framework.

To use the MindsDB integration, you need to set the following environment variables:

```
MINDSDB_HOST=http://127.0.0.1
MINDSDB_PORT=47334
MINDSDB_USER=mindsdb
MINDSDB_PASSWORD=
```

You can then create a MindsDB agent like this:

```javascript
const { AgentFactory } = require('./src');

// Create a MindsDB agent
const mindsdbAgent = await AgentFactory.createAgent({
  role: 'MindsDB',
  name: 'my_mindsdb_agent',
});

// Execute a task with the MindsDB agent
const result = await mindsdbAgent.executeTask({
  description: 'What is the meaning of life?',
});

console.log('MindsDB Agent response:', result);
```

## Security Features

The framework includes several security features to protect your application:

### Rate Limiting

- **Global Rate Limiting**: Protects against brute force and DoS attacks by limiting requests per IP
- **API-Specific Rate Limiting**: Stricter limits on API endpoints to prevent abuse

### HTTPS Enforcement

- Automatic HTTPS redirection in production
- Configurable SSL certificate paths
- Development mode fallback to HTTP for local testing

### Security Headers

- Content Security Policy (CSP) to prevent XSS attacks
- X-XSS-Protection header
- X-Content-Type-Options to prevent MIME sniffing
- Referrer-Policy for privacy protection
- Other security headers via Helmet

### Secrets Management

- Environment variable management with dotenv-vault
- Secure encryption utilities for sensitive data
- Separation of development and production secrets

### Security Scanning

- Automated dependency vulnerability scanning
- Regular security audits via npm scripts
- Security report generation and archiving

### Input Validation

- Comprehensive request validation with Joi
- Protection against injection attacks
- Parameter sanitization

To run a security scan:

```bash
npm run security:scan
```

## Contributing

Contributions are welcome! Please read our contributing guidelines for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.