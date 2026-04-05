import { createHash, randomBytes } from 'node:crypto';

import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

import { prisma } from '../prisma';

export const MCP_READ_SCOPE = 'duesync:mcp:read';
export const MCP_WRITE_SCOPE = 'duesync:mcp:write';

export interface IssueMcpAccessTokenInput {
  userId: string;
  name: string;
  expiresAt?: Date | null;
}

export function createRawMcpAccessToken() {
  return `dsmcp_${randomBytes(32).toString('base64url')}`;
}

export function hashMcpAccessToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueMcpAccessToken(input: IssueMcpAccessTokenInput) {
  const token = createRawMcpAccessToken();

  const record = await prisma.mcpAccessToken.create({
    data: {
      userId: input.userId,
      name: input.name,
      tokenHash: hashMcpAccessToken(token),
      expiresAt: input.expiresAt ?? null,
    },
  });

  return {
    token,
    record,
  };
}

export async function verifyMcpAccessToken(token: string): Promise<AuthInfo> {
  const tokenRecord = await prisma.mcpAccessToken.findUnique({
    where: {
      tokenHash: hashMcpAccessToken(token),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!tokenRecord || tokenRecord.revokedAt) {
    throw new Error('Invalid MCP access token.');
  }

  if (tokenRecord.expiresAt && tokenRecord.expiresAt.getTime() <= Date.now()) {
    throw new Error('Expired MCP access token.');
  }

  void prisma.mcpAccessToken.update({
    where: {
      id: tokenRecord.id,
    },
    data: {
      lastUsedAt: new Date(),
    },
  }).catch(() => {
    // Updating last-used metadata should not break tool execution.
  });

  return {
    token,
    clientId: `duesync-mcp:${tokenRecord.userId}`,
    scopes: [MCP_READ_SCOPE, MCP_WRITE_SCOPE],
    ...(tokenRecord.expiresAt
      ? {
          expiresAt: Math.floor(tokenRecord.expiresAt.getTime() / 1000),
        }
      : {}),
    extra: {
      userId: tokenRecord.userId,
      userEmail: tokenRecord.user.email,
      tokenId: tokenRecord.id,
      tokenName: tokenRecord.name,
    },
  };
}
