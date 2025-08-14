import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

const Dashboard = lazy(() => import('./components/Dashboard'));
const AgentsPage = lazy(() => import('./components/AgentsPage'));
const KnowledgeGraphView = lazy(() => import('./components/KnowledgeGraph'));

const App = () => {
  return (
    <Router>
      <Layout>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/knowledge" element={<KnowledgeGraphView />} />
            {/* Add more routes as needed */}
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
};

export default App;