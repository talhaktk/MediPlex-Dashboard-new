import type { NextAuthOptions, User, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client with Service Role Key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label:'Email',    type:'email' },
        password: { label:'Password', type:'password' },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) return null;

        // Querying the 'logins' table
        const { data: user, error } = await supabase
          .from('logins')
          .select('*')
          .eq('email', credentials.email.toLowerCase())
          .eq('password_hash', credentials.password) 
          .eq('is_active', true) 
          .single();

        if (error || !user) {
          console.error("Supabase Auth Error:", error?.message || "User not found or inactive");
          return null;
        }

        // IMPORTANT: Map Supabase columns to NextAuth object
        return {
          id:       user.id.toString(),
          email:    user.email,
          name:     user.name,
          role:     user.user_role, // Matches your 'user_role' column in screenshot
          initials: user.initials,  // Matches your 'initials' column
        } as User & { role: string; initials: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.role     = (user as any).role;
        token.initials = (user as any).initials;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session?.user) {
        (session.user as any).role     = token.role;
        (session.user as any).initials = token.initials;
      }
      return session;
    },
  },
  pages:   { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  secret:  process.env.NEXTAUTH_SECRET,
};