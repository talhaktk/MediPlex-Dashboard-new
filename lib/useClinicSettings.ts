'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useClinic } from '@/lib/clinicContext';

let _settings: any = null;
const _listeners: Set<()=>void> = new Set();

function notifyAll() { _listeners.forEach(fn => fn()); }

export function useClinicSettings() {
  const { clinicId } = useClinic();
  const [settings, setSettings] = useState<any>(_settings);
  const [loading, setLoading] = useState(!_settings);

  const fetch = useCallback(async () => {
    if (!clinicId) return;
    const { data } = await supabase
      .from('clinic_settings')
      .select('*')
      .eq('clinic_id', clinicId)
      .maybeSingle();
    _settings = data;
    setSettings(data);
    setLoading(false);
    notifyAll();
  }, [clinicId]);

  useEffect(() => {
    // Listen for settings saved event
    const handler = () => fetch();
    window.addEventListener('clinic-settings-saved', handler);
    _listeners.add(handler);

    // Also listen to Supabase realtime
    const channel = supabase
      .channel('clinic_settings_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'clinic_settings',
        filter: clinicId ? `clinic_id=eq.${clinicId}` : undefined,
      }, () => fetch())
      .subscribe();

    if (!_settings && clinicId) fetch();

    return () => {
      window.removeEventListener('clinic-settings-saved', handler);
      _listeners.delete(handler);
      supabase.removeChannel(channel);
    };
  }, [clinicId, fetch]);

  return { settings, loading, refetch: fetch };
}
