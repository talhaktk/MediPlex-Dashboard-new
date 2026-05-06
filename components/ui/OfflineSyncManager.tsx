'use client';

// Background component — syncs key clinic data into IndexedDB for offline access.
// Mounts in the dashboard layout. No visible output.

import { useEffect, useRef, useCallback } from 'react';
import { supabase }      from '@/lib/supabase';
import { useClinic }     from '@/lib/clinicContext';
import { cacheList, setSyncMeta } from '@/lib/offlineDb';
import { useOnlineStatus }        from '@/lib/useOnlineStatus';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

export default function OfflineSyncManager() {
  const { clinicId }   = useClinic();
  const online         = useOnlineStatus();
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastClinicId   = useRef<string | null>(null);

  const syncData = useCallback(async () => {
    if (!online || !clinicId) return;

    try {
      // ── Appointments: last 60 days + next 30 days ──────────────────────────
      const from = new Date(); from.setDate(from.getDate() - 60);
      const to   = new Date(); to.setDate(to.getDate() + 30);

      const { data: appts } = await supabase
        .from('appointments')
        .select('id,child_name,parent_name,appointment_date,appointment_time,status,visit_type,reason,whatsapp,mr_number,clinic_id')
        .eq('clinic_id', clinicId)
        .gte('appointment_date', from.toISOString().slice(0, 10))
        .lte('appointment_date', to.toISOString().slice(0, 10))
        .order('appointment_date', { ascending: true });

      if (appts?.length) {
        await cacheList('appointments', appts);
      }

      // ── Patients: unique from appointments ─────────────────────────────────
      if (appts?.length) {
        const mrMap = new Map<string, any>();
        appts.forEach(a => {
          if (a.mr_number && !mrMap.has(a.mr_number)) {
            mrMap.set(a.mr_number, {
              mr_number:   a.mr_number,
              child_name:  a.child_name,
              parent_name: a.parent_name,
              whatsapp:    a.whatsapp,
              clinic_id:   a.clinic_id,
              last_visit:  a.appointment_date,
            });
          }
        });
        await cacheList('patients', Array.from(mrMap.values()));
      }

      // ── Also try patients table if it exists ───────────────────────────────
      try {
        const { data: pts } = await supabase
          .from('patients')
          .select('id,mr_number,child_name,parent_name,whatsapp_number,date_of_birth,blood_group,clinic_id')
          .eq('clinic_id', clinicId)
          .limit(500);
        if (pts?.length) {
          await cacheList('patients', pts.map(p => ({ ...p, mr_number: p.mr_number || String(p.id) })));
        }
      } catch {}

      await setSyncMeta('last_sync', new Date().toISOString());
      await setSyncMeta('clinic_id', clinicId);

    } catch (err) {
      // Fail silently — offline sync is best-effort
    }
  }, [online, clinicId]);

  useEffect(() => {
    if (!clinicId) return;
    // Sync immediately on mount or when clinicId changes
    if (lastClinicId.current !== clinicId) {
      lastClinicId.current = clinicId;
      syncData();
    }
    // Periodic sync
    timerRef.current = setInterval(syncData, SYNC_INTERVAL_MS);
    // Manual force-sync event (from OfflineIndicator retry button)
    const forceSync = () => syncData();
    window.addEventListener('mediplex-force-sync', forceSync);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('mediplex-force-sync', forceSync);
    };
  }, [clinicId, syncData]);

  // Also sync when coming back online after being offline
  useEffect(() => {
    if (online) syncData();
  }, [online, syncData]);

  return null; // no UI
}
