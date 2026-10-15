'use client';

import { useState, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'pattern'>;

export default function ValidatedPhoneInput({ onChange, value, defaultValue, ...props }: Props) {
  const controlled = value !== undefined;
  const [localValue, setLocalValue] = useState(String(defaultValue ?? ''));
  const currentValue = String(controlled ? value : localValue);
  const normalizedPhone = currentValue.replace(/\D/g, '');
  const isValidVietnameseMobile = /^0[35789]\d{8}$/.test(normalizedPhone);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!controlled) setLocalValue(event.target.value);
    onChange?.(event);
  }

  return (
    <span className="validated-phone-input">
      <input
        {...props}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={controlled ? value : undefined}
        defaultValue={controlled ? undefined : defaultValue}
        onChange={handleChange}
      />
      <Check className="validated-phone-check" size={16} aria-hidden="true" data-visible={isValidVietnameseMobile} />
    </span>
  );
}