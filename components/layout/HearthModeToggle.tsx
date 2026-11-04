'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';

const HEARTH_STORAGE_KEY = 'mackhen-hearth-mode';

export default function HearthModeToggle() {
  const [enabled, setEnabled] = useState(false);
  const { locale } = useLocaleCurrency();
  const isEN = locale === 'en';

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(HEARTH_STORAGE_KEY) === 'true';
      setEnabled(saved);
      document.documentElement.classList.toggle('hearth-mode', saved);
    } catch {
      document.documentElement.classList.remove('hearth-mode');
    }
  }, []);

  function toggle() {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    document.documentElement.classList.toggle('hearth-mode', nextEnabled);
    try {
      window.localStorage.setItem(HEARTH_STORAGE_KEY, String(nextEnabled));
    } catch {
      return;
    }
  }

  return <button className={`hearth-mode-toggle${enabled ? ' is-active' : ''}`} type="button" aria-pressed={enabled} aria-label={isEN ? (enabled ? 'Turn off Northwest Hearth mode' : 'Turn on Northwest Hearth mode') : (enabled ? 'Tắt chế độ Bếp Lửa Tây Bắc' : 'Bật chế độ Bếp Lửa Tây Bắc')} title={isEN ? 'Northwest Hearth mode' : 'Bếp Lửa Tây Bắc'} onClick={toggle}><Flame size={18} aria-hidden="true" /><span>{isEN ? 'Hearth' : 'Bếp Lửa'}</span></button>;
}