import React, { useState } from 'react';
import { FiMenu, FiX, FiHome, FiUsers, FiDatabase, FiBrain, FiSettings, FiBarChart2 } from 'react-icons/fi';

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { icon: FiHome, label: 'Overview', path: '/' },
    { icon: FiUsers, label: 'Agents', path: '/agents' },
    { icon: FiDatabase, label: 'Knowledge Graph', path: '/knowledge' },
    { icon: FiBrain, label: 'LLM Integration', path: '/llm' },
    { icon: FiBarChart2, label: 'Analytics', path: '/analytics' },
    { icon: FiSettings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-gray-800 p-4`}>
        <div className="flex items-center justify-between mb-8">
          {isSidebarOpen && <h1 className="text-xl font-bold">Mind AI</h1>}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {isSidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        <nav>
          {menuItems.map((item, index) => (
            <a
              key={index}
              href={item.path}
              className="flex items-center p-3 mb-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="ml-4">{item.label}</span>}
            </a>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <header className="mb-8">
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="text-gray-400">Welcome to Mind AI Management System</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Active Agents', value: '12' },
            { label: 'Knowledge Nodes', value: '1,234' },
            { label: 'Tasks Completed', value: '89%' },
            { label: 'System Health', value: '98%' },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <h3 className="text-gray-400 text-sm font-medium">{stat.label}</h3>
              <p className="text-2xl font-bold mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <section className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { agent: 'CEO Agent', action: 'Completed market analysis', time: '5m ago' },
              { agent: 'CTO Agent', action: 'Updated system architecture', time: '15m ago' },
              { agent: 'Data Extractor', action: 'Processed new dataset', time: '1h ago' },
              { agent: 'Report Generator', action: 'Created weekly summary', time: '2h ago' },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0"
              >
                <div>
                  <p className="font-medium">{activity.agent}</p>
                  <p className="text-gray-400 text-sm">{activity.action}</p>
                </div>
                <span className="text-gray-500 text-sm">{activity.time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;