import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

function getUsers() {
  try {
    const raw = process.env.AUTH_USERS;
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    { email: 'admin@mediplex.com', password: 'mediplex2024', name: 'Dr. Talha', role: 'admin', initials: 'DT' },
  ];
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const users = getUsers();
        const user  = users.find(
          (u: { email: string; password: string }) =>
            u.email.toLowerCase() === credentials.email.toLowerCase() &&
            u.password === credentials.password
        );
        if (!user) return null;
        return { id: user.email, email: user.email, name: user.name, role: user.role, initials: user.initials };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: Record<string, unknown>; user?: Record<string, unknown> }) {
      if (user) { token.role = user.role; token.initials = user.initials; }
      return token;
    },
    async session({ session, token }: { session: Record<string, unknown>; token: Record<string, unknown> }) {
      if (session.user) {
        (session.user as Record<string, unknown>).role     = token.role;
        (session.user as Record<string, unknown>).initials = token.initials;
      }
      return session;
    },
  },
  pages:   { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  secret:  process.env.NEXTAUTH_SECRET,
};
