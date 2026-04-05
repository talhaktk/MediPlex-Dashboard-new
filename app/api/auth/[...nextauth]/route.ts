import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const authCodes = (process.env.AUTH_CODES || "").split(",").map(s => s.trim()).filter(Boolean);

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Code',
      credentials: {
        code: { label: 'Code', type: 'text' }
      },
      async authorize(credentials) {
        const code = credentials?.code?.trim();
        if (!code) return null;
        if (authCodes.includes(code)) {
          return { id: 'admin', name: 'Admin', email: 'admin@example.com' };
        }
        return null;
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.user = user;
      return token;
    },
    async session({ session, token }) {
      if (token?.user) session.user = token.user;
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
