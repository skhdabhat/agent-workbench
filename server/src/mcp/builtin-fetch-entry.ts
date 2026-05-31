import { startBuiltinFetchServer } from './builtin-fetch.js';

startBuiltinFetchServer().catch((err) => {
  console.error('Fetch MCP server failed:', err);
  process.exit(1);
});
