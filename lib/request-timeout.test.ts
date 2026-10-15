import { describe, expect, it, vi } from 'vitest';

import { createAbortSignal } from './request-timeout';

describe('createAbortSignal', () => {
  it('falls back to AbortController when AbortSignal.timeout is unavailable', () => {
    const timeoutFn = AbortSignal.timeout;
    // @ts-expect-error - simulating older browser compatibility
    AbortSignal.timeout = undefined;

    try {
      const timeout = createAbortSignal(250);
      expect(timeout.signal).toBeInstanceOf(AbortSignal);
      expect(timeout.signal.aborted).toBe(false);
      timeout.clear();
    } finally {
      AbortSignal.timeout = timeoutFn;
    }
  });

  it('cleans up the fallback timer when the signal is no longer needed', () => {
    const originalTimeout = AbortSignal.timeout;
    // @ts-expect-error - simulating older browser compatibility
    AbortSignal.timeout = undefined;

    try {
      const timeout = createAbortSignal(25);
      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
      timeout.clear();

      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    } finally {
      AbortSignal.timeout = originalTimeout;
    }
  });
});
