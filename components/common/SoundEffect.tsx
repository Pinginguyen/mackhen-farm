'use client';

import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useLocaleCurrency } from '@/lib/i18n-context';

const SOUND_STORAGE_KEY = 'mackhen-sound-muted';
let audioContext: AudioContext | null = null;

export function playClickSound() {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(SOUND_STORAGE_KEY) === 'true') return;
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;
    audioContext ??= new AudioContextConstructor();
    if (audioContext.state === 'suspended') void audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(800, start);
    gain.gain.setValueAtTime(0.055, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.015);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.015);
  } catch {
    return;
  }
}

export function useSoundEffect() {
  return { playClickSound };
}

export default function SoundEffect() {
  const [muted, setMuted] = useState(false);
  const { locale } = useLocaleCurrency();

  useEffect(() => {
    try {
      setMuted(window.localStorage.getItem(SOUND_STORAGE_KEY) === 'true');
    } catch {
      setMuted(false);
    }
  }, []);

  function toggleSound() {
    const nextMuted = !muted;
    setMuted(nextMuted);
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, String(nextMuted));
    } catch {
      return;
    }
    if (!nextMuted) playClickSound();
  }

  return <button className="sound-effect-toggle" type="button" aria-pressed={!muted} aria-label={locale === 'en' ? (muted ? 'Unmute interface sounds' : 'Mute interface sounds') : (muted ? 'Bật âm thanh giao diện' : 'Tắt âm thanh giao diện')} title={locale === 'en' ? (muted ? 'Unmute sounds' : 'Mute sounds') : (muted ? 'Bật âm thanh' : 'Tắt âm thanh')} onClick={toggleSound}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}<span>{locale === 'en' ? (muted ? 'Sound off' : 'Sound on') : (muted ? 'Đã tắt âm' : 'Âm thanh')}</span></button>;
}