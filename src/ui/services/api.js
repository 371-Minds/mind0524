// API endpoints configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// Request headers
const getHeaders = () => ({
  'Content-Type': 'application/json',
  // Add authorization header if needed
  // 'Authorization': `Bearer ${localStorage.getItem('token')}`,
});

// Generic request handler
const request = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// Agents API
export const agentsApi = {
  getAll: () => request('/agents'),
  getById: (id) => request(`/agents/${id}`),
  create: (data) => request('/agents', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/agents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => request(`/agents/${id}`, {
    method: 'DELETE',
  }),
  getStatus: (id) => request(`/agents/${id}/status`),
  getTasks: (id) => request(`/agents/${id}/tasks`),
};

// Knowledge Graph API
export const knowledgeGraphApi = {
  getNodes: () => request('/knowledge/nodes'),
  getEdges: () => request('/knowledge/edges'),
  addNode: (data) => request('/knowledge/nodes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateNode: (id, data) => request(`/knowledge/nodes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteNode: (id) => request(`/knowledge/nodes/${id}`, {
    method: 'DELETE',
  }),
  addEdge: (data) => request('/knowledge/edges', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteEdge: (id) => request(`/knowledge/edges/${id}`, {
    method: 'DELETE',
  }),
};

// System API
export const systemApi = {
  getStatus: () => request('/system/status'),
  getMetrics: () => request('/system/metrics'),
  getLogs: (params) => request('/system/logs', {
    method: 'GET',
    params,
  }),
  getConfiguration: () => request('/system/config'),
  updateConfiguration: (data) => request('/system/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// Tasks API
export const tasksApi = {
  getAll: () => request('/tasks'),
  getById: (id) => request(`/tasks/${id}`),
  create: (data) => request('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => request(`/tasks/${id}`, {
    method: 'DELETE',
  }),
  getStatus: (id) => request(`/tasks/${id}/status`),
  cancel: (id) => request(`/tasks/${id}/cancel`, {
    method: 'POST',
  }),
};

// Memory API
export const memoryApi = {
  query: (params) => request('/memory/query', {
    method: 'GET',
    params,
  }),
  store: (data) => request('/memory/store', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/memory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => request(`/memory/${id}`, {
    method: 'DELETE',
  }),
};