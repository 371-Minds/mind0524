const concurrently = require('concurrently');

// Run both backend and frontend development servers
concurrently([
  {
    command: 'node src/server/index.js',
    name: 'backend',
    prefixColor: 'blue',
  },
  {
    command: 'react-scripts start',
    name: 'frontend',
    prefixColor: 'green',
  },
], {
  prefix: 'name',
  killOthers: ['failure', 'success'],
  restartTries: 3,
}).then(
  () => {
    console.log('All processes exited with success');
  },
  (error) => {
    console.error('One of the processes exited with error:', error);
  }
);