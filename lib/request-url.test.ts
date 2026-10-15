import { afterEach, describe, expect, it } from 'vitest';

import { resolveRequestBaseUrl } from './request-url';

describe('resolveRequestBaseUrl', () => {
  const previousAppUrl = process.env.APP_URL;

  afterEach(() => {
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
  });

  it('prefers the current alias host over the default APP_URL', () => {
    process.env.APP_URL = 'https://mackhen-farm-51rwdxl5j-trn10.vercel.app';

    const headers = new Headers({
      'x-forwarded-host': 'mackhen-farm.vercel.app',
      'x-forwarded-proto': 'https',
    });

    expect(resolveRequestBaseUrl(headers)).toBe('https://mackhen-farm.vercel.app');
  });

  it('falls back to APP_URL when no request host is available', () => {
    process.env.APP_URL = 'https://mackhen-farm-51rwdxl5j-trn10.vercel.app';

    expect(resolveRequestBaseUrl(new Headers())).toBe('https://mackhen-farm-51rwdxl5j-trn10.vercel.app');
  });
});
