// auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
      /**
       * SECURITY NOTE: allowDangerousEmailAccountLinking is enabled to allow users
       * to link their Google account even if the email already exists in the database.
       *
       * This is necessary because:
       * 1. We use Google as the sole authentication provider
       * 2. Users may have accounts created through different OAuth flows
       * 3. Email verification is handled by Google OAuth (trusted provider)
       *
       * Risk Mitigation:
       * - Only Google OAuth is enabled (no other providers that could exploit this)
       * - Google performs email verification before issuing tokens
       * - Users must have access to the Google account to authenticate
       *
       * Alternative: Disable this and require strict email uniqueness across providers
       * (not applicable in single-provider setup)
       */
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id

        const account = await prisma.account.findFirst({
          where: { userId: user.id, provider: 'google' }
        })

        if (account) {
          // @ts-ignore
          session.accessToken = account.access_token
          // @ts-ignore
          session.refreshToken = account.refresh_token
        }
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // After successful sign-in, always redirect to home page
      if (url.startsWith("/")) return url
      if (url.includes("/api/auth")) return baseUrl
      return baseUrl
    },
  },
  session: {
    strategy: "database",
  },
  // Required for NextAuth v5 in development
  trustHost: true,
})