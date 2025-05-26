import React, { useState } from 'react';
import { FiPlay, FiPause, FiTrash2, FiPlus, FiRefreshCw, FiCpu } from 'react-icons/fi';

const AgentsPage = () => {
  const [agents, setAgents] = useState([
    { id: 1, name: 'CEO Agent', type: 'Executive', status: 'active', tasks: 145, success_rate: '94%' },
    { id: 2, name: 'CTO Agent', type: 'Executive', status: 'active', tasks: 89, success_rate: '91%' },
    { id: 3, name: 'Data Extractor', type: 'Specialist', status: 'paused', tasks: 234, success_rate: '97%' },
    { id: 4, name: 'Market Research', type: 'Analyst', status: 'active', tasks: 167, success_rate: '89%' },
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Agents Management</h2>
          <p className="text-gray-400 mt-1">Monitor and manage your AI agents</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <FiPlus className="mr-2" />
          New Agent
        </button>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-gray-700 rounded-lg mr-3">
                  <FiCpu className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">{agent.name}</h3>
                  <p className="text-gray-400 text-sm">{agent.type}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${agent.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                {agent.status}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tasks Completed</span>
                <span className="font-medium">{agent.tasks}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Success Rate</span>
                <span className="font-medium">{agent.success_rate}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                {agent.status === 'active' ? <FiPause /> : <FiPlay />}
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                <FiRefreshCw />
              </button>
              <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors">
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold mb-4">System Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-gray-400 text-sm font-medium">Average Response Time</h4>
            <p className="text-2xl font-bold mt-2">234ms</p>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-gray-400 text-sm font-medium">Active Tasks</h4>
            <p className="text-2xl font-bold mt-2">24</p>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-gray-400 text-sm font-medium">System Load</h4>
            <p className="text-2xl font-bold mt-2">42%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentsPage;