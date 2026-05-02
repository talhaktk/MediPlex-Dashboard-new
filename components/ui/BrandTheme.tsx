'use client';
import { useEffect } from 'react';
import { useClinicSettings } from '@/lib/useClinicSettings';

export function BrandTheme() {
  const { settings } = useClinicSettings();
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    if (settings.brand_color) root.style.setProperty('--color-navy', settings.brand_color);
    if (settings.brand_accent) root.style.setProperty('--color-gold', settings.brand_accent);
  }, [settings?.brand_color, settings?.brand_accent]);
  return null;
}
