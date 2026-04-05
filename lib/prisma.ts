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

function normalizeDirectDatabaseUrl(url?: string) {
  if (!url) {
    return url
  }

  try {
    const parsed = new URL(url)

    if (!parsed.searchParams.has('connection_limit')) {
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

function resolveRuntimeDatabaseUrl() {
  const pooledUrl = normalizePooledDatabaseUrl(process.env.DATABASE_URL)
  const directUrl = normalizeDirectDatabaseUrl(process.env.DIRECT_URL)

  if (!pooledUrl) {
    return directUrl
  }

  try {
    const parsedPooledUrl = new URL(pooledUrl)
    const usesSupabasePooler = parsedPooledUrl.hostname.includes('pooler.supabase.com')

    // This deployment has shown pooler checkout timeouts while the direct Postgres
    // port remains healthy. Prefer the direct runtime URL with a single connection
    // so production API routes can recover without requiring an urgent env change.
    if (usesSupabasePooler && directUrl) {
      return directUrl
    }
  } catch {
    return pooledUrl
  }

  return pooledUrl
}

process.env.DATABASE_URL = resolveRuntimeDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
