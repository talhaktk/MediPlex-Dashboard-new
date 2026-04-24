'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface ClinicContextType {
  clinicId: string | null;
  orgId: string | null;
  isSuperAdmin: boolean;
  role: string;
  isOrgOwner: boolean;
}

const ClinicContext = createContext<ClinicContextType>({
  clinicId: null,
  orgId: null,
  isSuperAdmin: false,
  role: 'receptionist',
  isOrgOwner: false,
});

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user as any;
  return (
    <ClinicContext.Provider value={{
      clinicId:     user?.clinicId     || null,
      orgId:        user?.orgId        || null,
      isSuperAdmin: user?.isSuperAdmin || false,
      role:         user?.role         || 'receptionist',
      isOrgOwner:   user?.role === 'org_owner',
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
