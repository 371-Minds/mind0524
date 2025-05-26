// Navigation items
export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: 'HomeIcon'
  },
  {
    id: 'agents',
    label: 'Agents',
    path: '/agents',
    icon: 'UserGroupIcon'
  },
  {
    id: 'knowledge',
    label: 'Knowledge Graph',
    path: '/knowledge',
    icon: 'ShareIcon'
  },
  {
    id: 'tasks',
    label: 'Tasks',
    path: '/tasks',
    icon: 'ClipboardListIcon'
  },
  {
    id: 'memory',
    label: 'Memory',
    path: '/memory',
    icon: 'DatabaseIcon'
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: 'CogIcon'
  }
];

// Agent status types
export const AGENT_STATUS = {
  IDLE: 'idle',
  ACTIVE: 'active',
  BUSY: 'busy',
  ERROR: 'error',
  OFFLINE: 'offline'
};

// Task status types
export const TASK_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Knowledge node types
export const NODE_TYPES = {
  CONCEPT: 'concept',
  INSIGHT: 'insight',
  TASK: 'task',
  AGENT: 'agent'
};

// Edge types for knowledge graph
export const EDGE_TYPES = {
  RELATED: 'related',
  DEPENDS_ON: 'depends_on',
  CREATED_BY: 'created_by',
  DERIVED_FROM: 'derived_from'
};

// Memory types
export const MEMORY_TYPES = {
  SHORT_TERM: 'short_term',
  LONG_TERM: 'long_term',
  EPISODIC: 'episodic',
  SEMANTIC: 'semantic'
};

// Chart colors
export const CHART_COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6366F1'
};

// Time intervals (in milliseconds)
export const TIME_INTERVALS = {
  SECOND: 1000,
  MINUTE: 60000,
  HOUR: 3600000,
  DAY: 86400000
};

// Maximum limits
export const LIMITS = {
  MAX_TASKS_PER_AGENT: 10,
  MAX_CONCURRENT_TASKS: 5,
  MAX_MEMORY_ITEMS: 1000,
  MAX_GRAPH_NODES: 500
};

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'mind_ai_theme',
  AUTH_TOKEN: 'mind_ai_token',
  USER_PREFERENCES: 'mind_ai_preferences'
};

// API error messages
export const API_ERRORS = {
  NETWORK_ERROR: 'Network error occurred',
  UNAUTHORIZED: 'Unauthorized access',
  NOT_FOUND: 'Resource not found',
  SERVER_ERROR: 'Internal server error',
  VALIDATION_ERROR: 'Validation error'
};

// Event types
export const EVENT_TYPES = {
  AGENT_STATUS_CHANGE: 'agent_status_change',
  TASK_COMPLETED: 'task_completed',
  KNOWLEDGE_UPDATED: 'knowledge_updated',
  MEMORY_STORED: 'memory_stored',
  SYSTEM_ERROR: 'system_error'
};