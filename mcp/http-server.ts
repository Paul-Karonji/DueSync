#!/usr/bin/env node

import { fileURLToPath } from 'node:url';

import { loadEnvConfig } from '@next/env';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

loadEnvConfig(process.cwd());

function parseCsvEnv(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parsePort(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const port = Number.parseInt(value, 10);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid MCP port: ${value}`);
  }

  return port;
}

export async function startDueSyncMcpHttpServer() {
  const [
    { createDueSyncMcpServer },
    { verifyMcpAccessToken, MCP_READ_SCOPE },
  ] = await Promise.all([
    import('./build-server'),
    import('../lib/mcp/token-auth'),
  ]);

  const port = parsePort(process.env.MCP_PORT || process.env.PORT, 8787);
  const host = process.env.MCP_HOST?.trim() || '0.0.0.0';
  const allowedOrigins = parseCsvEnv(process.env.MCP_ALLOWED_ORIGINS);
  const app = createMcpExpressApp({ host });

  const authMiddleware = requireBearerAuth({
    verifier: {
      verifyAccessToken: verifyMcpAccessToken,
    },
    requiredScopes: [MCP_READ_SCOPE],
  });

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'duesync-mcp',
      transport: 'streamable-http',
      mode: 'stateless-json',
    });
  });

  app.post('/mcp', authMiddleware, async (req, res) => {
    const { server } = createDueSyncMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      ...(allowedOrigins.length > 0 ? { allowedOrigins } : {}),
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP HTTP request:', error);

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  const methodNotAllowed = (allow: string) => (_req: any, res: any) => {
    res.status(405).set('Allow', allow).send('Method Not Allowed');
  };

  app.get('/mcp', authMiddleware, methodNotAllowed('POST'));
  app.delete('/mcp', authMiddleware, methodNotAllowed('POST'));

  app.listen(port, host, () => {
    console.log(`DueSync MCP HTTP server listening on http://${host}:${port}/mcp`);
  });
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectExecution) {
  startDueSyncMcpHttpServer().catch((error) => {
    console.error('Failed to start DueSync MCP HTTP server:', error);
    process.exit(1);
  });
}
