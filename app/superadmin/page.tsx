import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SuperAdminClient from './SuperAdminClient';

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);
  const adminEmail = (session?.user as any)?.email || '';
  return <SuperAdminClient adminEmail={adminEmail} />;
}
