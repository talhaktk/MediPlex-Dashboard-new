'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
import { useSession } from 'next-auth/react';

interface ClinicContextType {
  clinicId: string | null;
  orgId: string | null;
  isSuperAdmin: boolean;
  role: string;
  isOrgOwner: boolean;
  modules: Record<string, boolean>;
}

const ClinicContext = createContext<ClinicContextType>({
  clinicId: null,
  orgId: null,
  isSuperAdmin: false,
  role: 'receptionist',
  isOrgOwner: false,
  modules: {},
});

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [modules, setModules] = useState<Record<string,boolean>>({});

  useEffect(() => {
    const clinicId = user?.clinicId;
    if (!clinicId) { setModules({}); return; }
    sb.from('clinics').select('modules').eq('id', clinicId).maybeSingle()
      .then(({ data }) => { if (data?.modules) setModules(data.modules); });
  }, [user?.clinicId]);

  return (
    <ClinicContext.Provider value={{
      clinicId:     user?.clinicId     || null,
      orgId:        user?.orgId        || null,
      isSuperAdmin: user?.isSuperAdmin || false,
      role:         user?.role         || 'receptionist',
      isOrgOwner:   user?.role === 'org_owner',
      modules,
    }}>
      {children}
    </ClinicContext.Provider>
  );
}

export const useClinic = () => useContext(ClinicContext);

// Helper to add clinic_id filter to any supabase query
export function withClinicFilter(query: any, clinicId: string | null, isSuperAdmin: boolean, role?: string, orgId?: string | null) {
  if (isSuperAdmin) return query; // sees everything
  if (role === 'org_owner' && orgId) return query; // org owner sees all their clinics - filter by org_id separately
  if (!clinicId) return query;
  return query.eq('clinic_id', clinicId);
}

// Helper to add clinic_id to insert data
export function withClinicId(data: any, clinicId: string | null) {
  if (!clinicId) return data;
  return { ...data, clinic_id: clinicId };
}
