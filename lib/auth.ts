import type { NextAuthOptions, User, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';

interface AppUser {
  email:    string;
  password: string;
  name:     string;
  role:     string;
  initials: string;
  active:   boolean;
}

// Fetch users from Google Sheet Logins tab
async function getSheetUsers(): Promise<AppUser[]> {
  try {
    const sheetId = process.env.GOOGLE_SHEETS_ID;
    if (!sheetId) return [];
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Logins`;
    const res  = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const csv   = await res.text();
    const lines = csv.split('\n').filter(Boolean).slice(1); // skip header
    return lines.map(line => {
      const cols = parseCSV(line);
      return {
        name:     clean(cols[0]),
        email:    clean(cols[1]),
        password: clean(cols[2]),
        role:     clean(cols[3]) || 'receptionist',
        initials: clean(cols[4]),
        active:   clean(cols[5])?.toLowerCase() !== 'no',
      };
    }).filter(u => u.email && u.active);
  } catch { return []; }
}

// Fallback users from env var
function getEnvUsers(): AppUser[] {
  try {
    const raw = process.env.AUTH_USERS;
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    { email:'admin@mediplex.com', password:'mediplex2024', name:'Dr. Talha', role:'admin', initials:'DT', active:true },
  ];
}

async function getAllUsers(): Promise<AppUser[]> {
  const sheetUsers = await getSheetUsers();
  const envUsers   = getEnvUsers();
  // Merge: sheet users take priority, env users are fallback
  const allEmails  = new Set(sheetUsers.map(u => u.email.toLowerCase()));
  const combined   = [...sheetUsers, ...envUsers.filter(u => !allEmails.has(u.email.toLowerCase()))];
  return combined;
}

function clean(s?: string) { return (s||'').trim().replace(/^"|"$/g,''); }
function parseCSV(line: string): string[] {
  const result: string[] = []; let current = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i+1]==='"') { current+='"'; i++; } else inQ=!inQ; }
    else if (c === ',' && !inQ) { result.push(current); current=''; }
    else current += c;
  }
  result.push(current); return result;
}

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
        const users = await getAllUsers();
        const user  = users.find(
          u => u.email.toLowerCase() === credentials.email.toLowerCase() &&
               u.password === credentials.password &&
               u.active
        );
        if (!user) return null;
        return {
          id:       user.email,
          email:    user.email,
          name:     user.name,
          role:     user.role,
          initials: user.initials,
        } as User & { role: string; initials: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.role     = (user as User & { role?: string }).role;
        token.initials = (user as User & { initials?: string }).initials;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session?.user) {
        (session.user as Session['user'] & { role?: string; initials?: string }).role     = token.role as string;
        (session.user as Session['user'] & { role?: string; initials?: string }).initials = token.initials as string;
      }
      return session;
    },
  },
  pages:   { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  secret:  process.env.NEXTAUTH_SECRET,
};
