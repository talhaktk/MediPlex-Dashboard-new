'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useClinic } from '@/lib/clinicContext';

let _cache: Record<string, any> = {};

export function useClinicSettings() {
  const { clinicId } = useClinic();
  const [settings, setSettings] = useState<any>(_cache[clinicId||''] || null);
  const [loading, setLoading] = useState(!_cache[clinicId||'']);

  const fetch = useCallback(async () => {
    if (!clinicId) return;
    const { data } = await supabase
      .from('clinic_settings')
      .select('*')
      .eq('clinic_id', clinicId)
      .maybeSingle();
    if (data) {
      _cache[clinicId] = data;
      setSettings(data);
    }
    setLoading(false);
  }, [clinicId]);

  useEffect(() => {
    if (!clinicId) return;

    // Initial fetch
    if (!_cache[clinicId]) fetch();

    // Listen for local save events
    const handler = () => fetch();
    window.addEventListener('clinic-settings-saved', handler);

    // Realtime: set up BEFORE subscribe
    const channel = supabase.channel('cs_' + clinicId);
    channel.on(
      'postgres_changes' as any,
      { event: 'UPDATE', schema: 'public', table: 'clinic_settings', filter: `clinic_id=eq.${clinicId}` },
      () => fetch()
    ).subscribe();

    return () => {
      window.removeEventListener('clinic-settings-saved', handler);
      supabase.removeChannel(channel);
    };
  }, [clinicId, fetch]);

  return { settings, loading, refetch: fetch };
}
