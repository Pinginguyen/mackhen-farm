import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/auth/logout', () => {
  it('clears the session and redirects suspended affiliates to the login error', async () => {
    const response = await GET(new Request('https://mackhen.example/api/auth/logout?reason=account_suspended'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://mackhen.example/dang-nhap?error=account_suspended');
    expect(response.headers.get('set-cookie')).toContain('mkf_session=');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});