import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

import { prisma } from '../prisma';

const USER_ID_ENV = 'MCP_DUESYNC_USER_ID';
const USER_EMAIL_ENV = 'MCP_DUESYNC_USER_EMAIL';

export interface ScopedUser {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
}

let scopedUserPromise: Promise<ScopedUser> | null = null;

async function findUser(where: { id?: string; email?: string }): Promise<ScopedUser> {
  const user = await prisma.user.findFirst({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      timezone: true,
    },
  });

  if (!user) {
    throw new Error(
      `No DueSync user matched the MCP scope (${where.id || where.email || 'unknown'}).`
    );
  }

  return user;
}

async function resolveEnvScopedUser(): Promise<ScopedUser> {
  const configuredUserId = process.env[USER_ID_ENV]?.trim();
  const configuredUserEmail = process.env[USER_EMAIL_ENV]?.trim();

  if (!configuredUserId && !configuredUserEmail) {
    throw new Error(
      `Set ${USER_ID_ENV} or ${USER_EMAIL_ENV} before starting the DueSync MCP server.`
    );
  }

  return findUser({
    ...(configuredUserId ? { id: configuredUserId } : {}),
    ...(configuredUserEmail ? { email: configuredUserEmail } : {}),
  });
}

export async function resolveMcpUser(authInfo?: AuthInfo): Promise<ScopedUser> {
  const authUserId =
    authInfo?.extra && typeof authInfo.extra.userId === 'string'
      ? authInfo.extra.userId
      : null;
  const authUserEmail =
    authInfo?.extra && typeof authInfo.extra.userEmail === 'string'
      ? authInfo.extra.userEmail
      : null;

  if (authUserId || authUserEmail) {
    return findUser({
      ...(authUserId ? { id: authUserId } : {}),
      ...(authUserEmail ? { email: authUserEmail } : {}),
    });
  }

  if (!scopedUserPromise) {
    scopedUserPromise = resolveEnvScopedUser();
  }

  return scopedUserPromise;
}

export function getScopedUserConfig() {
  return {
    userId: process.env[USER_ID_ENV]?.trim() || null,
    userEmail: process.env[USER_EMAIL_ENV]?.trim() || null,
  };
}
