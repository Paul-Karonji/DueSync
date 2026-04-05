#!/usr/bin/env node

import { addDays } from 'date-fns';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function printUsage() {
  console.log(
    [
      'Usage:',
      '  npm run mcp:token:create -- --email you@example.com --name "My Agent"',
      'Optional:',
      '  --user-id <cuid>',
      '  --expires-in-days <number>',
    ].join('\n')
  );
}

async function main() {
  const email = getArg('--email');
  const userId = getArg('--user-id');
  const name = getArg('--name') || 'Agent token';
  const expiresInDays = getArg('--expires-in-days');

  if (!email && !userId) {
    printUsage();
    throw new Error('Provide --email or --user-id so the token can be attached to a DueSync user.');
  }

  const [{ prisma }, { issueMcpAccessToken }] = await Promise.all([
    import('../lib/prisma'),
    import('../lib/mcp/token-auth'),
  ]);

  const user = await prisma.user.findFirst({
    where: {
      ...(email ? { email } : {}),
      ...(userId ? { id: userId } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    throw new Error(`Could not find a DueSync user for ${email || userId}.`);
  }

  let expiresAt: Date | null = null;

  if (expiresInDays) {
    const parsedDays = Number.parseInt(expiresInDays, 10);

    if (Number.isNaN(parsedDays) || parsedDays <= 0) {
      throw new Error('--expires-in-days must be a positive integer.');
    }

    expiresAt = addDays(new Date(), parsedDays);
  }

  const { token, record } = await issueMcpAccessToken({
    userId: user.id,
    name,
    expiresAt,
  });

  console.log(`Created MCP token "${record.name}" for ${user.email}.`);
  console.log(`Token ID: ${record.id}`);
  console.log(`Expires: ${expiresAt ? expiresAt.toISOString() : 'never'}`);
  console.log('');
  console.log('Bearer token:');
  console.log(token);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
