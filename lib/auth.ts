import type { NextAuthOptions, User, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const authOptions: NextAuthOptions = {
  providers: [
    // Staff login
    CredentialsProvider({
      id: 'credentials',
      name: 'Staff',
      credentials: {
        email:    { label:'Email',    type:'email' },
        password: { label:'Password', type:'password' },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) return null;
        const { data: user, error } = await supabase
          .from('logins')
          .select('*')
          .eq('email', credentials.email.toLowerCase())
          .eq('password_hash', credentials.password)
          .eq('is_active', true)
          .single();
        if (error || !user) {
          console.error("Auth Error:", error?.message || "User not found");
          return null;
        }
        return {
          id:           user.id.toString(),
          email:        user.email,
          name:         user.name,
          role:         user.user_role || user.role,
          initials:     user.initials,
          clinicId:     user.clinic_id || null,
          orgId:        user.org_id || null,
          isSuperAdmin: user.is_super_admin || false,
          isPatient:    false,
        } as any;
      },
    }),

    // Patient login
    CredentialsProvider({
      id: 'patient-login',
      name: 'Patient',
      credentials: {
        mrNumber: { label:'MR Number', type:'text' },
        password: { label:'Password',  type:'password' },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.mrNumber || !credentials?.password) return null;
        const { data: account } = await supabase
          .from('patient_accounts')
          .select('*')
          .eq('mr_number', credentials.mrNumber.trim().toUpperCase())
          .eq('password_hash', credentials.password)
          .maybeSingle();
        if (!account) return null;
        return {
          id:          account.id,
          name:        account.patient_name,
          email:       account.email || '',
          role:        'patient',
          mrNumber:    account.mr_number,
          clinicId:    account.clinic_id,
          patientName: account.patient_name,
          isPatient:   true,
          isSuperAdmin: false,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.role         = (user as any).role;
        token.initials     = (user as any).initials;
        token.clinicId     = (user as any).clinicId;
        token.orgId        = (user as any).orgId;
        token.isSuperAdmin = (user as any).isSuperAdmin;
        token.isPatient    = (user as any).isPatient;
        token.mrNumber     = (user as any).mrNumber;
        token.patientName  = (user as any).patientName;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session?.user) {
        (session.user as any).role         = token.role;
        (session.user as any).initials     = token.initials;
        (session.user as any).clinicId     = token.clinicId;
        (session.user as any).orgId        = token.orgId;
        (session.user as any).isSuperAdmin = token.isSuperAdmin;
        (session.user as any).isPatient    = token.isPatient;
        (session.user as any).mrNumber     = token.mrNumber;
        (session.user as any).patientName  = token.patientName;
      }
      return session;
    },
  },
  pages:   { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  secret:  process.env.NEXTAUTH_SECRET,
};
