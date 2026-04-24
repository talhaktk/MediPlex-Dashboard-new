'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
import { useSession } from 'next-auth/react';

// Speciality → default module flags (used as fallback when clinics table has no entry)
const SPECIALITY_DEFAULTS: Record<string, Record<string, boolean>> = {
  'pediatrics':       { vaccines:true,  who_charts:true,  weight_based_dose:true,  bmi_calc:false, pain_scale:false, rom:false, surgical_history:false, implant_tracking:false, anc_record:false, lmp_edd:false, obstetric_history:false, chronic_conditions:false, bp_history:false, family_history:false, telehealth:true,  ai_scribe:true,  lab_results:true,  procedures:true,  feedback:true  },
  'general practice': { vaccines:false, who_charts:false, weight_based_dose:false, bmi_calc:true,  pain_scale:false, rom:false, surgical_history:false, implant_tracking:false, anc_record:false, lmp_edd:false, obstetric_history:false, chronic_conditions:true,  bp_history:true,  family_history:true,  telehealth:true,  ai_scribe:true,  lab_results:true,  procedures:true,  feedback:true  },
  'orthopedics':      { vaccines:false, who_charts:false, weight_based_dose:false, bmi_calc:false, pain_scale:true,  rom:true,  surgical_history:true,  implant_tracking:true,  anc_record:false, lmp_edd:false, obstetric_history:false, chronic_conditions:false, bp_history:false, family_history:false, telehealth:true,  ai_scribe:true,  lab_results:true,  procedures:true,  feedback:true  },
  'gynecology':       { vaccines:false, who_charts:false, weight_based_dose:false, bmi_calc:true,  pain_scale:false, rom:false, surgical_history:false, implant_tracking:false, anc_record:true,  lmp_edd:true,  obstetric_history:true,  chronic_conditions:false, bp_history:false, family_history:false, telehealth:true,  ai_scribe:true,  lab_results:true,  procedures:true,  feedback:true  },
  'cardiology':       { vaccines:false, who_charts:false, weight_based_dose:false, bmi_calc:true,  pain_scale:false, rom:false, surgical_history:false, implant_tracking:false, anc_record:false, lmp_edd:false, obstetric_history:false, chronic_conditions:true,  bp_history:true,  family_history:true,  telehealth:true,  ai_scribe:true,  lab_results:true,  procedures:true,  feedback:true  },
  'dermatology':      { vaccines:false, who_charts:false, weight_based_dose:false, bmi_calc:false, pain_scale:false, rom:false, surgical_history:false, implant_tracking:false, anc_record:false, lmp_edd:false, obstetric_history:false, chronic_conditions:false, bp_history:false, family_history:false, telehealth:true,  ai_scribe:true,  lab_results:true,  procedures:true,  feedback:true  },
  'ent':              { vaccines:false, who_charts:false, weight_based_dose:false, bmi_calc:false, pain_scale:true,  rom:false, surgical_history:false, implant_tracking:false, anc_record:false, lmp_edd:false, obstetric_history:false, chronic_conditions:false, bp_history:false, family_history:false, telehealth:true,  ai_scribe:true,  lab_results:true,  procedures:true,  feedback:true  },
};

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
      .then(async ({ data }) => {
        const m = data?.modules as Record<string, boolean> | null;
        if (m && Object.keys(m).length > 0) { setModules(m); return; }
        // Fallback: derive from clinic_settings.speciality
        const { data: settings } = await sb.from('clinic_settings').select('speciality').eq('clinic_id', clinicId).maybeSingle();
        const key = (settings?.speciality || '').toLowerCase();
        const defaults = SPECIALITY_DEFAULTS[key];
        if (defaults) setModules(defaults);
      });
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
