import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AgentsPage from './components/AgentsPage';
import KnowledgeGraphView from './components/KnowledgeGraph';

const App = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/knowledge" element={<KnowledgeGraphView />} />
          {/* Add more routes as needed */}
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;