'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useClinic } from '@/lib/clinicContext';

// Simple module-level cache
const cache: Record<string, any> = {};
const listeners: Set<()=>void> = new Set();

export function invalidateSettings() {
  Object.keys(cache).forEach(k => delete cache[k]);
  listeners.forEach(fn => fn());
}

export function useClinicSettings() {
  const { clinicId } = useClinic();
  const [settings, setSettings] = useState<any>(clinicId ? cache[clinicId] || null : null);
  const [loading, setLoading] = useState(clinicId ? !cache[clinicId] : false);

  const fetchSettings = useCallback(async () => {
    if (!clinicId) return;
    const { data } = await supabase
      .from('clinic_settings')
      .select('*')
      .eq('clinic_id', clinicId)
      .maybeSingle();
    if (data) {
      cache[clinicId] = data;
      setSettings(data);
    }
    setLoading(false);
  }, [clinicId]);

  useEffect(() => {
    if (!clinicId) return;
    if (!cache[clinicId]) fetchSettings();
    else setSettings(cache[clinicId]);

    const handler = () => { delete cache[clinicId]; fetchSettings(); };
    window.addEventListener('clinic-settings-saved', handler);
    listeners.add(handler);

    return () => {
      window.removeEventListener('clinic-settings-saved', handler);
      listeners.delete(handler);
    };
  }, [clinicId, fetchSettings]);

  return { settings, loading, refetch: fetchSettings };
}
