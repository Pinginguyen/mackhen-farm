#!/usr/bin/env node

import { performance } from 'node:perf_hooks';

const baseUrl = new URL(process.env.BASE_URL ?? 'http://localhost:3000');
const routes = [
  '/',
  '/products',
  '/khuyen-mai',
  '/tra-cuu',
  '/dang-nhap',
  '/dang-ky',
  '/checkout',
  '/admin',
  '/admin/orders',
  '/admin/returns',
  '/admin/vouchers',
  '/admin/customers',
  '/api/health',
  '/api/vouchers',
  '/api/products',
];

const results = await Promise.all(routes.map(async (route) => {
  const startedAt = performance.now();

  try {
    const response = await fetch(new URL(route, baseUrl), {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    const responseTime = Math.round(performance.now() - startedAt);
    const statusAccepted = response.status === 200 || response.status === 307;
    const latencyAccepted = responseTime < 2500;

    return {
      Route: route,
      Status: response.status,
      'Response Time': `${responseTime}ms`,
      Result: statusAccepted && latencyAccepted ? 'PASS' : 'FAIL',
    };
  } catch {
    const responseTime = Math.round(performance.now() - startedAt);

    return {
      Route: route,
      Status: 'ERROR',
      'Response Time': `${responseTime}ms`,
      Result: 'FAIL',
    };
  }
}));

console.table(results);
if (results.some(({ Result }) => Result === 'FAIL')) process.exitCode = 1;