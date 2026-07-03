// Placeholder for future BullMQ worker entry point
// Spawned as separate process via: node dist/worker.js
// (see apps/backend/package.json scripts.start:worker)
console.log('👷 Worker process started (placeholder, not yet wired)');

// Keep the process alive until BullMQ workers are wired
setInterval(() => {
  // Heartbeat — will be replaced with actual job processing later
}, 60000);
