import React, { useEffect, useRef } from 'react';
import ForceGraph3D from '3d-force-graph';
import { FiZoomIn, FiZoomOut, FiRefreshCw } from 'react-icons/fi';

const KnowledgeGraphView = () => {
  const graphRef = useRef();
  const containerRef = useRef();

  useEffect(() => {
    // Sample data - replace with actual data from your knowledge graph
    const graphData = {
      nodes: [
        { id: 'concept1', label: 'AI Systems', group: 'concept', value: 20 },
        { id: 'concept2', label: 'Machine Learning', group: 'concept', value: 15 },
        { id: 'insight1', label: 'Performance Analysis', group: 'insight', value: 10 },
        { id: 'task1', label: 'Market Research', group: 'task', value: 8 },
        { id: 'agent1', label: 'CEO Agent', group: 'agent', value: 12 },
      ],
      links: [
        { source: 'concept1', target: 'concept2', value: 1 },
        { source: 'concept1', target: 'insight1', value: 2 },
        { source: 'insight1', target: 'task1', value: 1 },
        { source: 'task1', target: 'agent1', value: 3 },
      ],
    };

    // Initialize the 3D force graph
    const Graph = ForceGraph3D()(containerRef.current)
      .graphData(graphData)
      .nodeLabel('label')
      .nodeColor(node => {
        const colors = {
          concept: '#60A5FA', // blue
          insight: '#34D399', // green
          task: '#F59E0B',    // yellow
          agent: '#EC4899',   // pink
        };
        return colors[node.group];
      })
      .nodeRelSize(6)
      .linkWidth(link => link.value)
      .linkColor(() => '#4B5563')
      .backgroundColor('#111827')
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight - 100);

    graphRef.current = Graph;

    // Handle window resize
    const handleResize = () => {
      Graph.width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight - 100);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleZoomIn = () => {
    const distance = graphRef.current.cameraPosition().z;
    graphRef.current.cameraPosition({ z: distance * 0.8 });
  };

  const handleZoomOut = () => {
    const distance = graphRef.current.cameraPosition().z;
    graphRef.current.cameraPosition({ z: distance * 1.2 });
  };

  const handleReset = () => {
    graphRef.current.zoomToFit(1000);
  };

  return (
    <div className="h-full space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Knowledge Graph</h2>
          <p className="text-gray-400 mt-1">Interactive visualization of system knowledge</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleZoomIn}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiZoomIn size={20} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiZoomOut size={20} />
          </button>
          <button
            onClick={handleReset}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiRefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex space-x-4 bg-gray-800 p-3 rounded-lg">
        {[
          { label: 'Concept', color: '#60A5FA' },
          { label: 'Insight', color: '#34D399' },
          { label: 'Task', color: '#F59E0B' },
          { label: 'Agent', color: '#EC4899' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-gray-300">{label}</span>
          </div>
        ))}
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="bg-gray-800 rounded-xl shadow-lg"
        style={{ height: 'calc(100vh - 300px)' }}
      />
    </div>
  );
};

export default KnowledgeGraphView;