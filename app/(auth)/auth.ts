import { compare } from 'bcrypt-ts';
import NextAuth, { type User, type Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { dbActions } from '@/lib/db/queries';
// import { getUser } from '@/lib/db/queries';

import { authConfig } from './auth.config';

interface ExtendedSession extends Session {
  user: User;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await dbActions.getUser(email);
        if (!users || users.length === 0) return null;
        const user = users[0];
        // biome-ignore lint: Forbidden non-null assertion.
        if (!user.password) return null;
        const passwordsMatch = await compare(password, user.password);
        if (!passwordsMatch) return null;
        return user as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: any;
    }) {
      if (session.user) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
  logger: {
    error(code, ...message) {
      console.log(code, message)
    },
    warn(code, ...message) {
      console.log(code, message)
    },
    debug(code, ...message) {
      console.log(code, message)
    },
  },
});
