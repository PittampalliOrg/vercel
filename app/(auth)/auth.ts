import { compare } from "bcrypt-ts"
import NextAuth from "next-auth"
import type { DefaultSession, User } from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { getUser } from "@/lib/db/queries"

import { authConfig } from "./auth.config"

// Extend the Session type through module augmentation
declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

// Create the NextAuth instance
const nextAuthConfig = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email)
        if (users.length === 0) return null
        // biome-ignore lint: Forbidden non-null assertion.
        const passwordsMatch = await compare(password, users[0].password!)
        if (!passwordsMatch) return null
        return users[0] as User
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }

      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id as string
      }

      return session
    },
  },
})

// Export the handlers
export const {
  handlers: { GET, POST },
} = nextAuthConfig

// Export the auth function with type assertion
export const auth = nextAuthConfig.auth as unknown as (...args: any[]) => Promise<{
  user: User | null
}>

// Export the signIn function with type assertion
export const signIn = nextAuthConfig.signIn as unknown as (
  provider: string,
  options?: { redirect?: boolean; email?: string; password?: string },
) => Promise<any>

// Export the signOut function with type assertion
export const signOut = nextAuthConfig.signOut as unknown as () => Promise<any>

