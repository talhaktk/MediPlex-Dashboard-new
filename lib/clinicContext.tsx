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

    const load = async () => {
      // 1. clinic_settings.modules — most reliable: clinic_settings.clinic_id = logins.clinic_id (JWT)
      //    Uses select('*') so it gracefully handles the case where modules column doesn't exist yet
      const { data: settings } = await sb
        .from('clinic_settings').select('*').eq('clinic_id', clinicId).maybeSingle();
      if (settings?.modules && Object.keys(settings.modules).length > 0) {
        setModules(settings.modules); return;
      }

      // 2. Direct match: clinics.id = clinicId (works for new-style clinics)
      const { data: direct } = await sb.from('clinics').select('modules').eq('id', clinicId).maybeSingle();
      if (direct?.modules && Object.keys(direct.modules).length > 0) {
        setModules(direct.modules); return;
      }

      // 3. Name-based match: clinic_settings.clinic_name → clinics.name
      //    Handles legacy clinics where logins.clinic_id != clinics.id
      if (settings?.clinic_name) {
        const { data: byName } = await sb
          .from('clinics').select('modules').ilike('name', `%${settings.clinic_name}%`).maybeSingle();
        if (byName?.modules && Object.keys(byName.modules).length > 0) {
          setModules(byName.modules); return;
        }
        // 3b. Reverse match: clinics.name contained in clinic_settings.clinic_name
        const { data: allClinics } = await sb.from('clinics').select('modules, name');
        if (allClinics) {
          const match = allClinics.find((c: any) =>
            c.name && (
              settings.clinic_name.toLowerCase().includes(c.name.toLowerCase()) ||
              c.name.toLowerCase().includes(settings.clinic_name.toLowerCase())
            )
          );
          if (match?.modules && Object.keys(match.modules).length > 0) {
            setModules(match.modules); return;
          }
        }
      }

      // 4. Last resort: SPECIALITY_DEFAULTS keyed by speciality
      const key = (settings?.speciality || '').toLowerCase();
      const defaults = SPECIALITY_DEFAULTS[key];
      if (defaults) setModules(defaults);
    };

    load();
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
