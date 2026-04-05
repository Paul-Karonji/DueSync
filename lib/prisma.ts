// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function normalizePooledDatabaseUrl(url?: string) {
  if (!url) {
    return url
  }

  try {
    const parsed = new URL(url)
    const usesPooler =
      parsed.searchParams.get('pgbouncer') === 'true' ||
      parsed.hostname.includes('pooler.supabase.com')

    if (!usesPooler) {
      return url
    }

    const configuredLimit = Number.parseInt(parsed.searchParams.get('connection_limit') || '', 10)

    // Serverless functions can spin up many short-lived Prisma pools at once.
    // A large per-instance pool size on a pooled Supabase URL can still exhaust
    // the underlying database very quickly, so clamp it to a conservative value.
    if (Number.isNaN(configuredLimit) || configuredLimit > 5) {
      parsed.searchParams.set('connection_limit', '1')
    }

    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '20')
    }

    return parsed.toString()
  } catch {
    return url
  }
}

process.env.DATABASE_URL = normalizePooledDatabaseUrl(process.env.DATABASE_URL)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
