#!/usr/bin/env node

import { fileURLToPath } from 'node:url';

import { loadEnvConfig } from '@next/env';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

loadEnvConfig(process.cwd());

export async function startDueSyncMcpStdioServer() {
  const [{ createDueSyncMcpServer }, { getScopedUserConfig }] = await Promise.all([
    import('./build-server'),
    import('../lib/mcp/config'),
  ]);

  const { server } = createDueSyncMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  const scope = getScopedUserConfig();
  console.error(
    `DueSync MCP stdio server started for ${scope.userEmail || scope.userId || 'unknown user scope'}.`
  );
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectExecution) {
  startDueSyncMcpStdioServer().catch((error) => {
    console.error('Failed to start DueSync MCP stdio server:', error);
    process.exit(1);
  });
}
