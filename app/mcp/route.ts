import { loadEnvConfig } from '@next/env';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { createDueSyncMcpServer } from '@/mcp/build-server';
import { verifyMcpAccessToken } from '@/lib/mcp/token-auth';

loadEnvConfig(process.cwd());

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseCsvEnv(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function authenticateRequest(request: Request) {
  const header = request.headers.get('authorization');

  if (!header || !header.startsWith('Bearer ')) {
    return {
      ok: false as const,
      response: new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Missing bearer token',
          },
          id: null,
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="DueSync MCP"',
          },
        }
      ),
    };
  }

  try {
    const authInfo = await verifyMcpAccessToken(header.slice('Bearer '.length));
    return {
      ok: true as const,
      authInfo,
    };
  } catch (error) {
    return {
      ok: false as const,
      response: new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: error instanceof Error ? error.message : 'Invalid bearer token',
          },
          id: null,
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="DueSync MCP"',
          },
        }
      ),
    };
  }
}

async function handleMcpRequest(request: Request) {
  const authResult = await authenticateRequest(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const { server } = createDueSyncMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    ...(parseCsvEnv(process.env.MCP_ALLOWED_ORIGINS).length > 0
      ? { allowedOrigins: parseCsvEnv(process.env.MCP_ALLOWED_ORIGINS) }
      : {}),
  });

  try {
    await server.connect(transport);
    return await transport.handleRequest(request, {
      authInfo: authResult.authInfo,
    });
  } finally {
    await transport.close();
    await server.close();
  }
}

export async function POST(request: Request) {
  return handleMcpRequest(request);
}

export async function GET() {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: {
      Allow: 'POST',
    },
  });
}

export async function DELETE() {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: {
      Allow: 'POST',
    },
  });
}
